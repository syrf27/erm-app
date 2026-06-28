import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

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

    if (!user || user.password !== password) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 400 }
      );
    }

    // Build unique set of permissions
    const permissionsSet = new Set<string>();

    // Add base role permissions
    for (const rp of user.role.permissions) {
      permissionsSet.add(`${rp.permission.resource}:${rp.permission.action}`);
    }

    // Apply user-specific overrides
    for (const up of user.permissions) {
      const permKey = `${up.permission.resource}:${up.permission.action}`;
      if (up.value === "grant") {
        permissionsSet.add(permKey);
      } else if (up.value === "deny") {
        permissionsSet.delete(permKey);
      }
    }

    const permissions = Array.from(permissionsSet);

    // Return user profile (exclude password)
    return NextResponse.json({
      name: user.name,
      email: user.email,
      role: user.role.name,
      permissions: permissions,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`,
    });
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
