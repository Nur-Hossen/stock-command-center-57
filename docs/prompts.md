**Q-1:** I want to customize role, not fixed list.
**Q-2:**
- I need a Brand feature for managing different brands of each product.

 - I have a product, suppose Samsung Galaxy Buds Pro, 2024 model, with a unique serial number for each unit. This serial number will be used to track the warranty and sales history of each individual product.

 ** Plan first, then we build after that with proper testing.
**Q-3:**
I am sharing my sales logic below. you analyse and plan my logic with yours and plane a best way within both, build, and perform proper testing.

Module : POS & Sales Management

The POS screen supports two distinct sales channels from a single interface, selectable before starting a sale.

Retail Sale Flow:

    5. Select customer type = Retail. Enter or search customer name/phone.

    6. Scan barcode or type serial number. System validates:

        a) If status = Available: loads model name and price into the invoice cart.

        b) If status = Sold/Damaged/Returned: shows error message 'Invalid or Already Sold' and blocks the item.

    7. Add multiple items to the cart. Apply product-level discount or gross discount.

    8. On confirm: single ACID transaction executes — serial status → 'Sold', warranty_expiry_date written, invoice saved, accounting entries created, warranty slip generated.

Dealer/Sub-Dealer Sale Flow:

    9. Select customer type = Dealer. Select dealer from registered dealer list.

    10. Same serial scan and validation as retail.

    11. Invoice generates as a Delivery Challan with unique challan number.

    12. Dealer warranty policy is applied (as configured on the model, not from sale date).

    13. If dealer pays partially or fully on credit: dealer balance in customers.balance is updated and accounts receivable entry is created.

Discount & Invoice Settings:

    • Discounts can be applied per-product (line-level) or as a gross amount across the full invoice.

    • A system setting controls whether discount is printed on the invoice or hidden (useful when the business does not want to reveal discount to all parties).

    • Invoice number is auto-generated in the format INV-YYYY-NNNN, resetting per year.

    • Separate invoice templates for retail (with warranty card) and dealer (delivery challan format).

    

Module : Warranty Management

Every serial number sold carries a warranty record. The warranty system is the bridge between sales and customer service.

Warranty Logic:

    • Retail: warranty_expiry_date = sale_date + warranty_months_retail (from product_models).

    • Dealer: warranty_expiry_date is calculated based on the dealer warranty policy configured on the model (may be based on purchase date or a fixed period regardless of sale date).

    • Warranty type (Service vs Replacement) is stored per serial number, inherited from the model configuration.

Warranty Check Screen:

Any user with support access types or scans the serial number. The system immediately shows:

    • Product model name and description.

    • Purchase date (when the business bought it from vendor).

    • Sale date and invoice number.

    • Customer name and contact (retail) or dealer name (dealer sale).

    • Warranty expiry date and current status: Active (green) or Expired (red).

    • Warranty type: Service or Replacement.

Warranty Claims:

Staff can log a warranty claim against any serial number, specifying claim type and notes. The warranty_claims table tracks the claim through its lifecycle from Pending to Resolved/Rejected.

**Q-4:**
- Need to showing at dashboard seles order count, pending order, canceled order(%).
- Sales analytics dashboard.
- Last 5 customer Orders at dashboard.

- Rename sales manu by sales order. and sales order can't add right now.

**Q-5:**
- Select by default Walk-in Customer at pos and sales order add page.
- Need a new customer add (+) button at pos and sales order add page after the customer dropdown. And after clicking the button, the customer add page is shown in a modal, and after saving, the saved customer will automatically be selected in the customer dropdown. There, the customer add page will sort by customer type and phone number.

next-q:
- Customer added the required type and phone, not the name field. 