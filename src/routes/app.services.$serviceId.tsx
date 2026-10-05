import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusTimeline } from "@/components/services/StatusTimeline";
import { StatusUpdateDialog } from "@/components/services/StatusUpdateDialog";
import { useCustomers, useServiceById } from "@/hooks/useInventoryData";
import { useUpdateService } from "@/hooks/useInventoryMutations";
import {
  PRODUCT_CONDITION_LABELS, RECEIVING_METHOD_LABELS, SERVICE_STATUS_LABELS,
  SERVICE_TYPE_LABELS, serviceTotals,
} from "@/lib/service-logic";
import { toast } from "sonner";

export const Route = createFileRoute("/app/services/$serviceId")({
  head: () => ({
    meta: [
      { title: "Service details — Stackwise" },
      { name: "description", content: "Service job details, status workflow and history." },
      { property: "og:title", content: "Service details — Stackwise" },
      { property: "og:description", content: "Service job details, status workflow and history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ServiceDetailPage,
});

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm">{children}</span>
    </div>
  );
}

function ServiceDetailPage() {
  const { serviceId } = Route.useParams();
  const navigate = useNavigate();
  const { data: service } = useServiceById(serviceId);
  const { data: customers } = useCustomers();
  const updateService = useUpdateService();
  const [statusOpen, setStatusOpen] = useState(false);

  if (!service) {
    return (
      <EmptyState
        icon={Wrench}
        title="Service not found"
        description="This service job does not exist or was removed."
        actionLabel="Back to services"
        onAction={() => navigate({ to: "/app/services" })}
      />
    );
  }

  const totals = serviceTotals(service);
  const customer = customers.find((c) => c.id === service.customerId);
  const t = service.tracking;
  const canMove = service.status !== "delivered";

  const saveTechnician = (value: string) => {
    if (value.trim() === service.technicianName) return;
    updateService.mutate(
      { id: service.id, updates: { technicianName: value.trim() } },
      { onSuccess: () => toast.success("Technician updated"), onError: (e) => toast.error(e.message) },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="Back to services">
            <Link to="/app/services"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="font-mono text-xl font-semibold">{service.serviceNumber}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge>{SERVICE_STATUS_LABELS[service.status]}</Badge>
              <Badge variant="outline">{SERVICE_TYPE_LABELS[service.serviceType]}</Badge>
              <Badge variant={totals.paymentStatus === "paid" ? "default" : totals.paymentStatus === "partial" ? "secondary" : "outline"}>
                Payment: {totals.paymentStatus}
              </Badge>
            </div>
          </div>
        </div>
        {canMove && <Button onClick={() => setStatusOpen(true)}>Update status</Button>}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-2 text-sm font-semibold">Product & problem</h2>
            <Row label="Product">{service.productName}</Row>
            {service.productSerial && <Row label="Serial"><span className="font-mono text-xs">{service.productSerial}</span></Row>}
            {service.productModel && <Row label="Model">{service.productModel}</Row>}
            <Row label="Condition">{PRODUCT_CONDITION_LABELS[t.condition]}</Row>
            <Row label="Received">{new Date(service.receivedDate).toLocaleString()}</Row>
            {service.expectedDeliveryDate && (
              <Row label="Expected delivery">{new Date(service.expectedDeliveryDate).toLocaleDateString()}</Row>
            )}
            {service.actualDeliveryDate && (
              <Row label="Delivered">{new Date(service.actualDeliveryDate).toLocaleString()}</Row>
            )}
            <div className="mt-2 border-t border-border pt-2">
              <p className="text-sm text-muted-foreground">Problem</p>
              <p className="mt-0.5 text-sm">{service.problemDescription}</p>
            </div>
            {service.serviceNotes && (
              <div className="mt-2">
                <p className="text-sm text-muted-foreground">Internal notes</p>
                <p className="mt-0.5 text-sm">{service.serviceNotes}</p>
              </div>
            )}
            {t.photoUrls.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {t.photoUrls.map((url, i) => (
                  <img key={i} src={url} alt={`Condition ${i + 1}`} className="h-16 w-16 rounded-md border border-border object-cover" />
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-2 text-sm font-semibold">Receiving</h2>
            <Row label="Method">{RECEIVING_METHOD_LABELS[t.receivingMethod]}</Row>
            {t.courierName && <Row label="Courier">{t.courierName}{t.courierContact ? ` · ${t.courierContact}` : ""}</Row>}
            {t.trackingNumber && <Row label="Tracking #"><span className="font-mono text-xs">{t.trackingNumber}</span></Row>}
            {t.courierCharge ? <Row label="Courier charge">${t.courierCharge.toFixed(2)}</Row> : null}
            {t.receiptNumber && <Row label="Receipt #">{t.receiptNumber}</Row>}
            {t.pickupAddress && <Row label="Pickup address">{t.pickupAddress}</Row>}
            {t.pickupPerson && <Row label="Pickup person">{t.pickupPerson}{t.pickupPhone ? ` · ${t.pickupPhone}` : ""}</Row>}
            {t.deliveryPerson && <Row label="Delivery person">{t.deliveryPerson}</Row>}
            {t.receiverName && <Row label="Received by">{t.receiverName}</Row>}
            {t.deliveryNotes && <Row label="Delivery notes">{t.deliveryNotes}</Row>}
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-2 text-sm font-semibold">Assignment</h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Technician</span>
              <Input
                key={service.id + service.technicianName}
                defaultValue={service.technicianName}
                onBlur={(e) => saveTechnician(e.target.value)}
                placeholder="Assign a technician"
                className="max-w-xs"
              />
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-2 text-sm font-semibold">Customer</h2>
            <p className="text-sm font-medium">{customer?.name ?? "Unknown"}</p>
            {customer?.phone && <p className="text-sm text-muted-foreground">{customer.phone}</p>}
            {customer?.address && <p className="text-sm text-muted-foreground">{customer.address}</p>}
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-2 text-sm font-semibold">Charges</h2>
            <Row label="Parts">${totals.partsCharge.toFixed(2)}</Row>
            <Row label="Service charge">${totals.serviceCharge.toFixed(2)}</Row>
            <Row label="Discount">-${totals.discount.toFixed(2)}</Row>
            <Row label="VAT / tax">${totals.vatTax.toFixed(2)}</Row>
            <div className="mt-1 border-t border-border pt-1.5">
              <Row label="Net amount"><span className="font-mono font-medium">${totals.netAmount.toFixed(2)}</span></Row>
              <Row label="Paid">${totals.totalPaid.toFixed(2)}</Row>
              <Row label="Due">
                <span className={totals.dueAmount > 0 ? "font-mono text-destructive" : "font-mono"}>
                  ${totals.dueAmount.toFixed(2)}
                </span>
              </Row>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold">Status history</h2>
            <StatusTimeline events={service.statusHistory} />
          </section>
        </div>
      </div>

      <StatusUpdateDialog service={service} open={statusOpen} onOpenChange={setStatusOpen} />
    </div>
  );
}
