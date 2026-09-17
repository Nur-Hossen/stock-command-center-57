# Approved sales and warranty fixes
- [x] Complete delivery and partial-refund store logic and migration script.
- [x] Add sales printing, product search, delivery forms, and refund page.
- [x] Restore claims page and confirmation/delivery workflow.
- [x] Run regression tests and browser walkthrough.

Verification: 21 unit tests passed on 2026-09-17. Browser walkthrough passed for manual product search (selected units retained), courier sale, invoice content and print invocation, partial refund confirmation/cancellation, disabled already-refunded unit, stored return delivery, service claim confirmation, claim delivery/order reference, and pending → in progress → resolved. Print styling was visually inspected; no physical printer was tested. POS courier sale and claims-page navigation were verified in the earlier walkthrough.

Deployment note: migration 00020 is provided as a script only; no live database is connected or migrated.
