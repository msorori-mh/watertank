UPDATE auth.users
SET encrypted_password = crypt('Login@692022', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE email = 'mosrori201201@gmail.com';

-- Also reset phone-based demo accounts in case bcrypt format mismatched
UPDATE auth.users u
SET encrypted_password = crypt('wayet-pwd-' || split_part(split_part(u.email,'@',1),'-',2) || '-secure', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE u.email LIKE 'phone-%@wayet.local';