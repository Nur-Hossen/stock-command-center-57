# Brands, Serialized Units & Sales

Adds three connected features to Stackwise:

1. **Brands** — full CRUD entity, linkable to items.
2. **Serialized units** — each physical unit (e.g. a specific Galaxy Buds Pro) is tracked by serial number with status, warranty, and history.
3. **Sales module** — customers + sales/invoices linking serial units to buyers.

---

## 1. Data model (Supabase migrations + demo store)

New tables (with GRANTs + RLS scoped to `authenticated`, admin/manager write):

- **brands** — `id, name (unique), logo_url, website, description, is_active, created_at, updated_at`.
- **item_units** — one row per physical unit:
  `id, item_id (FK items), serial_number (unique), status ('in_stock'|'reserved'|'sold'|'returned'|'warranty_service'|'retired'), location_id, purchase_order_item_id (nullable), received_at, warranty_months, warranty_expires_at, cost, notes, created_at, updated_at`.
- **customers** — `id, name, email, phone, address, notes, created_at, updated_at`.
- **sales** — `id, sale_number (auto), customer_id, status ('draft'|'completed'|'refunded'), sold_by, sold_at, subtotal, tax, total, notes, created_at, updated_at`.
- **sale_items** — `id, sale_id (CASCADE), item_unit_id (unique, FK item_units), item_id, unit_price, warranty_months`. One unit can appear on at most one active sale.

Changes to existing tables:
- **items**: add `brand_id uuid → brands`, `model` text, `model_year` int, `track_serials` boolean default false, `default_warranty_months` int.
- **stock_movements**: add optional `item_unit_id` so unit-level moves are auditable.

Triggers/logic:
- On sale completion: mark linked units `sold`, set `warranty_expires_at = sold_at + warranty_months`, decrement `items.quantity_on_hand`, insert a `shipped` stock_movement per unit.
- On PO receive (existing flow): when `track_serials=true`, prompt for serials → insert `item_units` rows in `in_stock` and increment quantity from that count.
- For non-serialized items, current quantity flow is unchanged.

Mirror all of the above in `src/lib/demo-store.ts` (in-memory) and demo seed files so the app keeps working in demo mode without Supabase.

## 2. UI

**Settings → Brands tab** (new `BrandManager.tsx`): list, create/edit sheet (name, logo, website, description, active), delete with confirm. Reuses existing manager patterns from Categories/Suppliers.

**Catalog**:
- `ItemFormSheet`: add Brand dropdown, Model, Model Year, "Track individual serial numbers" toggle, Default warranty (months).
- `CatalogFilters`: add Brand filter.
- `CatalogTable`: add optional Brand column.
- `ItemDetailSheet`: new **Units** tab (only when `track_serials`) listing serial numbers with status badge, warranty expiry, current location, and per-unit history. Add/edit/retire unit actions.

**Purchase Orders → Receive Shipment**: when a line item is serialized, require entering N serial numbers before confirming receipt.

**New route `/app/sales`** (`app.sales.tsx`):
- Sales list table with filters (status, customer, date range).
- New Sale sheet: pick customer (or quick-create), scan/enter serial numbers OR pick item + unit, price per unit, warranty override, totals. Completing the sale marks units sold.
- Sale detail sheet: line items, customer, print/export.

**New route `/app/customers`** (`app.customers.tsx`): CRUD list + detail sheet showing purchase history (all serial units they own, warranty status).

**Warranty view**: on unit detail — status chip (Active / Expiring soon / Expired) computed from `warranty_expires_at`. Filter on Units tab and in a small "Warranty" section on the customer detail.

**Sidebar & command palette**: add Sales, Customers entries; permission-gated.

## 3. Permissions

Extend `PERMISSION_CATALOG` in `src/lib/roles.ts` with: `brands.manage`, `sales.view`, `sales.create`, `sales.manage`, `customers.view`, `customers.manage`, `units.view`, `units.manage`. Update built-in Admin/Manager/Requestor defaults. Wire into `route-guard.ts` for the new routes.

## 4. Testing

- **Unit tests** (Vitest): serial uniqueness, warranty-expiry computation, sale completion transitions unit statuses correctly, quantity-on-hand stays consistent with unit counts for serialized items.
- **E2E** (Playwright, extending existing `e2e/` setup): create brand → create serialized item under it → receive PO with 3 serials → create customer → sell 2 serials → verify quantity dropped by 2, units marked sold, warranty dates set, customer detail shows both units, third unit still in stock.
- **Manual demo-mode smoke check** via the preview: brand CRUD, serial entry on receive, sale flow, warranty badge states.

## 5. Build order

1. Migrations + demo-store types/methods + roles/permissions.
2. Brands CRUD (settings tab + item form field + filter).
3. Serialized units: item toggle, receive flow, Units tab on item detail.
4. Customers CRUD.
5. Sales module (list + create + detail).
6. Warranty surfacing + sidebar/command palette entries.
7. Tests, then a documentation update in `docs/` (new PRD entry + schema doc).

## Technical notes

- Follow existing hook/mutation patterns (`useInventoryData`, `useInventoryMutations`) — no `useEffect + fetch`.
- Server writes go through `createServerFn` with `requireSupabaseAuth`; RLS enforces admin/manager for writes.
- `sale_items.item_unit_id UNIQUE` prevents double-selling the same physical unit.
- Serial uniqueness is per table (globally unique) with a DB constraint; catch conflicts and surface friendly errors in the form.
- Keep everything working in demo mode (no Supabase required) by mirroring logic in `demo-store.ts` and demo seeds.
