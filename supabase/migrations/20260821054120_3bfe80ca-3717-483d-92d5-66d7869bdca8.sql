-- PROD-E2E-RLS-CLOSURE-01
-- Break the drivers <-> orders RLS recursion using SECURITY DEFINER helpers.
-- Authorization is always anchored to auth.uid(); no visibility is broadened.

CREATE OR REPLACE FUNCTION public.is_caller_order_driver(_driver_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT _driver_id IS NOT NULL
     AND auth.uid() IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM public.drivers d
        WHERE d.id = _driver_id AND d.user_id = auth.uid()
     );
$$;

CREATE OR REPLACE FUNCTION public.is_caller_approved_driver_for_city(_city text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT auth.uid() IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM public.drivers d
        WHERE d.user_id = auth.uid()
          AND d.license_status = 'approved'::public.license_status
          AND (d.city IS NULL OR d.city = _city)
     );
$$;

CREATE OR REPLACE FUNCTION public.is_caller_customer_of_driver(_driver_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT _driver_id IS NOT NULL
     AND auth.uid() IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM public.orders o
        WHERE o.driver_id = _driver_id AND o.customer_id = auth.uid()
     );
$$;

CREATE OR REPLACE FUNCTION public.is_caller_order_participant(_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT auth.uid() IS NOT NULL
     AND EXISTS (
       SELECT 1
         FROM public.orders o
         LEFT JOIN public.drivers d ON d.id = o.driver_id
        WHERE o.id = _order_id
          AND (o.customer_id = auth.uid() OR d.user_id = auth.uid())
     );
$$;

REVOKE ALL ON FUNCTION public.is_caller_order_driver(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_caller_approved_driver_for_city(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_caller_customer_of_driver(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_caller_order_participant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_caller_order_driver(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_caller_approved_driver_for_city(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_caller_customer_of_driver(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_caller_order_participant(uuid) TO authenticated;

-- orders SELECT policies: no direct reference to public.drivers
DROP POLICY IF EXISTS "customer views own orders" ON public.orders;
CREATE POLICY "customer views own orders" ON public.orders
FOR SELECT TO authenticated USING (
  auth.uid() = customer_id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.is_caller_order_driver(driver_id)
);

DROP POLICY IF EXISTS "drivers view approved orders" ON public.orders;
CREATE POLICY "drivers view approved orders" ON public.orders
FOR SELECT TO authenticated USING (
  status = 'approved'::public.order_status
  AND driver_id IS NULL
  AND public.is_caller_approved_driver_for_city(city)
);

-- drivers SELECT policy: no direct reference to public.orders
DROP POLICY IF EXISTS "customer reads assigned driver" ON public.drivers;
CREATE POLICY "customer reads assigned driver" ON public.drivers
FOR SELECT TO authenticated USING (
  public.is_caller_customer_of_driver(id)
);

-- order_status_history: visible to the order's customer, its driver, or admin
DROP POLICY IF EXISTS "view status history" ON public.order_status_history;
CREATE POLICY "view status history" ON public.order_status_history
FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.is_caller_order_participant(order_id)
);