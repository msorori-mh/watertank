
CREATE OR REPLACE FUNCTION public.promote_to_admin(_setup_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _expected text := '1234';
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF public.has_role(_uid, 'admin'::public.app_role) THEN RETURN; END IF;
  IF trim(_setup_code) <> _expected THEN
    RAISE EXCEPTION 'invalid admin setup code';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.profiles
     SET type = 'admin'::public.user_type
   WHERE id = _uid;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_to_admin(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_to_admin(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.assign_initial_role(_role public.app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF _role = 'admin'::public.app_role THEN RAISE EXCEPTION 'use promote_to_admin for admin role'; END IF;
  IF _role NOT IN ('customer'::public.app_role, 'driver'::public.app_role) THEN
    RAISE EXCEPTION 'invalid role';
  END IF;
  IF public.has_role(_uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'admin accounts cannot change portal role';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF _role = 'driver'::public.app_role THEN
    UPDATE public.profiles SET type = 'driver'::public.user_type WHERE id = _uid;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_initial_role(public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_initial_role(public.app_role) TO authenticated;
