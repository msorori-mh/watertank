-- SEC-DRIVERS-PAYOUT-EXPOSURE-01
-- Customers must not read the drivers table directly (financial/payout columns).
DROP POLICY IF EXISTS "customer reads assigned driver" ON public.drivers;

CREATE OR REPLACE FUNCTION public.get_order_driver_public(_order_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  name text,
  phone text,
  vehicle_plate text,
  vehicle_capacity integer,
  city text,
  status public.driver_status,
  availability public.driver_availability,
  rating numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.orders o
     WHERE o.id = _order_id
       AND o.driver_id IS NOT NULL
       AND (
         o.customer_id = auth.uid()
         OR public.has_role(auth.uid(), 'admin')
         OR EXISTS (SELECT 1 FROM public.drivers d2
                     WHERE d2.id = o.driver_id AND d2.user_id = auth.uid())
       )
  ) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  RETURN QUERY
  SELECT d.id, d.user_id, d.name, d.phone, d.vehicle_plate, d.vehicle_capacity,
         d.city, d.status, d.availability, d.rating
    FROM public.orders o
    JOIN public.drivers d ON d.id = o.driver_id
   WHERE o.id = _order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_order_driver_public(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_order_driver_public(uuid) TO authenticated;