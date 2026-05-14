-- 1) Drop duplicate trigger
DROP TRIGGER IF EXISTS orders_compute_commission ON public.orders;

-- 2) Legacy data fixes
UPDATE public.orders
   SET commission_status = 'free'
 WHERE payment_method = 'cash'
   AND COALESCE(app_commission, 0) = 0
   AND commission_status = 'unpaid';

-- Recompute driver balances strictly from unpaid cash commissions minus handovers
WITH owed AS (
  SELECT driver_id, COALESCE(SUM(app_commission), 0) AS total
  FROM public.orders
  WHERE payment_method = 'cash'
    AND commission_status = 'unpaid'
    AND COALESCE(app_commission, 0) > 0
  GROUP BY driver_id
)
UPDATE public.drivers d
   SET balance = COALESCE(o.total, 0)
  FROM (SELECT id FROM public.drivers) all_d
  LEFT JOIN owed o ON o.driver_id = all_d.id
 WHERE d.id = all_d.id;

-- 3) Fix race condition: only mark orders that were available before the request
CREATE OR REPLACE FUNCTION public.process_driver_withdrawal(_request_id uuid, _action text, _admin_notes text DEFAULT NULL)
RETURNS public.driver_withdrawal_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _req public.driver_withdrawal_requests;
  _driver public.drivers;
  _eligible_total numeric;
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

    -- only count payouts that became available before the request was created
    SELECT COALESCE(SUM(driver_payout_amount),0) INTO _eligible_total
      FROM public.orders
     WHERE driver_id = _req.driver_id
       AND driver_payout_status = 'available'
       AND payment_collected_at <= _req.created_at;

    IF _eligible_total < _req.amount THEN
      RAISE EXCEPTION 'eligible payouts (%) less than request amount (%)', _eligible_total, _req.amount;
    END IF;

    UPDATE public.orders
       SET driver_payout_status = 'paid', updated_at = now()
     WHERE driver_id = _req.driver_id
       AND driver_payout_status = 'available'
       AND payment_collected_at <= _req.created_at;

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