
-- 1) Enable realtime on orders
ALTER TABLE public.orders REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.orders';
  END IF;
END $$;

-- 2) Atomic payment collection RPC
CREATE OR REPLACE FUNCTION public.collect_order_payment(_order_id uuid)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order public.orders;
  _driver public.drivers;
  _is_admin boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;

  SELECT * INTO _order FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order not found'; END IF;

  _is_admin := public.has_role(auth.uid(), 'admin');

  IF _order.driver_id IS NULL THEN
    RAISE EXCEPTION 'order has no assigned driver';
  END IF;

  SELECT * INTO _driver FROM public.drivers WHERE id = _order.driver_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'driver not found'; END IF;

  IF NOT _is_admin AND _driver.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _order.status <> 'delivering' THEN
    RAISE EXCEPTION 'order must be in delivering state';
  END IF;

  IF _order.payment_status = 'paid' THEN
    RAISE EXCEPTION 'order already paid';
  END IF;

  UPDATE public.orders
     SET status = 'payment_collected',
         payment_status = 'paid',
         payment_collected_at = now(),
         updated_at = now()
   WHERE id = _order_id
   RETURNING * INTO _order;

  UPDATE public.drivers
     SET balance = balance + _order.price
   WHERE id = _driver.id;

  INSERT INTO public.order_status_history(order_id, status, notes)
  VALUES (_order_id, 'payment_collected', 'collected via collect_order_payment');

  RETURN _order;
END;
$$;

REVOKE ALL ON FUNCTION public.collect_order_payment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.collect_order_payment(uuid) TO authenticated;
