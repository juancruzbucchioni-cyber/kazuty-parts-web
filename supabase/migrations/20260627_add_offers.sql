CREATE TABLE IF NOT EXISTS public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Oferta especial',
  badge text NOT NULL DEFAULT 'SALE',
  offer_price numeric(10,2),
  activo boolean NOT NULL DEFAULT true,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'offers'
      AND policyname = 'Anyone can view offers'
  ) THEN
    CREATE POLICY "Anyone can view offers"
      ON public.offers
      FOR SELECT
      USING (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'offers'
      AND policyname = 'Authenticated users can manage offers'
  ) THEN
    CREATE POLICY "Authenticated users can manage offers"
      ON public.offers
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_offers_activo_orden
  ON public.offers (activo, orden, created_at DESC);

