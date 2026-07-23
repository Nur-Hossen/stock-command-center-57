-- Migration: Create sales + sale_items tables
-- Feature: Brands, Serialized Units & Sales

CREATE TABLE public.sales (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number  text UNIQUE NOT NULL,
  customer_id  uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  status       text NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft','completed','refunded')),
  sold_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sold_at      timestamptz NOT NULL DEFAULT now(),
  subtotal     numeric(12,2) NOT NULL DEFAULT 0,
  tax          numeric(12,2) NOT NULL DEFAULT 0,
  total        numeric(12,2) NOT NULL DEFAULT 0,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER sales_updated_at
  BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_sales_customer_id ON public.sales(customer_id);
CREATE INDEX idx_sales_status ON public.sales(status);
CREATE INDEX idx_sales_sold_at ON public.sales(sold_at);

CREATE TABLE public.sale_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id         uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  item_unit_id    uuid UNIQUE REFERENCES public.item_units(id) ON DELETE RESTRICT,
  item_id         uuid NOT NULL REFERENCES public.items(id) ON DELETE RESTRICT,
  unit_price      numeric(10,2) NOT NULL DEFAULT 0,
  warranty_months integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX idx_sale_items_item_id ON public.sale_items(item_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_items TO authenticated;
GRANT ALL ON public.sale_items TO service_role;

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read sales"
  ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin and manager can insert sales"
  ON public.sales FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin and manager can update sales"
  ON public.sales FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin and manager can delete sales"
  ON public.sales FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Authenticated can read sale_items"
  ON public.sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin and manager can insert sale_items"
  ON public.sale_items FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin and manager can update sale_items"
  ON public.sale_items FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin and manager can delete sale_items"
  ON public.sale_items FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
