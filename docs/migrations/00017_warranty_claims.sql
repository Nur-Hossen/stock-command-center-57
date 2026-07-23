-- Warranty claims tracking.

CREATE TABLE IF NOT EXISTS public.warranty_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_unit_id uuid NOT NULL REFERENCES public.item_units(id) ON DELETE CASCADE,
  sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  claim_type text NOT NULL CHECK (claim_type IN ('service', 'replacement')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'resolved', 'rejected')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS warranty_claims_unit_idx ON public.warranty_claims(item_unit_id);
CREATE INDEX IF NOT EXISTS warranty_claims_status_idx ON public.warranty_claims(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.warranty_claims TO authenticated;
GRANT ALL ON public.warranty_claims TO service_role;

ALTER TABLE public.warranty_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read claims" ON public.warranty_claims
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers manage claims" ON public.warranty_claims
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE TRIGGER trg_warranty_claims_updated
  BEFORE UPDATE ON public.warranty_claims
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
