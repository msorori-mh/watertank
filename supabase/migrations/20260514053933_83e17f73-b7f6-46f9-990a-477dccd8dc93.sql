ALTER TABLE public.payment_methods DROP CONSTRAINT IF EXISTS payment_methods_type_check;

UPDATE public.payment_methods SET type = 'bank_deposit' WHERE type = 'bank';
UPDATE public.payment_methods SET type = 'unified_transfer' WHERE type IN ('transfer_network','direct_transfer','other');

ALTER TABLE public.payment_methods
  ADD CONSTRAINT payment_methods_type_check
  CHECK (type IN ('bank_deposit','unified_transfer','pos_point'));