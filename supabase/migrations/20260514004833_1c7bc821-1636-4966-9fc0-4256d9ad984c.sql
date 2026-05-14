-- Add notification types for wallet topups
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'wallet_topup_approved';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'wallet_topup_rejected';
