-- Supabase can reject UPDATEs without a WHERE clause ("UPDATE requires a WHERE clause").
-- Keep bulk reset semantics with an explicit predicate that matches all employee rows.

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

  UPDATE public.employees
  SET leave_balance = p_allowance_days
  WHERE id IS NOT NULL;

  UPDATE public.system_settings
  SET
    last_leave_reset_fiscal_year = p_fiscal_year,
    updated_at = now()
  WHERE id = 1;
END;
$$;
