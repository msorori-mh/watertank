UPDATE public.orders
SET status = 'approved'
WHERE id = '3e21eb74-35f2-40a9-96bd-d18738f638f9'
  AND notes = 'TEST_ONLY_E2E_ORDER_02'
  AND status = 'pending';