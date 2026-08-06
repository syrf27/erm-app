import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getOrSet } from "@/lib/cache";
import { logAudit } from "@/lib/audit-log";

export interface UserContext {
  email: string;
  name: string;
  roleName: string;
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
    },
  });

  if (!user) return null;

  return {
    email: user.email,
    name: user.name,
    roleName: user.role.name,
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

function hasBasePermission(
  context: UserContext,
  resource: string,
  action: string
): boolean {
  // Admin role bypasses all checks and has full access
  if (context.roleName?.toLowerCase() === "admin") return true;

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

  // Check role permissions
  const hasPerm = context.permissions.rolePermissions.some(
    (rp) => rp.resource === resource && rp.action === action
  );

  return hasPerm;
}

function hasRecordAccess(
  context: UserContext,
  record: { unitKerjaId?: number | null; sasaranId?: number | null; kegiatanId?: number | null }
): boolean {
  // Admin has access to all records
  if (context.roleName === "admin") return true;

  // If record has unitKerjaId, check if user's unit matches (would need user-unit mapping)
  // For now, we'll implement a basic check that can be extended
  // TODO: Implement proper user-unitKerja mapping
  
  return true; // Base permission already checked
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
      `user:context:${email}`,
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

    const userContext = await getUserContext(email);
    if (!userContext) return false;

    // First check base permission
    const hasBasePerm = hasBasePermission(userContext, resource, action);
    if (!hasBasePerm) return false;

    // Admin has access to all records
    if (userContext.roleName === "admin") return true;

    // TODO: Implement record-level access checks based on resource type
    // For now, return true if base permission passes
    // This should be extended per resource type:
    // - identifikasi-risiko: check unitKerjaId, sasaranId, kegiatanId
    // - sasaran: check unitKerjaId
    // - kegiatan: check unitKerjaId
    // etc.

    return true;
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
