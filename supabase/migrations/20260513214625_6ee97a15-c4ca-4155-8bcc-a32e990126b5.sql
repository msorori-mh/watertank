
-- cash_handovers table for driver cash deposit tracking
CREATE TABLE public.cash_handovers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  received_by uuid NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cash_handovers_driver ON public.cash_handovers(driver_id);
CREATE INDEX idx_cash_handovers_created ON public.cash_handovers(created_at DESC);

ALTER TABLE public.cash_handovers ENABLE ROW LEVEL SECURITY;

-- Admins: full read & insert
CREATE POLICY "admin views handovers"
ON public.cash_handovers FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin inserts handovers"
ON public.cash_handovers FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND received_by = auth.uid());

CREATE POLICY "admin updates handovers"
ON public.cash_handovers FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Driver: read own handovers only (no insert/update/delete)
CREATE POLICY "driver views own handovers"
ON public.cash_handovers FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.drivers d
  WHERE d.id = cash_handovers.driver_id AND d.user_id = auth.uid()
));

-- Atomic RPC: validate + insert handover + decrement driver balance
CREATE OR REPLACE FUNCTION public.record_cash_handover(
  _driver_id uuid,
  _amount numeric,
  _notes text DEFAULT NULL
) RETURNS public.cash_handovers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_balance numeric;
  _row public.cash_handovers;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'amount must be greater than zero';
  END IF;

  SELECT balance INTO _current_balance FROM public.drivers WHERE id = _driver_id FOR UPDATE;
  IF _current_balance IS NULL THEN
    RAISE EXCEPTION 'driver not found';
  END IF;

  IF _amount > _current_balance THEN
    RAISE EXCEPTION 'amount exceeds driver balance';
  END IF;

  INSERT INTO public.cash_handovers(driver_id, amount, received_by, notes)
  VALUES (_driver_id, _amount, auth.uid(), _notes)
  RETURNING * INTO _row;

  UPDATE public.drivers SET balance = balance - _amount WHERE id = _driver_id;

  RETURN _row;
END;
$$;
