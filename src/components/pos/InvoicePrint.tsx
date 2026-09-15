import { DeliverySummary } from "@/components/shared/DeliveryFields";
import type { Sale, Customer, Item } from "@/types/inventory";

interface Props {
  sale: Sale;
  customer: Customer | undefined;
  items: Item[];
  businessName: string;
}

export function InvoicePrint({ sale, customer, items, businessName }: Props) {
  const itemById = new Map(items.map((i) => [i.id, i]));
  const isDealer = sale.channel === "dealer";
  const showDisc = sale.showDiscountOnInvoice;

  return (
    <div data-invoice className="rounded-lg border border-border bg-background p-8 print:border-0 print:p-0">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="text-lg font-semibold">{businessName}</div>
          <div className="text-xs text-muted-foreground">
            {isDealer ? "Delivery Challan" : "Sales Invoice"}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-sm">{sale.documentNumber}</div>
          <div className="text-xs text-muted-foreground">{new Date(sale.soldAt).toLocaleString()}</div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-xs uppercase text-muted-foreground">{isDealer ? "Dealer" : "Customer"}</div>
          <div className="font-medium">{customer?.name ?? "—"}</div>
          <div className="text-xs text-muted-foreground">{customer?.phone} {customer?.email}</div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase text-muted-foreground">Channel</div>
          <div className="font-medium capitalize">{sale.channel}</div>
        </div>
      </div>

      <div className="mb-4"><DeliverySummary value={sale.delivery} /></div>
      <style>{`@media print { body * { visibility: hidden; } [data-invoice], [data-invoice] * { visibility: visible; } [data-invoice] { position: absolute; inset: 0; width: 100%; } [role="dialog"] { position: absolute !important; inset: 0 !important; width: 100% !important; max-width: none !important; transform: none !important; overflow: visible !important; } }`}</style>
      <table className="mb-4 w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <th className="py-2">Item</th>
            <th className="py-2">Serial</th>
            <th className="py-2 text-right">Price</th>
            {showDisc && <th className="py-2 text-right">Disc</th>}
            <th className="py-2 text-right">Warranty</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((li) => {
            const item = itemById.get(li.itemId);
            return (
              <tr key={li.id} className="border-b border-border/50">
                <td className="py-2">{item?.name ?? "Item"}</td>
                <td className="py-2 font-mono text-xs">{li.serialNumber}</td>
                <td className="py-2 text-right">${li.unitPrice.toFixed(2)}</td>
                {showDisc && <td className="py-2 text-right">−${li.lineDiscount.toFixed(2)}</td>}
                <td className="py-2 text-right text-xs capitalize">{li.warrantyMonths}mo · {li.warrantyType}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="ml-auto max-w-xs space-y-1 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span>${sale.subtotal.toFixed(2)}</span></div>
        {showDisc && (
          <>
            <div className="flex justify-between text-muted-foreground"><span>Line discount</span><span>−${sale.lineDiscountTotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Gross discount</span><span>−${sale.grossDiscount.toFixed(2)}</span></div>
          </>
        )}
        <div className="flex justify-between text-muted-foreground"><span>Tax</span><span>${sale.tax.toFixed(2)}</span></div>
        <div className="flex justify-between border-t border-border pt-1 font-semibold"><span>Total</span><span>${sale.total.toFixed(2)}</span></div>
        <div className="flex justify-between text-xs"><span>Paid</span><span>${sale.amountPaid.toFixed(2)}</span></div>
        {sale.balanceDue > 0 && (
          <div className="flex justify-between text-xs font-medium text-destructive"><span>Balance due</span><span>${sale.balanceDue.toFixed(2)}</span></div>
        )}
      </div>

      {!isDealer && (
        <div className="mt-8 rounded-md border border-dashed border-border p-4">
          <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Warranty Card</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {sale.items.map((li) => (
              <div key={li.id}>
                <div className="font-medium">{itemById.get(li.itemId)?.name}</div>
                <div className="font-mono">SN: {li.serialNumber}</div>
                <div>{li.warrantyMonths} month {li.warrantyType} warranty</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isDealer && (
        <div className="mt-12 grid grid-cols-2 gap-8 text-xs text-muted-foreground">
          <div className="border-t border-border pt-2">Delivered by</div>
          <div className="border-t border-border pt-2">Received by</div>
        </div>
      )}
    </div>
  );
}
