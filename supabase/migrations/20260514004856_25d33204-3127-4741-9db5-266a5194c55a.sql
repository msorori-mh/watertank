CREATE OR REPLACE FUNCTION public.approve_wallet_topup(_topup_id uuid)
RETURNS public.wallet_topups
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _topup public.wallet_topups;
  _wallet public.wallets;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO _topup FROM public.wallet_topups WHERE id = _topup_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'topup not found';
  END IF;

  IF _topup.status <> 'pending' THEN
    RAISE EXCEPTION 'topup is not pending (current: %)', _topup.status;
  END IF;

  -- Lock or create wallet for the user
  SELECT * INTO _wallet FROM public.wallets WHERE user_id = _topup.user_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, balance) VALUES (_topup.user_id, 0)
    RETURNING * INTO _wallet;
  END IF;

  UPDATE public.wallets
     SET balance = balance + _topup.amount,
         updated_at = now()
   WHERE id = _wallet.id;

  UPDATE public.wallet_topups
     SET status = 'approved',
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         updated_at = now()
   WHERE id = _topup_id
   RETURNING * INTO _topup;

  INSERT INTO public.notifications (user_id, title, body, type)
  VALUES (
    _topup.user_id,
    'تم اعتماد تعبئة المحفظة',
    'تم إضافة مبلغ ' || _topup.amount::text || ' ر.ي إلى محفظتك.',
    'wallet_topup_approved'
  );

  RETURN _topup;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_wallet_topup(_topup_id uuid, _admin_notes text DEFAULT NULL)
RETURNS public.wallet_topups
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _topup public.wallet_topups;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO _topup FROM public.wallet_topups WHERE id = _topup_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'topup not found';
  END IF;

  IF _topup.status <> 'pending' THEN
    RAISE EXCEPTION 'topup is not pending (current: %)', _topup.status;
  END IF;

  UPDATE public.wallet_topups
     SET status = 'rejected',
         admin_notes = _admin_notes,
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         updated_at = now()
   WHERE id = _topup_id
   RETURNING * INTO _topup;

  INSERT INTO public.notifications (user_id, title, body, type)
  VALUES (
    _topup.user_id,
    'تم رفض طلب تعبئة المحفظة',
    COALESCE('سبب الرفض: ' || _admin_notes, 'تم رفض طلب التعبئة. تواصل مع الإدارة لمزيد من التفاصيل.'),
    'wallet_topup_rejected'
  );

  RETURN _topup;
END;
$$;
