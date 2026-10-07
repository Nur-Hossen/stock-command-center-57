import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAddServicePayment } from "@/hooks/useInventoryMutations";
import { PAYMENT_METHOD_LABELS, validatePayment } from "@/lib/service-logic";
import type { Service, ServicePaymentMethod } from "@/types/inventory";
import { cn } from "@/lib/utils";

interface Props {
  service: Service;
  dueAmount: number;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const EMPTY = {
  amount: "", bankName: "", branchName: "", accountNumber: "", referenceNumber: "",
  mobileNumber: "", transactionId: "", notes: "", proofUrl: "",
};

export function RecordPaymentDialog({ service, dueAmount, open, onOpenChange }: Props) {
  const add = useAddServicePayment();
  const [method, setMethod] = useState<ServicePaymentMethod>("cash");
  const [f, setF] = useState(EMPTY);

  useEffect(() => {
    if (open) { setMethod("cash"); setF({ ...EMPTY, amount: String(dueAmount) }); }
  }, [open, dueAmount]);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));

  const onProof = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Proof must be under 2 MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setF((prev) => ({ ...prev, proofUrl: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const draft = { method, amount: Number(f.amount), ...f, amount_: undefined };
  const error = validatePayment({ ...draft, amount: Number(f.amount) }, dueAmount);

  const submit = () => {
    if (error) { toast.error(error); return; }
    add.mutate(
      {
        serviceId: service.id, method, amount: Number(f.amount),
        bankName: f.bankName, branchName: f.branchName, accountNumber: f.accountNumber,
        referenceNumber: f.referenceNumber, mobileNumber: f.mobileNumber, transactionId: f.transactionId,
        notes: f.notes, proofUrl: f.proofUrl,
      },
      {
        onSuccess: () => { toast.success("Payment recorded"); onOpenChange(false); },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const field = (k: keyof typeof EMPTY, label: string, required = false) => (
    <div>
      <label className="text-sm font-medium" htmlFor={`pay-${k}`}>{label}{required && " *"}</label>
      <Input id={`pay-${k}`} value={f[k]} onChange={set(k)} />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader><DialogTitle>Record payment — {service.serviceNumber}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Method</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {(Object.keys(PAYMENT_METHOD_LABELS) as ServicePaymentMethod[]).map((m) => (
                <button key={m} type="button" onClick={() => setMethod(m)}
                  className={cn("rounded-md border px-3 py-1.5 text-sm transition-colors",
                    method === m ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-muted")}>
                  {PAYMENT_METHOD_LABELS[m]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="pay-amount">Amount * <span className="font-normal text-muted-foreground">(due ${dueAmount.toFixed(2)})</span></label>
            <Input id="pay-amount" type="number" min={0} step="0.01" max={dueAmount} value={f.amount} onChange={set("amount")} />
          </div>

          {method === "bank" && (
            <div className="grid grid-cols-2 gap-3">
              {field("bankName", "Bank name", true)}
              {field("branchName", "Branch")}
              {field("accountNumber", "Account number")}
              {field("referenceNumber", "Reference number", true)}
            </div>
          )}
          {method === "mfs" && (
            <div className="grid grid-cols-2 gap-3">
              {field("mobileNumber", "Mobile number", true)}
              {field("transactionId", "Transaction ID", true)}
            </div>
          )}

          {method !== "cash" && (
            <div>
              <label className="text-sm font-medium" htmlFor="pay-proof">Payment proof</label>
              <Input id="pay-proof" type="file" accept="image/*,application/pdf" onChange={(e) => onProof(e.target.files?.[0])} />
              {f.proofUrl && <p className="mt-1 text-xs text-muted-foreground">Proof attached</p>}
            </div>
          )}

          <div>
            <label className="text-sm font-medium" htmlFor="pay-notes">Notes</label>
            <Textarea id="pay-notes" rows={2} value={f.notes} onChange={set("notes")} />
          </div>

          {error && f.amount !== "" && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3">
            <Button className="flex-1" onClick={submit} disabled={!!error || add.isLoading}>Save payment</Button>
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
