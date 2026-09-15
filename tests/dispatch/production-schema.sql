-- Schema-only snapshot read from Watertank via Lovable, 2026-09-15.
-- Test fixture: no production rows, foreign keys, grants or existing RLS policies.
-- Real order trigger/calculator definitions; not a complete database backup.
CREATE TYPE public.app_role AS ENUM ('admin','customer','driver');

CREATE TYPE public.driver_availability AS ENUM ('available','busy','offline');

CREATE TYPE public.driver_status AS ENUM ('active','inactive','busy');

CREATE TYPE public.license_status AS ENUM ('pending','approved','rejected');

CREATE TYPE public.notification_type AS ENUM ('order_approved','order_rejected','order_accepted','order_on_way','order_arrived','order_unloading','order_payment_collected','order_completed','order_cancelled','general','wallet_topup_approved','wallet_topup_rejected','driver_approved','driver_rejected');

CREATE TYPE public.order_status AS ENUM ('pending','approved','assigned','accepted','on_the_way','arrived','delivering','payment_collected','completed','cancelled','rejected');

CREATE TYPE public.payment_method AS ENUM ('cash','wallet');

CREATE TYPE public.payment_status AS ENUM ('pending','paid','failed','refunded');

CREATE TYPE public.topup_status AS ENUM ('pending','approved','rejected');

CREATE TYPE public.user_type AS ENUM ('customer','driver','admin');

CREATE TYPE public.wallet_tx_direction AS ENUM ('credit','debit');

CREATE TYPE public.wallet_tx_type AS ENUM ('topup','order_payment','refund','adjustment');

CREATE TYPE public.water_type AS ENUM ('normal','kawthar');

CREATE TYPE public.withdrawal_status AS ENUM ('pending','approved','rejected','paid');

CREATE TABLE public.addresses (id uuid DEFAULT gen_random_uuid() NOT NULL,user_id uuid NOT NULL,title text NOT NULL,city text NOT NULL,lat double precision NOT NULL,lng double precision NOT NULL,description text,is_default boolean DEFAULT false NOT NULL,created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.commission_settings (id uuid DEFAULT gen_random_uuid() NOT NULL,city text,capacity integer,commission_type text DEFAULT 'fixed'::text NOT NULL,commission_value numeric DEFAULT 0 NOT NULL,free_until date,is_active boolean DEFAULT true NOT NULL,created_at timestamp with time zone DEFAULT now() NOT NULL,updated_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.drivers (id uuid DEFAULT gen_random_uuid() NOT NULL,user_id uuid,name text NOT NULL,phone text NOT NULL,vehicle_plate text NOT NULL,vehicle_capacity integer NOT NULL,city text,status driver_status DEFAULT 'active'::driver_status NOT NULL,rating numeric(2,1) DEFAULT 5.0 NOT NULL,created_at timestamp with time zone DEFAULT now() NOT NULL,license_status license_status DEFAULT 'pending'::license_status NOT NULL,balance numeric DEFAULT 0 NOT NULL,availability driver_availability DEFAULT 'offline'::driver_availability NOT NULL,notifications_enabled boolean DEFAULT true NOT NULL,payout_method text,payout_account text,payout_recipient_name text,payout_type text,bank_name text,bank_account_number text,bank_account_holder text,transfer_recipient_name text,transfer_phone text,transfer_network_name text);

CREATE TABLE public.notifications (id uuid DEFAULT gen_random_uuid() NOT NULL,user_id uuid NOT NULL,order_id uuid,title text NOT NULL,body text NOT NULL,type notification_type DEFAULT 'general'::notification_type NOT NULL,is_read boolean DEFAULT false NOT NULL,created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.order_status_history (id uuid DEFAULT gen_random_uuid() NOT NULL,order_id uuid NOT NULL,status order_status NOT NULL,notes text,created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.orders (id uuid DEFAULT gen_random_uuid() NOT NULL,customer_id uuid NOT NULL,driver_id uuid,city text NOT NULL,address_id uuid,address_snapshot jsonb,water_type water_type NOT NULL,capacity integer NOT NULL,quantity integer DEFAULT 1 NOT NULL,status order_status DEFAULT 'pending'::order_status NOT NULL,price numeric(10,2) NOT NULL,payment_method payment_method DEFAULT 'cash'::payment_method NOT NULL,payment_status payment_status DEFAULT 'pending'::payment_status NOT NULL,notes text,scheduled_at timestamp with time zone,created_at timestamp with time zone DEFAULT now() NOT NULL,updated_at timestamp with time zone DEFAULT now() NOT NULL,payment_collected_at timestamp with time zone,app_commission numeric DEFAULT 0 NOT NULL,commission_status text DEFAULT 'unpaid'::text NOT NULL,commission_rule_snapshot jsonb,driver_payout_amount numeric DEFAULT 0 NOT NULL,driver_payout_status text DEFAULT 'none'::text NOT NULL,wallet_paid_at timestamp with time zone,wallet_refunded_at timestamp with time zone,refund_reason text);

CREATE TABLE public.wallet_transactions (id uuid DEFAULT gen_random_uuid() NOT NULL,wallet_id uuid NOT NULL,user_id uuid NOT NULL,order_id uuid,topup_id uuid,type wallet_tx_type NOT NULL,direction wallet_tx_direction NOT NULL,amount numeric NOT NULL,balance_after numeric NOT NULL,description text,created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.wallets (id uuid DEFAULT gen_random_uuid() NOT NULL,user_id uuid NOT NULL,balance numeric DEFAULT 0 NOT NULL,created_at timestamp with time zone DEFAULT now() NOT NULL,updated_at timestamp with time zone DEFAULT now() NOT NULL);

ALTER TABLE addresses ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);

ALTER TABLE drivers ADD CONSTRAINT drivers_payout_type_check CHECK (((payout_type IS NULL) OR (payout_type = ANY (ARRAY['bank'::text, 'transfer_network'::text]))));

ALTER TABLE drivers ADD CONSTRAINT drivers_pkey PRIMARY KEY (id);

ALTER TABLE orders ADD CONSTRAINT orders_pkey PRIMARY KEY (id);

ALTER TABLE order_status_history ADD CONSTRAINT order_status_history_pkey PRIMARY KEY (id);

ALTER TABLE notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

ALTER TABLE commission_settings ADD CONSTRAINT commission_settings_commission_type_check CHECK ((commission_type = ANY (ARRAY['fixed'::text, 'percentage'::text])));

ALTER TABLE commission_settings ADD CONSTRAINT commission_settings_pkey PRIMARY KEY (id);

ALTER TABLE wallets ADD CONSTRAINT wallets_balance_check CHECK ((balance >= (0)::numeric));

ALTER TABLE wallets ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);

ALTER TABLE wallets ADD CONSTRAINT wallets_user_id_key UNIQUE (user_id);

ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_amount_check CHECK ((amount > (0)::numeric));

ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id);

CREATE OR REPLACE FUNCTION public.log_order_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' OR (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.order_status_history (order_id, status)
    VALUES (NEW.id, NEW.status);
  END IF;
  RETURN NEW;
END; $function$;


CREATE OR REPLACE FUNCTION public.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $function$;


CREATE OR REPLACE FUNCTION public.calculate_app_commission(_city text, _capacity integer, _price numeric, OUT amount numeric, OUT snapshot jsonb, OUT is_free boolean)
 RETURNS record
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _rule public.commission_settings;
BEGIN
  amount := 0; snapshot := NULL; is_free := false;

  SELECT * INTO _rule FROM public.commission_settings
   WHERE is_active = true
     AND (city IS NULL OR city = _city)
     AND (capacity IS NULL OR capacity = _capacity)
   ORDER BY (city IS NOT NULL)::int DESC, (capacity IS NOT NULL)::int DESC, updated_at DESC
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  snapshot := to_jsonb(_rule);

  IF _rule.free_until IS NOT NULL AND _rule.free_until >= CURRENT_DATE THEN
    is_free := true; amount := 0; RETURN;
  END IF;

  IF _rule.commission_type = 'fixed' THEN
    amount := _rule.commission_value;
  ELSE
    amount := round(_price * _rule.commission_value / 100.0, 2);
  END IF;

  IF amount > _price THEN amount := _price; END IF;
  IF amount < 0 THEN amount := 0; END IF;
  IF amount = 0 THEN is_free := true; END IF;
END; $function$;


CREATE OR REPLACE FUNCTION public.auto_refund_wallet_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _wallet public.wallets;
  _new_balance numeric;
  _reason text;
BEGIN
  IF NEW.payment_method <> 'wallet' THEN RETURN NEW; END IF;
  IF NEW.wallet_refunded_at IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('rejected','cancelled') THEN RETURN NEW; END IF;
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF OLD.status = 'completed' OR OLD.payment_collected_at IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.wallet_paid_at IS NULL THEN RETURN NEW; END IF;

  SELECT * INTO _wallet FROM public.wallets WHERE user_id = NEW.customer_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.wallets(user_id, balance) VALUES (NEW.customer_id, 0)
    RETURNING * INTO _wallet;
  END IF;

  _new_balance := _wallet.balance + NEW.price;
  UPDATE public.wallets SET balance = _new_balance, updated_at = now() WHERE id = _wallet.id;

  _reason := CASE WHEN NEW.status = 'rejected' THEN 'تم رفض الطلب' ELSE 'تم إلغاء الطلب' END;

  NEW.payment_status := 'refunded';
  NEW.wallet_refunded_at := now();
  NEW.refund_reason := COALESCE(NEW.refund_reason, _reason);
  NEW.driver_payout_status := 'none';
  NEW.driver_payout_amount := 0;

  INSERT INTO public.wallet_transactions
    (wallet_id, user_id, order_id, type, direction, amount, balance_after, description)
  VALUES
    (_wallet.id, NEW.customer_id, NEW.id, 'refund', 'credit', NEW.price, _new_balance, _reason);

  INSERT INTO public.notifications(user_id, order_id, title, body, type)
  VALUES (NEW.customer_id, NEW.id,
    'تم استرداد مبلغ طلبك',
    'تم إعادة ' || NEW.price::text || ' ر.ي إلى محفظتك. السبب: ' || _reason,
    'general');

  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.emit_order_notifications()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _driver_user uuid;
  _title text;
  _body text;
  _type public.notification_type;
  _short text := upper(left(NEW.id::text, 8));
BEGIN
  IF NEW.driver_id IS DISTINCT FROM OLD.driver_id AND NEW.driver_id IS NOT NULL THEN
    SELECT user_id INTO _driver_user FROM public.drivers WHERE id = NEW.driver_id;

    IF _driver_user IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = _driver_user AND order_id = NEW.id
        AND title = 'طلب جديد مُسند إليك'
    ) THEN
      INSERT INTO public.notifications(user_id, order_id, type, title, body)
      VALUES (_driver_user, NEW.id, 'general', 'طلب جديد مُسند إليك',
        'تم تعيينك للطلب #' || _short || ' في ' || NEW.city || '.');
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = NEW.customer_id AND order_id = NEW.id
        AND title = 'تم تعيين سائق لطلبك'
    ) THEN
      INSERT INTO public.notifications(user_id, order_id, type, title, body)
      VALUES (NEW.customer_id, NEW.id, 'general', 'تم تعيين سائق لطلبك',
        'تم إسناد الطلب #' || _short || ' إلى سائق، ويمكنك متابعة مراحله الآن.');
    END IF;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    CASE NEW.status
      WHEN 'approved' THEN
        _type := 'order_approved'; _title := 'تم اعتماد طلبك';
        _body := 'الطلب #' || _short || ' تم اعتماده من الإدارة.';
      WHEN 'accepted' THEN
        _type := 'order_accepted'; _title := 'قَبِل السائق طلبك';
        _body := 'قَبِل السائق الطلب #' || _short || ' وسيبدأ التحرك قريباً.';
      WHEN 'on_the_way' THEN
        _type := 'order_on_way'; _title := 'السائق في الطريق إليك';
        _body := 'سائق الطلب #' || _short || ' انطلق نحو موقعك الآن.';
      WHEN 'arrived' THEN
        _type := 'order_arrived'; _title := 'وصل السائق';
        _body := 'وصل سائق الطلب #' || _short || ' إلى موقعك.';
      WHEN 'delivering' THEN
        _type := 'order_unloading'; _title := 'بدأ تفريغ الماء';
        _body := 'بدأ السائق صب الماء للطلب #' || _short || '.';
      WHEN 'payment_collected' THEN
        _type := 'order_payment_collected'; _title := 'تم استلام المبلغ';
        _body := 'تم استلام مبلغ الطلب #' || _short || '.';
      WHEN 'completed' THEN
        _type := 'order_completed'; _title := 'اكتمل الطلب';
        _body := 'اكتمل الطلب #' || _short || ' بنجاح.';
      WHEN 'cancelled' THEN
        _type := 'order_cancelled'; _title := 'تم إلغاء الطلب';
        _body := 'تم إلغاء الطلب #' || _short || '.';
      WHEN 'rejected' THEN
        _type := 'order_rejected'; _title := 'تم رفض الطلب';
        _body := 'تم رفض الطلب #' || _short || ' من الإدارة.';
      ELSE
        _type := NULL;
    END CASE;

    IF _type IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = NEW.customer_id AND order_id = NEW.id
        AND type = _type AND title = _title
    ) THEN
      INSERT INTO public.notifications(user_id, order_id, type, title, body)
      VALUES (NEW.customer_id, NEW.id, _type, _title, _body);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.compute_order_commission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _r record;
BEGIN
  IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    SELECT * INTO _r FROM public.calculate_app_commission(NEW.city, NEW.capacity, NEW.price);
    NEW.app_commission := COALESCE(_r.amount, 0);
    NEW.commission_rule_snapshot := _r.snapshot;

    IF NEW.payment_method = 'wallet' THEN
      -- التطبيق قبض المبلغ مسبقاً من محفظة العميل
      NEW.driver_payout_amount := GREATEST(NEW.price - COALESCE(_r.amount,0), 0);
      NEW.driver_payout_status := 'pending';
      NEW.commission_status := 'collected';
    ELSE
      NEW.driver_payout_amount := 0;
      NEW.driver_payout_status := 'none';
      NEW.commission_status := CASE WHEN COALESCE(_r.amount,0) = 0 THEN 'free' ELSE 'unpaid' END;
    END IF;
  END IF;
  RETURN NEW;
END; $function$;


CREATE TRIGGER orders_status_log AFTER INSERT OR UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION log_order_status_change();

CREATE TRIGGER orders_touch BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER trg_auto_refund_wallet_order BEFORE UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION auto_refund_wallet_order();

CREATE TRIGGER trg_compute_order_commission BEFORE INSERT OR UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION compute_order_commission();

CREATE TRIGGER trg_emit_order_notifications AFTER UPDATE OF driver_id, status ON public.orders FOR EACH ROW EXECUTE FUNCTION emit_order_notifications();
