-- payment_methods table
CREATE TABLE public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('bank','transfer_network','direct_transfer','other')),
  provider_name text,
  account_holder_name text,
  account_number text,
  phone_number text,
  qr_code_url text,
  instructions text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manages payment_methods"
ON public.payment_methods FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "auth read active payment_methods"
ON public.payment_methods FOR SELECT TO authenticated
USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_payment_methods_touch
BEFORE UPDATE ON public.payment_methods
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- storage bucket for QR images
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-qr', 'payment-qr', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public read payment-qr"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-qr');

CREATE POLICY "admin upload payment-qr"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'payment-qr' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin update payment-qr"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'payment-qr' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin delete payment-qr"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'payment-qr' AND public.has_role(auth.uid(), 'admin'));
