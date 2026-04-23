import { supabase, TABLES, handleSupabaseError, handleSupabaseSuccess } from './supabase';

export const DEFAULT_SYSTEM_SETTINGS = {
  default_leave_balance: 21,
  working_days_per_week: 5,
  working_hours_start: '09:00',
  working_hours_end: '17:00',
  overtime_rate: 1.5,
  fiscal_year_start: '01-01',
  last_leave_reset_fiscal_year: null,
};

/**
 * Calendar fiscal-year index: year in which the current FY started.
 * e.g. FY starts 01-01 → index matches calendar year; FY starts 04-01 → index is the year containing that April.
 */
export function getFiscalYearIndex(date, fiscalYearStartMMDD) {
  const raw = (fiscalYearStartMMDD || '01-01').trim();
  const parts = raw.split('-').map((s) => parseInt(s, 10));
  const mm = parts[0];
  const dd = parts[1];
  if (!Number.isFinite(mm) || !Number.isFinite(dd)) {
    return date.getFullYear();
  }
  const y = date.getFullYear();
  const start = new Date(y, mm - 1, dd);
  if (date < start) return y - 1;
  return y;
}

function mapRow(row) {
  if (!row) return { ...DEFAULT_SYSTEM_SETTINGS };
  return {
    default_leave_balance: row.default_leave_balance ?? DEFAULT_SYSTEM_SETTINGS.default_leave_balance,
    working_days_per_week: row.working_days_per_week ?? DEFAULT_SYSTEM_SETTINGS.working_days_per_week,
    working_hours_start: row.working_hours_start ?? DEFAULT_SYSTEM_SETTINGS.working_hours_start,
    working_hours_end: row.working_hours_end ?? DEFAULT_SYSTEM_SETTINGS.working_hours_end,
    overtime_rate: row.overtime_rate != null ? Number(row.overtime_rate) : DEFAULT_SYSTEM_SETTINGS.overtime_rate,
    fiscal_year_start: row.fiscal_year_start ?? DEFAULT_SYSTEM_SETTINGS.fiscal_year_start,
    last_leave_reset_fiscal_year:
      row.last_leave_reset_fiscal_year != null ? Number(row.last_leave_reset_fiscal_year) : null,
  };
}

export async function fetchSystemSettings() {
  try {
    const { data, error } = await supabase.from(TABLES.SYSTEM_SETTINGS).select('*').eq('id', 1).maybeSingle();

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(mapRow(data));
  } catch (error) {
    return handleSupabaseError(error);
  }
}

/**
 * Returns persisted default leave days, or fallback when the table is missing / empty.
 */
export async function getDefaultLeaveBalance() {
  const res = await fetchSystemSettings();
  if (!res.success) {
    return DEFAULT_SYSTEM_SETTINGS.default_leave_balance;
  }
  const n = Number(res.data.default_leave_balance);
  return Number.isFinite(n) ? n : DEFAULT_SYSTEM_SETTINGS.default_leave_balance;
}

export async function saveSystemSettings(settings) {
  try {
    const payload = {
      default_leave_balance: settings.default_leave_balance,
      working_days_per_week: settings.working_days_per_week,
      working_hours_start: settings.working_hours_start,
      working_hours_end: settings.working_hours_end,
      overtime_rate: settings.overtime_rate,
      fiscal_year_start: settings.fiscal_year_start,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(TABLES.SYSTEM_SETTINGS)
      .update(payload)
      .eq('id', 1)
      .select()
      .single();

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(mapRow(data));
  } catch (error) {
    return handleSupabaseError(error);
  }
}

/**
 * Sets every employee's leave_balance to p_allowance_days and records the fiscal year of the reset (admin JWT only).
 */
export async function resetAllLeaveAllowancesToDefault(allowanceDays, fiscalYearIndex) {
  try {
    const { error } = await supabase.rpc('reset_employee_leave_allowances', {
      p_allowance_days: allowanceDays,
      p_fiscal_year: fiscalYearIndex,
    });

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess({ ok: true });
  } catch (error) {
    return handleSupabaseError(error);
  }
}
