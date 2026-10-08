import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSuppliers } from "@/hooks/useInventoryData";
import { useSendToVendor, useUpdateVendorWarranty } from "@/hooks/useInventoryMutations";
import { QUALITY_CHECK_LABELS, VENDOR_STATUS_LABELS, VENDOR_TRANSITIONS } from "@/lib/service-logic";
import type { QualityCheckStatus, Service } from "@/types/inventory";

export function VendorWarrantyCard({ service }: { service: Service }) {
  const { data: suppliers } = useSuppliers();
  const send = useSendToVendor();
  const update = useUpdateVendorWarranty();
  const [vendorId, setVendorId] = useState("");
  const [courierName, setCourierName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [notes, setNotes] = useState("");
  const vw = service.vendorWarranty;
  const locked = service.status === "delivered";
  const err = (e: Error) => toast.error(e.message);

  if (!vw) {
    if (locked) return null;
    return (
      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-1 text-sm font-semibold">Vendor warranty</h2>
        <p className="mb-3 text-sm text-muted-foreground">Send this product to its vendor for warranty repair or replacement.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="vw-vendor">Vendor *</label>
            <select id="vw-vendor" value={vendorId} onChange={(e) => setVendorId(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Select a supplier</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div><label className="text-sm font-medium" htmlFor="vw-courier">Courier</label>
            <Input id="vw-courier" value={courierName} onChange={(e) => setCourierName(e.target.value)} /></div>
          <div><label className="text-sm font-medium" htmlFor="vw-tracking">Tracking #</label>
            <Input id="vw-tracking" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} /></div>
          <div><label className="text-sm font-medium" htmlFor="vw-return">Expected return</label>
            <Input id="vw-return" type="date" value={expectedReturnDate} onChange={(e) => setExpectedReturnDate(e.target.value)} /></div>
          <div><label className="text-sm font-medium" htmlFor="vw-notes">Notes</label>
            <Input id="vw-notes" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <Button className="mt-3" size="sm" disabled={!vendorId || send.isLoading}
          onClick={() => send.mutate(
            { serviceId: service.id, vendorId, courierName, trackingNumber, expectedReturnDate, notes },
            { onSuccess: () => toast.success("Sent to vendor"), onError: err },
          )}>Send to vendor</Button>
      </section>
    );
  }

  const vendor = suppliers.find((s) => s.id === vw.vendorId);
  const next = locked ? [] : VENDOR_TRANSITIONS[vw.status];
  const canQc = !locked && vw.status === "received";
  const setQc = (q: QualityCheckStatus) =>
    update.mutate({ serviceId: service.id, updates: { qualityCheck: q } },
      { onSuccess: () => toast.success(`Quality check ${QUALITY_CHECK_LABELS[q].toLowerCase()}`), onError: err });

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Vendor warranty</h2>
        <Badge variant={vw.status === "rejected" ? "destructive" : "default"}>{VENDOR_STATUS_LABELS[vw.status]}</Badge>
      </div>
      <dl className="grid grid-cols-2 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Vendor</dt><dd className="text-right">{vendor?.name ?? "—"}</dd>
        <dt className="text-muted-foreground">Sent</dt><dd className="text-right">{new Date(vw.sentDate).toLocaleDateString()}</dd>
        {vw.expectedReturnDate && <><dt className="text-muted-foreground">Expected return</dt><dd className="text-right">{new Date(vw.expectedReturnDate).toLocaleDateString()}</dd></>}
        {vw.courierName && <><dt className="text-muted-foreground">Courier</dt><dd className="text-right">{vw.courierName}</dd></>}
        {vw.trackingNumber && <><dt className="text-muted-foreground">Tracking #</dt><dd className="text-right font-mono text-xs">{vw.trackingNumber}</dd></>}
        {vw.receivedDate && <><dt className="text-muted-foreground">Received back</dt><dd className="text-right">{new Date(vw.receivedDate).toLocaleDateString()}</dd></>}
        <dt className="text-muted-foreground">Quality check</dt><dd className="text-right">{QUALITY_CHECK_LABELS[vw.qualityCheck]}</dd>
      </dl>
      {vw.notes && <p className="mt-2 text-sm">{vw.notes}</p>}

      {canQc && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Quality check:</span>
          <Button size="sm" variant="outline" onClick={() => setQc("passed")}>Pass</Button>
          <Button size="sm" variant="outline" onClick={() => setQc("failed")}>Fail</Button>
        </div>
      )}

      {next.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {next.map((s) => (
            <Button key={s} size="sm" variant={s === "rejected" ? "outline" : "default"}
              disabled={s === "replaced" && vw.qualityCheck !== "passed"}
              onClick={() => update.mutate({ serviceId: service.id, updates: { status: s } },
                { onSuccess: () => toast.success(VENDOR_STATUS_LABELS[s]), onError: err })}>
              {VENDOR_STATUS_LABELS[s]}
            </Button>
          ))}
        </div>
      )}
      {vw.status === "received" && vw.qualityCheck !== "passed" && (
        <p className="mt-2 text-xs text-muted-foreground">Pass the quality check before marking the product replaced.</p>
      )}
    </section>
  );
}
