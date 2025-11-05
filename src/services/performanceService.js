import { supabase, TABLES, handleSupabaseError, handleSupabaseSuccess } from './supabase';

/**
 * Get all performance records
 */
export const getAllPerformanceRecords = async () => {
  try {
    const { data, error } = await supabase
      .from(TABLES.PERFORMANCE_RECORDS)
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
 * Get performance records by employee ID
 */
export const getPerformanceByEmployeeId = async (employeeId) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.PERFORMANCE_RECORDS)
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
 * Get single performance record by ID
 */
export const getPerformanceById = async (id) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.PERFORMANCE_RECORDS)
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
 * Create performance record
 */
export const createPerformanceRecord = async (performanceData) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.PERFORMANCE_RECORDS)
      .insert([performanceData])
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
 * Update performance record
 */
export const updatePerformanceRecord = async (id, performanceData) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.PERFORMANCE_RECORDS)
      .update({
        ...performanceData,
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
 * Delete performance record
 */
export const deletePerformanceRecord = async (id) => {
  try {
    const { error } = await supabase
      .from(TABLES.PERFORMANCE_RECORDS)
      .delete()
      .eq('id', id);

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess({ message: 'Performance record deleted successfully' });
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Get performance statistics
 */
export const getPerformanceStats = async () => {
  try {
    const { data, error } = await supabase
      .from(TABLES.PERFORMANCE_RECORDS)
      .select('*');

    if (error) {
      return handleSupabaseError(error);
    }

    const stats = {
      total: data.length,
      averageOverall: calculateAverage(data, 'overall_rating'),
      averageQuality: calculateAverage(data, 'quality_rating'),
      averageProductivity: calculateAverage(data, 'productivity_rating'),
      averageTeamwork: calculateAverage(data, 'teamwork_rating'),
      averageCommunication: calculateAverage(data, 'communication_rating'),
      averagePunctuality: calculateAverage(data, 'punctuality_rating'),
      excellent: data.filter(r => r.overall_rating === 5).length,
      good: data.filter(r => r.overall_rating === 4).length,
      average: data.filter(r => r.overall_rating === 3).length,
      belowAverage: data.filter(r => r.overall_rating === 2).length,
      poor: data.filter(r => r.overall_rating === 1).length,
    };

    return handleSupabaseSuccess(stats);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Get performance records by period type
 */
export const getPerformanceByPeriod = async (periodType) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.PERFORMANCE_RECORDS)
      .select('*')
      .eq('period_type', periodType)
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
 * Get performance records by date range
 */
export const getPerformanceByDateRange = async (startDate, endDate) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.PERFORMANCE_RECORDS)
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
 * Calculate average rating
 */
const calculateAverage = (data, field) => {
  if (data.length === 0) return 0;
  const sum = data.reduce((acc, record) => acc + (record[field] || 0), 0);
  return (sum / data.length).toFixed(1);
};

/**
 * Get rating label
 */
export const getRatingLabel = (rating) => {
  const labels = {
    5: 'Excellent',
    4: 'Good',
    3: 'Average',
    2: 'Below Average',
    1: 'Poor',
  };
  return labels[rating] || 'N/A';
};

/**
 * Get rating color
 */
export const getRatingColor = (rating) => {
  const colors = {
    5: 'text-green-600 bg-green-100',
    4: 'text-blue-600 bg-blue-100',
    3: 'text-yellow-600 bg-yellow-100',
    2: 'text-orange-600 bg-orange-100',
    1: 'text-red-600 bg-red-100',
  };
  return colors[rating] || 'text-gray-600 bg-gray-100';
};

/**
 * Calculate overall performance score from individual ratings
 */
export const calculateOverallScore = (ratings) => {
  const { quality, productivity, teamwork, communication, punctuality } = ratings;
  const sum = quality + productivity + teamwork + communication + punctuality;
  return Math.round(sum / 5);
};