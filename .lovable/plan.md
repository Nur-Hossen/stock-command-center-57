# Sales, Refund & Warranty fixes

## Root cause found for the broken claim list

The Warranty Check screen and the Claims screen are stacked: the Claims page is a
child of the Warranty page, but the Warranty page never renders a slot for its
children. So opening "View all claims" leaves you on the check screen and the
claim list can never appear. Claims are in fact being saved — they just have no
visible page.

Fix: split the warranty screens so the check page and the claim list are proper
siblings, both reachable from the menu.

## What will change

### Sales

1. **Print invoice from the sales list.** Every order row gets a Print button that
   opens the existing invoice/challan layout (retail = Sales Invoice,
   dealer = Delivery Challan) in a print dialog. POS keeps its current
   after-sale print, and after a POS sale you land on the order in the list.
2. **Product search in the manual sales form.** A search box above
   "Select units to sell" filters the unit list by product name, SKU, or serial,
   so long lists are usable. Selected units stay visible while filtering.
3. **Delivery information on each sale.** Both POS and the manual sales form get
   a delivery block: method (By hand / Courier), and when Courier is chosen,
   courier name, tracking number, and delivery address/notes. The values are
   stored on the sale, shown on the order row, and printed on the invoice.

### Refunds

4. **Refund becomes a dedicated screen, not a one-click action.** The Refund
   button opens a refund page for that order where you:
   - tick which units/products of the order to return (full or partial),
   - enter return delivery information (By hand / Courier + courier details),
   - optionally add a reason note,
   - then confirm through a confirmation dialog that lists what will be returned
     and the amount.
   Only the ticked units go back to stock; an order with some units returned is
   shown as *partially refunded*, and remaining units can be refunded later.
   Dealer credit is adjusted proportionally to the refunded lines.

### Warranty

5. **Claim list fixed** (see root cause above) and given its own menu entry so it
   is reachable without going through a serial lookup.
6. **Claim delivery information.** Logging a service or replacement claim opens a
   small dialog asking for the claim type, delivery method (By hand / Courier
   with courier name, tracking, address) and notes.
7. **Confirmation before filing a claim,** with the serial, product, and claim
   type shown in the confirm step.
8. Claim rows display delivery details and the linked order number.

## Testing

- Unit tests (vitest) for: partial refund returns only selected units and keeps
  the rest sold, refund totals and dealer-credit adjustment, no double refund of
  the same unit, delivery data persisted on sale/refund/claim, and claim
  creation appearing in the claim list query.
- Typecheck.
- Browser walkthrough in demo mode: POS sale with courier delivery → print from
  the sales list → partial refund with confirmation → warranty check → file claim
  with confirmation → claim appears in the claim list and advances through
  statuses.

## Technical notes

- `src/routes/app.warranty.tsx` becomes a layout rendering `<Outlet />`; the
  current check UI moves to `src/routes/app.warranty.index.tsx`; sidebar gains a
  Claims link.
- New `DeliveryInfo` type (`method: "hand" | "courier"`, `courierName`,
  `trackingNumber`, `address`, `notes`) added to `src/types/inventory.ts` and
  attached to `Sale`, a new `SaleRefund` record, and `WarrantyClaim`.
- `demo-store.refundSale` is replaced by `refundSaleUnits(saleId, unitIds,
  delivery, reason)` returning the updated sale plus a refund record; sale status
  gains `partially_refunded`. Stock still derives from unit status via
  `syncSerializedStock` (no double counting).
- `createWarrantyClaim` accepts delivery info; claim list keeps the existing
  status filter.
- New routes: `app.sales.$saleId.refund.tsx` (refund screen); new components
  `RefundSheet`/`ConfirmDialog` reuse `alert-dialog`, `InvoicePrint` gains a
  delivery section and a print wrapper usable from the list.
- Migrations `00020_delivery_info.sql` (delivery columns on sales, refunds table,
  claim delivery columns) added under `docs/migrations/`.
