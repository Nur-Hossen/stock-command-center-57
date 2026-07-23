-- Migration: Create item_units table (serialized inventory)
-- Feature: Brands, Serialized Units & Sales

CREATE TABLE public.item_units (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id                  uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  serial_number            text UNIQUE NOT NULL,
  status                   text NOT NULL DEFAULT 'in_stock'
                           CHECK (status IN ('in_stock','reserved','sold','returned','warranty_service','retired')),
  location_id              uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  purchase_order_item_id   uuid,
  received_at              timestamptz NOT NULL DEFAULT now(),
  sold_at                  timestamptz,
  warranty_months          integer NOT NULL DEFAULT 0,
  warranty_expires_at      timestamptz,
  cost                     numeric(10,2),
  notes                    text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER item_units_updated_at
  BEFORE UPDATE ON public.item_units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_item_units_item_id ON public.item_units(item_id);
CREATE INDEX idx_item_units_status ON public.item_units(status);
CREATE INDEX idx_item_units_location_id ON public.item_units(location_id);
CREATE INDEX idx_item_units_serial ON public.item_units(serial_number);

-- Allow optional link to serialized unit on stock movements
ALTER TABLE public.stock_movements
  ADD COLUMN item_unit_id uuid REFERENCES public.item_units(id) ON DELETE SET NULL;

CREATE INDEX idx_stock_movements_item_unit_id ON public.stock_movements(item_unit_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.item_units TO authenticated;
GRANT ALL ON public.item_units TO service_role;

ALTER TABLE public.item_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read item_units"
  ON public.item_units FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin and manager can insert item_units"
  ON public.item_units FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admin and manager can update item_units"
  ON public.item_units FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admin and manager can delete item_units"
  ON public.item_units FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
