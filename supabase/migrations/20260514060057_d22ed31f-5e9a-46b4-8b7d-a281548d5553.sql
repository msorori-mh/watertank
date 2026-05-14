CREATE OR REPLACE FUNCTION public.approve_wallet_topup(_topup_id uuid, _approved_amount numeric DEFAULT NULL)
 RETURNS wallet_topups
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _topup public.wallet_topups;
  _wallet public.wallets;
  _new_balance numeric;
  _final_amount numeric;
  _note text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO _topup FROM public.wallet_topups WHERE id = _topup_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'topup not found'; END IF;
  IF _topup.status <> 'pending' THEN
    RAISE EXCEPTION 'topup is not pending (current: %)', _topup.status;
  END IF;

  _final_amount := COALESCE(_approved_amount, _topup.amount);
  IF _final_amount IS NULL OR _final_amount <= 0 THEN
    RAISE EXCEPTION 'invalid approved amount';
  END IF;

  SELECT * INTO _wallet FROM public.wallets WHERE user_id = _topup.user_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, balance) VALUES (_topup.user_id, 0)
    RETURNING * INTO _wallet;
  END IF;

  _new_balance := _wallet.balance + _final_amount;

  UPDATE public.wallets
     SET balance = _new_balance, updated_at = now()
   WHERE id = _wallet.id;

  IF _approved_amount IS NOT NULL AND _approved_amount <> _topup.amount THEN
    _note := 'تم تعديل المبلغ من ' || _topup.amount::text || ' إلى ' || _final_amount::text;
  END IF;

  UPDATE public.wallet_topups
     SET status = 'approved',
         amount = _final_amount,
         admin_notes = COALESCE(_note, admin_notes),
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         updated_at = now()
   WHERE id = _topup_id
   RETURNING * INTO _topup;

  INSERT INTO public.wallet_transactions
    (wallet_id, user_id, topup_id, type, direction, amount, balance_after, description)
  VALUES
    (_wallet.id, _topup.user_id, _topup.id, 'topup', 'credit', _final_amount, _new_balance,
     COALESCE(_note, 'تعبئة محفظة معتمدة'));

  INSERT INTO public.notifications (user_id, title, body, type)
  VALUES (
    _topup.user_id,
    'تم اعتماد تعبئة المحفظة',
    'تم إضافة مبلغ ' || _final_amount::text || ' ر.ي إلى محفظتك.' ||
      COALESCE(' (' || _note || ')', ''),
    'wallet_topup_approved'
  );

  RETURN _topup;
END;
$function$;