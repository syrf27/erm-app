import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const AUTH_COOKIE = "auth";
const DEFAULT_GOJAGS_REGISTER_ROLE = "anggota tim";

interface JwtPayload {
  email?: string;
  preferred_username?: string;
  upn?: string;
  name?: string;
  nama?: string;
  unit_kerja?: string;
  nip?: string;
  [key: string]: unknown;
}

function decodeJwtPayload(token: string): JwtPayload {
  const payload = token.split(".")[1];

  if (!payload) {
    throw new Error("Invalid token");
  }

  const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
  const paddedPayload = normalizedPayload.padEnd(
    normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
    "="
  );

  return JSON.parse(Buffer.from(paddedPayload, "base64").toString("utf8"));
}

function resolveEmail(payload: JwtPayload) {
  return (payload.email || payload.preferred_username || payload.upn || "").toLowerCase().trim();
}

function resolveName(payload: JwtPayload, fallback: string) {
  return String(payload.name || payload.nama || fallback).trim();
}

async function findOrCreateLocalUser(email: string, payload: JwtPayload) {
  const include = {
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
  } as const;

  const existingUser = await prisma.user.findUnique({
    where: { email },
    include,
  });

  if (existingUser) {
    return existingUser;
  }

  const defaultRoleName = process.env.GOJAGS_DEFAULT_ROLE || DEFAULT_GOJAGS_REGISTER_ROLE;
  const defaultRole = await prisma.role.findFirst({
    where: {
      name: {
        equals: defaultRoleName,
        mode: "insensitive",
      },
    },
  });

  if (!defaultRole) {
    throw new Error(`Default role "${defaultRoleName}" tidak ditemukan`);
  }

  return prisma.user.create({
    data: {
      email,
      name: resolveName(payload, email),
      roleId: defaultRole.id,
    },
    include,
  });
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token tidak ditemukan" }, { status: 400 });
    }

    const payload = decodeJwtPayload(token);
    const email = resolveEmail(payload);

    if (!email) {
      return NextResponse.json({ error: "Email tidak ditemukan pada token GOJAGS" }, { status: 400 });
    }

    const user = await findOrCreateLocalUser(email, payload);

    const permissionsSet = new Set<string>();

    for (const rolePermission of user.role.permissions) {
      permissionsSet.add(`${rolePermission.permission.resource}:${rolePermission.permission.action}`);
    }

    for (const userPermission of user.permissions) {
      const permissionKey = `${userPermission.permission.resource}:${userPermission.permission.action}`;
      if (userPermission.value === "grant") {
        permissionsSet.add(permissionKey);
      } else if (userPermission.value === "deny") {
        permissionsSet.delete(permissionKey);
      }
    }

    const permissions = Array.from(permissionsSet);
    const identity = {
      name: user.name || resolveName(payload, email),
      email: user.email,
      role: user.role.name,
    };
    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(identity.name)}&background=random`;
    const response = NextResponse.json({
      ...identity,
      permissions,
      avatar,
      tourCompleted: user.tourCompletedAt !== null,
    });

    response.cookies.set(AUTH_COOKIE, JSON.stringify(identity), {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("GOJAGS callback error:", error);
    return NextResponse.json({ error: "Gagal memproses login GOJAGS" }, { status: 500 });
  }
}
