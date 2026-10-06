import { PAYMENT_METHOD_LABELS, SERVICE_STATUS_LABELS, SERVICE_TYPE_LABELS, serviceTotals } from "@/lib/service-logic";
import type { Customer, Service } from "@/types/inventory";

interface Props {
  service: Service;
  customer: Customer | undefined;
  businessName: string;
}

const money = (n: number) => `$${n.toFixed(2)}`;

export function ServiceInvoicePrint({ service, customer, businessName }: Props) {
  const t = serviceTotals(service);
  return (
    <div data-invoice className="rounded-lg border border-border bg-background p-8 print:border-0 print:p-0">
      <style>{`@media print { body * { visibility: hidden; } [data-invoice], [data-invoice] * { visibility: visible; } [data-invoice] { position: absolute; inset: 0; width: 100%; } [role="dialog"] { position: absolute !important; inset: 0 !important; width: 100% !important; max-width: none !important; transform: none !important; overflow: visible !important; } }`}</style>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="text-lg font-semibold">{businessName}</div>
          <div className="text-xs text-muted-foreground">Service Invoice</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-sm">{service.serviceNumber}</div>
          <div className="text-xs text-muted-foreground">Received {new Date(service.receivedDate).toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Printed {new Date().toLocaleString()}</div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-xs uppercase text-muted-foreground">Customer</div>
          <div className="font-medium">{customer?.name ?? "—"}</div>
          <div className="text-xs text-muted-foreground">{customer?.phone}</div>
          {customer?.address && <div className="text-xs text-muted-foreground">{customer.address}</div>}
        </div>
        <div className="text-right">
          <div className="text-xs uppercase text-muted-foreground">Product</div>
          <div className="font-medium">{service.productName}</div>
          {service.productSerial && <div className="font-mono text-xs">SN: {service.productSerial}</div>}
          <div className="text-xs text-muted-foreground">
            {SERVICE_TYPE_LABELS[service.serviceType]} · {SERVICE_STATUS_LABELS[service.status]}
          </div>
        </div>
      </div>

      <div className="mb-4 text-sm">
        <div className="text-xs uppercase text-muted-foreground">Problem</div>
        <div>{service.problemDescription}</div>
      </div>

      <table className="mb-4 w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <th className="py-2">Description</th><th className="py-2 text-right">Qty</th>
            <th className="py-2 text-right">Price</th><th className="py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {service.items.map((i) => (
            <tr key={i.id} className="border-b border-border/50">
              <td className="py-2">{i.name}</td><td className="py-2 text-right">{i.quantity}</td>
              <td className="py-2 text-right">{money(i.unitPrice)}</td><td className="py-2 text-right">{money(i.total)}</td>
            </tr>
          ))}
          {t.serviceCharge > 0 && (
            <tr className="border-b border-border/50">
              <td className="py-2">Service charge</td><td className="py-2 text-right">1</td>
              <td className="py-2 text-right">{money(t.serviceCharge)}</td><td className="py-2 text-right">{money(t.serviceCharge)}</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="ml-auto max-w-xs space-y-1 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span>{money(t.totalCharge)}</span></div>
        <div className="flex justify-between text-muted-foreground"><span>Discount</span><span>−{money(t.discount)}</span></div>
        <div className="flex justify-between text-muted-foreground"><span>VAT / tax</span><span>{money(t.vatTax)}</span></div>
        <div className="flex justify-between border-t border-border pt-1 font-semibold"><span>Net amount</span><span>{money(t.netAmount)}</span></div>
        <div className="flex justify-between text-xs"><span>Paid</span><span>{money(t.totalPaid)}</span></div>
        <div className={`flex justify-between text-xs font-medium ${t.dueAmount > 0 ? "text-destructive" : ""}`}>
          <span>Due</span><span>{money(t.dueAmount)}</span>
        </div>
      </div>

      {service.payments.length > 0 && (
        <div className="mt-6 text-xs">
          <div className="mb-1 font-semibold uppercase text-muted-foreground">Payments</div>
          {service.payments.map((p) => (
            <div key={p.id} className="flex justify-between">
              <span>{new Date(p.paidAt).toLocaleDateString()} · {PAYMENT_METHOD_LABELS[p.method]}</span>
              <span>{money(p.amount)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-12 grid grid-cols-2 gap-8 text-xs text-muted-foreground">
        <div className="border-t border-border pt-2">Customer signature</div>
        <div className="border-t border-border pt-2">Authorised by</div>
      </div>
    </div>
  );
}
