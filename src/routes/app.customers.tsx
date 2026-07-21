import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { usePermissions } from "@/hooks/usePermissions";
import { useCustomers, useSales } from "@/hooks/useInventoryData";
import { useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from "@/hooks/useInventoryMutations";
import type { Customer } from "@/types/inventory";

export const Route = createFileRoute("/app/customers")({
  component: CustomersPage,
  head: () => ({ meta: [{ title: "Customers — Stackwise" }] }),
});

function CustomersPage() {
  const { can } = usePermissions();
  const { data: customers } = useCustomers();
  const { data: sales } = useSales();
  const createC = useCreateCustomer();
  const updateC = useUpdateCustomer();
  const deleteC = useDeleteCustomer();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", notes: "" });
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (sheetOpen) {
      setForm(editing
        ? { name: editing.name, email: editing.email, phone: editing.phone, address: editing.address, notes: editing.notes }
        : { name: "", email: "", phone: "", address: "", notes: "" });
    }
  }, [sheetOpen, editing]);

  const canManage = can("manage_customers");

  const salesCount = new Map<string, number>();
  sales.forEach((s) => salesCount.set(s.customerId, (salesCount.get(s.customerId) ?? 0) + 1));

  const filtered = customers.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSave = () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (editing) {
      updateC.mutate({ id: editing.id, updates: form }, {
        onSuccess: () => { toast.success("Customer updated"); setSheetOpen(false); setEditing(null); },
        onError: (e) => toast.error(e.message),
      });
    } else {
      const now = new Date().toISOString();
      createC.mutate({ id: crypto.randomUUID(), ...form, createdAt: now, updatedAt: now }, {
        onSuccess: () => { toast.success("Customer created"); setSheetOpen(false); },
      });
    }
  };

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="text-sm text-muted-foreground">{customers.length} customer{customers.length !== 1 && "s"}</p>
        </div>
        {canManage && (
          <Button onClick={() => { setEditing(null); setSheetOpen(true); }}>
            <Plus className="mr-1.5 h-4 w-4" /> New Customer
          </Button>
        )}
      </div>

      <Input placeholder="Search customers…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No customers" description="Add your first customer to start tracking sales." />
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {filtered.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {c.email || "—"} · {c.phone || "—"} · {salesCount.get(c.id) ?? 0} sale{(salesCount.get(c.id) ?? 0) !== 1 && "s"}
                </div>
              </div>
              {canManage && (
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditing(c); setSheetOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(c)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-[420px] overflow-y-auto">
          <SheetTitle>{editing ? "Edit Customer" : "New Customer"}</SheetTitle>
          <div className="mt-6 space-y-3">
            <div><label className="text-sm font-medium">Name *</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="text-sm font-medium">Email</label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><label className="text-sm font-medium">Phone</label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label className="text-sm font-medium">Address</label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div><label className="text-sm font-medium">Notes</label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={handleSave}>Save</Button>
              <Button variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>Cancel</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone. Customers with sales cannot be deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteC.mutate(deleteTarget.id, {
                onSuccess: () => { toast.success("Customer deleted"); setDeleteTarget(null); },
                onError: (e) => { toast.error(e.message); setDeleteTarget(null); },
              })}
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
