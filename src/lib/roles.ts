// ─── Permission catalog ────────────────────────────────
export const PERMISSION_CATALOG = [
  { key: "create_item", label: "Create items", group: "Catalog" },
  { key: "edit_item", label: "Edit items", group: "Catalog" },
  { key: "delete_item", label: "Delete items", group: "Catalog" },
  { key: "manage_brands", label: "Manage brands", group: "Catalog" },
  { key: "manage_units", label: "Manage serial units", group: "Catalog" },
  { key: "log_movement", label: "Log stock movements", group: "Operations" },
  { key: "create_po", label: "Create purchase orders", group: "Procurement" },
  { key: "manage_suppliers", label: "Manage suppliers", group: "Procurement" },
  { key: "manage_customers", label: "Manage customers", group: "Sales" },
  { key: "view_sales", label: "View sales", group: "Sales" },
  { key: "manage_sales", label: "Create & manage sales", group: "Sales" },
  { key: "create_request", label: "Create requests", group: "Requests" },
  { key: "approve_request", label: "Approve requests", group: "Requests" },
  { key: "view_analytics", label: "View analytics", group: "Insights" },
  { key: "export_data", label: "Export data", group: "Data" },
  { key: "manage_users", label: "Manage users", group: "Admin" },
  { key: "access_settings", label: "Access settings", group: "Admin" },
] as const;

export type PermissionAction = typeof PERMISSION_CATALOG[number]["key"];
export const ALL_PERMISSIONS: PermissionAction[] = PERMISSION_CATALOG.map((p) => p.key);

/** Role id is a free-form string to support custom roles. */
export type UserRoleType = string;

export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  /** Tailwind badge classes (bg + text) */
  color: string;
  permissions: PermissionAction[];
  /** System roles cannot be deleted; their id/isSystem cannot change. */
  isSystem: boolean;
}

/** Legacy shape kept so Sidebar / older gates keep working. */
export interface RolePermissions {
  canManageItems: boolean;
  canLogMovements: boolean;
  canManagePOs: boolean;
  canManageSuppliers: boolean;
  canApproveRequests: boolean;
  canViewAnalytics: boolean;
  canAccessSettings: boolean;
  canManageUsers: boolean;
}

export function derivePermissions(perms: readonly PermissionAction[]): RolePermissions {
  const has = (p: PermissionAction) => perms.includes(p);
  return {
    canManageItems: has("create_item") || has("edit_item") || has("delete_item"),
    canLogMovements: has("log_movement"),
    canManagePOs: has("create_po"),
    canManageSuppliers: has("manage_suppliers"),
    canApproveRequests: has("approve_request"),
    canViewAnalytics: has("view_analytics"),
    canAccessSettings: has("access_settings"),
    canManageUsers: has("manage_users"),
  };
}

export const BUILTIN_ROLES: RoleDefinition[] = [
  {
    id: "admin",
    name: "Admin",
    description: "Full access to every feature and setting.",
    color: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
    permissions: [...ALL_PERMISSIONS],
    isSystem: true,
  },
  {
    id: "manager",
    name: "Inventory Manager",
    description: "Manage stock, procurement and requests.",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    permissions: [
      "create_item", "edit_item", "delete_item",
      "log_movement", "create_po", "manage_suppliers",
      "create_request", "approve_request",
      "view_analytics", "export_data",
    ],
    isSystem: true,
  },
  {
    id: "requestor",
    name: "Requestor",
    description: "Submit inventory requests only.",
    color: "bg-muted text-muted-foreground",
    permissions: ["create_request"],
    isSystem: true,
  },
];

/** Legacy helper — resolves an id against builtins. Custom roles are resolved via DemoStore. */
export function getPermissionsForRole(roleId: UserRoleType): RolePermissions {
  const def = BUILTIN_ROLES.find((r) => r.id === roleId);
  return derivePermissions(def?.permissions ?? []);
}

/** Predefined color swatches offered in the role editor. */
export const ROLE_COLOR_PRESETS: { label: string; className: string }[] = [
  { label: "Teal", className: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200" },
  { label: "Amber", className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
  { label: "Slate", className: "bg-muted text-muted-foreground" },
  { label: "Blue", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  { label: "Purple", className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  { label: "Rose", className: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200" },
  { label: "Emerald", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" },
  { label: "Sky", className: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200" },
];
