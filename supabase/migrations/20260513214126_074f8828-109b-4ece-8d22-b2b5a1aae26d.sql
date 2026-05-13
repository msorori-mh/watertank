-- نوع الإشعار
DO $$ BEGIN
  CREATE TYPE public.notification_type AS ENUM (
    'order_approved',
    'order_rejected',
    'order_accepted',
    'order_on_way',
    'order_arrived',
    'order_unloading',
    'order_payment_collected',
    'order_completed',
    'order_cancelled',
    'general'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- جدول الإشعارات
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  order_id uuid,
  title text NOT NULL,
  body text NOT NULL,
  type public.notification_type NOT NULL DEFAULT 'general',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, is_read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- المستخدم يرى إشعاراته، الإدارة ترى الكل
DROP POLICY IF EXISTS "users view own notifications" ON public.notifications;
CREATE POLICY "users view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- المستخدم يستطيع تحديث is_read لإشعاراته فقط
DROP POLICY IF EXISTS "users update own notifications" ON public.notifications;
CREATE POLICY "users update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- الإدارة تنشئ أي إشعار
DROP POLICY IF EXISTS "admin creates notifications" ON public.notifications;
CREATE POLICY "admin creates notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- المستخدم يستطيع إنشاء إشعارات لنفسه (لاستخدامها من الواجهة في الأحداث التلقائية)
DROP POLICY IF EXISTS "users create own notifications" ON public.notifications;
CREATE POLICY "users create own notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- تفعيل البث المباشر
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;