import { Input } from "@/components/ui/input";
import type { ReceivingMethod, ServiceTracking } from "@/types/inventory";

interface ReceivingFieldsProps {
  method: ReceivingMethod;
  values: Partial<ServiceTracking>;
  onChange: (updates: Partial<ServiceTracking>) => void;
}

/** Dynamic fields that depend on how the product reached us. */
export function ReceivingFields({ method, values, onChange }: ReceivingFieldsProps) {
  if (method === "courier") {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Courier name *</label>
          <Input
            value={values.courierName ?? ""}
            onChange={(e) => onChange({ courierName: e.target.value })}
            placeholder="e.g. Sundarban"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Courier contact</label>
          <Input
            value={values.courierContact ?? ""}
            onChange={(e) => onChange({ courierContact: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Tracking number</label>
          <Input
            value={values.trackingNumber ?? ""}
            onChange={(e) => onChange({ trackingNumber: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Courier charge</label>
          <Input
            type="number"
            min={0}
            value={values.courierCharge ?? 0}
            onChange={(e) => onChange({ courierCharge: Number(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Receipt number</label>
          <Input
            value={values.receiptNumber ?? ""}
            onChange={(e) => onChange({ receiptNumber: e.target.value })}
          />
        </div>
      </div>
    );
  }

  if (method === "pickup_service") {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-sm font-medium">Pickup address *</label>
          <Input
            value={values.pickupAddress ?? ""}
            onChange={(e) => onChange({ pickupAddress: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Pickup person</label>
          <Input
            value={values.pickupPerson ?? ""}
            onChange={(e) => onChange({ pickupPerson: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Pickup phone</label>
          <Input
            value={values.pickupPhone ?? ""}
            onChange={(e) => onChange({ pickupPhone: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Pickup date</label>
          <Input
            type="date"
            value={values.pickupDate ?? ""}
            onChange={(e) => onChange({ pickupDate: e.target.value })}
          />
        </div>
      </div>
    );
  }

  return null;
}
