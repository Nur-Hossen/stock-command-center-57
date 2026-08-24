-- Migration: Store received serial numbers on PO line items
-- Feature: Serialized receiving — serials printed on purchase invoices

ALTER TABLE public.purchase_order_items
  ADD COLUMN received_serials text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.purchase_order_items.received_serials
  IS 'Serial numbers received for this line (serialized items only), appended on each receipt.';
