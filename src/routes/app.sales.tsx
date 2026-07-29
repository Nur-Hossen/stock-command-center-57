import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Receipt, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/EmptyState";
import { QuickCustomerDialog } from "@/components/customers/QuickCustomerDialog";
import { usePermissions } from "@/hooks/usePermissions";
import { useCustomers, useSales, useUnits, useItems } from "@/hooks/useInventoryData";
import { useCreateSale, useRefundSale } from "@/hooks/useInventoryMutations";
import { useDemo } from "@/hooks/useDemo";

export const Route = createFileRoute("/app/sales")({
  component: SalesPage,
  head: () => ({ meta: [{ title: "Sales orders — Stackwise" }] }),
});

function SalesPage() {
  const { can } = usePermissions();
  const { data: sales } = useSales();
  const { data: customers } = useCustomers();
  const { data: units } = useUnits();
  const { data: items } = useItems();
  const createSale = useCreateSale();
  const refundSale = useRefundSale();
  const { demoStore } = useDemo();

  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [unitPrices, setUnitPrices] = useState<Record<string, number>>({});
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);

  const canManage = can("manage_sales");

  const inStockUnits = useMemo(() => units.filter((u) => u.status === "in_stock"), [units]);
  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const sortedCustomers = useMemo(
    () =>
      [...customers].sort((a, b) =>
        a.type === b.type ? a.phone.localeCompare(b.phone) : a.type.localeCompare(b.type),
      ),
    [customers],
  );

  const walkInId = useMemo(
    () => customers.find((c) => c.name.toLowerCase().includes("walk-in"))?.id ?? "",
    [customers],
  );

  useEffect(() => {
    if (open && !customerId && walkInId) setCustomerId(walkInId);
  }, [open, customerId, walkInId]);

  const resetForm = () => { setCustomerId(walkInId); setSelectedUnitIds([]); setUnitPrices({}); };

  const submit = () => {
    createSale.mutate({
      customerId,
      soldBy: "demo-user",
      lineItems: selectedUnitIds.map((id) => ({
        itemUnitId: id,
        unitPrice: unitPrices[id] ?? itemById.get(units.find((u) => u.id === id)?.itemId ?? "")?.sellingPrice ?? 0,
      })),
    }, {
      onSuccess: () => { toast.success("Sale recorded"); setOpen(false); resetForm(); },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sales orders</h1>
          <p className="text-sm text-muted-foreground">{sales.length} order{sales.length !== 1 && "s"}</p>
        </div>
        {canManage && (
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> New sales order
          </Button>
        )}
      </div>

      {sales.length === 0 ? (
        <EmptyState icon={Receipt} title="No sales yet" description="Record your first sale of a serialized unit." />
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {sales.map((s) => (
            <div key={s.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{s.saleNumber}</span>
                    <Badge variant={s.status === "refunded" ? "destructive" : "secondary"}>{s.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {customerById.get(s.customerId)?.name ?? "Unknown"} · {new Date(s.soldAt).toLocaleString()} · ${s.total.toFixed(2)}
                  </div>
                </div>
                {canManage && s.status !== "refunded" && (
                  <Button size="sm" variant="outline" onClick={() =>
                    refundSale.mutate(s.id, {
                      onSuccess: () => toast.success("Sale refunded — units returned to stock"),
                      onError: (e) => toast.error(e.message),
                    })
                  }>
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Refund
                  </Button>
                )}
              </div>
              <div className="mt-2 space-y-1">
                {s.items.map((li) => {
                  const item = itemById.get(li.itemId);
                  const unit = demoStore?.getUnitById(li.itemUnitId);
                  const warrantyStatus = unit?.warrantyExpiresAt
                    ? new Date(unit.warrantyExpiresAt) > new Date() ? `Warranty until ${new Date(unit.warrantyExpiresAt).toLocaleDateString()}` : "Warranty expired"
                    : "";
                  return (
                    <div key={li.id} className="text-xs text-muted-foreground">
                      • {item?.name ?? "Item"} — SN <span className="font-mono">{li.serialNumber}</span> · ${li.unitPrice.toFixed(2)} · {warrantyStatus}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
        <SheetContent className="w-full sm:max-w-[520px] overflow-y-auto">
          <SheetTitle>New sales order</SheetTitle>
          {inStockUnits.length === 0 && (
            <p className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-200">
              No serialized units in stock. Receive a purchase order or reset the demo data (Settings → System) to add stock.
            </p>
          )}
          <div className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-medium">Customer *</label>
              <div className="flex gap-2">
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {sortedCustomers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}{c.phone ? ` · ${c.phone}` : ""} — {c.type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Add new customer"
                  onClick={() => setNewCustomerOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Select units to sell</label>
              <div className="mt-1 max-h-[320px] overflow-y-auto rounded-md border border-border divide-y divide-border">
                {inStockUnits.length === 0 && <div className="p-3 text-xs text-muted-foreground">No serialized units in stock.</div>}
                {inStockUnits.map((u) => {
                  const item = itemById.get(u.itemId);
                  const selected = selectedUnitIds.includes(u.id);
                  return (
                    <label key={u.id} className="flex items-center gap-2 p-2 text-sm">
                      <input type="checkbox" checked={selected}
                        onChange={(e) => setSelectedUnitIds((prev) =>
                          e.target.checked ? [...prev, u.id] : prev.filter((id) => id !== u.id),
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{item?.name ?? "Item"} — <span className="font-mono">{u.serialNumber}</span></div>
                      </div>
                      {selected && (
                        <Input type="number" step="0.01" className="h-8 w-24"
                          value={unitPrices[u.id] ?? item?.sellingPrice ?? 0}
                          onChange={(e) => setUnitPrices({ ...unitPrices, [u.id]: Number(e.target.value) })}
                        />
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={submit} disabled={!customerId || selectedUnitIds.length === 0}>Record Sale</Button>
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
