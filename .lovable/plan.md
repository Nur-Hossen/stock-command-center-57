# Plan: End-to-end browser verification of PO receive fixes

## Goal
Confirm in the live app (not just unit tests) that the last round of fixes works: stock counting, duplicate-serial rejection, and serials on the printed purchase invoice.

## Status so far
- Typecheck: clean (0 errors)
- Unit tests: 13/13 passing, including the 3 + 2 + 40 = 45 stock regression test
- Remaining: browser-level verification

## Steps

1. **Open the app in demo mode** (dismiss onboarding/walkthrough if shown) and note the baseline stock of a test item in the Catalog.

2. **Create a test purchase order** with:
   - one serialized line (e.g. 2 units of a trackSerials item)
   - one non-serialized line (e.g. 10 units)

3. **Test duplicate-serial rejection**:
   - In Receive Shipment, enter the same serial twice → expect an inline "Duplicate serials entered" error and Confirm disabled.
   - Enter a serial that already exists in inventory → expect "Already in inventory" error.
   - Fix the serials to unique values and confirm receipt.

4. **Verify stock count**:
   - Return to Catalog → the serialized item's stock must increase by exactly the number of accepted serials (not double).
   - The non-serialized item's stock must increase by exactly the received quantity (not double).

5. **Verify printed invoice**:
   - Open the PO detail → Print view → confirm each serialized line lists all received serial numbers.

6. **Verify Units tab**: open the serialized item in Catalog → Units tab shows all received serial numbers.

7. **Re-run tests** (`tsgo --noEmit` + `vitest run`) at the end to confirm nothing regressed.

## Technical notes
- Verification via Playwright against the local dev server (http://localhost:8080), screenshots at each step.
- Any failure found gets fixed and re-verified in the same pass.
- No new features or UI changes — verification only (plus fixes if a step fails).
