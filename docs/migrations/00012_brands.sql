-- Migration: Create brands table
-- Feature: Brands, Serialized Units & Sales

CREATE TABLE public.brands (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text UNIQUE NOT NULL,
  logo_url    text,
  website     text,
  description text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER brands_updated_at
  BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_brands_is_active ON public.brands(is_active);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brands TO authenticated;
GRANT ALL ON public.brands TO service_role;

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read brands"
  ON public.brands FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin and manager can insert brands"
  ON public.brands FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admin and manager can update brands"
  ON public.brands FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admin and manager can delete brands"
  ON public.brands FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Extend items with brand + serial tracking metadata
ALTER TABLE public.items
  ADD COLUMN brand_id                uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  ADD COLUMN model                   text,
  ADD COLUMN model_year              integer,
  ADD COLUMN track_serials           boolean NOT NULL DEFAULT false,
  ADD COLUMN default_warranty_months integer NOT NULL DEFAULT 0;

CREATE INDEX idx_items_brand_id ON public.items(brand_id);
