-- Audit trail + email delivery logs for admin visibility.

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id bigserial PRIMARY KEY,
  actor_id bigint NULL,
  actor_name text NOT NULL DEFAULT 'Unknown',
  actor_role text NOT NULL DEFAULT 'unknown',
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NULL,
  entity_label text NULL,
  summary text NOT NULL,
  details jsonb NULL,
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_actor_id_idx ON public.audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS audit_logs_entity_type_idx ON public.audit_logs (entity_type);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS audit_logs_status_idx ON public.audit_logs (status);

CREATE TABLE IF NOT EXISTS public.email_logs (
  id bigserial PRIMARY KEY,
  email_type text NOT NULL,
  recipient text NOT NULL,
  subject text NULL,
  message_id text NULL,
  status text NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
  error_message text NULL,
  metadata jsonb NULL,
  triggered_by_employee_id bigint NULL,
  triggered_by_name text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_logs_created_at_idx ON public.email_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS email_logs_email_type_idx ON public.email_logs (email_type);
CREATE INDEX IF NOT EXISTS email_logs_recipient_idx ON public.email_logs (recipient);
CREATE INDEX IF NOT EXISTS email_logs_status_idx ON public.email_logs (status);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Audit logs: any authenticated user may write their own actions; admins read all.
DROP POLICY IF EXISTS "audit_logs_select_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_select_admin"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (coalesce((auth.jwt() -> 'app_metadata' ->> 'type'), '') = 'admin');

DROP POLICY IF EXISTS "audit_logs_insert_authenticated" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_authenticated"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_id IS NULL
    OR actor_id = ((auth.jwt() -> 'app_metadata' ->> 'employee_id')::bigint)
  );

-- Email logs: admin read-only from client; writes use service role (Netlify function).
DROP POLICY IF EXISTS "email_logs_select_admin" ON public.email_logs;
CREATE POLICY "email_logs_select_admin"
  ON public.email_logs
  FOR SELECT
  TO authenticated
  USING (coalesce((auth.jwt() -> 'app_metadata' ->> 'type'), '') = 'admin');
