-- MVP-01-SECURITY-CLOSURE
-- Source-only migration (NOT applied to production in this batch).
-- Apply later via the migration tool. No data deletion, no order status or balance changes.

-- 1) Remove any self-promotion path to admin
REVOKE EXECUTE ON FUNCTION public.promote_to_admin(text) FROM anon, authenticated, public;
DROP FUNCTION IF EXISTS public.promote_to_admin(text);

-- 2) Customers/drivers must use trusted RPCs, never direct DML on orders
DROP POLICY IF EXISTS "customer creates orders" ON public.orders;
DROP POLICY IF EXISTS "customer cancels own pending" ON public.orders;
DROP POLICY IF EXISTS "driver updates assigned orders" ON public.orders;
DROP POLICY IF EXISTS "driver claims approved order" ON public.orders;
-- "admin updates orders" and all SELECT policies stay untouched.

-- 3) create_wallet_order: server-side price is the only source of truth
CREATE OR REPLACE FUNCTION public.create_wallet_order(
  _city text, _address_id uuid, _address_snapshot jsonb,
  _water_type water_type, _capacity integer, _price numeric,
  _notes text DEFAULT NULL::text
)
RETURNS orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _wallet public.wallets;
  _new_balance numeric;
  _order public.orders;
  _server_price numeric;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF _capacity IS NULL OR _capacity <= 0 THEN RAISE EXCEPTION 'invalid capacity'; END IF;

  PERFORM public.assert_active_customer(_uid);
  PERFORM public.validate_order_address(_uid, _city, _address_id);

  -- client _price is untrusted, used only as a sanity check
  _server_price := public.resolve_order_price(_city, _capacity);
  IF _server_price IS NULL OR _server_price <= 0 THEN
    RAISE EXCEPTION 'no pricing for city/capacity';
  END IF;
  IF _price IS NOT NULL AND _price <> _server_price THEN
    RAISE EXCEPTION 'price mismatch (expected %)', _server_price;
  END IF;

  SELECT * INTO _wallet FROM public.wallets WHERE user_id = _uid FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, balance) VALUES (_uid, 0) RETURNING * INTO _wallet;
  END IF;
  IF _wallet.balance < _server_price THEN RAISE EXCEPTION 'insufficient wallet balance'; END IF;

  _new_balance := _wallet.balance - _server_price;
  UPDATE public.wallets SET balance = _new_balance, updated_at = now() WHERE id = _wallet.id;

  INSERT INTO public.orders (
    customer_id, city, address_id, address_snapshot,
    water_type, capacity, quantity, price,
    payment_method, payment_status, notes, wallet_paid_at
  ) VALUES (
    _uid, _city, _address_id, _address_snapshot,
    _water_type, _capacity, 1, _server_price,
    'wallet', 'paid', _notes, now()
  ) RETURNING * INTO _order;

  INSERT INTO public.wallet_transactions
    (wallet_id, user_id, order_id, type, direction, amount, balance_after, description)
  VALUES (_wallet.id, _uid, _order.id, 'order_payment', 'debit', _server_price, _new_balance,
          'دفع طلب من المحفظة');

  RETURN _order;
END;
$function$;

-- 4) drivers: scoped SELECT policies instead of broad authenticated read
DROP POLICY IF EXISTS "auth read drivers" ON public.drivers;

CREATE POLICY "driver reads own row" ON public.drivers
FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "admin reads drivers" ON public.drivers
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "customer reads assigned driver" ON public.drivers
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders o
          WHERE o.driver_id = drivers.id AND o.customer_id = auth.uid())
);

-- 5) Guard sensitive driver columns against non-admin updates
CREATE OR REPLACE FUNCTION public.guard_driver_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  IF NEW.balance IS DISTINCT FROM OLD.balance
     OR NEW.license_status IS DISTINCT FROM OLD.license_status
     OR NEW.rating IS DISTINCT FROM OLD.rating
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'not allowed to modify protected driver fields';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_driver_sensitive_columns ON public.drivers;
CREATE TRIGGER trg_guard_driver_sensitive_columns
BEFORE UPDATE ON public.drivers
FOR EACH ROW EXECUTE FUNCTION public.guard_driver_sensitive_columns();

-- 6) Withdrawals created only through request_driver_withdrawal()
DROP POLICY IF EXISTS "driver creates own withdrawal" ON public.driver_withdrawal_requests;

-- 7) wallet-receipts becomes private, owner/admin read only
UPDATE storage.buckets SET public = false WHERE id = 'wallet-receipts';
DROP POLICY IF EXISTS "public read wallet receipts" ON storage.objects;
DROP POLICY IF EXISTS "Public read wallet-receipts" ON storage.objects;
DROP POLICY IF EXISTS "wallet receipts public read" ON storage.objects;
DROP POLICY IF EXISTS "wallet receipts owner reads" ON storage.objects;
CREATE POLICY "wallet receipts owner reads" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'wallet-receipts'
  AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'))
);

-- 8) notifications INSERT restricted to admin, self, or verified order counterparties
DROP POLICY IF EXISTS "auth insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "user inserts notifications" ON public.notifications;
DROP POLICY IF EXISTS "admin can insert" ON public.notifications;
DROP POLICY IF EXISTS "user can notify self" ON public.notifications;
DROP POLICY IF EXISTS "order parties can notify each other" ON public.notifications;

CREATE POLICY "admin can insert" ON public.notifications
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user can notify self" ON public.notifications
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "order parties can notify each other" ON public.notifications
FOR INSERT TO authenticated WITH CHECK (
  order_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.orders o
    LEFT JOIN public.drivers d ON d.id = o.driver_id
    WHERE o.id = notifications.order_id
      AND (o.customer_id = auth.uid() OR d.user_id = auth.uid())
      AND (notifications.user_id = o.customer_id OR notifications.user_id = d.user_id)
  )
);
