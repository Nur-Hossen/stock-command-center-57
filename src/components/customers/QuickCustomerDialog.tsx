import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateCustomer } from "@/hooks/useInventoryMutations";
import type { Customer, CustomerType } from "@/types/inventory";

interface QuickCustomerDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultType?: CustomerType;
  onCreated?: (customer: Customer) => void;
}

export function QuickCustomerDialog({
  open, onOpenChange, defaultType = "retail", onCreated,
}: QuickCustomerDialogProps) {
  const createC = useCreateCustomer();
  const [form, setForm] = useState({
    name: "", email: "", phone: "", address: "", notes: "",
    type: defaultType as CustomerType,
  });

  useEffect(() => {
    if (open) {
      setForm({ name: "", email: "", phone: "", address: "", notes: "", type: defaultType });
    }
  }, [open, defaultType]);

  const handleSave = () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    const now = new Date().toISOString();
    const customer: Customer = {
      id: crypto.randomUUID(),
      ...form,
      balance: 0,
      createdAt: now,
      updatedAt: now,
    };
    createC.mutate(customer, {
      onSuccess: () => {
        toast.success("Customer created");
        onCreated?.(customer);
        onOpenChange(false);
      },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>New Customer</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Name *</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          </div>
          <div>
            <label className="text-sm font-medium">Type *</label>
            <div className="mt-1 flex gap-2">
              {(["retail", "dealer"] as const).map((t) => (
                <button key={t} type="button"
                  className={`flex-1 rounded-md border px-3 py-2 text-sm capitalize ${
                    form.type === t ? "border-primary bg-primary/10" : "border-border"
                  }`}
                  onClick={() => setForm({ ...form, type: t })}
                >{t}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Phone</label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium">Address</label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium">Notes</label>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleSave}>Save</Button>
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
