type ClientIdentity = {
  role?: string | null;
  permissions?: string[] | null;
} | null | undefined;

export function isAdminIdentity(identity: ClientIdentity) {
  return identity?.role?.toLowerCase() === "admin";
}

export function hasClientPermission(identity: ClientIdentity, permission: string) {
  if (isAdminIdentity(identity)) {
    return true;
  }

  return Boolean(identity?.permissions?.includes(permission));
}
