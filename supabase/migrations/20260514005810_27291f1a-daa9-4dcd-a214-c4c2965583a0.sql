
-- 1) wallet_transactions table
CREATE TYPE public.wallet_tx_type AS ENUM ('topup', 'order_payment', 'refund', 'adjustment');
CREATE TYPE public.wallet_tx_direction AS ENUM ('credit', 'debit');

CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL,
  user_id uuid NOT NULL,
  order_id uuid,
  topup_id uuid,
  type public.wallet_tx_type NOT NULL,
  direction public.wallet_tx_direction NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  balance_after numeric NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wallet_tx_user ON public.wallet_transactions(user_id, created_at DESC);
CREATE INDEX idx_wallet_tx_wallet ON public.wallet_transactions(wallet_id, created_at DESC);
CREATE INDEX idx_wallet_tx_order ON public.wallet_transactions(order_id);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner views own wallet tx"
  ON public.wallet_transactions FOR SELECT
  TO authenticated
  USING ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin manages wallet tx"
  ON public.wallet_transactions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) Update approve_wallet_topup to log transaction
CREATE OR REPLACE FUNCTION public.approve_wallet_topup(_topup_id uuid)
 RETURNS public.wallet_topups
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _topup public.wallet_topups;
  _wallet public.wallets;
  _new_balance numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO _topup FROM public.wallet_topups WHERE id = _topup_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'topup not found'; END IF;
  IF _topup.status <> 'pending' THEN
    RAISE EXCEPTION 'topup is not pending (current: %)', _topup.status;
  END IF;

  SELECT * INTO _wallet FROM public.wallets WHERE user_id = _topup.user_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, balance) VALUES (_topup.user_id, 0)
    RETURNING * INTO _wallet;
  END IF;

  _new_balance := _wallet.balance + _topup.amount;

  UPDATE public.wallets
     SET balance = _new_balance, updated_at = now()
   WHERE id = _wallet.id;

  UPDATE public.wallet_topups
     SET status = 'approved',
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         updated_at = now()
   WHERE id = _topup_id
   RETURNING * INTO _topup;

  INSERT INTO public.wallet_transactions
    (wallet_id, user_id, topup_id, type, direction, amount, balance_after, description)
  VALUES
    (_wallet.id, _topup.user_id, _topup.id, 'topup', 'credit', _topup.amount, _new_balance,
     'تعبئة محفظة معتمدة');

  INSERT INTO public.notifications (user_id, title, body, type)
  VALUES (
    _topup.user_id,
    'تم اعتماد تعبئة المحفظة',
    'تم إضافة مبلغ ' || _topup.amount::text || ' ر.ي إلى محفظتك.',
    'wallet_topup_approved'
  );

  RETURN _topup;
END;
$function$;

-- 3) create_wallet_order RPC
CREATE OR REPLACE FUNCTION public.create_wallet_order(
  _city text,
  _address_id uuid,
  _address_snapshot jsonb,
  _water_type water_type,
  _capacity integer,
  _price numeric,
  _notes text DEFAULT NULL
)
RETURNS public.orders
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
    payment_method, payment_status, notes
  ) VALUES (
    _uid, _city, _address_id, _address_snapshot,
    _water_type, _capacity, 1, _price,
    'wallet', 'paid', _notes
  ) RETURNING * INTO _order;

  INSERT INTO public.wallet_transactions
    (wallet_id, user_id, order_id, type, direction, amount, balance_after, description)
  VALUES
    (_wallet.id, _uid, _order.id, 'order_payment', 'debit', _price, _new_balance,
     'دفع طلب من المحفظة');

  RETURN _order;
END;
$function$;

-- 4) Update collect_order_payment so wallet orders skip commission & cash logic
CREATE OR REPLACE FUNCTION public.collect_order_payment(_order_id uuid)
 RETURNS public.orders
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

  -- Wallet-paid orders: already paid upfront; just advance status, no commission.
  IF _order.payment_method = 'wallet' THEN
    UPDATE public.orders
       SET status = 'payment_collected',
           payment_collected_at = COALESCE(payment_collected_at, now()),
           commission_status = 'free',
           updated_at = now()
     WHERE id = _order_id
     RETURNING * INTO _order;

    INSERT INTO public.order_status_history(order_id, status, notes)
    VALUES (_order_id, 'payment_collected', 'wallet prepaid order');

    RETURN _order;
  END IF;

  -- Cash flow (existing behavior)
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
