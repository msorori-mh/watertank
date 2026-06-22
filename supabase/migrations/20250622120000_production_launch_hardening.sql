-- Production launch hardening: auth, orders, drivers, storage, notifications

-- =============================================================================
-- 1) AUTH: safe role assignment + admin invite codes
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.admin_invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  max_uses integer NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  use_count integer NOT NULL DEFAULT 0 CHECK (use_count >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_invite_codes ENABLE ROW LEVEL SECURITY;

-- No SELECT/INSERT policies — only SECURITY DEFINER RPCs may read this table.

INSERT INTO public.admin_invite_codes (code, max_uses)
VALUES ('WAYET2025', 10)
ON CONFLICT (code) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, phone, name, type)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    'customer'::public.user_type
  )
  ON CONFLICT (id) DO NOTHING;

  -- Always customer on signup; admin via promote_to_admin, driver via assign_initial_role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer'::public.app_role)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.promote_to_admin(_setup_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _invite public.admin_invite_codes;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;

  IF public.has_role(_uid, 'admin'::public.app_role) THEN
    RETURN;
  END IF;

  SELECT * INTO _invite
  FROM public.admin_invite_codes
  WHERE code = trim(_setup_code)
    AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'invalid admin setup code'; END IF;
  IF _invite.use_count >= _invite.max_uses THEN RAISE EXCEPTION 'admin setup code exhausted'; END IF;

  UPDATE public.admin_invite_codes
     SET use_count = use_count + 1
   WHERE id = _invite.id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.profiles
     SET type = 'admin'::public.user_type
   WHERE id = _uid;
END;
$function$;

CREATE OR REPLACE FUNCTION public.assign_initial_role(_role public.app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF _role = 'admin'::public.app_role THEN RAISE EXCEPTION 'use promote_to_admin for admin role'; END IF;
  IF _role NOT IN ('customer'::public.app_role, 'driver'::public.app_role) THEN
    RAISE EXCEPTION 'invalid role';
  END IF;

  IF public.has_role(_uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'admin accounts cannot change portal role';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF _role = 'driver'::public.app_role THEN
    UPDATE public.profiles SET type = 'driver'::public.user_type WHERE id = _uid;
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.promote_to_admin(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_to_admin(text) TO authenticated;

REVOKE ALL ON FUNCTION public.assign_initial_role(public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_initial_role(public.app_role) TO authenticated;

-- =============================================================================
-- 2) ORDER HELPERS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.resolve_order_price(_city text, _capacity integer)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT price
  FROM public.pricing
  WHERE city = _city AND capacity = _capacity
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.assert_active_customer(_uid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = _uid AND is_active = true
  ) THEN
    RAISE EXCEPTION 'account inactive';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_order_address(_uid uuid, _city text, _address_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  _addr public.addresses;
BEGIN
  SELECT * INTO _addr FROM public.addresses WHERE id = _address_id AND user_id = _uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid address'; END IF;
  IF _addr.city <> _city THEN RAISE EXCEPTION 'city mismatch'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.cities WHERE name = _city AND is_active = true) THEN
    RAISE EXCEPTION 'city inactive';
  END IF;
END;
$function$;

-- =============================================================================
-- 3) ORDER RPCs (price validation, controlled transitions)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_wallet_order(
  _city text,
  _address_id uuid,
  _address_snapshot jsonb,
  _water_type public.water_type,
  _capacity integer,
  _price numeric,
  _notes text DEFAULT NULL
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _wallet public.wallets;
  _new_balance numeric;
  _order public.orders;
  _expected numeric;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  PERFORM public.assert_active_customer(_uid);
  PERFORM public.validate_order_address(_uid, _city, _address_id);

  _expected := public.resolve_order_price(_city, _capacity);
  IF _expected IS NULL THEN RAISE EXCEPTION 'no pricing for city/capacity'; END IF;
  IF _price IS NULL OR _price <> _expected THEN RAISE EXCEPTION 'invalid price'; END IF;

  SELECT * INTO _wallet FROM public.wallets WHERE user_id = _uid FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, balance) VALUES (_uid, 0) RETURNING * INTO _wallet;
  END IF;

  IF _wallet.balance < _price THEN RAISE EXCEPTION 'insufficient wallet balance'; END IF;

  _new_balance := _wallet.balance - _price;
  UPDATE public.wallets SET balance = _new_balance, updated_at = now() WHERE id = _wallet.id;

  INSERT INTO public.orders (
    customer_id, city, address_id, address_snapshot,
    water_type, capacity, quantity, price,
    payment_method, payment_status, notes, wallet_paid_at, status
  ) VALUES (
    _uid, _city, _address_id, _address_snapshot,
    _water_type, _capacity, 1, _price,
    'wallet', 'paid', _notes, now(), 'pending'
  ) RETURNING * INTO _order;

  INSERT INTO public.wallet_transactions
    (wallet_id, user_id, order_id, type, direction, amount, balance_after, description)
  VALUES
    (_wallet.id, _uid, _order.id, 'order_payment', 'debit', _price, _new_balance,
     'دفع طلب من المحفظة');

  RETURN _order;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_cash_order(
  _city text,
  _address_id uuid,
  _address_snapshot jsonb,
  _water_type public.water_type,
  _capacity integer,
  _notes text DEFAULT NULL
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _price numeric;
  _order public.orders;
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
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_customer_order(_order_id uuid)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _order public.orders;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  PERFORM public.assert_active_customer(_uid);

  SELECT * INTO _order FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order not found'; END IF;
  IF _order.customer_id <> _uid THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _order.status <> 'pending'::public.order_status THEN
    RAISE EXCEPTION 'only pending orders can be cancelled';
  END IF;

  UPDATE public.orders
     SET status = 'cancelled', updated_at = now()
   WHERE id = _order_id
   RETURNING * INTO _order;

  RETURN _order;
END;
$function$;

CREATE OR REPLACE FUNCTION public.advance_driver_order_status(
  _order_id uuid,
  _new_status public.order_status
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  _order public.orders;
  _driver public.drivers;
  _allowed boolean := false;
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
    (_order.status = 'assigned'::public.order_status AND _new_status = 'accepted'::public.order_status)
    OR (_order.status = 'accepted'::public.order_status AND _new_status = 'on_the_way'::public.order_status)
    OR (_order.status = 'on_the_way'::public.order_status AND _new_status = 'arrived'::public.order_status)
    OR (_order.status = 'arrived'::public.order_status AND _new_status = 'delivering'::public.order_status)
    OR (_order.status = 'payment_collected'::public.order_status AND _new_status = 'completed'::public.order_status)
  );

  IF NOT _allowed THEN
    RAISE EXCEPTION 'invalid status transition from % to %', _order.status, _new_status;
  END IF;

  UPDATE public.orders
     SET status = _new_status, updated_at = now()
   WHERE id = _order_id
   RETURNING * INTO _order;

  RETURN _order;
END;
$function$;

CREATE OR REPLACE FUNCTION public.claim_approved_order(_order_id uuid)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  _driver public.drivers;
  _order public.orders;
  _active_count integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;

  SELECT * INTO _driver FROM public.drivers WHERE user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'driver not found'; END IF;
  IF _driver.license_status <> 'approved'::public.license_status THEN
    RAISE EXCEPTION 'driver not approved';
  END IF;

  SELECT COUNT(*) INTO _active_count
  FROM public.orders
  WHERE driver_id = _driver.id
    AND status IN (
      'assigned'::public.order_status,
      'accepted'::public.order_status,
      'on_the_way'::public.order_status,
      'arrived'::public.order_status,
      'delivering'::public.order_status,
      'payment_collected'::public.order_status
    );
  IF _active_count > 0 THEN RAISE EXCEPTION 'finish current order first'; END IF;

  SELECT * INTO _order FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order not found'; END IF;
  IF _order.status <> 'approved'::public.order_status OR _order.driver_id IS NOT NULL THEN
    RAISE EXCEPTION 'order not available';
  END IF;
  IF _driver.city IS NOT NULL AND _driver.city <> _order.city THEN
    RAISE EXCEPTION 'city mismatch';
  END IF;

  UPDATE public.orders
     SET driver_id = _driver.id,
         status = 'accepted'::public.order_status,
         updated_at = now()
   WHERE id = _order_id
     AND status = 'approved'::public.order_status
     AND driver_id IS NULL
   RETURNING * INTO _order;

  IF NOT FOUND THEN RAISE EXCEPTION 'order already claimed'; END IF;
  RETURN _order;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_cash_order(text, uuid, jsonb, public.water_type, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_cash_order(text, uuid, jsonb, public.water_type, integer, text) TO authenticated;

REVOKE ALL ON FUNCTION public.cancel_customer_order(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_customer_order(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.advance_driver_order_status(uuid, public.order_status) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.advance_driver_order_status(uuid, public.order_status) TO authenticated;

REVOKE ALL ON FUNCTION public.claim_approved_order(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_approved_order(uuid) TO authenticated;

-- =============================================================================
-- 4) ORDER RLS — block direct client inserts/updates for customers & drivers
-- =============================================================================

DROP POLICY IF EXISTS "customer creates orders" ON public.orders;
DROP POLICY IF EXISTS "customer cancels own pending" ON public.orders;
DROP POLICY IF EXISTS "driver updates assigned orders" ON public.orders;
DROP POLICY IF EXISTS "driver claims approved order" ON public.orders;

-- Admin retains full UPDATE; customers/drivers use RPCs only.

-- =============================================================================
-- 5) DRIVERS — protect sensitive columns & limit SELECT exposure
-- =============================================================================

DROP POLICY IF EXISTS "auth read drivers" ON public.drivers;

CREATE POLICY "driver reads own row"
  ON public.drivers FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "admin reads all drivers"
  ON public.drivers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "customer reads assigned driver"
  ON public.drivers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.driver_id = drivers.id
        AND o.customer_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.guard_driver_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.balance IS DISTINCT FROM OLD.balance THEN RAISE EXCEPTION 'forbidden field: balance'; END IF;
    IF NEW.license_status IS DISTINCT FROM OLD.license_status THEN RAISE EXCEPTION 'forbidden field: license_status'; END IF;
    IF NEW.rating IS DISTINCT FROM OLD.rating THEN RAISE EXCEPTION 'forbidden field: rating'; END IF;
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN RAISE EXCEPTION 'forbidden field: user_id'; END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN RAISE EXCEPTION 'forbidden field: status'; END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_driver_sensitive ON public.drivers;
CREATE TRIGGER trg_guard_driver_sensitive
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.guard_driver_sensitive_columns();

-- =============================================================================
-- 6) WITHDRAWALS — RPC only for drivers
-- =============================================================================

DROP POLICY IF EXISTS "driver creates own withdrawal" ON public.driver_withdrawal_requests;

-- =============================================================================
-- 7) NOTIFICATIONS — restrict cross-user inserts
-- =============================================================================

DROP POLICY IF EXISTS "users create own notifications" ON public.notifications;
DROP POLICY IF EXISTS "order participants notify each other" ON public.notifications;
DROP POLICY IF EXISTS "admin creates notifications" ON public.notifications;

CREATE POLICY "admin creates notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "users notify self"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "order participants send notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    order_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.orders o
      LEFT JOIN public.drivers d ON d.id = o.driver_id
      WHERE o.id = notifications.order_id
        AND (
          (o.customer_id = auth.uid() AND user_id IN (o.customer_id, d.user_id))
          OR (d.user_id = auth.uid() AND user_id IN (o.customer_id, d.user_id))
        )
    )
  );

-- =============================================================================
-- 8) STORAGE — wallet receipts private
-- =============================================================================

UPDATE storage.buckets SET public = false WHERE id = 'wallet-receipts';

DROP POLICY IF EXISTS "public read wallet-receipts" ON storage.objects;

CREATE POLICY "owner read wallet-receipts"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'wallet-receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "admin read wallet-receipts"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'wallet-receipts'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );
