
DROP POLICY IF EXISTS "drivers view available orders" ON public.orders;

CREATE POLICY "drivers view approved orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  status = 'approved'::order_status
  AND driver_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.drivers d
    WHERE d.user_id = auth.uid()
      AND d.license_status = 'approved'::license_status
      AND (d.city IS NULL OR d.city = orders.city)
  )
);
