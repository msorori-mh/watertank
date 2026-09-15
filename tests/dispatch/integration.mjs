import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';

// No arbitrary connection URL: only an isolated local test database is supported.
const real = process.argv.includes('--postgres');
const connect = async () => {
  const client = new pg.Client({host:'/var/run/postgresql', database:'watertank_dispatch_test', user:process.env.USER, statement_timeout:10000});
  await client.connect(); return client;
};
const db = real ? await connect() : new PGlite();
const run = sql => real ? db.query(sql) : db.exec(sql);
const scalar = async sql => Object.values((await db.query(sql)).rows[0])[0];
const id = n => `00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
let checks = 0;
const eq = (actual, expected) => { assert.equal(actual, expected); checks++; };
const reject = async sql => { await assert.rejects(run(sql)); checks++; };
const uid = n => run(`SELECT set_config('test.uid','${n ? id(n) : ''}',false)`);
try {
  assert.equal(await scalar("SELECT to_regclass('public.orders')"),null,'Refuse to run against an existing application database');
  await run(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
    CREATE FUNCTION public.has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT $1='${id(90)}'::uuid AND $2='admin' $$;
    GRANT USAGE ON SCHEMA public,auth TO authenticated,anon;`);
  await run(readFileSync(new URL('./production-schema.sql',import.meta.url),'utf8'));
  await run(readFileSync(new URL('../../db/auto_dispatch_candidate.sql',import.meta.url),'utf8'));
  await run(`INSERT INTO commission_settings(city,capacity,commission_type,commission_value) VALUES('Marib',5000,'percentage',5);
    INSERT INTO addresses(id,user_id,title,city,lat,lng) VALUES('${id(50)}','${id(60)}','TEST_ONLY','Marib',15,45);
    INSERT INTO drivers(id,user_id,name,phone,vehicle_plate,vehicle_capacity,city,license_status,availability)
    VALUES('${id(1)}','${id(11)}','TEST_ONLY','TEST_ONLY','TEST_ONLY',5000,'Marib','approved','available');`);
  const order = async n => run(`INSERT INTO orders(id,customer_id,address_id,city,water_type,capacity,price) VALUES('${id(n)}','${id(60)}','${id(50)}','Marib','normal',5000,14000)`);
  const prepare = async n => {
    await uid(11); await run("SELECT dispatch_heartbeat(15.01,45,'normal')");
    await order(n); await run('SELECT dispatch_private.tick()');
    return scalar(`SELECT id FROM dispatch_private.offers WHERE order_id='${id(n)}' AND state='offered'`);
  };
  await run('UPDATE dispatch_private.config SET enabled=true');
  const first = await prepare(100);
  // Exercise EXECUTE grants, private schema access and ownership as actual DB roles.
  await run('SET ROLE anon'); await reject('SELECT public.dispatch_offer()'); await run('RESET ROLE');
  await uid(12); await run('SET ROLE authenticated');
  await reject('SELECT * FROM dispatch_private.positions');
  await reject('SELECT dispatch_private.tick()');
  await reject(`SELECT dispatch_respond('${first}',true)`);
  eq(await scalar('SELECT dispatch_offer()'),null);
  await run('RESET ROLE'); await uid(11); await run('SET ROLE authenticated');
  eq((await scalar('SELECT dispatch_offer()')).id,first);
  await run(`SELECT dispatch_respond('${first}',true)`); await run('RESET ROLE');
  eq(Number(await scalar(`SELECT app_commission FROM orders WHERE id='${id(100)}'`)),700);
  eq(await scalar(`SELECT commission_rule_snapshot->>'commission_type' FROM orders WHERE id='${id(100)}'`),'percentage');
  eq(await scalar(`SELECT commission_status FROM orders WHERE id='${id(100)}'`),'unpaid');
  eq(Number(await scalar(`SELECT count(*) FROM order_status_history WHERE order_id='${id(100)}' AND status='accepted'`)),1);
  eq(Number(await scalar(`SELECT count(*) FROM notifications WHERE order_id='${id(100)}' AND type='order_accepted'`)),1);
  await reject(`SELECT dispatch_respond('${first}',true)`);
  await uid(60); await run('SET ROLE authenticated');
  eq((await scalar(`SELECT dispatch_status('${id(100)}')`)).state,'accepted');
  eq((await scalar('SELECT dispatch_manual_queue()')).length,0);
  await run('RESET ROLE');
  await run(`UPDATE orders SET status='completed' WHERE id='${id(100)}'`);
  const second = await prepare(101);
  await run(`UPDATE drivers SET status='inactive' WHERE id='${id(1)}'`);
  await reject(`SELECT dispatch_respond('${second}',true)`);
  await run(`UPDATE drivers SET status='active' WHERE id='${id(1)}'; UPDATE orders SET status='cancelled' WHERE id='${id(101)}'`);
  await reject(`SELECT dispatch_respond('${second}',true)`);
  eq(await scalar(`SELECT state FROM dispatch_private.offers WHERE id='${second}'`),'closed');
  await prepare(102);
  await run(`UPDATE dispatch_private.jobs SET deadline=now()-interval '1 second' WHERE order_id='${id(102)}';
    UPDATE dispatch_private.offers SET expires_at=now()-interval '1 second' WHERE order_id='${id(102)}'; SELECT dispatch_private.tick()`);
  await uid(90); await run('SET ROLE authenticated');
  eq((await scalar('SELECT dispatch_manual_queue()'))[0].order_id,id(102));
  await run('RESET ROLE');

  if (real) {
    const a=await connect(), b=await connect();
    try {
      for(const c of [a,b]) await c.query(`SELECT set_config('test.uid','${id(11)}',false); SET ROLE authenticated;`);
      const offer=await prepare(103);
      const results=await Promise.allSettled([a.query('SELECT dispatch_respond($1,true)',[offer]),b.query('SELECT dispatch_respond($1,true)',[offer])]);
      eq(results.filter(r=>r.status==='fulfilled').length,1);
      eq(results.filter(r=>r.status==='rejected').length,1);
      eq(Number(await scalar(`SELECT count(*) FROM order_status_history WHERE order_id='${id(103)}' AND status='accepted'`)),1);
      await run(`UPDATE orders SET status='completed' WHERE id='${id(103)}'`);
      const cancelled=await prepare(104);
      await db.query('BEGIN');
      await db.query(`UPDATE orders SET status='cancelled' WHERE id='${id(104)}'`);
      const pending=a.query('SELECT dispatch_respond($1,true)',[cancelled]);
      // Attach rejection before releasing the blocking transaction.
      const outcome=Promise.allSettled([pending]);
      await db.query('COMMIT');
      eq((await outcome)[0].status,'rejected');
      eq(await scalar(`SELECT status FROM orders WHERE id='${id(104)}'`),'cancelled');
      const assigned=await prepare(105);
      await order(106);
      await db.query('BEGIN');
      await db.query(`UPDATE orders SET driver_id='${id(1)}',status='assigned' WHERE id='${id(106)}'`);
      const accept=Promise.allSettled([a.query('SELECT dispatch_respond($1,true)',[assigned])]);
      await db.query('COMMIT');
      eq((await accept)[0].status,'rejected');
      eq(await scalar(`SELECT driver_id FROM orders WHERE id='${id(105)}'`),null);
    } finally { await a.end(); await b.end(); }
  }
  console.log(`PASS: ${checks} production-schema integration assertions (${real ? 'PostgreSQL with independent connections' : 'PGlite, concurrency NOT tested'}). Existing application RLS/JWT, foreign keys and device delivery require staging E2E.`);
} finally { if(real) await db.end(); else await db.close(); }
