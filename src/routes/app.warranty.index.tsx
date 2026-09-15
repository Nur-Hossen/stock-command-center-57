import { DeliveryFields } from "@/components/shared/DeliveryFields";
import { ConfirmAction } from "@/components/shared/ConfirmAction";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { EMPTY_DELIVERY } from "@/types/inventory";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ScanLine, ShieldCheck, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useUnitByScan, useCreateWarrantyClaim } from "@/hooks/usePosData";
import { useDemo } from "@/hooks/useDemo";
import type { ItemUnit } from "@/types/inventory";

export const Route = createFileRoute("/app/warranty/")({
  component: WarrantyCheckPage,
  head: () => ({
    meta: [
      { title: "Warranty Check — Stackwise" },
      { name: "description", content: "Look up the warranty status of any serial number." },
      { property: "og:title", content: "Warranty Check — Stackwise" },
      { property: "og:description", content: "Look up warranty status by serial number." },
    ],
  }),
});

function WarrantyCheckPage() {
  const findUnit = useUnitByScan();
  const createClaim = useCreateWarrantyClaim();
  const { demoStore } = useDemo();
  const [claimType, setClaimType] = useState<"service" | "replacement" | null>(null);
  const [delivery, setDelivery] = useState({ ...EMPTY_DELIVERY });
  const [notes, setNotes] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [scan, setScan] = useState("");
  const [unit, setUnit] = useState<ItemUnit | null>(null);
  const [notFound, setNotFound] = useState(false);

  const lookup = () => {
    const u = findUnit(scan);
    if (!u) { setUnit(null); setNotFound(true); return; }
    setUnit(u); setNotFound(false);
  };

  const item = unit ? demoStore?.getItemById(unit.itemId) : undefined;
  const sale = unit ? demoStore?.getSalesForUnit(unit.id).find((s) => s.status !== "refunded") : undefined;
  const customer = sale ? demoStore?.getCustomerById(sale.customerId) : undefined;
  const isActive = unit?.warrantyExpiresAt ? new Date(unit.warrantyExpiresAt) > new Date() : false;

  const logClaim = (type: "service" | "replacement") => {
    if (!unit) return;
    try {
      createClaim({ itemUnitId: unit.id, claimType: type, notes, delivery });
      toast.success("Claim logged");
      setClaimType(null); setNotes(""); setDelivery({ ...EMPTY_DELIVERY });
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="mx-auto max-w-[720px] space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Warranty Check</h1>
        <p className="text-sm text-muted-foreground">Scan or type a serial number.</p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <ScanLine className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input autoFocus className="pl-8" placeholder="Serial number"
            value={scan}
            onChange={(e) => setScan(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") lookup(); }}
          />
        </div>
        <Button onClick={lookup}>Check</Button>
      </div>

      <Dialog open={!!claimType} onOpenChange={o => { if (!o) setClaimType(null); }}><DialogContent><DialogTitle>New {claimType} claim</DialogTitle><DialogDescription>{item?.name} · {unit?.serialNumber}</DialogDescription><DeliveryFields value={delivery} onChange={setDelivery} /><label className="text-sm">Claim notes<Input value={notes} onChange={e => setNotes(e.target.value)} /></label><Button onClick={() => setConfirmOpen(true)}>Review claim</Button></DialogContent></Dialog>
      <ConfirmAction open={confirmOpen} onOpenChange={setConfirmOpen} title="Confirm warranty claim" description={`${item?.name} · ${unit?.serialNumber} — ${claimType} claim`} onConfirm={() => { if (claimType) logClaim(claimType); }} />
      {notFound && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          No unit found with that serial number.
        </div>
      )}

      {unit && (
        <div className="space-y-4 rounded-lg border border-border p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-lg font-semibold">{item?.name ?? "Item"}</div>
              <div className="text-xs text-muted-foreground">{item?.description}</div>
              <div className="mt-1 font-mono text-xs">SN {unit.serialNumber}</div>
            </div>
            {unit.warrantyExpiresAt ? (
              isActive ? (
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                  <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Active
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <ShieldAlert className="mr-1 h-3.5 w-3.5" /> Expired
                </Badge>
              )
            ) : (
              <Badge variant="outline">Not sold</Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Purchase date" value={new Date(unit.receivedAt).toLocaleDateString()} />
            <Field label="Sale date" value={sale ? new Date(sale.soldAt).toLocaleDateString() : "—"} />
            <Field label="Document #" value={sale?.documentNumber ?? "—"} />
            <Field label="Channel" value={sale?.channel ?? "—"} />
            <Field label={sale?.channel === "dealer" ? "Dealer" : "Customer"} value={customer?.name ?? "—"} />
            <Field label="Contact" value={customer?.phone || customer?.email || "—"} />
            <Field label="Warranty expiry" value={unit.warrantyExpiresAt ? new Date(unit.warrantyExpiresAt).toLocaleDateString() : "—"} />
            <Field label="Warranty months" value={String(unit.warrantyMonths)} />
          </div>

          {unit.status === "sold" || unit.status === "warranty_service" ? (
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <Button size="sm" variant="outline" onClick={() => setClaimType("service")}>Log service claim</Button>
              <Button size="sm" variant="outline" onClick={() => setClaimType("replacement")}>Log replacement claim</Button>
              <Link to="/app/warranty/claims" className="ml-auto text-xs text-muted-foreground underline">View all claims</Link>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="capitalize">{value}</div>
    </div>
  );
}
