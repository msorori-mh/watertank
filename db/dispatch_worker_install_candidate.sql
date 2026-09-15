-- STAGING CANDIDATE ONLY. Run after auto_dispatch_candidate.sql and verification.
-- Requires pg_cron >= 1.5 installed by the project administrator.
-- Installs the worker INACTIVE; does not enable dispatch.
BEGIN;
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
  RAISE EXCEPTION 'pg_cron must be installed before worker setup';
 END IF;
 IF (SELECT enabled FROM dispatch_private.config WHERE singleton) IS DISTINCT FROM false THEN
  RAISE EXCEPTION 'Dispatch must remain disabled during worker installation';
 END IF;
 IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='wayetmaa-dispatch-tick') THEN
  RAISE EXCEPTION 'Worker already exists: inspect it rather than replacing it';
 END IF;
END $$;
SELECT cron.schedule('wayetmaa-dispatch-tick','5 seconds','SELECT dispatch_private.tick();');
SELECT cron.alter_job(jobid, active := false) FROM cron.job WHERE jobname='wayetmaa-dispatch-tick';
COMMIT;
-- After staging gates, enable this exact job with cron.alter_job, keeping the
-- dispatch config false until the first successful cron.job_run_details entry.
-- Rollback: disable config first; run tick once to close outstanding offers,
-- then deactivate this exact cron job. Never delete orders or accepted jobs.
