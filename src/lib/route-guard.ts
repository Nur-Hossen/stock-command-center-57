import type { PermissionAction } from "@/lib/roles";

/**
 * Maps route paths to the permission required to access them.
 * `null` = accessible to any signed-in role.
 * Missing entries default to admin-only (require `access_settings`).
 */
const ROUTE_PERMISSION: Record<string, PermissionAction | null> = {
  "/app/dashboard": null,
  "/app/catalog": null,
  "/app/requests": null,
  "/app/purchase-orders": null,
  "/app/locations": null,
  "/app/help": null,
  "/app/movements": "log_movement",
  "/app/suppliers": "manage_suppliers",
  "/app/analytics": "view_analytics",
  "/app/ai-insights": "view_analytics",
  "/app/customers": "manage_customers",
  "/app/sales": "view_sales",
  "/app/settings": "access_settings",
};

export function canAccessRoute(
  path: string,
  hasPermission: (p: PermissionAction) => boolean,
): boolean {
  if (!(path in ROUTE_PERMISSION)) return hasPermission("access_settings");
  const required = ROUTE_PERMISSION[path];
  if (required === null) return true;
  return hasPermission(required);
}
