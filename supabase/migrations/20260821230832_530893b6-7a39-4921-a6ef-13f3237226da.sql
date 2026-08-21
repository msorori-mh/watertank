DROP POLICY IF EXISTS "driver self register" ON public.drivers;
CREATE POLICY "driver self register"
ON public.drivers
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND license_status = 'pending'::public.license_status
  AND status = 'inactive'::public.driver_status
  AND balance = 0
  AND rating = 5.0
  AND payout_type IS NULL
  AND payout_method IS NULL
  AND payout_account IS NULL
  AND payout_recipient_name IS NULL
  AND bank_name IS NULL
  AND bank_account_number IS NULL
  AND bank_account_holder IS NULL
  AND transfer_recipient_name IS NULL
  AND transfer_phone IS NULL
  AND transfer_network_name IS NULL
);

CREATE OR REPLACE FUNCTION public.guard_driver_insert_defaults()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  NEW.user_id := auth.uid();
  NEW.license_status := 'pending'::public.license_status;
  NEW.status := 'inactive'::public.driver_status;
  NEW.balance := 0;
  NEW.rating := 5.0;
  NEW.payout_type := NULL;
  NEW.payout_method := NULL;
  NEW.payout_account := NULL;
  NEW.payout_recipient_name := NULL;
  NEW.bank_name := NULL;
  NEW.bank_account_number := NULL;
  NEW.bank_account_holder := NULL;
  NEW.transfer_recipient_name := NULL;
  NEW.transfer_phone := NULL;
  NEW.transfer_network_name := NULL;
  RETURN NEW;
END;
$$;
