import { supabase, TABLES, handleSupabaseError, handleSupabaseSuccess } from './supabase';

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
          leave_balance: employeeData.leave_balance || 20,
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

    return handleSupabaseSuccess(data[0]);
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

    return handleSupabaseSuccess(data[0]);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Delete employee
 */
export const deleteEmployee = async (id) => {
  try {
    const { error } = await supabase
      .from(TABLES.EMPLOYEES)
      .delete()
      .eq('id', id);

    if (error) {
      return handleSupabaseError(error);
    }

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