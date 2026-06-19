import { supabase, TABLES, handleSupabaseError, handleSupabaseSuccess } from './supabase';
import { getDefaultLeaveBalance } from './systemSettingsService';
import { logAudit, AUDIT_ACTIONS, AUDIT_ENTITIES } from './auditLogService';

/**
 * Get all employees
 */
export const getAllEmployees = async () => {
  try {
    const { data, error } = await supabase
      .from(TABLES.EMPLOYEES)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Get employee by ID
 */
export const getEmployeeById = async (id) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.EMPLOYEES)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Create new employee
 */
export const createEmployee = async (employeeData) => {
  try {
    const leaveRaw = employeeData.leave_balance;
    const leaveNum = leaveRaw === '' || leaveRaw === undefined || leaveRaw === null ? NaN : Number(leaveRaw);
    const leave_balance = Number.isFinite(leaveNum) ? leaveNum : await getDefaultLeaveBalance();

    const { data, error } = await supabase
      .from(TABLES.EMPLOYEES)
      .insert([
        {
          name: employeeData.name,
          email: employeeData.email,
          position: employeeData.position,
          department: employeeData.department,
          salary: employeeData.salary,
          join_date: employeeData.join_date,
          leave_balance,
          employee_code: employeeData.employee_code,
          bank_name: employeeData.bank_name,
          bank_account: employeeData.bank_account,
          payment_mode: employeeData.payment_mode,
          password: employeeData.password,
          can_login: employeeData.can_login || false,
          profile_pic: employeeData.profile_pic,
          phone: employeeData.phone,
          is_manager: employeeData.is_manager || false,
          manager_permissions: employeeData.manager_permissions,
        },
      ])
      .select();

    if (error) {
      return handleSupabaseError(error);
    }

    const created = data[0];
    logAudit({
      action: AUDIT_ACTIONS.CREATE,
      entityType: AUDIT_ENTITIES.EMPLOYEE,
      entityId: created.id,
      entityLabel: created.name,
      summary: `Created employee record for ${created.name}`,
      details: { ...created, password: '[redacted]' },
    });

    return handleSupabaseSuccess(created);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Update employee
 */
export const updateEmployee = async (id, employeeData) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.EMPLOYEES)
      .update({
        name: employeeData.name,
        email: employeeData.email,
        position: employeeData.position,
        department: employeeData.department,
        salary: employeeData.salary,
        join_date: employeeData.join_date,
        leave_balance: employeeData.leave_balance,
        employee_code: employeeData.employee_code,
        bank_name: employeeData.bank_name,
        bank_account: employeeData.bank_account,
        payment_mode: employeeData.payment_mode,
        password: employeeData.password,
        can_login: employeeData.can_login,
        profile_pic: employeeData.profile_pic,
        phone: employeeData.phone,
        is_manager: employeeData.is_manager,
        manager_permissions: employeeData.manager_permissions,
      })
      .eq('id', id)
      .select();

    if (error) {
      return handleSupabaseError(error);
    }

    const updated = data[0];
    logAudit({
      action: AUDIT_ACTIONS.UPDATE,
      entityType: AUDIT_ENTITIES.EMPLOYEE,
      entityId: updated.id,
      entityLabel: updated.name,
      summary: `Updated employee record for ${updated.name}`,
      details: { ...updated, password: updated.password ? '[redacted]' : undefined },
    });

    return handleSupabaseSuccess(updated);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Delete employee
 */
export const deleteEmployee = async (id) => {
  try {
    const existing = await getEmployeeById(id);
    const { error } = await supabase
      .from(TABLES.EMPLOYEES)
      .delete()
      .eq('id', id);

    if (error) {
      return handleSupabaseError(error);
    }

    logAudit({
      action: AUDIT_ACTIONS.DELETE,
      entityType: AUDIT_ENTITIES.EMPLOYEE,
      entityId: id,
      entityLabel: existing.data?.name || `Employee #${id}`,
      summary: `Deleted employee record for ${existing.data?.name || id}`,
      details: existing.data ? { ...existing.data, password: '[redacted]' } : { id },
    });

    return handleSupabaseSuccess({ message: 'Employee deleted successfully' });
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Search employees by name or email
 */
export const searchEmployees = async (searchTerm) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.EMPLOYEES)
      .select('*')
      .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,employee_code.ilike.%${searchTerm}%`)
      .order('name', { ascending: true });

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Get employees by department
 */
export const getEmployeesByDepartment = async (department) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.EMPLOYEES)
      .select('*')
      .eq('department', department)
      .order('name', { ascending: true });

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Get all managers
 */
export const getManagers = async () => {
  try {
    const { data, error } = await supabase
      .from(TABLES.EMPLOYEES)
      .select('*')
      .eq('is_manager', true)
      .order('name', { ascending: true });

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Update employee leave balance
 */
export const updateLeaveBalance = async (id, newBalance) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.EMPLOYEES)
      .update({ leave_balance: newBalance })
      .eq('id', id)
      .select();

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(data[0]);
  } catch (error) {
    return handleSupabaseError(error);
  }
};