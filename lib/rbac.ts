export type AppRole = "admin" | "vendor" | "crew";

export function hasRequiredRole(
  userRole: string | undefined,
  allowedRoles: AppRole[],
) {
  if (!userRole) return false;
  return allowedRoles.includes(userRole as AppRole);
}
