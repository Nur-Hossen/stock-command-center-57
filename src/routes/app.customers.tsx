import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { CustomersTable } from "@/components/customers/CustomersTable";
import { usePermissions } from "@/hooks/usePermissions";
import { useCustomers } from "@/hooks/useInventoryData";
import { useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from "@/hooks/useInventoryMutations";
import type { Customer } from "@/types/inventory";

export const Route = createFileRoute("/app/customers")({
  component: CustomersPage,
  head: () => ({ meta: [{ title: "Customers — Stackwise" }] }),
});

function CustomersPage() {
  const { can } = usePermissions();
  const { data: customers } = useCustomers();
  const createC = useCreateCustomer();
  const updateC = useUpdateCustomer();
  const deleteC = useDeleteCustomer();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<{
    name: string;
    email: string;
    phone: string;
    address: string;
    notes: string;
    type: "retail" | "dealer";
  }>({ name: "", email: "", phone: "", address: "", notes: "", type: "retail" });
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  useEffect(() => {
    if (sheetOpen) {
      setForm(
        editing
          ? {
              name: editing.name,
              email: editing.email,
              phone: editing.phone,
              address: editing.address,
              notes: editing.notes,
              type: editing.type,
            }
          : { name: "", email: "", phone: "", address: "", notes: "", type: "retail" },
      );
    }
  }, [sheetOpen, editing]);

  const canManage = can("manage_customers");

  function openCreate() {
    setEditing(null);
    setSheetOpen(true);
  }

  function openEdit(c: Customer) {
    setEditing(c);
    setSheetOpen(true);
  }

  function handleSave() {
    if (!form.phone.trim()) {
      toast.error("Phone is required");
      return;
    }
    if (editing) {
      updateC.mutate(
        { id: editing.id, updates: form },
        {
          onSuccess: () => {
            toast.success("Customer updated");
            setSheetOpen(false);
            setEditing(null);
          },
          onError: (e) => toast.error(e.message),
        },
      );
    } else {
      const now = new Date().toISOString();
      createC.mutate(
        { id: crypto.randomUUID(), ...form, balance: 0, createdAt: now, updatedAt: now },
        {
          onSuccess: () => {
            toast.success("Customer created");
            setSheetOpen(false);
          },
        },
      );
    }
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteC.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Customer deleted");
        setDeleteTarget(null);
      },
      onError: (e) => {
        toast.error(e.message);
        setDeleteTarget(null);
      },
    });
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground">
            {customers.length} customer{customers.length !== 1 && "s"}
          </p>
        </div>
        {canManage && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Customer
          </Button>
        )}
      </div>

      {customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers added yet"
          description="Add customers to track retail and dealer sales history."
          actionLabel={canManage ? "Add Customer" : undefined}
          onAction={canManage ? openCreate : undefined}
        />
      ) : (
        <CustomersTable
          customers={customers}
          onRowClick={(c) => {
            if (canManage) {
              openEdit(c);
            }
          }}
        />
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-[420px] overflow-y-auto">
          <SheetTitle>{editing ? "Edit Customer" : "New Customer"}</SheetTitle>
          <div className="mt-6 space-y-3">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Type *</label>
              <div className="mt-1 flex gap-2">
                {(["retail", "dealer"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`flex-1 rounded-md border px-3 py-2 text-sm capitalize ${
                      form.type === t
                        ? "border-primary bg-primary/10"
                        : "border-border"
                    }`}
                    onClick={() => setForm({ ...form, type: t })}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Address</label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={handleSave}>
                Save
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSheetOpen(false)}
              >
                Cancel
              </Button>
            </div>
            {editing && canManage && (
              <div className="pt-4 border-t border-border">
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => {
                    setSheetOpen(false);
                    setDeleteTarget(editing);
                  }}
                >
                  Delete Customer
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Customers with sales cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
