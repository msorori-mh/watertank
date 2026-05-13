DROP POLICY IF EXISTS "order participants notify each other" ON public.notifications;
CREATE POLICY "order participants notify each other"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    order_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = notifications.order_id
        AND (
          o.customer_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = o.driver_id AND d.user_id = auth.uid())
        )
    )
  );