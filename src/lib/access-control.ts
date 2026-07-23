import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getOrSet } from "@/lib/cache";

export async function checkPermission(resource: string, action: string): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const auth = cookieStore.get("auth");

    if (!auth?.value) return false;

    const parsed = JSON.parse(auth.value);
    const email = parsed.email;

    if (!email) return false;

    const permissions = await getOrSet(
      `user:permissions:${email}`,
      async () => {
        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        });

        if (!user) return null;

        return {
          roleName: user.role.name,
          rolePermissions: user.role.permissions.map((rp) => ({
            resource: rp.permission.resource,
            action: rp.permission.action,
          })),
          userPermissions: user.permissions.map((up) => ({
            resource: up.permission.resource,
            action: up.permission.action,
            value: up.value,
          })),
        };
      },
      900
    );

    if (!permissions) return false;

    // Check deny overrides first
    const hasDenyOverride = permissions.userPermissions.some(
      (up) => up.resource === resource && up.action === action && up.value === "deny"
    );
    if (hasDenyOverride) return false;

    // Check grant overrides
    const hasGrantOverride = permissions.userPermissions.some(
      (up) => up.resource === resource && up.action === action && up.value === "grant"
    );
    if (hasGrantOverride) return true;

    // Admin has superuser override access to everything
    if (permissions.roleName === "admin") return true;

    // Check role permissions
    const hasPerm = permissions.rolePermissions.some(
      (rp) => rp.resource === resource && rp.action === action
    );

    return hasPerm;
  } catch (error) {
    console.error("checkPermission error:", error);
    return false;
  }
}
