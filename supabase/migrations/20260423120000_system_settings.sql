-- Company-wide system settings (single row, id = 1).
-- Replaces in-memory-only Settings UI so default leave allowance persists.

CREATE TABLE IF NOT EXISTS public.system_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  default_leave_balance integer NOT NULL DEFAULT 21,
  working_days_per_week integer NOT NULL DEFAULT 5,
  working_hours_start text NOT NULL DEFAULT '09:00',
  working_hours_end text NOT NULL DEFAULT '17:00',
  overtime_rate numeric(6, 2) NOT NULL DEFAULT 1.5,
  fiscal_year_start text NOT NULL DEFAULT '01-01',
  last_leave_reset_fiscal_year integer NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.system_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_settings_select_authenticated" ON public.system_settings;
CREATE POLICY "system_settings_select_authenticated"
  ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "system_settings_insert_admin" ON public.system_settings;
CREATE POLICY "system_settings_insert_admin"
  ON public.system_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (coalesce((auth.jwt() -> 'app_metadata' ->> 'type'), '') = 'admin');

DROP POLICY IF EXISTS "system_settings_update_admin" ON public.system_settings;
CREATE POLICY "system_settings_update_admin"
  ON public.system_settings
  FOR UPDATE
  TO authenticated
  USING (coalesce((auth.jwt() -> 'app_metadata' ->> 'type'), '') = 'admin')
  WITH CHECK (coalesce((auth.jwt() -> 'app_metadata' ->> 'type'), '') = 'admin');

-- Atomic leave reset + fiscal-year bookkeeping (bypasses per-row employee RLS safely for admins only).
CREATE OR REPLACE FUNCTION public.reset_employee_leave_allowances(
  p_allowance_days integer,
  p_fiscal_year integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(auth.jwt() -> 'app_metadata' ->> 'type', '') <> 'admin' THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_allowance_days IS NULL OR p_allowance_days < 0 THEN
    RAISE EXCEPTION 'invalid allowance' USING ERRCODE = '22023';
  END IF;

  UPDATE public.employees SET leave_balance = p_allowance_days;

  UPDATE public.system_settings
  SET
    last_leave_reset_fiscal_year = p_fiscal_year,
    updated_at = now()
  WHERE id = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_employee_leave_allowances(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_employee_leave_allowances(integer, integer) TO authenticated;
