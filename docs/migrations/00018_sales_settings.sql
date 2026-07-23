-- Singleton settings row for sales/POS configuration.

CREATE TABLE IF NOT EXISTS public.sales_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  show_discount_on_invoice boolean NOT NULL DEFAULT true,
  default_tax_rate numeric(6, 4) NOT NULL DEFAULT 0,
  business_name text NOT NULL DEFAULT 'Stackwise Store',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.sales_settings (id) VALUES (1)
  ON CONFLICT (id) DO NOTHING;

GRANT SELECT ON public.sales_settings TO authenticated;
GRANT UPDATE ON public.sales_settings TO authenticated;
GRANT ALL ON public.sales_settings TO service_role;

ALTER TABLE public.sales_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read settings" ON public.sales_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins write settings" ON public.sales_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
