-- GOOGLE-PLAY-WEB-COMPLIANCE-01
-- In-app authenticated deletion plus a public web request path.
-- Public requests do not reveal whether an account exists and expose no readable rows.

CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  requester_type text NOT NULL DEFAULT 'customer'
    CHECK (requester_type IN ('customer', 'driver')),
  reason text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'verified', 'completed', 'rejected')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  completed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.account_deletion_requests FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS account_deletion_requests_phone_status_idx
  ON public.account_deletion_requests (phone, status, requested_at DESC);

CREATE OR REPLACE FUNCTION public.request_account_deletion(
  _phone text,
  _requester_type text DEFAULT 'customer',
  _reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  normalized_phone text := regexp_replace(coalesce(_phone, ''), '[^0-9+]', '', 'g');
  existing_id uuid;
  request_id uuid;
BEGIN
  IF normalized_phone LIKE '00967%' THEN
    normalized_phone := '+' || substring(normalized_phone FROM 3);
  ELSIF normalized_phone LIKE '967%' THEN
    normalized_phone := '+' || normalized_phone;
  ELSIF normalized_phone LIKE '07%' THEN
    normalized_phone := '+967' || substring(normalized_phone FROM 2);
  ELSIF normalized_phone LIKE '7%' THEN
    normalized_phone := '+967' || normalized_phone;
  END IF;

  IF normalized_phone !~ '^\\+9677[0-9]{8}$' THEN
    RAISE EXCEPTION 'invalid phone format';
  END IF;

  IF _requester_type NOT IN ('customer', 'driver') THEN
    RAISE EXCEPTION 'invalid requester type';
  END IF;

  SELECT id INTO existing_id
  FROM public.account_deletion_requests
  WHERE phone = normalized_phone
    AND status IN ('pending', 'verified')
    AND requested_at > now() - interval '30 days'
  ORDER BY requested_at DESC
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    RETURN existing_id;
  END IF;

  INSERT INTO public.account_deletion_requests (phone, requester_type, reason)
  VALUES (
    normalized_phone,
    _requester_type,
    nullif(left(trim(coalesce(_reason, '')), 500), '')
  )
  RETURNING id INTO request_id;

  RETURN request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_account_deletion(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_account_deletion(text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = uid AND ur.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'admin accounts cannot be deleted from the app';
  END IF;

  DELETE FROM public.driver_withdrawal_requests
  WHERE driver_id IN (SELECT id FROM public.drivers WHERE user_id = uid);

  UPDATE public.orders SET driver_id = NULL
  WHERE driver_id IN (SELECT id FROM public.drivers WHERE user_id = uid);

  DELETE FROM public.drivers WHERE user_id = uid;
  DELETE FROM public.addresses WHERE user_id = uid;
  DELETE FROM public.notifications WHERE user_id = uid;
  DELETE FROM public.orders WHERE customer_id = uid;
  DELETE FROM public.wallet_transactions WHERE user_id = uid;
  DELETE FROM public.wallet_topups WHERE user_id = uid;
  DELETE FROM public.wallets WHERE user_id = uid;
  DELETE FROM public.user_roles WHERE user_id = uid;
  DELETE FROM public.profiles WHERE id = uid;
  DELETE FROM auth.users WHERE id = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

COMMENT ON TABLE public.account_deletion_requests IS
  'Google Play web account-deletion requests. Rows are private and processed by administrators.';
