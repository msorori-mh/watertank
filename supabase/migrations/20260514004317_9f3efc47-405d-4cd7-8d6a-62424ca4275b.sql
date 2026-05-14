-- Enum for top-up status
CREATE TYPE public.topup_status AS ENUM ('pending','approved','rejected');

-- wallets table
CREATE TABLE public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance numeric NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner views own wallet"
ON public.wallets FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin manages wallets"
ON public.wallets FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_wallets_touch
BEFORE UPDATE ON public.wallets
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- wallet_topups table
CREATE TABLE public.wallet_topups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  payment_method_id uuid REFERENCES public.payment_methods(id) ON DELETE SET NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  receipt_url text,
  sender_name text,
  sender_phone text,
  transfer_reference text,
  status public.topup_status NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_topups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner views own topups"
ON public.wallet_topups FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "owner creates own topup"
ON public.wallet_topups FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND reviewed_by IS NULL
  AND reviewed_at IS NULL
);

-- Owner can edit ONLY while still pending (e.g. fix sender info / receipt) and cannot change status
CREATE POLICY "owner updates own pending topup"
ON public.wallet_topups FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "admin manages topups"
ON public.wallet_topups FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_wallet_topups_touch
BEFORE UPDATE ON public.wallet_topups
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_wallet_topups_user ON public.wallet_topups(user_id);
CREATE INDEX idx_wallet_topups_status ON public.wallet_topups(status);

-- Auto-create wallet on new user (extend handle_new_user)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, phone, name, type)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE((NEW.raw_user_meta_data->>'type')::public.user_type, 'customer')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'customer'))
  ON CONFLICT DO NOTHING;

  -- Auto-create wallet for every new user (covers Google, phone, email signups)
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Backfill wallets for existing users
INSERT INTO public.wallets (user_id, balance)
SELECT p.id, 0 FROM public.profiles p
LEFT JOIN public.wallets w ON w.user_id = p.id
WHERE w.id IS NULL;

-- Storage bucket for receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('wallet-receipts', 'wallet-receipts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public read wallet-receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'wallet-receipts');

CREATE POLICY "auth upload wallet-receipts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'wallet-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "owner update wallet-receipts"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'wallet-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "owner delete wallet-receipts"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'wallet-receipts' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));
