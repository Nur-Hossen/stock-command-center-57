import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Shield, Lock } from "lucide-react";
import { toast } from "sonner";
import { useDemo } from "@/hooks/useDemo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  PERMISSION_CATALOG,
  ROLE_COLOR_PRESETS,
  type PermissionAction,
  type RoleDefinition,
} from "@/lib/roles";

interface DraftRole {
  id: string;
  name: string;
  description: string;
  color: string;
  permissions: PermissionAction[];
  isSystem: boolean;
  isNew: boolean;
}

function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `role-${Date.now()}`;
}

export function RoleManager() {
  const { demoStore, bumpVersion, version } = useDemo();
  const roles = useMemo<RoleDefinition[]>(() => demoStore?.getRoles() ?? [], [demoStore, version]);
  const users = useMemo(() => demoStore?.getUsers() ?? [], [demoStore, version]);
  const userCountByRole = useMemo(() => {
    const map = new Map<string, number>();
    for (const u of users) map.set(u.role, (map.get(u.role) ?? 0) + 1);
    return map;
  }, [users]);

  const [editing, setEditing] = useState<DraftRole | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoleDefinition | null>(null);

  const openNew = () => {
    setEditing({
      id: "",
      name: "",
      description: "",
      color: ROLE_COLOR_PRESETS[3].className,
      permissions: [],
      isSystem: false,
      isNew: true,
    });
  };

  const openEdit = (role: RoleDefinition) => {
    setEditing({
      id: role.id,
      name: role.name,
      description: role.description,
      color: role.color,
      permissions: [...role.permissions],
      isSystem: role.isSystem,
      isNew: false,
    });
  };

  const togglePerm = (p: PermissionAction) => {
    setEditing((prev) => prev ? {
      ...prev,
      permissions: prev.permissions.includes(p)
        ? prev.permissions.filter((x) => x !== p)
        : [...prev.permissions, p],
    } : prev);
  };

  const handleSave = () => {
    if (!editing || !demoStore) return;
    const name = editing.name.trim();
    if (!name) { toast.error("Name is required"); return; }

    if (editing.isNew) {
      const id = slugify(name);
      const result = demoStore.createRole({
        id,
        name,
        description: editing.description.trim(),
        color: editing.color,
        permissions: editing.permissions,
      });
      if ("error" in result) { toast.error(result.error); return; }
      toast.success(`Role "${name}" created`);
    } else {
      const result = demoStore.updateRole(editing.id, {
        name,
        description: editing.description.trim(),
        color: editing.color,
        permissions: editing.permissions,
      });
      if ("error" in result) { toast.error(result.error); return; }
      toast.success(`Role "${name}" updated`);
    }
    bumpVersion();
    setEditing(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget || !demoStore) return;
    const result = demoStore.deleteRole(deleteTarget.id);
    if ("error" in result) { toast.error(result.error); setDeleteTarget(null); return; }
    bumpVersion();
    toast.success(`Role "${deleteTarget.name}" deleted`);
    setDeleteTarget(null);
  };

  const groupedCatalog = useMemo(() => {
    const groups = new Map<string, typeof PERMISSION_CATALOG[number][]>();
    for (const p of PERMISSION_CATALOG) {
      const list = groups.get(p.group) ?? [];
      list.push(p);
      groups.set(p.group, list);
    }
    return Array.from(groups.entries());
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Define who can do what. System roles can be edited but not deleted.
          </p>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> New Role
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {roles.map((role) => {
          const inUse = userCountByRole.get(role.id) ?? 0;
          return (
            <div key={role.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge className={cn("text-xs", role.color)}>{role.name}</Badge>
                    {role.isSystem && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                        <Lock className="h-3 w-3" /> system
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
                    {role.description || "No description"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(role)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    disabled={role.isSystem || inUse > 0}
                    title={role.isSystem ? "System role" : inUse > 0 ? `${inUse} user(s) assigned` : "Delete role"}
                    onClick={() => setDeleteTarget(role)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  {role.permissions.length} permission{role.permissions.length === 1 ? "" : "s"}
                </span>
                <span>{inUse} user{inUse === 1 ? "" : "s"}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Editor dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.isNew ? "New Role" : `Edit ${editing?.name || "Role"}`}</DialogTitle>
            <DialogDescription>
              {editing?.isSystem
                ? "This is a system role. You can edit its permissions but not delete it."
                : "Set a name, color, and choose which actions this role can perform."}
            </DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="space-y-4 py-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    placeholder="e.g. Warehouse Auditor"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Badge color</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {ROLE_COLOR_PRESETS.map((c) => (
                      <button
                        key={c.className}
                        type="button"
                        onClick={() => setEditing({ ...editing, color: c.className })}
                        className={cn(
                          "h-7 rounded-md border px-2 text-[11px] transition-all",
                          c.className,
                          editing.color === c.className ? "ring-2 ring-primary ring-offset-1" : "border-transparent",
                        )}
                        aria-label={c.label}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="What can users with this role do?"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Permissions</Label>
                  <span className="text-xs text-muted-foreground">
                    {editing.permissions.length} of {PERMISSION_CATALOG.length} selected
                  </span>
                </div>
                <div className="space-y-3 rounded-md border border-border p-3">
                  {groupedCatalog.map(([group, perms]) => (
                    <div key={group}>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                        {group}
                      </p>
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        {perms.map((p) => {
                          const checked = editing.permissions.includes(p.key);
                          return (
                            <label
                              key={p.key}
                              className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted/50 cursor-pointer"
                            >
                              <Checkbox checked={checked} onCheckedChange={() => togglePerm(p.key)} />
                              <span>{p.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={handleSave}>{editing?.isNew ? "Create Role" : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete role "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Users assigned to this role must be reassigned first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
