import { supabase, TABLES, handleSupabaseError, handleSupabaseSuccess } from './supabase';

/**
 * Notification Types
 */
export const NOTIFICATION_TYPES = {
  RESIGNATION: 'resignation',
  LEAVE_REQUEST: 'leave_request',
  ATTENDANCE: 'attendance',
  PAYROLL: 'payroll',
  PERFORMANCE: 'performance',
  EMPLOYEE: 'employee',
  SYSTEM: 'system',
};

/**
 * Get all notifications for a user
 */
export const getAllNotifications = async (userId) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.NOTIFICATIONS)
      .select('*')
      .eq('user_id', userId)
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
 * Get unread notifications count
 */
export const getUnreadCount = async (userId) => {
  try {
    const { data, error, count } = await supabase
      .from(TABLES.NOTIFICATIONS)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(count || 0);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Get unread notifications
 */
export const getUnreadNotifications = async (userId, limit = 10) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.NOTIFICATIONS)
      .select('*')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Create a notification
 */
export const createNotification = async (notificationData) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.NOTIFICATIONS)
      .insert([{
        ...notificationData,
        is_read: false,
        created_at: new Date().toISOString(),
      }])
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
 * Mark notification as read
 */
export const markAsRead = async (notificationId) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.NOTIFICATIONS)
      .update({ 
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
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
 * Mark all notifications as read for a user
 */
export const markAllAsRead = async (userId) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.NOTIFICATIONS)
      .update({ 
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('is_read', false)
      .select();

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Delete a notification
 */
export const deleteNotification = async (notificationId) => {
  try {
    const { error } = await supabase
      .from(TABLES.NOTIFICATIONS)
      .delete()
      .eq('id', notificationId);

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess({ message: 'Notification deleted' });
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Delete all read notifications for a user
 */
export const deleteAllRead = async (userId) => {
  try {
    const { error } = await supabase
      .from(TABLES.NOTIFICATIONS)
      .delete()
      .eq('user_id', userId)
      .eq('is_read', true);

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess({ message: 'Read notifications deleted' });
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Helper function to create resignation notification
 */
export const notifyNewResignation = async (adminUserIds, resignationData) => {
  try {
    const notifications = adminUserIds.map(userId => ({
      user_id: userId,
      type: NOTIFICATION_TYPES.RESIGNATION,
      title: 'New Resignation Submitted',
      message: `${resignationData.employee_name} has submitted a resignation`,
      data: {
        resignation_id: resignationData.id,
        employee_name: resignationData.employee_name,
      },
      link: '/resignation',
    }));

    const { data, error } = await supabase
      .from(TABLES.NOTIFICATIONS)
      .insert(notifications)
      .select();

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Helper function to create leave request notification
 */
export const notifyNewLeaveRequest = async (managerUserIds, leaveData) => {
  try {
    const notifications = managerUserIds.map(userId => ({
      user_id: userId,
      type: NOTIFICATION_TYPES.LEAVE_REQUEST,
      title: 'New Leave Request',
      message: `${leaveData.employee_name} has requested leave from ${leaveData.start_date} to ${leaveData.end_date}`,
      data: {
        leave_id: leaveData.id,
        employee_name: leaveData.employee_name,
      },
      link: '/leave',
    }));

    const { data, error } = await supabase
      .from(TABLES.NOTIFICATIONS)
      .insert(notifications)
      .select();

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Helper function to notify leave approval/rejection
 */
export const notifyLeaveDecision = async (employeeUserId, leaveData, status) => {
  try {
    const notification = {
      user_id: employeeUserId,
      type: NOTIFICATION_TYPES.LEAVE_REQUEST,
      title: `Leave Request ${status}`,
      message: `Your leave request from ${leaveData.start_date} to ${leaveData.end_date} has been ${status.toLowerCase()}`,
      data: {
        leave_id: leaveData.id,
        status: status,
      },
      link: '/leave',
    };

    const { data, error } = await supabase
      .from(TABLES.NOTIFICATIONS)
      .insert([notification])
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
 * Helper function to notify payroll generation
 */
export const notifyPayrollGenerated = async (employeeUserIds, month, year) => {
  try {
    const notifications = employeeUserIds.map(userId => ({
      user_id: userId,
      type: NOTIFICATION_TYPES.PAYROLL,
      title: 'Payroll Generated',
      message: `Your payslip for ${month} ${year} is now available`,
      data: {
        month: month,
        year: year,
      },
      link: '/payroll',
    }));

    const { data, error } = await supabase
      .from(TABLES.NOTIFICATIONS)
      .insert(notifications)
      .select();

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Helper function to notify attendance issues
 */
export const notifyAttendanceIssue = async (managerUserIds, attendanceData) => {
  try {
    const notifications = managerUserIds.map(userId => ({
      user_id: userId,
      type: NOTIFICATION_TYPES.ATTENDANCE,
      title: 'Attendance Alert',
      message: `${attendanceData.employee_name} - ${attendanceData.issue}`,
      data: {
        attendance_id: attendanceData.id,
        employee_name: attendanceData.employee_name,
        issue: attendanceData.issue,
      },
      link: '/attendance',
    }));

    const { data, error } = await supabase
      .from(TABLES.NOTIFICATIONS)
      .insert(notifications)
      .select();

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Helper function to notify performance review deadline
 */
export const notifyPerformanceDeadline = async (managerUserIds, reviewData) => {
  try {
    const notifications = managerUserIds.map(userId => ({
      user_id: userId,
      type: NOTIFICATION_TYPES.PERFORMANCE,
      title: 'Performance Review Due',
      message: `Performance review for ${reviewData.employee_name} is due on ${reviewData.deadline}`,
      data: {
        review_id: reviewData.id,
        employee_name: reviewData.employee_name,
        deadline: reviewData.deadline,
      },
      link: '/performance',
    }));

    const { data, error } = await supabase
      .from(TABLES.NOTIFICATIONS)
      .insert(notifications)
      .select();

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Get notification icon based on type
 */
export const getNotificationIcon = (type) => {
  const icons = {
    resignation: '👋',
    leave_request: '🏖️',
    attendance: '⏰',
    payroll: '💰',
    performance: '📊',
    employee: '👤',
    system: '🔔',
  };
  return icons[type] || '🔔';
};

/**
 * Get notification color based on type
 */
export const getNotificationColor = (type) => {
  const colors = {
    resignation: 'bg-red-100 text-red-800',
    leave_request: 'bg-blue-100 text-blue-800',
    attendance: 'bg-yellow-100 text-yellow-800',
    payroll: 'bg-green-100 text-green-800',
    performance: 'bg-purple-100 text-purple-800',
    employee: 'bg-indigo-100 text-indigo-800',
    system: 'bg-gray-100 text-gray-800',
  };
  return colors[type] || 'bg-gray-100 text-gray-800';
};

/**
 * Subscribe to real-time notifications
 */
export const subscribeToNotifications = (userId, callback) => {
  const subscription = supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: TABLES.NOTIFICATIONS,
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();

  return subscription;
};

/**
 * Unsubscribe from notifications
 */
export const unsubscribeFromNotifications = (subscription) => {
  if (subscription) {
    supabase.removeChannel(subscription);
  }
};