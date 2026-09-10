import type { Role } from "./constants";

// Coarse-grained page/section access. Enforced both in middleware (route
// prefix guard) and defensively inside each server action / route handler —
// never trust the client alone (see AGENTS/security notes in README).
export const SECTION_ACCESS: Record<string, Role[]> = {
  "/dashboard": ["ADMIN", "SERVICE_MANAGER", "TECHNICIAN", "FRONT_DESK"],
  "/jobs": ["ADMIN", "SERVICE_MANAGER", "TECHNICIAN", "FRONT_DESK"],
  "/customers": ["ADMIN", "SERVICE_MANAGER", "FRONT_DESK"],
  "/inventory": ["ADMIN", "SERVICE_MANAGER", "TECHNICIAN"],
  "/suppliers": ["ADMIN", "SERVICE_MANAGER"],
  "/purchases": ["ADMIN", "SERVICE_MANAGER"],
  "/payments": ["ADMIN", "SERVICE_MANAGER", "FRONT_DESK"],
  "/reports": ["ADMIN", "SERVICE_MANAGER"],
  "/notifications": ["ADMIN", "SERVICE_MANAGER", "TECHNICIAN", "FRONT_DESK"],
  "/settings": ["ADMIN"],
  "/users": ["ADMIN"],
  "/audit-log": ["ADMIN"],
};

export function canAccessSection(role: Role, pathname: string): boolean {
  const match = Object.keys(SECTION_ACCESS)
    .filter((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"))
    .sort((a, b) => b.length - a.length)[0];
  if (!match) return true; // unlisted routes (dashboard root, status pages) are open to any authenticated staff
  return SECTION_ACCESS[match].includes(role);
}

export function canSeeFinancials(role: Role): boolean {
  return role === "ADMIN" || role === "SERVICE_MANAGER" || role === "FRONT_DESK";
}

export function canManageUsers(role: Role): boolean {
  return role === "ADMIN";
}

export function canManageSettings(role: Role): boolean {
  return role === "ADMIN";
}

export function canApproveEstimate(role: Role): boolean {
  return role === "ADMIN" || role === "SERVICE_MANAGER" || role === "FRONT_DESK";
}

export function canDeleteRecords(role: Role): boolean {
  return role === "ADMIN";
}
