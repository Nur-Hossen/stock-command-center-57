import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CustomerCombobox } from "@/components/customers/CustomerCombobox";
import { QuickCustomerDialog } from "@/components/customers/QuickCustomerDialog";
import { ProductPicker, type ProductSelection } from "@/components/services/ProductPicker";
import { ReceivingFields } from "@/components/services/ReceivingFields";
import { ServicePhotoUpload } from "@/components/services/ServicePhotoUpload";
import { useCustomers, useItems, useUnits } from "@/hooks/useInventoryData";
import { useCreateService } from "@/hooks/useInventoryMutations";
import {
  PRODUCT_CONDITION_LABELS, RECEIVING_METHOD_LABELS, SERVICE_TYPE_LABELS,
} from "@/lib/service-logic";
import type {
  ProductCondition, ReceivingMethod, ServiceTracking, ServiceType,
} from "@/types/inventory";
import { cn } from "@/lib/utils";

function ToggleGroup<T extends string>({
  options, value, onChange,
}: {
  options: Record<T, string>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(options) as T[]).map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={cn(
            "rounded-md border px-3 py-1.5 text-sm transition-colors",
            value === k ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-muted",
          )}
        >
          {options[k]}
        </button>
      ))}
    </div>
  );
}

export function ServiceEntryForm() {
  const navigate = useNavigate();
  const { data: customers } = useCustomers();
  const { data: items } = useItems();
  const { data: units } = useUnits();
  const createService = useCreateService();

  const [customerId, setCustomerId] = useState("");
  const [quickOpen, setQuickOpen] = useState(false);
  const [source, setSource] = useState<"in_house" | "outside">("in_house");
  const [selection, setSelection] = useState<ProductSelection | null>(null);
  const [productName, setProductName] = useState("");
  const [productSerial, setProductSerial] = useState("");
  const [productModel, setProductModel] = useState("");
  const [serviceType, setServiceType] = useState<ServiceType>("paid");
  const [serviceCharge, setServiceCharge] = useState("");
  const [problemDescription, setProblemDescription] = useState("");
  const [serviceNotes, setServiceNotes] = useState("");
  const [technicianName, setTechnicianName] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [receivingMethod, setReceivingMethod] = useState<ReceivingMethod>("customer_brought");
  const [condition, setCondition] = useState<ProductCondition>("good");
  const [tracking, setTracking] = useState<Partial<ServiceTracking>>({});
  const [photos, setPhotos] = useState<string[]>([]);

  const handleSubmit = () => {
    const name = source === "in_house" ? (selection?.productName ?? "") : productName.trim();
    if (!customerId) { toast.error("Select a customer"); return; }
    if (name.length < 3) { toast.error("Product name must be at least 3 characters"); return; }
    if (!problemDescription.trim()) { toast.error("Problem description is required"); return; }
    if (receivingMethod === "courier" && !tracking.courierName?.trim()) {
      toast.error("Courier name is required"); return;
    }
    if (receivingMethod === "pickup_service" && !tracking.pickupAddress?.trim()) {
      toast.error("Pickup address is required"); return;
    }

    createService.mutate(
      {
        customerId,
        serviceType,
        itemId: source === "in_house" ? (selection?.itemId ?? null) : null,
        itemUnitId: source === "in_house" ? (selection?.itemUnitId ?? null) : null,
        productName: name,
        productSerial: source === "in_house" ? (selection?.productSerial ?? "") : productSerial.trim(),
        productModel: source === "in_house" ? (selection?.productModel ?? "") : productModel.trim(),
        problemDescription: problemDescription.trim(),
        serviceNotes: serviceNotes.trim(),
        technicianName: technicianName.trim(),
        serviceCharge: serviceType === "paid" ? Number(serviceCharge) || 0 : 0,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        tracking: { ...tracking, receivingMethod, condition, photoUrls: photos },
      },
      {
        onSuccess: () => {
          toast.success("Service created");
          navigate({ to: "/app/services" });
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="space-y-3 rounded-lg border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Customer</h2>
        <div className="flex gap-2">
          <div className="flex-1">
            <CustomerCombobox customers={customers} value={customerId} onChange={setCustomerId} />
          </div>
          <Button type="button" variant="outline" size="icon" aria-label="Add customer" onClick={() => setQuickOpen(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <QuickCustomerDialog
          open={quickOpen}
          onOpenChange={setQuickOpen}
          onCreated={(c) => setCustomerId(c.id)}
        />
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Product</h2>
        <ToggleGroup
          options={{ in_house: "Our product", outside: "Outside product" } as const}
          value={source}
          onChange={setSource}
        />
        {source === "in_house" ? (
          <>
            <ProductPicker
              items={items}
              units={units}
              value={selection ? (selection.itemUnitId ?? selection.itemId) : null}
              onSelect={setSelection}
            />
            {selection && (
              <p className="text-xs text-muted-foreground">
                {selection.productName}
                {selection.productSerial && ` · ${selection.productSerial}`}
                {selection.productModel && ` · ${selection.productModel}`}
              </p>
            )}
          </>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <label className="text-sm font-medium">Product name *</label>
              <Input value={productName} onChange={(e) => setProductName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Serial</label>
              <Input value={productSerial} onChange={(e) => setProductSerial(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Model</label>
              <Input value={productModel} onChange={(e) => setProductModel(e.target.value)} />
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Service details</h2>
        <ToggleGroup options={SERVICE_TYPE_LABELS} value={serviceType} onChange={setServiceType} />
        {serviceType === "paid" && (
          <div className="max-w-xs">
            <label className="text-sm font-medium">Service charge</label>
            <Input
              type="number" min={0} value={serviceCharge}
              onChange={(e) => setServiceCharge(e.target.value)} placeholder="0.00"
            />
          </div>
        )}
        <div>
          <label className="text-sm font-medium">Problem description *</label>
          <Textarea
            value={problemDescription}
            onChange={(e) => setProblemDescription(e.target.value)}
            rows={3}
            placeholder="Describe the reported problem…"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Technician</label>
            <Input value={technicianName} onChange={(e) => setTechnicianName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Expected delivery date</label>
            <Input
              type="date" value={expectedDeliveryDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setExpectedDeliveryDate(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Internal notes</label>
          <Textarea value={serviceNotes} onChange={(e) => setServiceNotes(e.target.value)} rows={2} />
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Receiving & condition</h2>
        <ToggleGroup options={RECEIVING_METHOD_LABELS} value={receivingMethod} onChange={setReceivingMethod} />
        <ReceivingFields
          method={receivingMethod}
          values={tracking}
          onChange={(u) => setTracking((t) => ({ ...t, ...u }))}
        />
        <div className="max-w-xs">
          <label className="text-sm font-medium">Product condition</label>
          <Select value={condition} onValueChange={(v) => setCondition(v as ProductCondition)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(PRODUCT_CONDITION_LABELS) as ProductCondition[]).map((c) => (
                <SelectItem key={c} value={c}>{PRODUCT_CONDITION_LABELS[c]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Condition photos</label>
          <ServicePhotoUpload photos={photos} onChange={setPhotos} />
        </div>
      </section>

      <div className="flex gap-3 pb-8">
        <Button onClick={handleSubmit} disabled={createService.isLoading} className="flex-1 sm:flex-none">
          {createService.isLoading ? "Creating…" : "Create service"}
        </Button>
        <Button variant="outline" onClick={() => navigate({ to: "/app/services" })}>Cancel</Button>
      </div>
    </div>
  );
}
