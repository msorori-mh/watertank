-- Create demo accounts (drivers, customers, admin)
-- Uses existing handle_new_user trigger to populate profiles + user_roles

DO $$
DECLARE
  _ids jsonb := '{}'::jsonb;
  _city text;
  _uid uuid;
  rec record;
BEGIN
  SELECT name INTO _city FROM public.cities WHERE is_active = true ORDER BY created_at LIMIT 1;

  -- Phone-based accounts (customers + drivers)
  FOR rec IN
    SELECT * FROM (VALUES
      ('777111777', 'صدام حسين',  'customer'),
      ('777222777', 'محمد حسين',  'customer'),
      ('777333777', 'عيسى حسين',  'driver'),
      ('777444777', 'مروان حسين', 'driver')
    ) AS t(phone, full_name, kind)
  LOOP
    SELECT id INTO _uid FROM auth.users
      WHERE email = 'phone-' || rec.phone || '@wayet.local';

    IF _uid IS NULL THEN
      _uid := gen_random_uuid();
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, email_change,
        email_change_token_new, recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', _uid, 'authenticated', 'authenticated',
        'phone-' || rec.phone || '@wayet.local',
        crypt('wayet-pwd-' || rec.phone || '-secure', gen_salt('bf')),
        now(),
        jsonb_build_object('provider','email','providers',ARRAY['email']),
        jsonb_build_object('phone', rec.phone, 'name', rec.full_name, 'type', rec.kind, 'role', rec.kind),
        now(), now(), '', '', '', ''
      );
      INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), _uid,
        jsonb_build_object('sub', _uid::text, 'email', 'phone-' || rec.phone || '@wayet.local'),
        'email', _uid::text, now(), now(), now()
      );
    END IF;

    -- Ensure profile name/phone are correct
    UPDATE public.profiles
       SET name = rec.full_name, phone = rec.phone, type = rec.kind::public.user_type, city = COALESCE(city, _city)
     WHERE id = _uid;

    IF rec.kind = 'driver' THEN
      INSERT INTO public.drivers (user_id, name, phone, city, vehicle_plate, vehicle_capacity,
                                  license_status, availability)
      VALUES (_uid, rec.full_name, rec.phone, _city,
              'DRV-' || substring(rec.phone, 4, 6),
              5000, 'approved', 'available')
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- Admin account
  SELECT id INTO _uid FROM auth.users WHERE email = 'mosrori201201@gmail.com';
  IF _uid IS NULL THEN
    _uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', _uid, 'authenticated', 'authenticated',
      'mosrori201201@gmail.com',
      crypt('Login@692022', gen_salt('bf')),
      now(),
      jsonb_build_object('provider','email','providers',ARRAY['email']),
      jsonb_build_object('name','Admin','type','admin','role','admin'),
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), _uid,
      jsonb_build_object('sub', _uid::text, 'email', 'mosrori201201@gmail.com'),
      'email', _uid::text, now(), now(), now()
    );
  END IF;

  -- Ensure admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Ensure admin profile type
  UPDATE public.profiles SET type = 'admin', name = COALESCE(NULLIF(name,''), 'Admin')
   WHERE id = _uid;
END $$;