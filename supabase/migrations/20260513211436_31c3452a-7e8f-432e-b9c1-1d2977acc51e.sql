-- Allow approved drivers to self-claim approved, unassigned orders in their city
CREATE POLICY "driver claims approved order"
ON public.orders
FOR UPDATE
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
)
WITH CHECK (
  status = 'accepted'::order_status
  AND EXISTS (
    SELECT 1 FROM public.drivers d
    WHERE d.id = orders.driver_id
      AND d.user_id = auth.uid()
      AND d.license_status = 'approved'::license_status
  )
);