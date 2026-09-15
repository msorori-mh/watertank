-- Candidate schema, NOT a production migration. Disabled until deployment preflight/E2E.
CREATE SCHEMA IF NOT EXISTS dispatch_private;
REVOKE ALL ON SCHEMA dispatch_private FROM PUBLIC;
CREATE TABLE dispatch_private.config (singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), enabled boolean NOT NULL DEFAULT false);
INSERT INTO dispatch_private.config DEFAULT VALUES;
CREATE TABLE dispatch_private.positions (
 driver_id uuid PRIMARY KEY REFERENCES public.drivers(id) ON DELETE CASCADE,
 lat double precision NOT NULL CHECK(lat BETWEEN -90 AND 90),
 lng double precision NOT NULL CHECK(lng BETWEEN -180 AND 180),
 water_type text NOT NULL, seen_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE dispatch_private.jobs (
 order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
 state text NOT NULL DEFAULT 'searching' CHECK(state IN ('searching','accepted','manual','closed')),
 started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 deadline timestamptz NOT NULL DEFAULT clock_timestamp() + interval '180 seconds'
);
CREATE TABLE dispatch_private.offers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL REFERENCES dispatch_private.jobs(order_id) ON DELETE CASCADE,
 driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
 state text NOT NULL DEFAULT 'offered' CHECK(state IN ('offered','accepted','rejected','expired','closed')),
 expires_at timestamptz NOT NULL,
 UNIQUE(order_id, driver_id)
);
CREATE UNIQUE INDEX dispatch_one_order_offer ON dispatch_private.offers(order_id) WHERE state='offered';
CREATE UNIQUE INDEX dispatch_one_driver_offer ON dispatch_private.offers(driver_id) WHERE state='offered';
-- Also covers legacy/manual assignment; preflight must resolve any existing conflicts.
CREATE UNIQUE INDEX dispatch_one_active_order_per_driver ON public.orders(driver_id)
 WHERE driver_id IS NOT NULL AND status IN ('assigned','accepted','on_the_way','arrived','delivering','payment_collected');
ALTER TABLE dispatch_private.config ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_private.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_private.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_private.offers ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.dispatch_heartbeat(_lat double precision, _lng double precision, _water_type text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE d public.drivers;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
 SELECT * INTO d FROM public.drivers WHERE user_id=auth.uid();
 IF NOT FOUND OR d.license_status <> 'approved' OR d.status <> 'active' OR d.availability <> 'available' THEN RAISE EXCEPTION 'driver unavailable'; END IF;
 IF _lat IS NULL OR _lng IS NULL OR NOT (_lat BETWEEN -90 AND 90 AND _lng BETWEEN -180 AND 180)
    OR _water_type IS NULL OR _water_type NOT IN ('normal','kawthar') THEN RAISE EXCEPTION 'invalid position or water type'; END IF;
 INSERT INTO dispatch_private.positions VALUES(d.id,_lat,_lng,_water_type,clock_timestamp())
 ON CONFLICT(driver_id) DO UPDATE SET lat=excluded.lat,lng=excluded.lng,water_type=excluded.water_type,seen_at=excluded.seen_at;
END $$;

CREATE FUNCTION dispatch_private.enqueue() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF (SELECT enabled FROM dispatch_private.config WHERE singleton) AND NEW.status='pending' AND NEW.payment_method='cash'
    AND NEW.quantity=1 AND NEW.scheduled_at IS NULL THEN
  INSERT INTO dispatch_private.jobs(order_id) VALUES(NEW.id);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER dispatch_enqueue AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION dispatch_private.enqueue();

CREATE FUNCTION dispatch_private.tick() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j record; o public.orders; chosen uuid; expires timestamptz; address_lat double precision; address_lng double precision;
BEGIN
 -- One worker/acceptance at a time. Bounds keep the lock short for the MVP.
 PERFORM pg_advisory_xact_lock(764521);
 FOR j IN SELECT * FROM dispatch_private.jobs WHERE state='searching' ORDER BY started_at LIMIT 100 LOOP
  SELECT * INTO o FROM public.orders WHERE id=j.order_id FOR UPDATE;
  IF o.status <> 'pending' OR o.driver_id IS NOT NULL OR o.payment_method<>'cash' OR o.quantity<>1 OR o.scheduled_at IS NOT NULL THEN
   UPDATE dispatch_private.jobs SET state='closed' WHERE order_id=j.order_id;
   UPDATE dispatch_private.offers SET state='closed' WHERE order_id=j.order_id AND state='offered';
   CONTINUE;
  END IF;
  UPDATE dispatch_private.offers SET state='expired' WHERE order_id=j.order_id AND state='offered' AND expires_at<=clock_timestamp();
  IF NOT (SELECT enabled FROM dispatch_private.config WHERE singleton) THEN
   UPDATE dispatch_private.offers SET state='closed' WHERE order_id=j.order_id AND state='offered';
   UPDATE dispatch_private.jobs SET state='manual' WHERE order_id=j.order_id;
   CONTINUE;
  END IF;
  IF EXISTS(SELECT 1 FROM dispatch_private.offers WHERE order_id=j.order_id AND state='offered') THEN CONTINUE; END IF;
  IF NOT (SELECT enabled FROM dispatch_private.config WHERE singleton) OR j.deadline<=clock_timestamp()
     OR (SELECT count(*) FROM dispatch_private.offers WHERE order_id=j.order_id)>=3 THEN
   UPDATE dispatch_private.jobs SET state='manual' WHERE order_id=j.order_id; CONTINUE;
  END IF;
  SELECT lat,lng INTO address_lat,address_lng FROM public.addresses WHERE id=o.address_id AND user_id=o.customer_id;
  chosen := NULL;
  SELECT d.id INTO chosen FROM public.drivers d JOIN dispatch_private.positions p ON p.driver_id=d.id
  WHERE d.license_status='approved' AND d.status='active' AND d.availability='available'
   AND d.city=o.city AND d.vehicle_capacity=o.capacity AND p.water_type=o.water_type::text
   AND p.seen_at>=clock_timestamp()-interval '90 seconds'
   AND address_lat IS NOT NULL AND address_lng IS NOT NULL
   AND NOT EXISTS(SELECT 1 FROM dispatch_private.offers f WHERE f.order_id=o.id AND f.driver_id=d.id)
   AND NOT EXISTS(SELECT 1 FROM dispatch_private.offers f WHERE f.driver_id=d.id AND f.state='offered')
   AND NOT EXISTS(SELECT 1 FROM public.orders a WHERE a.driver_id=d.id AND a.status IN ('assigned','accepted','on_the_way','arrived','delivering','payment_collected'))
  ORDER BY power(sin(radians(p.lat-address_lat)/2),2)+cos(radians(address_lat))*cos(radians(p.lat))*power(sin(radians(p.lng-address_lng)/2),2),d.id LIMIT 1;
  IF chosen IS NULL THEN CONTINUE; END IF;
  expires := least(clock_timestamp()+interval '60 seconds',j.deadline);
  INSERT INTO dispatch_private.offers(order_id,driver_id,expires_at) VALUES(o.id,chosen,expires);
 END LOOP;
END $$;

CREATE FUNCTION public.dispatch_offer() RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('id',f.id,'order_id',o.id,'city',o.city,'capacity',o.capacity,
   'water_type',o.water_type,'price',o.price,'expires_at',f.expires_at,'server_now',clock_timestamp())
 FROM dispatch_private.offers f JOIN public.drivers d ON d.id=f.driver_id JOIN public.orders o ON o.id=f.order_id
 WHERE d.user_id=auth.uid() AND d.license_status='approved' AND d.status='active'
  AND f.state='offered' AND f.expires_at>clock_timestamp() AND o.status='pending' AND o.driver_id IS NULL LIMIT 1;
$$;

CREATE FUNCTION public.dispatch_respond(_offer_id uuid,_accept boolean) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE f dispatch_private.offers; o public.orders; d public.drivers; commission record;
BEGIN
 IF auth.uid() IS NULL OR _accept IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
 IF NOT (SELECT enabled FROM dispatch_private.config WHERE singleton) THEN RAISE EXCEPTION 'dispatch disabled'; END IF;
 PERFORM pg_advisory_xact_lock(764521);
 SELECT * INTO f FROM dispatch_private.offers WHERE id=_offer_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'offer unavailable'; END IF;
 SELECT * INTO d FROM public.drivers WHERE id=f.driver_id FOR UPDATE;
 IF d.user_id IS DISTINCT FROM auth.uid() OR d.license_status<>'approved' OR d.status<>'active' THEN RAISE EXCEPTION 'forbidden'; END IF;
 SELECT * INTO o FROM public.orders WHERE id=f.order_id FOR UPDATE;
 IF f.state<>'offered' OR f.expires_at<=clock_timestamp() OR o.status<>'pending' OR o.driver_id IS NOT NULL
   OR o.payment_method<>'cash' OR o.quantity<>1 OR o.scheduled_at IS NOT NULL THEN RAISE EXCEPTION 'offer expired or order changed'; END IF;
 IF NOT _accept THEN UPDATE dispatch_private.offers SET state='rejected' WHERE id=f.id; RETURN NULL; END IF;
 IF d.availability<>'available' OR d.city IS DISTINCT FROM o.city OR d.vehicle_capacity<>o.capacity
  OR NOT EXISTS(SELECT 1 FROM dispatch_private.positions WHERE driver_id=d.id AND water_type=o.water_type::text AND seen_at>clock_timestamp()-interval '90 seconds')
  OR EXISTS(SELECT 1 FROM public.orders WHERE driver_id=d.id AND status IN ('assigned','accepted','on_the_way','arrived','delivering','payment_collected')) THEN RAISE EXCEPTION 'driver unavailable'; END IF;
 UPDATE dispatch_private.offers SET state='accepted' WHERE id=f.id;
 UPDATE dispatch_private.jobs SET state='accepted' WHERE order_id=o.id;
 -- Production computes commission only on 'approved'. Automatic acceptance must
 -- use the same calculator without publishing an intermediate approved order.
 SELECT * INTO commission FROM public.calculate_app_commission(o.city,o.capacity,o.price);
 UPDATE public.orders SET driver_id=d.id,status='accepted',updated_at=clock_timestamp(),
   app_commission=coalesce(commission.amount,0),commission_rule_snapshot=commission.snapshot,
   commission_status=CASE WHEN coalesce(commission.amount,0)=0 THEN 'free' ELSE 'unpaid' END,
   driver_payout_amount=0,driver_payout_status='none' WHERE id=o.id;
 RETURN o.id;
END $$;

CREATE FUNCTION public.dispatch_status(_order_id uuid) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('state',j.state,'deadline',j.deadline) FROM dispatch_private.jobs j JOIN public.orders o ON o.id=j.order_id
 WHERE o.id=_order_id AND (o.customer_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
$$;

CREATE FUNCTION public.dispatch_manual_queue() RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('order_id',q.order_id,'started_at',q.started_at)), '[]'::jsonb)
 FROM (SELECT j.order_id,j.started_at FROM dispatch_private.jobs j JOIN public.orders o ON o.id=j.order_id
 WHERE public.has_role(auth.uid(),'admin') AND j.state='manual' AND o.status='pending' AND o.driver_id IS NULL
 ORDER BY j.started_at LIMIT 100) q;
$$;
REVOKE ALL ON FUNCTION public.dispatch_manual_queue() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dispatch_manual_queue() TO authenticated;

CREATE FUNCTION dispatch_private.order_changed() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.status<>'pending' OR NEW.driver_id IS NOT NULL THEN
  UPDATE dispatch_private.offers SET state='closed' WHERE order_id=NEW.id AND state='offered';
  UPDATE dispatch_private.jobs SET state='closed' WHERE order_id=NEW.id AND state='searching';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER dispatch_order_changed AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION dispatch_private.order_changed();
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA dispatch_private FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dispatch_heartbeat(double precision,double precision,text),public.dispatch_offer(),public.dispatch_respond(uuid,boolean),public.dispatch_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dispatch_heartbeat(double precision,double precision,text),public.dispatch_offer(),public.dispatch_respond(uuid,boolean),public.dispatch_status(uuid) TO authenticated;
-- Activation is separate: requires real PostgreSQL concurrency tests, push delivery,
-- verified field coordinates and a cron job calling dispatch_private.tick() every 5 seconds.
