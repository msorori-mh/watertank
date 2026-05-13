
-- Add new order statuses
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'accepted' AFTER 'assigned';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'payment_collected' AFTER 'delivering';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'rejected' AFTER 'cancelled';

-- Add is_active flag for customers
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Add payment collected timestamp on orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_collected_at timestamptz;
