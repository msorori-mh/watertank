-- Allow assigned driver to fetch customer contact for an active order
CREATE OR REPLACE FUNCTION public.get_order_customer_contact(_order_id uuid)
RETURNS TABLE(name text, phone text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.drivers d ON d.id = o.driver_id
    WHERE o.id = _order_id
      AND d.user_id = auth.uid()
      AND o.status IN ('accepted','on_the_way','arrived','delivering','payment_collected')
  ) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  RETURN QUERY
  SELECT p.name, p.phone
  FROM public.orders o
  JOIN public.profiles p ON p.id = o.customer_id
  WHERE o.id = _order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_order_customer_contact(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_customer_contact(uuid) TO authenticated;