# Service Management module + unified Reports

## What the app already has (verified in code)

- Customers with type/balance, quick-create dialog, searchable picker.
- Products with brands, models, serial-tracked units, warranty months and
  warranty expiry per unit.
- Purchases (suppliers, purchase orders, receiving with serial capture).
- Sales (POS retail/dealer, manual sales orders, invoice/challan printing,
  partial refunds, delivery info: by hand / courier + tracking).
- Warranty claims: serial lookup, claim type service/replacement, claim
  delivery info, statuses pending / in progress / resolved / rejected.
- Custom roles with an action-based permission catalogue, route guards.
- Analytics: stock, movement, supplier and a basic sales tab. CSV export.
- Migration scripts 00001-00020 under `docs/migrations/` (scripts only, no
  live database connected).

## What the SRS asks for that is missing

- A Service Management module: service records, service numbers
  (SRV-YYYYMMDD-0001), paid / non-paid type, problem description, received and
  expected delivery dates, in-house vs outside product.
- Service billing: service charge, multiple parts lines, discount, VAT,
  net amount, printable service invoice.
- Service status workflow with enforced transitions and a status history log
  (who, when, notes).
- Payments: cash / bank / mobile financial services, partial payments,
  payment status, mandatory bank reference, MFS transaction id, payment proof
  attachment, and the rule that Delivered needs full payment.
- Receiving and delivery tracking: customer brought / courier / pickup /
  third party, courier charge and receipt, pickup details, product condition,
  condition photos, delivery person and receiver.
- Vendor-side warranty replacement: send to vendor, vendor statuses, return
  and quality check, replacement delivery.
- Service roles: Service Manager, Technician, Accountant, Viewer.
- Reports: 15 named service reports, plus equivalent purchase and sales
  reports (daily summary, revenue, collection, outstanding, customer-wise,
  product-wise, supplier/vendor-wise, monthly statistics).

## Build order (each task is independently testable)

**Task 1 - Data foundation.** Service types in `src/types/inventory.ts`
(Service, ServiceItem, ServiceStatusEvent, ServicePayment, ServiceTracking,
VendorWarrantyTracking) plus demo-store CRUD, service-number generator, seeded
demo services. Unit tests for numbering, totals, due amount.

**Task 2 - Service list and entry.** `/app/services` list (search, status and
date-range filter, CSV export) and a New Service form: customer picker with
quick-create, in-house product/serial search vs outside manual entry, service
type, problem description, dates, receiving method with dynamic courier/pickup
fields, product condition, photo upload.

**Task 3 - Service detail and status workflow.** Detail page with summary,
status update action honouring the allowed transitions, status history
timeline, notes, technician assignment. Tests for transition rules, locked
Delivered, and full-payment-before-delivery.

**Task 4 - Billing and invoice.** Parts/equipment lines, service charge,
discount, VAT, totals; non-paid services cannot carry a service charge.
Printable service invoice reusing the sales invoice look. Tests for totals.

**Task 5 - Payments.** Payment records with cash / bank / MFS conditional
fields, validation (bank reference mandatory, amount cannot exceed due),
running paid/due and payment status, proof attachment. Tests.

**Task 6 - Vendor warranty replacement.** Send-to-vendor flow on a service
(vendor = existing supplier), vendor statuses, courier and tracking, receive
back, quality check pass/fail, replacement delivery. Links to the existing
warranty claim so a claim can escalate into a service. Tests.

**Task 7 - Delivery and handover.** Delivery date, delivery person, receiver
name, notes, and a delivery confirmation dialog; Delivered locks the record.

**Task 8 - Roles and navigation.** New permissions (service view / create /
status update / billing / payments / vendor) added to the permission catalogue,
preset roles Service Manager, Technician, Accountant, Viewer, route guards, and
a Service Management sidebar group: New service, All services, Pending, Today,
Service reports.

**Task 9 - Reports module (service + purchase + sales).** One
`/app/reports` area with a shared report shell (date range, entity filter,
table, totals row, CSV and print export) and these report groups:

- Service: daily summary, daily revenue, daily collection, monthly statistics,
  monthly revenue, technician performance, customer-wise history, frequent
  service customers, product-wise services, most common issues, service
  revenue, payment collection, outstanding payments, vendor-wise warranty,
  vendor performance.
- Sales (same shapes on existing sale data): daily sales summary, daily and
  monthly revenue, collection and outstanding (dealer dues), customer-wise
  sales, product-wise sales, refund report, channel comparison.
- Purchases: daily and monthly purchase summary, supplier-wise purchases,
  product-wise purchases, pending/partial receipts, purchase cost trend.

Shared report calculations live in one module so service, sales and purchase
reports use the same aggregation and export code.

**Task 10 - Migrations and verification.** Migration scripts 00021+ for
services, service_items, service_status_history, service_payments,
service_tracking, warranty_tracking and vendor links, with grants and RLS.
Then full typecheck, full vitest run, and a browser walkthrough of
entry -> status -> billing -> payment -> delivery -> reports.

## Technical notes

- Everything runs against the in-memory demo store, matching how purchases,
  sales and warranty already work; SQL migrations are written as scripts under
  `docs/migrations/` because no live database is connected.
- Photos and payment proofs are stored as data URLs in demo mode; swapping to
  Cloud storage later is a single upload helper change.
- Vendors reuse the existing `Supplier` entity rather than a new table, per the
  SRS integration requirement that purchase vendors feed the service module.
- Delivery/courier fields reuse the existing `DeliveryInfo` type and
  `DeliveryFields` component, extended with courier charge and receipt number.
- Reports reuse the existing CSV export helper and print wrapper.

