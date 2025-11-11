import { supabase, TABLES, handleSupabaseError, handleSupabaseSuccess } from './supabase';
import { notifyNewLeaveRequest, notifyLeaveDecision, createNotification } from './notificationAPI';
import { getEmployeeById, updateLeaveBalance } from './employeeService';

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
    const created = data[0];

    // Notify managers and admins about new leave request (non-blocking)
    try {
      const { data: managers } = await supabase
        .from(TABLES.EMPLOYEES)
        .select('id')
        .eq('is_manager', true);
      const { data: admins } = await supabase
        .from(TABLES.ADMIN_USERS)
        .select('id');
      const managerUserIds = [
        ...(managers || []).map((m) => m.id),
        ...(admins || []).map((a) => a.id),
      ];
      if (managerUserIds.length > 0) {
        await notifyNewLeaveRequest(managerUserIds, created);
      }
    } catch (e) {
      console.warn('Notification error (leave create):', e);
    }

    // Also notify the requesting employee for confirmation (visible on their bell)
    try {
      await createNotification({
        user_id: created.employee_id,
        type: 'leave_request',
        title: 'Leave Request Submitted',
        message: `Your leave request from ${created.start_date} to ${created.end_date} has been submitted`,
        data: { leave_id: created.id, status: created.status },
        link: '/leave',
      });
    } catch (e) {
      console.warn('Notification error (leave submit self):', e);
    }

    return handleSupabaseSuccess(created);
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
    // Fetch the leave request first to check status and get details
    const { data: leaveRow, error: fetchError } = await supabase
      .from(TABLES.LEAVE_REQUESTS)
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      return handleSupabaseError(fetchError);
    }

    // If already approved, do not double-deduct
    if (leaveRow?.status === 'approved') {
      return handleSupabaseSuccess(leaveRow);
    }

    // Approve the leave request
    const { data, error } = await supabase
      .from(TABLES.LEAVE_REQUESTS)
      .update({ status: 'approved' })
      .eq('id', id)
      .select();

    if (error) {
      return handleSupabaseError(error);
    }

    const updated = data[0];

    // Deduct leave balance for all leave types
    try {
      if (updated && updated.employee_id) {
          // Compute days if not stored
          const daysComputed =
            typeof updated.days === 'number' && !Number.isNaN(updated.days)
              ? updated.days
              : calculateLeaveDays(updated.start_date, updated.end_date);

          const daysToDeduct = Math.max(0, Number(daysComputed || 0));
          if (daysToDeduct > 0) {
            // Read current balance and write back new value
            const empRes = await getEmployeeById(updated.employee_id);
            if (empRes.success && empRes.data) {
              const currentBalance = Number(empRes.data.leave_balance || 0);
              const newBalance = Math.max(0, currentBalance - daysToDeduct);
              await updateLeaveBalance(updated.employee_id, newBalance);
            }
          }
      }
    } catch (e) {
      console.warn('Leave balance update error:', e);
    }

    // Notify the employee about the decision
    try {
      await notifyLeaveDecision(updated.employee_id, updated, 'Approved');
    } catch (e) {
      console.warn('Notification error (leave approve):', e);
    }

    return handleSupabaseSuccess(updated);
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
    const updated = data[0];
    try {
      await notifyLeaveDecision(updated.employee_id, updated, 'Rejected');
    } catch (e) {
      console.warn('Notification error (leave reject):', e);
    }
    return handleSupabaseSuccess(updated);
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
