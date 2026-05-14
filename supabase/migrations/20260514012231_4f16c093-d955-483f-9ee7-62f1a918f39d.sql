-- Driver withdrawal requests
CREATE TYPE public.withdrawal_status AS ENUM ('pending','approved','rejected','paid');

CREATE TABLE public.driver_withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  status public.withdrawal_status NOT NULL DEFAULT 'pending',
  payment_method_notes text,
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dwr_driver ON public.driver_withdrawal_requests(driver_id);
CREATE INDEX idx_dwr_status ON public.driver_withdrawal_requests(status);

ALTER TABLE public.driver_withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "driver views own withdrawals"
ON public.driver_withdrawal_requests FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = driver_id AND d.user_id = auth.uid())
  OR public.has_role(auth.uid(),'admin')
);

CREATE POLICY "driver creates own withdrawal"
ON public.driver_withdrawal_requests FOR INSERT TO authenticated
WITH CHECK (
  status = 'pending'
  AND reviewed_by IS NULL
  AND reviewed_at IS NULL
  AND EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = driver_id AND d.user_id = auth.uid())
);

CREATE POLICY "admin manages withdrawals"
ON public.driver_withdrawal_requests FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_dwr_touch BEFORE UPDATE ON public.driver_withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Request creation RPC: full available payout only
CREATE OR REPLACE FUNCTION public.request_driver_withdrawal(_payment_method_notes text DEFAULT NULL)
RETURNS public.driver_withdrawal_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _driver public.drivers;
  _available numeric;
  _existing int;
  _row public.driver_withdrawal_requests;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT * INTO _driver FROM public.drivers WHERE user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'driver not found'; END IF;

  SELECT COUNT(*) INTO _existing FROM public.driver_withdrawal_requests
   WHERE driver_id = _driver.id AND status IN ('pending','approved');
  IF _existing > 0 THEN
    RAISE EXCEPTION 'you already have an active withdrawal request';
  END IF;

  SELECT COALESCE(SUM(driver_payout_amount),0) INTO _available
    FROM public.orders
   WHERE driver_id = _driver.id AND driver_payout_status = 'available';

  IF _available <= 0 THEN
    RAISE EXCEPTION 'no available payouts';
  END IF;

  INSERT INTO public.driver_withdrawal_requests(driver_id, amount, payment_method_notes)
  VALUES (_driver.id, _available, _payment_method_notes)
  RETURNING * INTO _row;

  RETURN _row;
END; $$;

-- Admin processing RPC
CREATE OR REPLACE FUNCTION public.process_driver_withdrawal(_request_id uuid, _action text, _admin_notes text DEFAULT NULL)
RETURNS public.driver_withdrawal_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _req public.driver_withdrawal_requests;
  _driver public.drivers;
  _available numeric;
  _new_status public.withdrawal_status;
  _title text; _body text;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _action NOT IN ('approve','reject','pay') THEN RAISE EXCEPTION 'invalid action'; END IF;

  SELECT * INTO _req FROM public.driver_withdrawal_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found'; END IF;

  SELECT * INTO _driver FROM public.drivers WHERE id = _req.driver_id;

  IF _action = 'approve' THEN
    IF _req.status <> 'pending' THEN RAISE EXCEPTION 'request not pending'; END IF;
    _new_status := 'approved';
    _title := 'تم اعتماد طلب السحب';
    _body := 'تم اعتماد طلب سحب بقيمة ' || _req.amount::text || ' ر.ي وسيتم الدفع قريباً.';
  ELSIF _action = 'reject' THEN
    IF _req.status NOT IN ('pending','approved') THEN RAISE EXCEPTION 'request cannot be rejected'; END IF;
    _new_status := 'rejected';
    _title := 'تم رفض طلب السحب';
    _body := COALESCE('سبب الرفض: ' || _admin_notes, 'تم رفض طلب السحب.');
  ELSE -- pay
    IF _req.status NOT IN ('pending','approved') THEN RAISE EXCEPTION 'request cannot be paid'; END IF;

    SELECT COALESCE(SUM(driver_payout_amount),0) INTO _available
      FROM public.orders
     WHERE driver_id = _req.driver_id AND driver_payout_status = 'available';

    IF _available < _req.amount THEN
      RAISE EXCEPTION 'available payouts (%) less than request amount (%)', _available, _req.amount;
    END IF;

    UPDATE public.orders
       SET driver_payout_status = 'paid', updated_at = now()
     WHERE driver_id = _req.driver_id AND driver_payout_status = 'available';

    _new_status := 'paid';
    _title := 'تم دفع مستحقاتك';
    _body := 'تم تحويل مبلغ ' || _req.amount::text || ' ر.ي إلى حسابك.';
  END IF;

  UPDATE public.driver_withdrawal_requests
     SET status = _new_status,
         admin_notes = COALESCE(_admin_notes, admin_notes),
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         updated_at = now()
   WHERE id = _request_id
   RETURNING * INTO _req;

  IF _driver.user_id IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, title, body, type)
    VALUES (_driver.user_id, _title, _body, 'general');
  END IF;

  RETURN _req;
END; $$;