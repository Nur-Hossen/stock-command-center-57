import { createContext, useMemo, useState, type ReactNode } from "react";
import { useDemo } from "@/hooks/useDemo";
import {
  BUILTIN_ROLES,
  derivePermissions,
  type PermissionAction,
  type RoleDefinition,
  type RolePermissions,
  type UserRoleType,
} from "@/lib/roles";

export interface RoleContextValue {
  role: UserRoleType;
  roleDefinition: RoleDefinition;
  roles: RoleDefinition[];
  permissions: RolePermissions;
  hasPermission: (p: PermissionAction) => boolean;
  isAdmin: boolean;
  isManager: boolean;
  isRequestor: boolean;
  /** Demo-only: override the current role by id */
  setDemoRole: (role: UserRoleType) => void;
}

export const RoleContext = createContext<RoleContextValue | null>(null);

const FALLBACK_REQUESTOR = BUILTIN_ROLES.find((r) => r.id === "requestor")!;

export function RoleProvider({ children }: { children: ReactNode }) {
  const { isDemo, demoStore, version } = useDemo();
  const [demoRole, setDemoRole] = useState<UserRoleType>("admin");

  const value = useMemo<RoleContextValue>(() => {
    const roles: RoleDefinition[] = isDemo && demoStore ? demoStore.getRoles() : BUILTIN_ROLES;
    const currentId: UserRoleType = isDemo ? demoRole : "requestor";
    const roleDefinition =
      roles.find((r) => r.id === currentId) ?? roles[0] ?? FALLBACK_REQUESTOR;

    const permissions = derivePermissions(roleDefinition.permissions);
    const hasPermission = (p: PermissionAction) => roleDefinition.permissions.includes(p);

    return {
      role: roleDefinition.id,
      roleDefinition,
      roles,
      permissions,
      hasPermission,
      isAdmin: roleDefinition.id === "admin",
      isManager: roleDefinition.id === "manager",
      isRequestor: roleDefinition.id === "requestor",
      setDemoRole,
    };
    // version bumps whenever the demoStore roles/users change
  }, [isDemo, demoStore, demoRole, version]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}
