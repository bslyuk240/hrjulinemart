import { supabase, TABLES, handleSupabaseError, handleSupabaseSuccess } from './supabase';

export const getEmailLogs = async ({
  page = 1,
  pageSize = 50,
  search = '',
  emailType = '',
  status = '',
  fromDate = '',
  toDate = '',
} = {}) => {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from(TABLES.EMAIL_LOGS)
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (emailType) query = query.eq('email_type', emailType);
    if (status) query = query.eq('status', status);
    if (fromDate) query = query.gte('created_at', fromDate);
    if (toDate) query = query.lte('created_at', `${toDate}T23:59:59.999Z`);
    if (search.trim()) {
      const term = search.trim();
      query = query.or(
        `recipient.ilike.%${term}%,subject.ilike.%${term}%,triggered_by_name.ilike.%${term}%`
      );
    }

    const { data, error, count } = await query.range(from, to);
    if (error) return handleSupabaseError(error);

    return handleSupabaseSuccess({
      rows: data || [],
      total: count || 0,
      page,
      pageSize,
    });
  } catch (error) {
    return handleSupabaseError(error);
  }
};

export const getEmailLogFilterOptions = async () => {
  try {
    const { data, error } = await supabase
      .from(TABLES.EMAIL_LOGS)
      .select('email_type')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) return handleSupabaseError(error);

    const emailTypes = [...new Set((data || []).map((row) => row.email_type).filter(Boolean))].sort();
    return handleSupabaseSuccess({ emailTypes });
  } catch (error) {
    return handleSupabaseError(error);
  }
};

export const formatEmailType = (emailType) =>
  String(emailType || '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
