import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getOrSet } from "@/lib/cache";
import { logAudit } from "@/lib/audit-log";
import { resourceMap } from "@/lib/resource-map";

const AUTHENTICATED_READ_RESOURCES = new Set(["repositori", "upload"]);

export interface UserContext {
  userId: number;
  email: string;
  name: string;
  roleName: string;
  teamIds: number[];
  unitKerjaId?: number;
  permissions: {
    rolePermissions: Array<{ resource: string; action: string }>;
    userPermissions: Array<{ resource: string; action: string; value: string }>;
  };
}

async function getUserContext(email: string): Promise<UserContext | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      },
      permissions: {
        include: { permission: true },
      },
      teams: { select: { teamId: true } },
    },
  });

  if (!user) return null;

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    roleName: user.role.name,
    teamIds: user.teams.map((item) => item.teamId),
    unitKerjaId: undefined, // User model doesn't have unitKerjaId directly
    permissions: {
      rolePermissions: user.role.permissions.map((rp) => ({
        resource: rp.permission.resource,
        action: rp.permission.action,
      })),
      userPermissions: user.permissions.map((up) => ({
        resource: up.permission.resource,
        action: up.permission.action,
        value: up.value,
      })),
    },
  };
}

export function isAdminRole(roleName?: string | null): boolean {
  return String(roleName ?? "").trim().toLowerCase() === "admin";
}

export const TEAM_SCOPED_RISK_RESOURCES = new Set([
  "identifikasi-risiko",
  "analisis-risiko",
  "evaluasi-risiko",
  "rencana-penanganan",
  "pelaporan-risiko",
  "kri",
  "dokumen-pendukung",
]);

export function buildRiskTeamWhere(resource: string, context: UserContext): Record<string, unknown> | null {
  if (isAdminRole(context.roleName) || !TEAM_SCOPED_RISK_RESOURCES.has(resource)) return null;
  const teamFilter = { in: context.teamIds };
  if (resource === "identifikasi-risiko") return { teamId: teamFilter };
  if (resource === "dokumen-pendukung") {
    return { rencanaPenanganan: { is: { identifikasiRisiko: { is: { teamId: teamFilter } } } } };
  }
  return { identifikasiRisiko: { is: { teamId: teamFilter } } };
}

export function mergeRiskTeamWhere(resource: string, where: Record<string, unknown>, context: UserContext) {
  const teamWhere = buildRiskTeamWhere(resource, context);
  return teamWhere ? { AND: [where, teamWhere] } : where;
}

export async function canAccessRiskIds(context: UserContext, riskIds: number[]): Promise<boolean> {
  const ids = Array.from(new Set(riskIds.filter((id) => Number.isInteger(id) && id > 0)));
  if (ids.length === 0) return true;
  if (isAdminRole(context.roleName)) return true;
  if (context.teamIds.length === 0) return false;
  const count = await prisma.identifikasiRisiko.count({
    where: { id: { in: ids }, teamId: { in: context.teamIds } },
  });
  return count === ids.length;
}

function hasBasePermission(
  context: UserContext,
  resource: string,
  action: string
): boolean {
  // Admin is the highest role and may access risk registers across teams.
  if (isAdminRole(context.roleName)) return true;

  // Check deny overrides first
  const hasDenyOverride = context.permissions.userPermissions.some(
    (up) => up.resource === resource && up.action === action && up.value === "deny"
  );
  if (hasDenyOverride) return false;

  // Check grant overrides
  const hasGrantOverride = context.permissions.userPermissions.some(
    (up) => up.resource === resource && up.action === action && up.value === "grant"
  );
  if (hasGrantOverride) return true;

  // Dokumen repository should be readable by every authenticated role.
  if (action === "read" && AUTHENTICATED_READ_RESOURCES.has(resource)) {
    return true;
  }

  // Check role permissions
  const hasPerm = context.permissions.rolePermissions.some(
    (rp) => rp.resource === resource && rp.action === action
  );

  return hasPerm;
}

export async function checkPermission(
  resource: string,
  action: string,
  context?: { ipAddress?: string; userAgent?: string }
): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const auth = cookieStore.get("auth");

    if (!auth?.value) {
      await logAudit({
        userId: "unknown",
        userName: "Anonymous",
        action: "ACCESS_DENIED",
        resource,
        details: { action, reason: "No auth cookie" },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      });
      return false;
    }

    const parsed = JSON.parse(auth.value);
    const email = parsed.email;

    if (!email) {
      await logAudit({
        userId: "unknown",
        userName: "Anonymous",
        action: "ACCESS_DENIED",
        resource,
        details: { action, reason: "No email in auth cookie" },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      });
      return false;
    }

    const userContext = await getOrSet(
      `user:context:v2:${email}`,
      async () => {
        const ctx = await getUserContext(email);
        return ctx;
      },
      900
    );

    if (!userContext) {
      await logAudit({
        userId: email,
        userName: parsed.name || email,
        action: "ACCESS_DENIED",
        resource,
        details: { action, reason: "User not found" },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      });
      return false;
    }

    const hasPerm = hasBasePermission(userContext, resource, action);

    if (!hasPerm) {
      await logAudit({
        userId: email,
        userName: parsed.name || email,
        action: "ACCESS_DENIED",
        resource,
        details: { action, reason: "No matching role permission" },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error("checkPermission error:", error);
    return false;
  }
}

// Mengembalikan konteks pengguna saat ini (role + permissions) tanpa melakukan
// pemeriksaan permission. Dipakai endpoint yang butuh verifikasi role
// tambahan, mis. hapus permanen yang hanya boleh dilakukan Admin.
export async function getAuthUserContext(): Promise<UserContext | null> {
  try {
    const cookieStore = await cookies();
    const auth = cookieStore.get("auth");
    if (!auth?.value) return null;

    const parsed = JSON.parse(auth.value);
    const email = parsed.email;
    if (!email) return null;

    return await getOrSet(
      `user:context:v2:${email}`,
      async () => getUserContext(email),
      900
    );
  } catch (error) {
    console.error("getAuthUserContext error:", error);
    return null;
  }
}

export async function getRiskTeamContext(): Promise<UserContext | null> {
  return getAuthUserContext();
}

export async function checkRecordPermission(
  resource: string,
  action: string,
  recordId: number,
  context?: { ipAddress?: string; userAgent?: string }
): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const auth = cookieStore.get("auth");

    if (!auth?.value) return false;

    const parsed = JSON.parse(auth.value);
    const email = parsed.email;

    if (!email) return false;

    const userContext = await getOrSet(
      `user:context:v2:${email}`,
      async () => getUserContext(email),
      900
    );
    if (!userContext) return false;

    // First check base permission
    const hasBasePerm = hasBasePermission(userContext, resource, action);
    if (!hasBasePerm) return false;

    if (isAdminRole(userContext.roleName) || !TEAM_SCOPED_RISK_RESOURCES.has(resource)) return true;
    if (userContext.teamIds.length === 0) return false;

    const modelName = resourceMap[resource];
    const delegate = modelName ? (prisma as any)[modelName] : null;
    if (!delegate) return false;
    const teamWhere = buildRiskTeamWhere(resource, userContext);
    return Boolean(await delegate.findFirst({ where: { AND: [{ id: recordId }, teamWhere] }, select: { id: true } }));
  } catch (error) {
    console.error("checkRecordPermission error:", error);
    return false;
  }
}

export async function getUserPermissions(email: string): Promise<Array<{ resource: string; action: string }>> {
  try {
    const userContext = await getUserContext(email);
    if (!userContext) return [];

    const allPermissions = new Set<string>();

    // Add role permissions
    for (const rp of userContext.permissions.rolePermissions) {
      allPermissions.add(`${rp.resource}:${rp.action}`);
    }

    // Add user grant overrides
    for (const up of userContext.permissions.userPermissions) {
      if (up.value === "grant") {
        allPermissions.add(`${up.resource}:${up.action}`);
      }
    }

    // Remove denied permissions
    for (const up of userContext.permissions.userPermissions) {
      if (up.value === "deny") {
        allPermissions.delete(`${up.resource}:${up.action}`);
      }
    }

    return Array.from(allPermissions).map((p) => {
      const [resource, action] = p.split(":");
      return { resource, action };
    });
  } catch (error) {
    console.error("getUserPermissions error:", error);
    return [];
  }
}

export async function canGrantPermissions(
  grantorEmail: string,
  permissionsToGrant: Array<{ permissionId: number; value: string }>
): Promise<{ allowed: boolean; invalidPermissions: number[] }> {
  try {
    const grantorPerms = await getUserPermissions(grantorEmail);
    const grantorPermSet = new Set(grantorPerms.map((p) => `${p.resource}:${p.action}`));

    // Get permission details for the IDs being granted
    const permIds = permissionsToGrant.map((p) => p.permissionId);
    const perms = await prisma.permission.findMany({
      where: { id: { in: permIds } },
    });

    const permMap = new Map(perms.map((p) => [p.id, `${p.resource}:${p.action}`]));

    const invalidPermissions: number[] = [];

    for (const p of permissionsToGrant) {
      if (p.value === "grant") {
        const permKey = permMap.get(p.permissionId);
        if (permKey && !grantorPermSet.has(permKey)) {
          invalidPermissions.push(p.permissionId);
        }
      }
    }

    return {
      allowed: invalidPermissions.length === 0,
      invalidPermissions,
    };
  } catch (error) {
    console.error("canGrantPermissions error:", error);
    return { allowed: false, invalidPermissions: [] };
  }
}
