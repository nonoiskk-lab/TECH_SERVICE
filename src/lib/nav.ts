import type { Role } from "./constants";

// Icons are resolved client-side (see app-shell/sidebar.tsx) from the string
// key below — a server component (the (app) layout) computes this nav list
// and passes it to the client Sidebar, and React Server Components cannot
// serialize component/function references across that boundary.
export type NavIconKey =
  | "dashboard"
  | "jobs"
  | "customers"
  | "inventory"
  | "suppliers"
  | "purchases"
  | "payments"
  | "reports"
  | "notifications"
  | "users"
  | "audit-log"
  | "settings";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIconKey;
  roles: Role[];
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard", roles: ["ADMIN", "SERVICE_MANAGER", "TECHNICIAN", "FRONT_DESK"] },
  { href: "/jobs", label: "Service Jobs", icon: "jobs", roles: ["ADMIN", "SERVICE_MANAGER", "TECHNICIAN", "FRONT_DESK"] },
  { href: "/customers", label: "Customers", icon: "customers", roles: ["ADMIN", "SERVICE_MANAGER", "FRONT_DESK"] },
  { href: "/inventory", label: "Inventory", icon: "inventory", roles: ["ADMIN", "SERVICE_MANAGER", "TECHNICIAN"] },
  { href: "/suppliers", label: "Suppliers", icon: "suppliers", roles: ["ADMIN", "SERVICE_MANAGER"] },
  { href: "/purchases", label: "Purchases", icon: "purchases", roles: ["ADMIN", "SERVICE_MANAGER"] },
  { href: "/payments", label: "Payments", icon: "payments", roles: ["ADMIN", "SERVICE_MANAGER", "FRONT_DESK"] },
  { href: "/reports", label: "Reports", icon: "reports", roles: ["ADMIN", "SERVICE_MANAGER"] },
  { href: "/notifications", label: "Notifications", icon: "notifications", roles: ["ADMIN", "SERVICE_MANAGER", "TECHNICIAN", "FRONT_DESK"] },
];

export const SETTINGS_NAV_ITEMS: NavItem[] = [
  { href: "/users", label: "Team & Roles", icon: "users", roles: ["ADMIN"] },
  { href: "/audit-log", label: "Audit Log", icon: "audit-log", roles: ["ADMIN"] },
  { href: "/settings", label: "Settings", icon: "settings", roles: ["ADMIN"] },
];

export function navForRole(role: Role) {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function settingsNavForRole(role: Role) {
  return SETTINGS_NAV_ITEMS.filter((item) => item.roles.includes(role));
}
