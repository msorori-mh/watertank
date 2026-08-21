-- GOOGLE-PLAY-READINESS-01 — pending migration (NOT applied).
-- Self-service account + data deletion required by Google Play.
-- Uses only auth.uid(); refuses anonymous callers and admin accounts.
-- Deletion happens in FK-safe order only, with no privileged replication tricks.

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = uid AND ur.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'admin accounts cannot be deleted from the app';
  END IF;

  -- Driver-side data
  DELETE FROM public.driver_withdrawal_requests dw
  WHERE dw.driver_id IN (SELECT d.id FROM public.drivers d WHERE d.user_id = uid);

  -- Detach driver from any historical orders, then remove the driver row
  -- (cash_handovers rows cascade from drivers).
  UPDATE public.orders SET driver_id = NULL
  WHERE driver_id IN (SELECT d.id FROM public.drivers d WHERE d.user_id = uid);

  DELETE FROM public.drivers WHERE user_id = uid;

  -- Customer-side data
  DELETE FROM public.addresses WHERE user_id = uid;
  DELETE FROM public.notifications WHERE user_id = uid;

  -- order_status_history / order-related child rows cascade from orders
  DELETE FROM public.orders WHERE customer_id = uid;

  DELETE FROM public.wallet_transactions WHERE user_id = uid;
  DELETE FROM public.wallet_topups WHERE user_id = uid;
  DELETE FROM public.wallets WHERE user_id = uid;

  DELETE FROM public.user_roles WHERE user_id = uid;
  DELETE FROM public.profiles WHERE id = uid;

  -- Finally the login identity itself
  DELETE FROM auth.users WHERE id = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_my_account() FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
