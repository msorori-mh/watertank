-- ROLLBACK for SEC-DRIVERS-PAYOUT-EXPOSURE-01
-- Restores the previous (less strict) customer read policy on public.drivers
-- and removes the limited-column RPC.
DROP FUNCTION IF EXISTS public.get_order_driver_public(uuid);

CREATE POLICY "customer reads assigned driver" ON public.drivers
FOR SELECT TO authenticated
USING (public.is_caller_customer_of_driver(id));
