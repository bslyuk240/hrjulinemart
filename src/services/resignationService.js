import { supabase, TABLES, handleSupabaseError, handleSupabaseSuccess } from './supabase';

/**
 * Get all resignations
 */
export const getAllResignations = async () => {
  try {
    const { data, error } = await supabase
      .from(TABLES.RESIGNATIONS)
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
 * Get resignations by status
 */
export const getResignationsByStatus = async (status) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.RESIGNATIONS)
      .select('*')
      .eq('status', status)
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
 * Get resignation by ID
 */
export const getResignationById = async (id) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.RESIGNATIONS)
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
 * Get resignations by employee ID
 */
export const getResignationsByEmployeeId = async (employeeId) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.RESIGNATIONS)
      .select('*')
      .eq('employee_id', employeeId)
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
 * Submit resignation
 */
export const submitResignation = async (resignationData) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.RESIGNATIONS)
      .insert([resignationData])
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
 * Update resignation
 */
export const updateResignation = async (id, resignationData) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.RESIGNATIONS)
      .update({
        ...resignationData,
        updated_at: new Date().toISOString(),
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
 * Approve resignation and archive employee
 */
export const approveResignation = async (resignationId, employeeData) => {
  try {
    // Start transaction-like operations
    // 1. Update resignation status
    const { data: resignation, error: resignError } = await supabase
      .from(TABLES.RESIGNATIONS)
      .update({ status: 'Approved', updated_at: new Date().toISOString() })
      .eq('id', resignationId)
      .select()
      .single();

    if (resignError) {
      return handleSupabaseError(resignError);
    }

    // 2. Archive employee
    const archiveData = {
      employee_id: employeeData.id,
      name: employeeData.name,
      email: employeeData.email,
      position: employeeData.position,
      department: employeeData.department,
      salary: employeeData.salary,
      join_date: employeeData.join_date,
      employee_code: employeeData.employee_code,
      phone: employeeData.phone,
      profile_pic: employeeData.profile_pic,
      bank_name: employeeData.bank_name,
      bank_account: employeeData.bank_account,
      payment_mode: employeeData.payment_mode,
      resignation_id: resignationId,
      resignation_date: resignation.resignation_date,
      last_working_date: resignation.last_working_date,
      resignation_reason: resignation.reason,
      archived_by: employeeData.archived_by || 'System',
      notes: `Approved resignation. Reason: ${resignation.reason || 'Not specified'}`,
    };

    const { data: archived, error: archiveError } = await supabase
      .from(TABLES.ARCHIVED_EMPLOYEES)
      .insert([archiveData])
      .select();

    if (archiveError) {
      // Rollback resignation approval
      await supabase
        .from(TABLES.RESIGNATIONS)
        .update({ status: 'Pending' })
        .eq('id', resignationId);
      
      return handleSupabaseError(archiveError);
    }

    // 3. Delete from active employees
    const { error: deleteError } = await supabase
      .from(TABLES.EMPLOYEES)
      .delete()
      .eq('id', employeeData.id);

    if (deleteError) {
      return handleSupabaseError(deleteError);
    }

    return handleSupabaseSuccess({ 
      resignation, 
      archived: archived[0],
      message: 'Resignation approved and employee archived successfully' 
    });
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Reject resignation
 */
export const rejectResignation = async (id, comments) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.RESIGNATIONS)
      .update({ 
        status: 'Rejected',
        comments: comments,
        updated_at: new Date().toISOString(),
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
 * Archive resignation (without archiving employee)
 */
export const archiveResignation = async (id) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.RESIGNATIONS)
      .update({ 
        status: 'Archived',
        updated_at: new Date().toISOString(),
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
 * Delete resignation
 */
export const deleteResignation = async (id) => {
  try {
    const { error } = await supabase
      .from(TABLES.RESIGNATIONS)
      .delete()
      .eq('id', id);

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess({ message: 'Resignation deleted successfully' });
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Get resignation statistics
 */
export const getResignationStats = async () => {
  try {
    const { data, error } = await supabase
      .from(TABLES.RESIGNATIONS)
      .select('*');

    if (error) {
      return handleSupabaseError(error);
    }

    const stats = {
      total: data.length,
      pending: data.filter(r => r.status === 'Pending').length,
      approved: data.filter(r => r.status === 'Approved').length,
      rejected: data.filter(r => r.status === 'Rejected').length,
      archived: data.filter(r => r.status === 'Archived').length,
    };

    return handleSupabaseSuccess(stats);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Calculate notice period days
 */
export const calculateNoticePeriod = (resignationDate, lastWorkingDate) => {
  if (!resignationDate || !lastWorkingDate) return 0;
  
  const start = new Date(resignationDate);
  const end = new Date(lastWorkingDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

/**
 * Get count of pending resignations
 */
export const getPendingResignationsCount = async () => {
  try {
    const { data, error, count } = await supabase
      .from(TABLES.RESIGNATIONS)
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Pending');

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(count || 0);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Get status color
 */
export const getStatusColor = (status) => {
  const colors = {
    Pending: 'bg-yellow-100 text-yellow-800',
    Approved: 'bg-green-100 text-green-800',
    Rejected: 'bg-red-100 text-red-800',
    Archived: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

/**
 * Get status icon
 */
export const getStatusIcon = (status) => {
  const icons = {
    Pending: '⏳',
    Approved: '✅',
    Rejected: '❌',
    Archived: '📦',
  };
  return icons[status] || '❓';
};