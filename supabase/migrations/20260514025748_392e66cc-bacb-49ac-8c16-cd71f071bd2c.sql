
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notifications_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS notifications_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS payout_method text;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS payout_account text;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS payout_recipient_name text;
