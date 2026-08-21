-- SEC-DRIVERS-PAYOUT-EXPOSURE-01 permission tests (read-only assertions).
-- Run against the project database (as a superuser session, so SET ROLE works).

-- 1) No customer-facing SELECT policy remains on public.drivers.
--    Expected: only "driver reads own row" and "admin reads drivers".
select polname, pg_get_expr(polqual, polrelid) as using_expr
  from pg_policy where polrelid = 'public.drivers'::regclass and polcmd = 'r'
 order by polname;

-- 2) The public RPC exposes no financial / payout column.
--    Expected rpc_leaks_financial = false
select pg_get_function_result(oid) as rpc_columns,
       pg_get_function_result(oid) ~* '(balance|payout|commission|bank_|transfer_)' as rpc_leaks_financial
  from pg_proc where proname = 'get_order_driver_public';

-- 3) Only signed-in users may call the RPC (fail-closed for anon).
--    Expected: authenticated = true, anon = false
select has_function_privilege('authenticated','public.get_order_driver_public(uuid)','execute') as authenticated_can_exec,
       has_function_privilege('anon','public.get_order_driver_public(uuid)','execute') as anon_can_exec;

-- 4) Role-scoped behaviour (requires a session that may SET ROLE).
--    Replace the UUIDs with a real order + its customer / driver / an unrelated user.
-- \set oid '...'  \set cust '...'  \set duser '...'  \set other '...'
--
-- 4a) customer: direct table read must return 0 rows, RPC must return exactly 1 row
-- select set_config('request.jwt.claims', json_build_object('sub', :'cust', 'role','authenticated')::text, true);
-- set local role authenticated;
--   select count(*) = 0 as customer_cannot_read_drivers from public.drivers;
--   select count(*) = 1 as customer_sees_assigned_driver from public.get_order_driver_public(:'oid');
-- reset role;
--
-- 4b) unrelated authenticated user: RPC must raise 'not allowed'
-- select set_config('request.jwt.claims', json_build_object('sub', :'other', 'role','authenticated')::text, true);
-- set local role authenticated;
--   select * from public.get_order_driver_public(:'oid');  -- expected: ERROR not allowed
-- reset role;
--
-- 4c) driver: still reads its own full row (needed by the driver app)
-- select set_config('request.jwt.claims', json_build_object('sub', :'duser', 'role','authenticated')::text, true);
-- set local role authenticated;
--   select count(*) = 1 as driver_reads_own_row from public.drivers;
-- reset role;
--
-- 4d) admin: keeps full access
-- select set_config('request.jwt.claims', json_build_object('sub', :'admin', 'role','authenticated')::text, true);
-- set local role authenticated;
--   select count(*) > 0 as admin_reads_all_drivers from public.drivers;
-- reset role;
