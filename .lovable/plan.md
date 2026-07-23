
# POS, Sales Channels & Warranty — Merged Plan

Your logic and the current app overlap on ~70% (customers, serialized units, sales, warranty-on-sale). The gaps: **dealer channel**, **barcode/serial-scan POS UX**, **discounts**, **invoice numbering + templates**, **warranty check screen**, and **warranty claims**. Plan below merges both into one coherent module without breaking existing data.

## What we keep from current build
- `ItemUnit` (status, warrantyExpiresAt) — already the source of truth for serials.
- `Sale` + `SaleLineItem` — extend, don't replace.
- `Customer` + `useCreateSale` / `useRefundSale` mutations.
- Existing Sales list page (becomes the "Sales History" view).

## What we add / change

### 1. Data model (extend `src/types/inventory.ts` + demo-store)
- `Customer`: add `type: "retail" | "dealer"`, `balance: number`, `dealerWarrantyPolicy?` (optional override).
- `Item` / product: add `warrantyMonthsRetail`, `warrantyMonthsDealer`, `warrantyType: "service" | "replacement"`.
- `Sale`: add `channel: "retail" | "dealer"`, `invoiceNumber` (INV-YYYY-NNNN) or `challanNumber` (DC-YYYY-NNNN), `discountTotal`, `showDiscountOnInvoice`, `amountPaid`, `balanceDue`.
- `SaleLineItem`: add `lineDiscount`.
- New `WarrantyClaim`: `{ id, itemUnitId, saleId, claimType: "service"|"replacement", status: "pending"|"in_progress"|"resolved"|"rejected", notes, createdAt, resolvedAt }`.
- New setting `salesSettings`: `{ showDiscountOnInvoice: boolean, invoiceCounterByYear: Record<number, number>, challanCounterByYear: Record<number, number> }`.

### 2. POS screen — `/app/pos` (new route)
Single interface, two channels:

```text
┌──────────────────────────────────────────┐
│ Channel: [Retail] [Dealer]               │
│ Customer: [search / +new]                │
├──────────────────────────────────────────┤
│ Scan serial: [_________]  (autofocus)    │
│                                          │
│  Cart:                                   │
│   SN 12345  Samsung Buds  $120  [-disc] │
│   SN 12346  Samsung Buds  $120  [-disc] │
├──────────────────────────────────────────┤
│ Subtotal $240   Gross discount [__]      │
│ Tax   Total  Amount paid  Balance        │
│                    [Confirm Sale]        │
└──────────────────────────────────────────┘
```

Scan validation (matches your logic):
- Lookup unit by serial OR barcode.
- If `status === "in_stock"` → add to cart with model + selling price.
- Else → toast error `"Invalid or Already Sold"`, block.

Confirm = single atomic op in `demoStore.createPosSale()`:
1. Re-check every unit is still `in_stock` (else rollback + error).
2. Compute warranty per unit: retail → `soldAt + warrantyMonthsRetail`; dealer → policy from model.
3. Flip unit → `sold`, set `soldAt` + `warrantyExpiresAt`.
4. Generate invoice/challan number (year-scoped counter).
5. Write `Sale`. For dealer with unpaid balance: increment `customer.balance` (accounts receivable).
6. Create stock movement records.

### 3. Discounts & invoice settings
- Line-level `lineDiscount` on each cart row.
- Gross discount on cart total.
- Toggle in Settings → **Sales**: "Print discount on invoice" (also hides discount column in printable view).
- Invoice number `INV-YYYY-NNNN`, dealer challan `DC-YYYY-NNNN`, both reset per calendar year.

### 4. Printable invoice / challan
`src/components/pos/InvoicePrint.tsx` — two templates:
- **Retail**: header, items, totals, warranty card block per serial.
- **Dealer**: "Delivery Challan" header, items, no warranty card (dealer policy referenced), signature block.

`window.print()` action from confirmation screen.

### 5. Warranty Check screen — `/app/warranty`
Input: serial number (type or scan) → shows:
- Model + description, purchase date (unit.receivedAt), sale date + invoice #, customer/dealer, warranty type, expiry, status badge (green Active / red Expired).
- "Log Claim" button → creates `WarrantyClaim`.

### 6. Warranty claims — `/app/warranty/claims`
List + filter by status. Update lifecycle Pending → In Progress → Resolved/Rejected. When status = "in_progress", unit status flips to `warranty_service` (already an enum value); on resolved/rejected returns to previous.

### 7. Navigation
Add sidebar: **POS**, **Warranty** (with sub: Check, Claims). Keep existing Sales page as read-only history.

### 8. Permissions
Extend catalog: `open_pos`, `sell_retail`, `sell_dealer`, `apply_discount`, `override_discount_visibility`, `check_warranty`, `manage_warranty_claims`.

### 9. SQL migrations (docs/migrations)
- `00016_sales_pos_extensions.sql` — alter customers/items/sales; add sale_items.line_discount.
- `00017_warranty_claims.sql` — new table + RLS + GRANTs.
- `00018_sales_settings.sql` — settings row.

### 10. Testing
- **Unit tests** (`bunx vitest run`) for demo-store:
  - Scan available/sold/damaged serial paths.
  - Retail warranty date = sale + N months.
  - Dealer warranty uses model policy, not sale date.
  - Invoice/challan counters reset per year and are monotonic within year.
  - Discount visibility flag doesn't affect totals.
  - Dealer partial payment increments `customer.balance`.
  - Refund resets unit to `in_stock`, clears warranty, reverses balance.
  - Double-scan same serial in one cart is blocked.
- **Playwright smoke** against localhost: open POS → scan → confirm → check warranty screen shows Active.

## Build order
1. Types + demo-store extensions + settings.
2. `createPosSale`, invoice numbering, warranty compute helpers.
3. Vitest for the store logic (green before UI).
4. POS route + cart + printable template.
5. Warranty check + claims routes.
6. Sidebar, permissions, SQL migrations.
7. Playwright smoke.

## Non-goals (call out)
- No real accounting ledger — dealer credit tracked only via `customer.balance` (matches current demo scope).
- No tax engine beyond a flat % from settings.
- Barcode "scan" = keyboard input into focused field (USB scanners act as keyboards). No camera scanning yet.

Approve and I'll start with step 1.
