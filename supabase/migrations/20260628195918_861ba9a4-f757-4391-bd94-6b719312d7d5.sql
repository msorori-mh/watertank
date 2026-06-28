
CREATE OR REPLACE FUNCTION public.resolve_order_price(_city text, _capacity integer)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO public AS $$
  SELECT price FROM public.pricing WHERE city = _city AND capacity = _capacity LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.assert_active_customer(_uid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid AND is_active = true) THEN
    RAISE EXCEPTION 'account inactive';
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.validate_order_address(_uid uuid, _city text, _address_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
DECLARE _addr public.addresses;
BEGIN
  SELECT * INTO _addr FROM public.addresses WHERE id = _address_id AND user_id = _uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid address'; END IF;
  IF _addr.city <> _city THEN RAISE EXCEPTION 'city mismatch'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.cities WHERE name = _city AND is_active = true) THEN
    RAISE EXCEPTION 'city inactive';
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.create_cash_order(
  _city text, _address_id uuid, _address_snapshot jsonb,
  _water_type public.water_type, _capacity integer, _notes text DEFAULT NULL
) RETURNS public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
DECLARE _uid uuid := auth.uid(); _price numeric; _order public.orders;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  PERFORM public.assert_active_customer(_uid);
  PERFORM public.validate_order_address(_uid, _city, _address_id);
  _price := public.resolve_order_price(_city, _capacity);
  IF _price IS NULL THEN RAISE EXCEPTION 'no pricing for city/capacity'; END IF;

  INSERT INTO public.orders (
    customer_id, city, address_id, address_snapshot,
    water_type, capacity, quantity, price,
    payment_method, payment_status, notes, status
  ) VALUES (
    _uid, _city, _address_id, _address_snapshot,
    _water_type, _capacity, 1, _price,
    'cash', 'pending', _notes, 'pending'
  ) RETURNING * INTO _order;
  RETURN _order;
END; $$;

CREATE OR REPLACE FUNCTION public.cancel_customer_order(_order_id uuid)
RETURNS public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
DECLARE _uid uuid := auth.uid(); _order public.orders;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT * INTO _order FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order not found'; END IF;
  IF _order.customer_id <> _uid THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _order.status <> 'pending'::public.order_status THEN
    RAISE EXCEPTION 'only pending orders can be cancelled';
  END IF;
  UPDATE public.orders SET status = 'cancelled', updated_at = now()
   WHERE id = _order_id RETURNING * INTO _order;
  RETURN _order;
END; $$;

CREATE OR REPLACE FUNCTION public.advance_driver_order_status(
  _order_id uuid, _new_status public.order_status
) RETURNS public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
DECLARE _order public.orders; _driver public.drivers; _allowed boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT * INTO _order FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order not found'; END IF;
  SELECT * INTO _driver FROM public.drivers WHERE id = _order.driver_id;
  IF NOT FOUND OR _driver.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _driver.license_status <> 'approved'::public.license_status THEN
    RAISE EXCEPTION 'driver not approved';
  END IF;
  _allowed := (
    (_order.status = 'assigned' AND _new_status = 'accepted')
    OR (_order.status = 'accepted' AND _new_status = 'on_the_way')
    OR (_order.status = 'on_the_way' AND _new_status = 'arrived')
    OR (_order.status = 'arrived' AND _new_status = 'delivering')
    OR (_order.status = 'payment_collected' AND _new_status = 'completed')
  );
  IF NOT _allowed THEN
    RAISE EXCEPTION 'invalid status transition from % to %', _order.status, _new_status;
  END IF;
  UPDATE public.orders SET status = _new_status, updated_at = now()
   WHERE id = _order_id RETURNING * INTO _order;
  RETURN _order;
END; $$;

CREATE OR REPLACE FUNCTION public.claim_approved_order(_order_id uuid)
RETURNS public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
DECLARE _driver public.drivers; _order public.orders; _active_count integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT * INTO _driver FROM public.drivers WHERE user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'driver not found'; END IF;
  IF _driver.license_status <> 'approved' THEN RAISE EXCEPTION 'driver not approved'; END IF;
  SELECT COUNT(*) INTO _active_count FROM public.orders
   WHERE driver_id = _driver.id
     AND status IN ('assigned','accepted','on_the_way','arrived','delivering','payment_collected');
  IF _active_count > 0 THEN RAISE EXCEPTION 'finish current order first'; END IF;
  SELECT * INTO _order FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order not found'; END IF;
  IF _order.status <> 'approved' OR _order.driver_id IS NOT NULL THEN
    RAISE EXCEPTION 'order not available';
  END IF;
  IF _driver.city IS NOT NULL AND _driver.city <> _order.city THEN
    RAISE EXCEPTION 'city mismatch';
  END IF;
  UPDATE public.orders
     SET driver_id = _driver.id, status = 'accepted', updated_at = now()
   WHERE id = _order_id AND status = 'approved' AND driver_id IS NULL
   RETURNING * INTO _order;
  IF NOT FOUND THEN RAISE EXCEPTION 'order already claimed'; END IF;
  RETURN _order;
END; $$;

REVOKE ALL ON FUNCTION public.create_cash_order(text, uuid, jsonb, public.water_type, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_cash_order(text, uuid, jsonb, public.water_type, integer, text) TO authenticated;
REVOKE ALL ON FUNCTION public.cancel_customer_order(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_customer_order(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.advance_driver_order_status(uuid, public.order_status) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.advance_driver_order_status(uuid, public.order_status) TO authenticated;
REVOKE ALL ON FUNCTION public.claim_approved_order(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_approved_order(uuid) TO authenticated;
