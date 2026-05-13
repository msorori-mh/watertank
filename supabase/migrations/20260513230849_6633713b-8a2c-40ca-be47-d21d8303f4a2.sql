
-- 1) commission_settings table
CREATE TABLE public.commission_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city text,
  capacity integer,
  commission_type text NOT NULL DEFAULT 'fixed' CHECK (commission_type IN ('fixed','percentage')),
  commission_value numeric NOT NULL DEFAULT 0,
  free_until date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.commission_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read commission_settings" ON public.commission_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manages commission_settings" ON public.commission_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER commission_settings_touch BEFORE UPDATE ON public.commission_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2) orders new columns
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS app_commission numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS commission_rule_snapshot jsonb;

-- 3) calculate function
CREATE OR REPLACE FUNCTION public.calculate_app_commission(
  _city text, _capacity integer, _price numeric,
  OUT amount numeric, OUT snapshot jsonb, OUT is_free boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _rule public.commission_settings;
BEGIN
  amount := 0; snapshot := NULL; is_free := false;

  SELECT * INTO _rule FROM public.commission_settings
   WHERE is_active = true
     AND (city IS NULL OR city = _city)
     AND (capacity IS NULL OR capacity = _capacity)
   ORDER BY (city IS NOT NULL)::int DESC, (capacity IS NOT NULL)::int DESC, updated_at DESC
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  snapshot := to_jsonb(_rule);

  IF _rule.free_until IS NOT NULL AND _rule.free_until >= CURRENT_DATE THEN
    is_free := true; amount := 0; RETURN;
  END IF;

  IF _rule.commission_type = 'fixed' THEN
    amount := _rule.commission_value;
  ELSE
    amount := round(_price * _rule.commission_value / 100.0, 2);
  END IF;

  IF amount > _price THEN amount := _price; END IF;
  IF amount < 0 THEN amount := 0; END IF;
  IF amount = 0 THEN is_free := true; END IF;
END; $$;

-- 4) trigger to compute commission on approval
CREATE OR REPLACE FUNCTION public.compute_order_commission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _r record;
BEGIN
  IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    SELECT * INTO _r FROM public.calculate_app_commission(NEW.city, NEW.capacity, NEW.price);
    NEW.app_commission := COALESCE(_r.amount, 0);
    NEW.commission_rule_snapshot := _r.snapshot;
    NEW.commission_status := CASE WHEN COALESCE(_r.amount,0) = 0 THEN 'free' ELSE 'unpaid' END;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS orders_compute_commission ON public.orders;
CREATE TRIGGER orders_compute_commission
  BEFORE INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.compute_order_commission();

-- 5) modify collect_order_payment: balance += app_commission only
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

-- 6) modify record_cash_handover: also mark FIFO unpaid commissions as paid
CREATE OR REPLACE FUNCTION public.record_cash_handover(_driver_id uuid, _amount numeric, _notes text DEFAULT NULL::text)
 RETURNS cash_handovers
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _current_balance numeric;
  _row public.cash_handovers;
  _remaining numeric;
  _o record;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'amount must be greater than zero';
  END IF;

  SELECT balance INTO _current_balance FROM public.drivers WHERE id = _driver_id FOR UPDATE;
  IF _current_balance IS NULL THEN
    RAISE EXCEPTION 'driver not found';
  END IF;

  IF _amount > _current_balance THEN
    RAISE EXCEPTION 'amount exceeds driver balance';
  END IF;

  INSERT INTO public.cash_handovers(driver_id, amount, received_by, notes)
  VALUES (_driver_id, _amount, auth.uid(), _notes)
  RETURNING * INTO _row;

  UPDATE public.drivers SET balance = balance - _amount WHERE id = _driver_id;

  -- mark FIFO unpaid commissions as paid up to _amount
  _remaining := _amount;
  FOR _o IN
    SELECT id, app_commission FROM public.orders
     WHERE driver_id = _driver_id
       AND commission_status = 'unpaid'
       AND COALESCE(app_commission,0) > 0
     ORDER BY payment_collected_at NULLS LAST, created_at ASC
  LOOP
    EXIT WHEN _remaining < _o.app_commission;
    UPDATE public.orders SET commission_status = 'paid' WHERE id = _o.id;
    _remaining := _remaining - _o.app_commission;
  END LOOP;

  RETURN _row;
END;
$function$;
