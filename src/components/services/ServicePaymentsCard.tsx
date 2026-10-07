import { useState } from "react";
import { Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PAYMENT_METHOD_LABELS, serviceTotals } from "@/lib/service-logic";
import type { Service } from "@/types/inventory";
import { RecordPaymentDialog } from "./RecordPaymentDialog";

export function ServicePaymentsCard({ service }: { service: Service }) {
  const [open, setOpen] = useState(false);
  const totals = serviceTotals(service);
  const canPay = totals.dueAmount > 0;

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Payments</h2>
        {canPay && <Button size="sm" onClick={() => setOpen(true)}>Record payment</Button>}
      </div>

      {service.payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {service.payments.map((p) => {
            const ref = p.method === "bank"
              ? [p.bankName, p.branchName, p.referenceNumber && `Ref ${p.referenceNumber}`].filter(Boolean).join(" · ")
              : p.method === "mfs"
                ? [p.mobileNumber, p.transactionId && `TrxID ${p.transactionId}`].filter(Boolean).join(" · ")
                : "";
            return (
              <li key={p.id} className="flex items-start justify-between gap-3 py-2 text-sm">
                <div>
                  <div className="font-medium">{PAYMENT_METHOD_LABELS[p.method]}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(p.paidAt).toLocaleString()} · by {p.receivedBy}
                  </div>
                  {ref && <div className="text-xs text-muted-foreground">{ref}</div>}
                  {p.notes && <div className="text-xs">{p.notes}</div>}
                  {p.proofUrl && (
                    <a href={p.proofUrl} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-xs text-primary underline">
                      <Paperclip className="h-3 w-3" /> Proof
                    </a>
                  )}
                </div>
                <span className="font-mono">${p.amount.toFixed(2)}</span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-3 flex justify-between border-t border-border pt-2 text-sm">
        <span className="text-muted-foreground">Paid ${totals.totalPaid.toFixed(2)} of ${totals.netAmount.toFixed(2)}</span>
        <span className={totals.dueAmount > 0 ? "font-mono text-destructive" : "font-mono"}>
          Due ${totals.dueAmount.toFixed(2)}
        </span>
      </div>

      <RecordPaymentDialog service={service} dueAmount={totals.dueAmount} open={open} onOpenChange={setOpen} />
    </section>
  );
}
