import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function checkPermission(resource: string, action: string): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const auth = cookieStore.get("auth");
    
    if (!auth?.value) return false;

    const parsed = JSON.parse(auth.value);
    const email = parsed.email;

    if (!email) return false;

    // Fetch user with their role, permissions, and overrides
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

    if (!user) return false;

    // Check deny overrides first
    const hasDenyOverride = user.permissions.some(
      (up) => up.permission.resource === resource && up.permission.action === action && up.value === "deny"
    );
    if (hasDenyOverride) return false;

    // Check grant overrides
    const hasGrantOverride = user.permissions.some(
      (up) => up.permission.resource === resource && up.permission.action === action && up.value === "grant"
    );
    if (hasGrantOverride) return true;

    // Admin has superuser override access to everything (as long as not explicitly denied)
    if (user.role.name === "admin") return true;

    // Verify if there is a permission mapping matching the resource and action in role permissions
    const hasPerm = user.role.permissions.some(
      (rp) => rp.permission.resource === resource && rp.permission.action === action
    );

    return hasPerm;
  } catch (error) {
    console.error("checkPermission error:", error);
    return false;
  }
}
