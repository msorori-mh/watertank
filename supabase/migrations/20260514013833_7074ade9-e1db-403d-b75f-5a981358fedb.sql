
-- 1) extend payment_status enum
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'refunded';

-- 2) refund tracking columns
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS wallet_refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_reason text;

-- 3) refund RPC
CREATE OR REPLACE FUNCTION public.refund_wallet_order(_order_id uuid, _reason text DEFAULT NULL)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order public.orders;
  _wallet public.wallets;
  _new_balance numeric;
  _is_admin boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;

  SELECT * INTO _order FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order not found'; END IF;

  _is_admin := public.has_role(auth.uid(), 'admin');
  IF NOT _is_admin AND _order.customer_id <> auth.uid() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _order.payment_method <> 'wallet' THEN
    RAISE EXCEPTION 'order is not a wallet order';
  END IF;

  IF _order.wallet_refunded_at IS NOT NULL THEN
    RAISE EXCEPTION 'order already refunded';
  END IF;

  IF _order.status NOT IN ('rejected','cancelled') THEN
    RAISE EXCEPTION 'order status (%) does not allow refund', _order.status;
  END IF;

  IF _order.status = 'completed' OR _order.payment_collected_at IS NOT NULL THEN
    RAISE EXCEPTION 'completed/collected orders cannot be refunded';
  END IF;

  SELECT * INTO _wallet FROM public.wallets WHERE user_id = _order.customer_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.wallets(user_id, balance) VALUES (_order.customer_id, 0)
    RETURNING * INTO _wallet;
  END IF;

  _new_balance := _wallet.balance + _order.price;
  UPDATE public.wallets SET balance = _new_balance, updated_at = now() WHERE id = _wallet.id;

  UPDATE public.orders
     SET payment_status = 'refunded',
         wallet_refunded_at = now(),
         refund_reason = _reason,
         driver_payout_status = 'none',
         driver_payout_amount = 0,
         updated_at = now()
   WHERE id = _order_id
   RETURNING * INTO _order;

  INSERT INTO public.wallet_transactions
    (wallet_id, user_id, order_id, type, direction, amount, balance_after, description)
  VALUES
    (_wallet.id, _order.customer_id, _order.id, 'refund', 'credit', _order.price, _new_balance,
     COALESCE(_reason, 'استرداد طلب محفظة'));

  INSERT INTO public.notifications(user_id, order_id, title, body, type)
  VALUES (
    _order.customer_id, _order.id,
    'تم استرداد مبلغ طلبك',
    'تم إعادة ' || _order.price::text || ' ر.ي إلى محفظتك.' ||
      COALESCE(' السبب: ' || _reason, ''),
    'general'
  );

  RETURN _order;
END;
$$;

-- 4) auto-refund trigger on status change to rejected/cancelled
CREATE OR REPLACE FUNCTION public.auto_refund_wallet_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _wallet public.wallets;
  _new_balance numeric;
  _reason text;
BEGIN
  IF NEW.payment_method <> 'wallet' THEN RETURN NEW; END IF;
  IF NEW.wallet_refunded_at IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('rejected','cancelled') THEN RETURN NEW; END IF;
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF OLD.status = 'completed' OR OLD.payment_collected_at IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.wallet_paid_at IS NULL THEN RETURN NEW; END IF;

  SELECT * INTO _wallet FROM public.wallets WHERE user_id = NEW.customer_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.wallets(user_id, balance) VALUES (NEW.customer_id, 0)
    RETURNING * INTO _wallet;
  END IF;

  _new_balance := _wallet.balance + NEW.price;
  UPDATE public.wallets SET balance = _new_balance, updated_at = now() WHERE id = _wallet.id;

  _reason := CASE WHEN NEW.status = 'rejected' THEN 'تم رفض الطلب' ELSE 'تم إلغاء الطلب' END;

  NEW.payment_status := 'refunded';
  NEW.wallet_refunded_at := now();
  NEW.refund_reason := COALESCE(NEW.refund_reason, _reason);
  NEW.driver_payout_status := 'none';
  NEW.driver_payout_amount := 0;

  INSERT INTO public.wallet_transactions
    (wallet_id, user_id, order_id, type, direction, amount, balance_after, description)
  VALUES
    (_wallet.id, NEW.customer_id, NEW.id, 'refund', 'credit', NEW.price, _new_balance, _reason);

  INSERT INTO public.notifications(user_id, order_id, title, body, type)
  VALUES (NEW.customer_id, NEW.id,
    'تم استرداد مبلغ طلبك',
    'تم إعادة ' || NEW.price::text || ' ر.ي إلى محفظتك. السبب: ' || _reason,
    'general');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_refund_wallet_order ON public.orders;
CREATE TRIGGER trg_auto_refund_wallet_order
BEFORE UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.auto_refund_wallet_order();
