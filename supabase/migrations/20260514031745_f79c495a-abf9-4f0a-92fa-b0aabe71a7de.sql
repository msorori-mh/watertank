
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS payout_type text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_account_number text,
  ADD COLUMN IF NOT EXISTS bank_account_holder text,
  ADD COLUMN IF NOT EXISTS transfer_recipient_name text,
  ADD COLUMN IF NOT EXISTS transfer_phone text,
  ADD COLUMN IF NOT EXISTS transfer_network_name text;

-- Backfill payout_type from legacy payout_method when possible
UPDATE public.drivers
   SET payout_type = CASE
     WHEN payout_method = 'bank' THEN 'bank'
     WHEN payout_method IN ('wallet','transfer','transfer_network') THEN 'transfer_network'
     ELSE payout_type
   END
 WHERE payout_type IS NULL AND payout_method IS NOT NULL;

ALTER TABLE public.drivers
  ADD CONSTRAINT drivers_payout_type_check
  CHECK (payout_type IS NULL OR payout_type IN ('bank','transfer_network'));
