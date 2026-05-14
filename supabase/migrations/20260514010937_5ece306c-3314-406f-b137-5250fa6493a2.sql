-- Phase 6: Split wallet order amount between app commission and driver payout

-- 1) Add new columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS driver_payout_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS driver_payout_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS wallet_paid_at timestamptz NULL;

-- 2) Update commission compute trigger to also set driver_payout fields
CREATE OR REPLACE FUNCTION public.compute_order_commission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _r record;
BEGIN
  IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    SELECT * INTO _r FROM public.calculate_app_commission(NEW.city, NEW.capacity, NEW.price);
    NEW.app_commission := COALESCE(_r.amount, 0);
    NEW.commission_rule_snapshot := _r.snapshot;

    IF NEW.payment_method = 'wallet' THEN
      -- التطبيق قبض المبلغ مسبقاً من محفظة العميل
      NEW.driver_payout_amount := GREATEST(NEW.price - COALESCE(_r.amount,0), 0);
      NEW.driver_payout_status := 'pending';
      NEW.commission_status := 'collected';
    ELSE
      NEW.driver_payout_amount := 0;
      NEW.driver_payout_status := 'none';
      NEW.commission_status := CASE WHEN COALESCE(_r.amount,0) = 0 THEN 'free' ELSE 'unpaid' END;
    END IF;
  END IF;
  RETURN NEW;
END; $function$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS trg_compute_order_commission ON public.orders;
CREATE TRIGGER trg_compute_order_commission
BEFORE INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.compute_order_commission();

-- 3) Update collect_order_payment so wallet orders mark driver payout as available
CREATE OR REPLACE FUNCTION public.collect_order_payment(_order_id uuid)
 RETURNS orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  IF _order.payment_method = 'wallet' THEN
    -- محفظة: لا نلمس drivers.balance، نجعل المستحق متاحاً
    UPDATE public.orders
       SET status = 'payment_collected',
           payment_collected_at = COALESCE(payment_collected_at, now()),
           commission_status = 'collected',
           driver_payout_status = 'available',
           updated_at = now()
     WHERE id = _order_id
     RETURNING * INTO _order;

    INSERT INTO public.order_status_history(order_id, status, notes)
    VALUES (_order_id, 'payment_collected',
      'wallet prepaid; driver payout available: ' || COALESCE(_order.driver_payout_amount,0)::text);

    RETURN _order;
  END IF;

  -- نقدي
  IF _order.payment_status = 'paid' THEN
    RAISE EXCEPTION 'order already paid';
  END IF;

  UPDATE public.orders
     SET status = 'payment_collected',
         payment_status = 'paid',
         payment_collected_at = now(),
         commission_status = CASE WHEN COALESCE(app_commission,0) = 0 THEN 'free' ELSE 'unpaid' END,
         updated_at = now()
   WHERE id = _order_id
   RETURNING * INTO _order;

  IF COALESCE(_order.app_commission, 0) > 0 THEN
    UPDATE public.drivers
       SET balance = balance + _order.app_commission
     WHERE id = _driver.id;
  END IF;

  INSERT INTO public.order_status_history(order_id, status, notes)
  VALUES (_order_id, 'payment_collected', 'commission added: ' || COALESCE(_order.app_commission,0)::text);

  RETURN _order;
END;
$function$;

-- 4) Update create_wallet_order to stamp wallet_paid_at
CREATE OR REPLACE FUNCTION public.create_wallet_order(_city text, _address_id uuid, _address_snapshot jsonb, _water_type water_type, _capacity integer, _price numeric, _notes text DEFAULT NULL::text)
 RETURNS orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _wallet public.wallets;
  _new_balance numeric;
  _order public.orders;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF _price IS NULL OR _price <= 0 THEN RAISE EXCEPTION 'invalid price'; END IF;
  IF _capacity IS NULL OR _capacity <= 0 THEN RAISE EXCEPTION 'invalid capacity'; END IF;

  SELECT * INTO _wallet FROM public.wallets WHERE user_id = _uid FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, balance) VALUES (_uid, 0) RETURNING * INTO _wallet;
  END IF;

  IF _wallet.balance < _price THEN
    RAISE EXCEPTION 'insufficient wallet balance';
  END IF;

  _new_balance := _wallet.balance - _price;
  UPDATE public.wallets SET balance = _new_balance, updated_at = now() WHERE id = _wallet.id;

  INSERT INTO public.orders (
    customer_id, city, address_id, address_snapshot,
    water_type, capacity, quantity, price,
    payment_method, payment_status, notes, wallet_paid_at
  ) VALUES (
    _uid, _city, _address_id, _address_snapshot,
    _water_type, _capacity, 1, _price,
    'wallet', 'paid', _notes, now()
  ) RETURNING * INTO _order;

  INSERT INTO public.wallet_transactions
    (wallet_id, user_id, order_id, type, direction, amount, balance_after, description)
  VALUES
    (_wallet.id, _uid, _order.id, 'order_payment', 'debit', _price, _new_balance,
     'دفع طلب من المحفظة');

  RETURN _order;
END;
$function$;

-- 5) Backfill existing already-approved wallet orders so payouts show up
UPDATE public.orders
   SET driver_payout_amount = GREATEST(price - COALESCE(app_commission,0), 0),
       driver_payout_status = CASE
         WHEN status IN ('payment_collected','completed') THEN 'available'
         ELSE 'pending'
       END,
       commission_status = 'collected',
       wallet_paid_at = COALESCE(wallet_paid_at, created_at)
 WHERE payment_method = 'wallet'
   AND status NOT IN ('pending','rejected','cancelled');
