
REVOKE ALL ON FUNCTION public.record_cash_handover(uuid, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_cash_handover(uuid, numeric, text) TO authenticated;
