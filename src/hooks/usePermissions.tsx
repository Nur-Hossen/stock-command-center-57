import { type ReactNode } from "react";
import { useRole } from "@/hooks/useRole";
import type { PermissionAction } from "@/lib/roles";

export type { PermissionAction };

export function usePermissions() {
  const { hasPermission } = useRole();
  const can = (action: PermissionAction): boolean => hasPermission(action);
  return { can };
}

interface PermissionGateProps {
  permission: PermissionAction;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGate({ permission, fallback = null, children }: PermissionGateProps) {
  const { can } = usePermissions();
  return can(permission) ? <>{children}</> : <>{fallback}</>;
}
