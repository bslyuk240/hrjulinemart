import { supabase, TABLES, handleSupabaseError, handleSupabaseSuccess } from './supabase';

/**
 * Get all leave requests
 */
export const getAllLeaveRequests = async () => {
  try {
    const { data, error } = await supabase
      .from(TABLES.LEAVE_REQUESTS)
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
 * Get leave request by ID
 */
export const getLeaveRequestById = async (id) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.LEAVE_REQUESTS)
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
 * Get leave requests by employee ID
 */
export const getLeaveRequestsByEmployeeId = async (employeeId) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.LEAVE_REQUESTS)
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
 * Get leave requests by status
 */
export const getLeaveRequestsByStatus = async (status) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.LEAVE_REQUESTS)
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
 * Create new leave request
 */
export const createLeaveRequest = async (leaveData) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.LEAVE_REQUESTS)
      .insert([
        {
          employee_id: leaveData.employee_id,
          employee_name: leaveData.employee_name,
          start_date: leaveData.start_date,
          end_date: leaveData.end_date,
          days: leaveData.days,
          reason: leaveData.reason,
          type: leaveData.type,
          status: leaveData.status || 'pending',
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
 * Update leave request
 */
export const updateLeaveRequest = async (id, leaveData) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.LEAVE_REQUESTS)
      .update({
        employee_id: leaveData.employee_id,
        employee_name: leaveData.employee_name,
        start_date: leaveData.start_date,
        end_date: leaveData.end_date,
        days: leaveData.days,
        reason: leaveData.reason,
        type: leaveData.type,
        status: leaveData.status,
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
 * Approve leave request
 */
export const approveLeaveRequest = async (id) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.LEAVE_REQUESTS)
      .update({ status: 'approved' })
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
 * Reject leave request
 */
export const rejectLeaveRequest = async (id) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.LEAVE_REQUESTS)
      .update({ status: 'rejected' })
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
 * Delete leave request
 */
export const deleteLeaveRequest = async (id) => {
  try {
    const { error } = await supabase
      .from(TABLES.LEAVE_REQUESTS)
      .delete()
      .eq('id', id);

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess({ message: 'Leave request deleted successfully' });
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Calculate number of days between two dates
 */
export const calculateLeaveDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end date
  return diffDays;
};

/**
 * Get pending leave requests count
 */
export const getPendingLeaveCount = async () => {
  try {
    const { data, error, count } = await supabase
      .from(TABLES.LEAVE_REQUESTS)
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(count);
  } catch (error) {
    return handleSupabaseError(error);
  }
};