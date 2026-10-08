import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDeliverService, useUpdateServiceStatus } from "@/hooks/useInventoryMutations";
import { SERVICE_STATUS_LABELS, SERVICE_TRANSITIONS, serviceTotals } from "@/lib/service-logic";
import type { Service, ServiceStatus } from "@/types/inventory";
import { cn } from "@/lib/utils";
import { ConfirmAction } from "@/components/shared/ConfirmAction";

interface StatusUpdateDialogProps {
  service: Service;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function StatusUpdateDialog({ service, open, onOpenChange }: StatusUpdateDialogProps) {
  const updateStatus = useUpdateServiceStatus();
  const deliver = useDeliverService();
  const nextStatuses = SERVICE_TRANSITIONS[service.status];

  const [target, setTarget] = useState<ServiceStatus | null>(null);
  const [notes, setNotes] = useState("");
  const [deliveryPerson, setDeliveryPerson] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setTarget(nextStatuses[0] ?? null);
      setNotes("");
      setDeliveryPerson("");
      setReceiverName("");
      setDeliveryDate(new Date().toISOString().slice(0, 10));
      setConfirmOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, service.id, service.status]);

  const totals = serviceTotals(service);
  const isDelivery = target === "delivered";
  const blockedByDue = isDelivery && totals.dueAmount > 0;
  const vw = service.vendorWarranty;
  const blockedByVendor = isDelivery && !!vw && !["replaced", "rejected"].includes(vw.status);
  const busy = updateStatus.isLoading || deliver.isLoading;

  const confirm = () => {
    if (!target) return;
    if (isDelivery) {
      if (!deliveryPerson.trim() || !receiverName.trim()) {
        toast.error("Delivery person and receiver name are required");
        return;
      }
      setConfirmOpen(true);
      return;
    }
    updateStatus.mutate(
      { id: service.id, status: target, notes: notes.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(`Status updated to ${SERVICE_STATUS_LABELS[target]}`);
          onOpenChange(false);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const doDeliver = () => {
      deliver.mutate(
        {
          id: service.id,
          deliveryPerson: deliveryPerson.trim(),
          receiverName: receiverName.trim(),
          deliveryNotes: notes.trim() || undefined,
          deliveryDate: deliveryDate ? new Date(deliveryDate + "T12:00:00").toISOString() : undefined,
        },
        {
          onSuccess: () => { toast.success("Service marked as delivered"); onOpenChange(false); },
          onError: (e) => toast.error(e.message),
        },
      );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Update status — {service.serviceNumber}</DialogTitle>
        </DialogHeader>
        {nextStatuses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This service is delivered and can no longer change status.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Move to</label>
              <div className="mt-1 flex flex-wrap gap-2">
                {nextStatuses.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setTarget(s)}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-sm transition-colors",
                      target === s ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-muted",
                    )}
                  >
                    {SERVICE_STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            {isDelivery && (
              <div className="space-y-3 rounded-md border border-border p-3">
                {blockedByDue && (
                  <p className="text-sm text-destructive">
                    ${totals.dueAmount.toFixed(2)} is still due — collect the full payment before delivering.
                  </p>
                )}
                {blockedByVendor && (
                  <p className="text-sm text-destructive">
                    The product is still with the vendor — finish the vendor warranty first.
                  </p>
                )}
                <div>
                  <label className="text-sm font-medium" htmlFor="del-date">Delivery date *</label>
                  <Input id="del-date" type="date" value={deliveryDate} min={service.receivedDate.slice(0, 10)}
                    onChange={(e) => setDeliveryDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Delivery person *</label>
                  <Input aria-label="Delivery person" value={deliveryPerson} onChange={(e) => setDeliveryPerson(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Receiver name *</label>
                  <Input aria-label="Receiver name" value={receiverName} onChange={(e) => setReceiverName(e.target.value)} />
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">{isDelivery ? "Delivery notes" : "Notes"}</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>

            <div className="flex gap-3">
              <Button className="flex-1" onClick={confirm} disabled={busy || blockedByDue || blockedByVendor || !target || (isDelivery && !deliveryDate)}>
                {busy ? "Saving…" : "Confirm"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
            </div>
          </div>
        )}
        <ConfirmAction
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Confirm delivery"
          description={`Hand over ${service.productName} (${service.serviceNumber}).\nDelivered by: ${deliveryPerson}\nReceived by: ${receiverName}\nDate: ${deliveryDate}\n\nOnce delivered, this service is locked and can no longer be edited.`}
          onConfirm={doDeliver}
        />
      </DialogContent>
    </Dialog>
  );
}
