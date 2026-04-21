-- FCM device tokens: RLS so each user only touches their own rows.
--
-- user_id in public.fcm_tokens is the app’s employee id (bigint), same as
-- AuthContext user.id / app_metadata.employee_id — NOT auth.uid() (uuid).
-- See src/services/authService.js (buildUserFromSession).

ALTER TABLE IF EXISTS public.fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Current session’s employee id from the JWT (set server-side in app_metadata).
DROP POLICY IF EXISTS "fcm_tokens_select_own" ON public.fcm_tokens;
CREATE POLICY "fcm_tokens_select_own"
  ON public.fcm_tokens
  FOR SELECT
  TO authenticated
  USING (
    user_id = ((auth.jwt() -> 'app_metadata' ->> 'employee_id')::bigint)
  );

DROP POLICY IF EXISTS "fcm_tokens_insert_own" ON public.fcm_tokens;
CREATE POLICY "fcm_tokens_insert_own"
  ON public.fcm_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = ((auth.jwt() -> 'app_metadata' ->> 'employee_id')::bigint)
  );

DROP POLICY IF EXISTS "fcm_tokens_update_own" ON public.fcm_tokens;
CREATE POLICY "fcm_tokens_update_own"
  ON public.fcm_tokens
  FOR UPDATE
  TO authenticated
  USING (
    user_id = ((auth.jwt() -> 'app_metadata' ->> 'employee_id')::bigint)
  )
  WITH CHECK (
    user_id = ((auth.jwt() -> 'app_metadata' ->> 'employee_id')::bigint)
  );

DROP POLICY IF EXISTS "fcm_tokens_delete_own" ON public.fcm_tokens;
CREATE POLICY "fcm_tokens_delete_own"
  ON public.fcm_tokens
  FOR DELETE
  TO authenticated
  USING (
    user_id = ((auth.jwt() -> 'app_metadata' ->> 'employee_id')::bigint)
  );
