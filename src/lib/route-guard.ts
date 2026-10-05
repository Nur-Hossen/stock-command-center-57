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
  "/app/pos": "open_pos",
  "/app/warranty": "check_warranty",
  "/app/warranty/claims": "manage_warranty_claims",
  "/app/services": null,
  "/app/services/new": null,
  "/app/settings": "access_settings",
};

export function canAccessRoute(
  path: string,
  hasPermission: (p: PermissionAction) => boolean,
): boolean {
  // Exact match first, then walk up segments so dynamic children
  // (e.g. /app/services/<id>) inherit their parent route's permission.
  let p: string = path;
  while (p.length > 1) {
    if (p in ROUTE_PERMISSION) {
      const required = ROUTE_PERMISSION[p];
      return required === null ? true : hasPermission(required);
    }
    const idx = p.lastIndexOf("/");
    if (idx <= 0) break;
    p = p.slice(0, idx);
  }
  return hasPermission("access_settings");
}
