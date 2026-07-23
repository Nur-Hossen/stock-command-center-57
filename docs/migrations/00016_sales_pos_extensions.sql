-- Extend sales/customers/items for POS + dealer channel + discounts + doc numbering.

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'retail'
    CHECK (type IN ('retail', 'dealer')),
  ADD COLUMN IF NOT EXISTS balance numeric(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS warranty_months_retail integer NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS warranty_months_dealer integer NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS warranty_type text NOT NULL DEFAULT 'service'
    CHECK (warranty_type IN ('service', 'replacement'));

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS document_number text UNIQUE,
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'retail'
    CHECK (channel IN ('retail', 'dealer')),
  ADD COLUMN IF NOT EXISTS line_discount_total numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gross_discount numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_paid numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_due numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS show_discount_on_invoice boolean NOT NULL DEFAULT true;

ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS line_discount numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS warranty_type text NOT NULL DEFAULT 'service'
    CHECK (warranty_type IN ('service', 'replacement'));

-- Per-year counters for invoice / challan numbering.
CREATE TABLE IF NOT EXISTS public.sales_document_counters (
  channel text NOT NULL CHECK (channel IN ('retail', 'dealer')),
  year integer NOT NULL,
  counter integer NOT NULL DEFAULT 0,
  PRIMARY KEY (channel, year)
);

GRANT SELECT, INSERT, UPDATE ON public.sales_document_counters TO authenticated;
GRANT ALL ON public.sales_document_counters TO service_role;

ALTER TABLE public.sales_document_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read counters" ON public.sales_document_counters
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers write counters" ON public.sales_document_counters
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
