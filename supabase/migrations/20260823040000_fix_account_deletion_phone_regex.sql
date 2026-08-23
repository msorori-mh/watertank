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

  IF normalized_phone !~ '^[+]9677[0-9]{8}$' THEN
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
