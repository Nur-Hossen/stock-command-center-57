import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAddServiceItem, useRemoveServiceItem, useUpdateService } from "@/hooks/useInventoryMutations";
import { serviceTotals } from "@/lib/service-logic";
import type { Service } from "@/types/inventory";

function Line({ label, value, strong, danger }: { label: string; value: string; strong?: boolean; danger?: boolean }) {
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono ${strong ? "font-semibold" : ""} ${danger ? "text-destructive" : ""}`}>{value}</span>
    </div>
  );
}

export function ServiceBillingCard({ service }: { service: Service }) {
  const addItem = useAddServiceItem();
  const removeItem = useRemoveServiceItem();
  const update = useUpdateService();
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");
  const locked = service.status === "delivered";
  const isNonPaid = service.serviceType === "non_paid";
  const totals = serviceTotals(service);
  const err = (e: Error) => toast.error(e.message);

  const add = () => {
    addItem.mutate(
      { serviceId: service.id, name, quantity: Number(qty), unitPrice: Number(price) },
      { onSuccess: () => { setName(""); setQty("1"); setPrice(""); toast.success("Part added"); }, onError: err },
    );
  };

  const saveNum = (field: "serviceCharge" | "discount" | "vatTax", raw: string) => {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) { toast.error("Enter a valid non-negative amount"); return; }
    if (n === service[field]) return;
    update.mutate({ id: service.id, updates: { [field]: n } }, { onError: err });
  };

  const numField = (field: "serviceCharge" | "discount" | "vatTax", label: string, disabled = false) => (
    <div className="flex items-center justify-between gap-3 py-1">
      <label className="text-sm text-muted-foreground" htmlFor={`bill-${field}`}>{label}</label>
      <Input
        id={`bill-${field}`}
        key={`${field}-${service[field]}`}
        type="number" min={0} step="0.01"
        defaultValue={service[field]}
        disabled={locked || disabled}
        onBlur={(e) => saveNum(field, e.target.value)}
        className="h-8 w-28 text-right font-mono"
      />
    </div>
  );

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="mb-3 text-sm font-semibold">Billing</h2>
      <table className="mb-3 w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <th className="py-1.5">Part</th><th className="py-1.5 text-right">Qty</th>
            <th className="py-1.5 text-right">Price</th><th className="py-1.5 text-right">Total</th><th />
          </tr>
        </thead>
        <tbody>
          {service.items.length === 0 && (
            <tr><td colSpan={5} className="py-3 text-center text-muted-foreground">No parts added</td></tr>
          )}
          {service.items.map((i) => (
            <tr key={i.id} className="border-b border-border/50">
              <td className="py-1.5">{i.name}</td>
              <td className="py-1.5 text-right">{i.quantity}</td>
              <td className="py-1.5 text-right font-mono">${i.unitPrice.toFixed(2)}</td>
              <td className="py-1.5 text-right font-mono">${i.total.toFixed(2)}</td>
              <td className="w-8 text-right">
                {!locked && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Remove ${i.name}`}
                    onClick={() => removeItem.mutate({ serviceId: service.id, itemId: i.id }, { onError: err })}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {!locked && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Input placeholder="Part name" value={name} onChange={(e) => setName(e.target.value)} className="h-8 min-w-[160px] flex-1" />
          <Input type="number" min={1} aria-label="Quantity" value={qty} onChange={(e) => setQty(e.target.value)} className="h-8 w-20" />
          <Input type="number" min={0} step="0.01" placeholder="Unit price" value={price} onChange={(e) => setPrice(e.target.value)} className="h-8 w-28" />
          <Button size="sm" onClick={add} disabled={!name.trim() || !price}>Add part</Button>
        </div>
      )}

      <div className="border-t border-border pt-2">
        <Line label="Parts" value={`$${totals.partsCharge.toFixed(2)}`} />
        {numField("serviceCharge", isNonPaid ? "Service charge (n/a — warranty)" : "Service charge", isNonPaid)}
        {numField("discount", "Discount")}
        {numField("vatTax", "VAT / tax")}
        <div className="mt-1 border-t border-border pt-1">
          <Line label="Net amount" value={`$${totals.netAmount.toFixed(2)}`} strong />
          <Line label="Paid" value={`$${totals.totalPaid.toFixed(2)}`} />
          <Line label="Due" value={`$${totals.dueAmount.toFixed(2)}`} danger={totals.dueAmount > 0} />
        </div>
      </div>
    </section>
  );
}
