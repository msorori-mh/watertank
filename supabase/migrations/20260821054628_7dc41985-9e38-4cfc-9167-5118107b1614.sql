DELETE FROM public.user_roles
WHERE role = 'customer'
  AND user_id = 'bf359bc2-86a0-4ce9-ae12-4914747c0c0e'
  AND user_id IN (SELECT user_id FROM public.drivers WHERE name = 'TEST_ONLY_E2E_DRIVER_02' AND vehicle_plate = 'TEST_ONLY-E2E-DRIVER-02');

UPDATE public.drivers
SET license_status = 'approved',
    availability = 'available',
    status = 'active'
WHERE id = '23b22028-0fcc-4fd9-a406-f5bf9f334a38'
  AND name = 'TEST_ONLY_E2E_DRIVER_02'
  AND vehicle_plate = 'TEST_ONLY-E2E-DRIVER-02';