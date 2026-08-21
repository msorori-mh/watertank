CREATE OR REPLACE FUNCTION public.guard_driver_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only guard direct writes coming from client roles.
  -- Trusted SECURITY DEFINER RPCs run as the function owner and are allowed.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.balance IS DISTINCT FROM OLD.balance
     OR NEW.license_status IS DISTINCT FROM OLD.license_status
     OR NEW.rating IS DISTINCT FROM OLD.rating
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'not allowed to modify protected driver fields';
  END IF;

  RETURN NEW;
END;
$function$;