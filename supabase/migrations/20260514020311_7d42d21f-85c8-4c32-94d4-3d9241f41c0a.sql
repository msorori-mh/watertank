-- 1) New enum
CREATE TYPE public.water_type_new AS ENUM ('normal','kawthar');

-- 2) Drop function that depends on old enum (will recreate)
DROP FUNCTION IF EXISTS public.create_wallet_order(text, uuid, jsonb, public.water_type, integer, numeric, text);

-- 3) Migrate orders.water_type column to new enum with value mapping
ALTER TABLE public.orders
  ALTER COLUMN water_type TYPE public.water_type_new
  USING (CASE
    WHEN water_type::text IN ('sweet','well','normal') THEN 'normal'
    WHEN water_type::text IN ('desalinated','kawthar') THEN 'kawthar'
    ELSE 'normal'
  END)::public.water_type_new;

-- 4) Drop old enum and rename
DROP TYPE public.water_type;
ALTER TYPE public.water_type_new RENAME TO water_type;

-- 5) Recreate create_wallet_order with the new type
CREATE OR REPLACE FUNCTION public.create_wallet_order(_city text, _address_id uuid, _address_snapshot jsonb, _water_type public.water_type, _capacity integer, _price numeric, _notes text DEFAULT NULL::text)
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

REVOKE ALL ON FUNCTION public.create_wallet_order(text, uuid, jsonb, public.water_type, integer, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_wallet_order(text, uuid, jsonb, public.water_type, integer, numeric, text) TO authenticated;