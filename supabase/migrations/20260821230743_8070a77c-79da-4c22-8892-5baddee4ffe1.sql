-- SECURITY-DRIVER-WRITE-BOUNDARY-01
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
  AND rating = 0
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
  NEW.rating := 0;
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

DROP TRIGGER IF EXISTS trg_guard_driver_insert_defaults ON public.drivers;
CREATE TRIGGER trg_guard_driver_insert_defaults
BEFORE INSERT ON public.drivers
FOR EACH ROW EXECUTE FUNCTION public.guard_driver_insert_defaults();

CREATE OR REPLACE FUNCTION public.guard_driver_sensitive_columns()
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

  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.balance IS DISTINCT FROM OLD.balance
     OR NEW.license_status IS DISTINCT FROM OLD.license_status
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.rating IS DISTINCT FROM OLD.rating
     OR NEW.payout_type IS DISTINCT FROM OLD.payout_type
     OR NEW.payout_method IS DISTINCT FROM OLD.payout_method
     OR NEW.payout_account IS DISTINCT FROM OLD.payout_account
     OR NEW.payout_recipient_name IS DISTINCT FROM OLD.payout_recipient_name
     OR NEW.bank_name IS DISTINCT FROM OLD.bank_name
     OR NEW.bank_account_number IS DISTINCT FROM OLD.bank_account_number
     OR NEW.bank_account_holder IS DISTINCT FROM OLD.bank_account_holder
     OR NEW.transfer_recipient_name IS DISTINCT FROM OLD.transfer_recipient_name
     OR NEW.transfer_phone IS DISTINCT FROM OLD.transfer_phone
     OR NEW.transfer_network_name IS DISTINCT FROM OLD.transfer_network_name THEN
    RAISE EXCEPTION 'not allowed to modify protected driver fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_driver_sensitive_columns ON public.drivers;
CREATE TRIGGER trg_guard_driver_sensitive_columns
BEFORE UPDATE ON public.drivers
FOR EACH ROW EXECUTE FUNCTION public.guard_driver_sensitive_columns();

CREATE OR REPLACE FUNCTION public.update_my_driver_payout(
  _payout_type text,
  _bank_name text DEFAULT NULL,
  _bank_account_number text DEFAULT NULL,
  _bank_account_holder text DEFAULT NULL,
  _transfer_recipient_name text DEFAULT NULL,
  _transfer_phone text DEFAULT NULL,
  _transfer_network_name text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _driver public.drivers;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF _payout_type NOT IN ('bank','transfer_network') THEN
    RAISE EXCEPTION 'invalid payout type';
  END IF;

  SELECT * INTO _driver FROM public.drivers WHERE user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'driver not found'; END IF;

  IF _payout_type = 'bank' THEN
    IF COALESCE(btrim(_bank_account_number), '') = ''
       OR COALESCE(btrim(_bank_account_holder), '') = '' THEN
      RAISE EXCEPTION 'bank account details required';
    END IF;
  ELSE
    IF COALESCE(btrim(_transfer_phone), '') = ''
       OR COALESCE(btrim(_transfer_recipient_name), '') = '' THEN
      RAISE EXCEPTION 'transfer details required';
    END IF;
  END IF;

  UPDATE public.drivers SET
    payout_type = _payout_type,
    payout_method = CASE WHEN _payout_type = 'bank' THEN 'bank' ELSE 'transfer_network' END,
    payout_account = CASE WHEN _payout_type = 'bank'
                          THEN btrim(_bank_account_number) ELSE btrim(_transfer_phone) END,
    payout_recipient_name = CASE WHEN _payout_type = 'bank'
                          THEN btrim(_bank_account_holder) ELSE btrim(_transfer_recipient_name) END,
    bank_name = NULLIF(btrim(_bank_name), ''),
    bank_account_number = NULLIF(btrim(_bank_account_number), ''),
    bank_account_holder = NULLIF(btrim(_bank_account_holder), ''),
    transfer_recipient_name = NULLIF(btrim(_transfer_recipient_name), ''),
    transfer_phone = NULLIF(btrim(_transfer_phone), ''),
    transfer_network_name = NULLIF(btrim(_transfer_network_name), '')
  WHERE id = _driver.id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_my_driver_payout(text,text,text,text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_my_driver_payout(text,text,text,text,text,text,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_my_driver_payout(text,text,text,text,text,text,text) TO authenticated;
