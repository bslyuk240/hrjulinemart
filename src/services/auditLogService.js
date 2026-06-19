import { supabase, TABLES, handleSupabaseError, handleSupabaseSuccess } from './supabase';

export const AUDIT_ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  APPROVE: 'approve',
  REJECT: 'reject',
  ASSIGN: 'assign',
  SEND: 'send',
  LOGIN: 'login',
  LOGOUT: 'logout',
  CLOCK_IN: 'clock_in',
  CLOCK_OUT: 'clock_out',
  ARCHIVE: 'archive',
  SUBMIT: 'submit',
  PUBLISH: 'publish',
};

export const AUDIT_ENTITIES = {
  EMPLOYEE: 'employee',
  LEAVE_REQUEST: 'leave_request',
  PAYROLL: 'payroll',
  ATTENDANCE: 'attendance',
  RESIGNATION: 'resignation',
  REQUISITION: 'requisition',
  PERFORMANCE: 'performance',
  ONBOARDING: 'onboarding',
  REFERENCE: 'reference',
  ANNOUNCEMENT: 'announcement',
  TRAINING_COURSE: 'training_course',
  TRAINING_ENROLLMENT: 'training_enrollment',
  VENDOR: 'vendor',
  SYSTEM_SETTINGS: 'system_settings',
  AUTH: 'auth',
  EMAIL: 'email',
};

const SENSITIVE_KEYS = new Set([
  'password',
  'smtp_password',
  'token',
  'access_token',
  'refresh_token',
  'onboarding_token',
  'reference_token',
]);

const sanitizeDetails = (value, depth = 0) => {
  if (value == null || depth > 4) return value;
  if (Array.isArray(value)) return value.map((item) => sanitizeDetails(item, depth + 1));
  if (typeof value !== 'object') return value;

  const out = {};
  for (const [key, val] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(String(key).toLowerCase())) {
      out[key] = '[redacted]';
    } else {
      out[key] = sanitizeDetails(val, depth + 1);
    }
  }
  return out;
};

const getActorFromSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const authUser = session?.user;
  if (!authUser) return null;

  const meta = authUser.app_metadata || {};
  const employeeId = meta.employee_id ? Number(meta.employee_id) : null;
  let actorName = authUser.user_metadata?.full_name || authUser.email || 'Unknown';

  if (employeeId) {
    const { data: employee } = await supabase
      .from(TABLES.EMPLOYEES)
      .select('name')
      .eq('id', employeeId)
      .maybeSingle();
    if (employee?.name) actorName = employee.name;
  }

  const actorRole = meta.type === 'admin'
    ? 'admin'
    : (meta.role || (meta.type === 'employee' ? 'employee' : 'unknown'));

  return {
    actor_id: employeeId,
    actor_name: actorName,
    actor_role: actorRole,
  };
};

/**
 * Record an audit event (non-throwing).
 */
export const logAudit = async ({
  action,
  entityType,
  entityId = null,
  entityLabel = null,
  summary,
  details = null,
  status = 'success',
  actor = null,
}) => {
  try {
    const actorInfo = actor || (await getActorFromSession()) || {
      actor_id: null,
      actor_name: 'System',
      actor_role: 'system',
    };

    const row = {
      actor_id: actorInfo.actor_id,
      actor_name: actorInfo.actor_name,
      actor_role: actorInfo.actor_role,
      action,
      entity_type: entityType,
      entity_id: entityId != null ? String(entityId) : null,
      entity_label: entityLabel,
      summary,
      details: details ? sanitizeDetails(details) : null,
      status,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from(TABLES.AUDIT_LOGS).insert([row]);
    if (error) console.warn('Audit log insert failed:', error.message);
  } catch (err) {
    console.warn('Audit log error:', err);
  }
};

export const getAuditLogs = async ({
  page = 1,
  pageSize = 50,
  search = '',
  action = '',
  entityType = '',
  status = '',
  actorId = '',
  fromDate = '',
  toDate = '',
} = {}) => {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from(TABLES.AUDIT_LOGS)
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (action) query = query.eq('action', action);
    if (entityType) query = query.eq('entity_type', entityType);
    if (status) query = query.eq('status', status);
    if (actorId) query = query.eq('actor_id', Number(actorId));
    if (fromDate) query = query.gte('created_at', fromDate);
    if (toDate) query = query.lte('created_at', `${toDate}T23:59:59.999Z`);
    if (search.trim()) {
      const term = search.trim();
      query = query.or(
        `summary.ilike.%${term}%,entity_label.ilike.%${term}%,actor_name.ilike.%${term}%`
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

export const getAuditFilterOptions = async () => {
  try {
    const { data, error } = await supabase
      .from(TABLES.AUDIT_LOGS)
      .select('action, entity_type, actor_name, actor_id')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) return handleSupabaseError(error);

    const actions = [...new Set((data || []).map((row) => row.action).filter(Boolean))].sort();
    const entityTypes = [...new Set((data || []).map((row) => row.entity_type).filter(Boolean))].sort();
    const actorsMap = new Map();
    for (const row of data || []) {
      if (row.actor_id && row.actor_name) {
        actorsMap.set(String(row.actor_id), row.actor_name);
      }
    }
    const actors = [...actorsMap.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return handleSupabaseSuccess({ actions, entityTypes, actors });
  } catch (error) {
    return handleSupabaseError(error);
  }
};

export const formatAuditAction = (action) =>
  String(action || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

export const formatEntityType = (entityType) =>
  String(entityType || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
