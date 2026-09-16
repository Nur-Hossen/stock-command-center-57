-- Delivery information on sales, partial refunds, and delivery info on warranty claims.

-- 1. Delivery details + partial-refund tracking on sales.
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS delivery_method text NOT NULL DEFAULT 'hand'
    CHECK (delivery_method IN ('hand', 'courier')),
  ADD COLUMN IF NOT EXISTS delivery_courier_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS delivery_tracking_number text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS delivery_address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS delivery_notes text NOT NULL DEFAULT '';

ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_status_check;
ALTER TABLE public.sales
  ADD CONSTRAINT sales_status_check
  CHECK (status IN ('draft', 'completed', 'partially_refunded', 'refunded'));

-- 2. Refund records (a sale can have several partial refunds).
CREATE TABLE IF NOT EXISTS public.sale_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  refund_number text NOT NULL UNIQUE,
  amount numeric(12, 2) NOT NULL DEFAULT 0,
  reason text NOT NULL DEFAULT '',
  delivery_method text NOT NULL DEFAULT 'hand'
    CHECK (delivery_method IN ('hand', 'courier')),
  delivery_courier_name text NOT NULL DEFAULT '',
  delivery_tracking_number text NOT NULL DEFAULT '',
  delivery_address text NOT NULL DEFAULT '',
  delivery_notes text NOT NULL DEFAULT '',
  refunded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sale_refunds_sale_idx ON public.sale_refunds(sale_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_refunds TO authenticated;
GRANT ALL ON public.sale_refunds TO service_role;

ALTER TABLE public.sale_refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read refunds" ON public.sale_refunds
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers manage refunds" ON public.sale_refunds
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- 3. Which units of a sale each refund returned.
CREATE TABLE IF NOT EXISTS public.sale_refund_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_id uuid NOT NULL REFERENCES public.sale_refunds(id) ON DELETE CASCADE,
  item_unit_id uuid NOT NULL REFERENCES public.item_units(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (refund_id, item_unit_id)
);

CREATE INDEX IF NOT EXISTS sale_refund_units_unit_idx ON public.sale_refund_units(item_unit_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_refund_units TO authenticated;
GRANT ALL ON public.sale_refund_units TO service_role;

ALTER TABLE public.sale_refund_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read refund units" ON public.sale_refund_units
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers manage refund units" ON public.sale_refund_units
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- 4. Delivery details on warranty claims.
ALTER TABLE public.warranty_claims
  ADD COLUMN IF NOT EXISTS delivery_method text NOT NULL DEFAULT 'hand'
    CHECK (delivery_method IN ('hand', 'courier')),
  ADD COLUMN IF NOT EXISTS delivery_courier_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS delivery_tracking_number text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS delivery_address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS delivery_notes text NOT NULL DEFAULT '';

CREATE TRIGGER trg_sale_refunds_updated
  BEFORE UPDATE ON public.sale_refunds
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
