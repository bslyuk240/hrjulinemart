import { supabase, TABLES, handleSupabaseError, handleSupabaseSuccess } from './supabase';

/**
 * Get all attendance records
 */
export const getAllAttendance = async () => {
  try {
    const { data, error } = await supabase
      .from(TABLES.ATTENDANCE)
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Get attendance by employee ID
 */
export const getAttendanceByEmployeeId = async (employeeId) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.ATTENDANCE)
      .select('*')
      .eq('employee_id', employeeId)
      .order('date', { ascending: false });

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Get attendance by date range
 */
export const getAttendanceByDateRange = async (startDate, endDate) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.ATTENDANCE)
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Clock in
 */
export const clockIn = async (attendanceData) => {
  try {
    // Check if already clocked in today
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase
      .from(TABLES.ATTENDANCE)
      .select('*')
      .eq('employee_id', attendanceData.employee_id)
      .eq('date', today)
      .single();

    if (existing) {
      return handleSupabaseError({ message: 'Already clocked in today' });
    }

    const { data, error } = await supabase
      .from(TABLES.ATTENDANCE)
      .insert([
        {
          employee_id: attendanceData.employee_id,
          employee_name: attendanceData.employee_name,
          date: today,
          clock_in: new Date().toTimeString().split(' ')[0],
          status: 'present',
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
 * Clock out
 */
export const clockOut = async (attendanceId) => {
  try {
    const clockOutTime = new Date().toTimeString().split(' ')[0];
    
    const { data, error } = await supabase
      .from(TABLES.ATTENDANCE)
      .update({ 
        clock_out: clockOutTime,
      })
      .eq('id', attendanceId)
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
 * Mark attendance manually
 */
export const markAttendance = async (attendanceData) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.ATTENDANCE)
      .insert([
        {
          employee_id: attendanceData.employee_id,
          employee_name: attendanceData.employee_name,
          date: attendanceData.date,
          clock_in: attendanceData.clock_in || null,
          clock_out: attendanceData.clock_out || null,
          status: attendanceData.status,
          notes: attendanceData.notes || '',
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
 * Update attendance
 */
export const updateAttendance = async (id, attendanceData) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.ATTENDANCE)
      .update({
        clock_in: attendanceData.clock_in,
        clock_out: attendanceData.clock_out,
        status: attendanceData.status,
        notes: attendanceData.notes,
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
 * Delete attendance
 */
export const deleteAttendance = async (id) => {
  try {
    const { error } = await supabase
      .from(TABLES.ATTENDANCE)
      .delete()
      .eq('id', id);

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess({ message: 'Attendance deleted successfully' });
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Get attendance statistics
 */
export const getAttendanceStats = async (month, year) => {
  try {
    // Get all attendance for the month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

    const { data, error } = await supabase
      .from(TABLES.ATTENDANCE)
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) {
      return handleSupabaseError(error);
    }

    const stats = {
      total: data.length,
      present: data.filter(a => a.status === 'present').length,
      absent: data.filter(a => a.status === 'absent').length,
      late: data.filter(a => a.status === 'late').length,
      halfDay: data.filter(a => a.status === 'half_day').length,
    };

    return handleSupabaseSuccess(stats);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Check if employee is clocked in today
 */
export const getTodayAttendance = async (employeeId) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from(TABLES.ATTENDANCE)
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', today)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Get today's attendance summary (total employees vs clocked in)
 */
export const getTodayAttendanceSummary = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from(TABLES.ATTENDANCE)
      .select('*')
      .eq('date', today);

    if (error) {
      return handleSupabaseError(error);
    }

    const summary = {
      total: data.length,
      present: data.filter(a => a.status === 'present').length,
      late: data.filter(a => a.status === 'late').length,
      absent: data.filter(a => a.status === 'absent').length,
      halfDay: data.filter(a => a.status === 'half_day').length,
      onLeave: data.filter(a => a.status === 'on_leave').length,
    };

    return handleSupabaseSuccess(summary);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Calculate work hours
 */
export const calculateWorkHours = (clockIn, clockOut) => {
  if (!clockIn || !clockOut) return '0h 0m';

  const [inHours, inMinutes] = clockIn.split(':').map(Number);
  const [outHours, outMinutes] = clockOut.split(':').map(Number);

  const inTotalMinutes = inHours * 60 + inMinutes;
  const outTotalMinutes = outHours * 60 + outMinutes;

  const diffMinutes = outTotalMinutes - inTotalMinutes;
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  return `${hours}h ${minutes}m`;
};