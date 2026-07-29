import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Trash2, ScanLine, Printer, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { usePermissions } from "@/hooks/usePermissions";
import { useCustomers, useItems, useUnits } from "@/hooks/useInventoryData";
import { useCreatePosSale, useUnitByScan, useSalesSettings, usePeekDocumentNumber } from "@/hooks/usePosData";
import { InvoicePrint } from "@/components/pos/InvoicePrint";
import { QuickCustomerDialog } from "@/components/customers/QuickCustomerDialog";
import type { Sale, SaleChannel } from "@/types/inventory";

export const Route = createFileRoute("/app/pos")({
  component: PosPage,
  head: () => ({
    meta: [
      { title: "POS — Stackwise" },
      { name: "description", content: "Point-of-sale for retail and dealer channels with serial scanning and warranty tracking." },
      { property: "og:title", content: "POS — Stackwise" },
      { property: "og:description", content: "Point-of-sale for retail and dealer channels." },
    ],
  }),
});

interface CartLine {
  itemUnitId: string;
  itemId: string;
  serialNumber: string;
  itemName: string;
  unitPrice: number;
  lineDiscount: number;
}

function PosPage() {
  const { can } = usePermissions();
  const { data: customers } = useCustomers();
  const { data: items } = useItems();
  const { data: allUnits } = useUnits();
  const findUnit = useUnitByScan();
  const createSale = useCreatePosSale();
  const settings = useSalesSettings();

  const [channel, setChannel] = useState<SaleChannel>("retail");
  const [customerId, setCustomerId] = useState("");
  const [scan, setScan] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [grossDiscount, setGrossDiscount] = useState(0);
  const [amountPaid, setAmountPaid] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const scanRef = useRef<HTMLInputElement>(null);
  const nextDoc = usePeekDocumentNumber(channel);

  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const filteredCustomers = useMemo(
    () => customers.filter((c) => c.type === channel),
    [customers, channel],
  );

  const canDiscount = can("apply_discount");

  const subtotal = cart.reduce((s, l) => s + l.unitPrice, 0);
  const lineDiscountTotal = cart.reduce((s, l) => s + l.lineDiscount, 0);
  const afterDiscount = Math.max(0, subtotal - lineDiscountTotal - grossDiscount);
  const tax = Math.round(afterDiscount * settings.defaultTaxRate * 100) / 100;
  const total = Math.round((afterDiscount + tax) * 100) / 100;

  const suggestions = useMemo(() => {
    const q = scan.trim().toLowerCase();
    if (!q) return [];
    const inCart = new Set(cart.map((l) => l.itemUnitId));
    return allUnits
      .filter((u) => u.status === "in_stock" && !inCart.has(u.id))
      .map((u) => ({ unit: u, item: itemById.get(u.itemId) }))
      .filter(({ unit, item }) =>
        unit.serialNumber.toLowerCase().includes(q) ||
        item?.name.toLowerCase().includes(q) ||
        item?.sku.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [scan, allUnits, itemById, cart]);

  const addUnitToCart = (unitId: string) => {
    const unit = allUnits.find((u) => u.id === unitId);
    if (!unit) { toast.error(`Invalid or Already Sold: ${scan}`); setScan(""); return; }
    if (unit.status !== "in_stock") { toast.error(`Invalid or Already Sold: ${unit.serialNumber}`); setScan(""); return; }
    if (cart.some((l) => l.itemUnitId === unit.id)) { toast.error("Already in cart"); setScan(""); return; }
    const item = itemById.get(unit.itemId);
    setCart([...cart, {
      itemUnitId: unit.id,
      itemId: unit.itemId,
      serialNumber: unit.serialNumber,
      itemName: item?.name ?? "Item",
      unitPrice: item?.sellingPrice ?? 0,
      lineDiscount: 0,
    }]);
    setScan("");
    scanRef.current?.focus();
  };

  const handleScan = () => {
    const code = scan.trim();
    if (!code) return;
    const unit = findUnit(code);
    if (unit) { addUnitToCart(unit.id); return; }
    if (suggestions.length === 1) { addUnitToCart(suggestions[0].unit.id); return; }
    toast.error(`Invalid or Already Sold: ${code}`);
    setScan("");
  };

  const removeLine = (id: string) => setCart(cart.filter((l) => l.itemUnitId !== id));
  const patchLine = (id: string, patch: Partial<CartLine>) =>
    setCart(cart.map((l) => (l.itemUnitId === id ? { ...l, ...patch } : l)));

  const resetAll = () => {
    setCart([]); setCustomerId(""); setGrossDiscount(0); setAmountPaid(""); setNotes(""); setScan("");
  };

  const confirm = () => {
    try {
      const sale = createSale({
        channel,
        customerId,
        soldBy: "demo-user",
        lineItems: cart.map((l) => ({
          itemUnitId: l.itemUnitId,
          unitPrice: l.unitPrice,
          lineDiscount: l.lineDiscount,
        })),
        grossDiscount,
        amountPaid: amountPaid === "" ? total : Number(amountPaid),
        notes,
      });
      toast.success(`Sale recorded: ${sale.documentNumber}`);
      setLastSale(sale);
      resetAll();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (lastSale) {
    return (
      <div className="mx-auto max-w-[900px] space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Sale complete</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-1.5 h-4 w-4" /> Print
            </Button>
            <Button onClick={() => setLastSale(null)}>New Sale</Button>
          </div>
        </div>
        <InvoicePrint sale={lastSale} customer={customers.find((c) => c.id === lastSale.customerId)} items={items} businessName={settings.businessName} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Point of Sale</h1>
        <Badge variant="secondary">Next: {nextDoc}</Badge>
      </div>

      <div className="grid gap-3 rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-md border border-border p-1">
            {(["retail", "dealer"] as const).map((c) => (
              <button key={c} type="button"
                className={`rounded px-3 py-1.5 text-sm capitalize ${channel === c ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                onClick={() => { setChannel(c); setCustomerId(""); }}
              >{c}</button>
            ))}
          </div>
          <div className="min-w-[220px] flex-1">
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder={`Select ${channel} customer`} /></SelectTrigger>
              <SelectContent>
                {filteredCustomers.length === 0 && <div className="p-2 text-xs text-muted-foreground">No {channel} customers</div>}
                {filteredCustomers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}{c.type === "dealer" && c.balance > 0 ? ` — balance $${c.balance.toFixed(2)}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <ScanLine className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input ref={scanRef} autoFocus placeholder="Scan serial, or search by item name / SKU / serial"
              className="pl-8"
              value={scan}
              onChange={(e) => setScan(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleScan(); } }}
            />
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-md border border-border bg-popover shadow-lg">
                {suggestions.map(({ unit, item }) => (
                  <button
                    key={unit.id}
                    type="button"
                    className="flex w-full items-center justify-between gap-2 border-b border-border px-3 py-2 text-left text-sm hover:bg-accent last:border-0"
                    onClick={() => addUnitToCart(unit.id)}
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{item?.name ?? "Item"}</div>
                      <div className="font-mono text-xs text-muted-foreground">{unit.serialNumber}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">${(item?.sellingPrice ?? 0).toFixed(2)}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button onClick={handleScan}>Add</Button>
        </div>
      </div>


      <div className="rounded-lg border border-border">
        <div className="grid grid-cols-[1fr_120px_120px_40px] gap-2 border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
          <div>Item / Serial</div>
          <div className="text-right">Price</div>
          <div className="text-right">Discount</div>
          <div />
        </div>
        {cart.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Scan a serial to add it to the cart.</div>
        ) : cart.map((l) => (
          <div key={l.itemUnitId} className="grid grid-cols-[1fr_120px_120px_40px] items-center gap-2 border-b border-border px-3 py-2 text-sm last:border-0">
            <div className="min-w-0">
              <div className="truncate font-medium">{l.itemName}</div>
              <div className="font-mono text-xs text-muted-foreground">{l.serialNumber}</div>
            </div>
            <Input type="number" step="0.01" className="h-8 text-right"
              value={l.unitPrice}
              onChange={(e) => patchLine(l.itemUnitId, { unitPrice: Number(e.target.value) || 0 })}
            />
            <Input type="number" step="0.01" className="h-8 text-right"
              disabled={!canDiscount}
              value={l.lineDiscount}
              onChange={(e) => patchLine(l.itemUnitId, { lineDiscount: Math.max(0, Number(e.target.value) || 0) })}
            />
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeLine(l.itemUnitId)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <div className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between text-muted-foreground"><span>Line discounts</span><span>−${lineDiscountTotal.toFixed(2)}</span></div>
          <div className="flex items-center justify-between">
            <span>Gross discount</span>
            <Input type="number" step="0.01" className="h-8 w-28 text-right"
              disabled={!canDiscount}
              value={grossDiscount}
              onChange={(e) => setGrossDiscount(Math.max(0, Number(e.target.value) || 0))}
            />
          </div>
          <div className="flex justify-between text-muted-foreground"><span>Tax ({(settings.defaultTaxRate * 100).toFixed(1)}%)</span><span>${tax.toFixed(2)}</span></div>
          <div className="flex justify-between border-t border-border pt-2 text-base font-semibold"><span>Total</span><span>${total.toFixed(2)}</span></div>
          <div className="flex items-center justify-between">
            <span>Amount paid</span>
            <Input type="number" step="0.01" className="h-8 w-28 text-right"
              placeholder={total.toFixed(2)}
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
          {channel === "dealer" && amountPaid !== "" && Number(amountPaid) < total && (
            <div className="flex justify-between text-xs text-amber-600 dark:text-amber-400">
              <span>Dealer credit</span><span>+${(total - Number(amountPaid)).toFixed(2)}</span>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Notes</label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          <Button className="w-full" size="lg"
            disabled={!customerId || cart.length === 0}
            onClick={confirm}
          >
            Confirm {channel === "dealer" ? "Challan" : "Invoice"}
          </Button>
        </div>
      </div>
    </div>
  );
}
