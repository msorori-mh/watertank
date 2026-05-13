
DO $$ BEGIN
  CREATE TYPE public.license_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.driver_availability AS ENUM ('available', 'busy', 'offline');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS license_status public.license_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS balance numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS availability public.driver_availability NOT NULL DEFAULT 'offline';

DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'driver';
EXCEPTION WHEN others THEN null; END $$;

DROP POLICY IF EXISTS "driver self register" ON public.drivers;
CREATE POLICY "driver self register"
  ON public.drivers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "driver updates own row" ON public.drivers;
CREATE POLICY "driver updates own row"
  ON public.drivers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "driver updates assigned orders" ON public.orders;
CREATE POLICY "driver updates assigned orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = orders.driver_id AND d.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = orders.driver_id AND d.user_id = auth.uid()));

DROP POLICY IF EXISTS "drivers view available orders" ON public.orders;
CREATE POLICY "drivers view available orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    status IN ('pending', 'approved')
    AND EXISTS (
      SELECT 1 FROM public.drivers d
      WHERE d.user_id = auth.uid()
        AND d.license_status = 'approved'
        AND (d.city IS NULL OR d.city = orders.city)
    )
  );
