import { supabase, TABLES, handleSupabaseError, handleSupabaseSuccess } from './supabase';

/**
 * Get all archived employees
 */
export const getAllArchivedEmployees = async () => {
  try {
    const { data, error } = await supabase
      .from(TABLES.ARCHIVED_EMPLOYEES)
      .select('*')
      .order('archived_at', { ascending: false });

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Get archived employee by ID
 */
export const getArchivedEmployeeById = async (id) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.ARCHIVED_EMPLOYEES)
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
 * Search archived employees
 */
export const searchArchivedEmployees = async (searchTerm) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.ARCHIVED_EMPLOYEES)
      .select('*')
      .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,employee_code.ilike.%${searchTerm}%`)
      .order('archived_at', { ascending: false });

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Reinstate archived employee
 */
export const reinstateEmployee = async (archivedEmployee) => {
  try {
    // 1. Create employee from archived data
    const employeeData = {
      name: archivedEmployee.name,
      email: archivedEmployee.email,
      position: archivedEmployee.position,
      department: archivedEmployee.department,
      salary: archivedEmployee.salary,
      join_date: new Date().toISOString().split('T')[0], // New join date
      employee_code: archivedEmployee.employee_code,
      phone: archivedEmployee.phone,
      profile_pic: archivedEmployee.profile_pic,
      bank_name: archivedEmployee.bank_name,
      bank_account: archivedEmployee.bank_account,
      payment_mode: archivedEmployee.payment_mode,
      leave_balance: 0, // Reset leave balance
      can_login: false, // Needs new password
    };

    const { data: newEmployee, error: createError } = await supabase
      .from(TABLES.EMPLOYEES)
      .insert([employeeData])
      .select();

    if (createError) {
      return handleSupabaseError(createError);
    }

    // 2. Delete from archived
    const { error: deleteError } = await supabase
      .from(TABLES.ARCHIVED_EMPLOYEES)
      .delete()
      .eq('id', archivedEmployee.id);

    if (deleteError) {
      // Rollback - delete newly created employee
      await supabase
        .from(TABLES.EMPLOYEES)
        .delete()
        .eq('id', newEmployee[0].id);
      
      return handleSupabaseError(deleteError);
    }

    return handleSupabaseSuccess({
      employee: newEmployee[0],
      message: 'Employee reinstated successfully'
    });
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Permanently delete archived employee
 */
export const deleteArchivedEmployee = async (id) => {
  try {
    const { error } = await supabase
      .from(TABLES.ARCHIVED_EMPLOYEES)
      .delete()
      .eq('id', id);

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess({ message: 'Archived employee deleted permanently' });
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Update archived employee notes
 */
export const updateArchivedEmployeeNotes = async (id, notes) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.ARCHIVED_EMPLOYEES)
      .update({ notes })
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
 * Get archive statistics
 */
export const getArchiveStats = async () => {
  try {
    const { data, error } = await supabase
      .from(TABLES.ARCHIVED_EMPLOYEES)
      .select('*');

    if (error) {
      return handleSupabaseError(error);
    }

    const stats = {
      total: data.length,
      withResignation: data.filter(e => e.resignation_id !== null).length,
      thisMonth: data.filter(e => {
        const archivedDate = new Date(e.archived_at);
        const now = new Date();
        return archivedDate.getMonth() === now.getMonth() && 
               archivedDate.getFullYear() === now.getFullYear();
      }).length,
      thisYear: data.filter(e => {
        const archivedDate = new Date(e.archived_at);
        const now = new Date();
        return archivedDate.getFullYear() === now.getFullYear();
      }).length,
    };

    return handleSupabaseSuccess(stats);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Export archived employees to CSV
 */
export const exportArchivedToCSV = (archivedEmployees) => {
  const headers = [
    'ID', 'Employee Code', 'Name', 'Email', 'Position', 'Department',
    'Resignation Date', 'Last Working Date', 'Archived At', 'Reason'
  ];
  
  const rows = archivedEmployees.map(emp => [
    emp.id,
    emp.employee_code || 'N/A',
    emp.name,
    emp.email,
    emp.position || 'N/A',
    emp.department || 'N/A',
    emp.resignation_date || 'N/A',
    emp.last_working_date || 'N/A',
    new Date(emp.archived_at).toLocaleDateString('en-GB'),
    emp.resignation_reason || 'N/A'
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `archived-employees-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};