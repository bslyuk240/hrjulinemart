import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import {
  Calendar,
  Clock,
  DollarSign,
  TrendingUp,
  LogIn,
  LogOut,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import Loading from '../common/Loading';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [clockedIn, setClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [stats, setStats] = useState({
    leaveBalance: 0,
    attendanceThisMonth: 0,
    latestPayslip: null,
    pendingLeaves: 0,
  });

  useEffect(() => {
    if (user?.id) {
      fetchEmployeeData();
      checkClockStatus();
    }
  }, [user]);

  const getLatestAttendanceForToday = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', user.id)
      .eq('date', today)
      .order('id', { ascending: false })
      .limit(1);

    if (error) throw error;
    return data?.[0] || null;
  };

  const fetchEmployeeData = async () => {
    setLoading(true);
    try {
      // Get employee details
      const { data: employee } = await supabase
        .from('employees')
        .select('leave_balance')
        .eq('id', user.id)
        .single();

      // Get attendance this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const { data: attendance, count } = await supabase
        .from('attendance')
        .select('*', { count: 'exact' })
        .eq('employee_id', user.id)
        .gte('date', startOfMonth.toISOString().split('T')[0]);

      // Get latest payslip - FIXED
      const { data: payslips, error: payslipError } = await supabase
        .from('payrolls')
        .select('*')
        .eq('employee_id', user.id)
        .order('pay_period_end', { ascending: false })
        .limit(1);

      const latestPayslip = payslips && payslips.length > 0 ? payslips[0] : null;

      // Get pending leave requests
      const { data: leaves, count: leaveCount } = await supabase
        .from('leave_requests')
        .select('*', { count: 'exact' })
        .eq('employee_id', user.id)
        .eq('status', 'pending');

      setStats({
        leaveBalance: employee?.leave_balance || 0,
        attendanceThisMonth: count || 0,
        latestPayslip: latestPayslip,
        pendingLeaves: leaveCount || 0,
      });
    } catch (error) {
      console.error('Error fetching employee data:', error);
    }
    setLoading(false);
  };

  const checkClockStatus = async () => {
    try {
      const data = await getLatestAttendanceForToday();

      if (data) {
        if (data.clock_in && !data.clock_out) {
          setClockedIn(true);
          setClockInTime(data.clock_in);
        } else if (data.clock_out) {
          setClockedIn(false);
          setClockInTime(null);
        }
      } else {
        setClockedIn(false);
        setClockInTime(null);
      }
    } catch (error) {
      console.error('Error checking clock status:', error);
    }
  };

  const handleClockIn = async () => {
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const time = now.toTimeString().split(' ')[0];

      const existing = await getLatestAttendanceForToday();

      if (existing) {
        alert('You have already clocked in today!');
        setClockedIn(true);
        setClockInTime(existing.clock_in);
        return;
      }

      const { error } = await supabase
        .from('attendance')
        .insert([{
          employee_id: user.id,
          employee_name: user.name,
          date: today,
          clock_in: time,
          status: 'present',
        }]);

      if (error) throw error;

      setClockedIn(true);
      setClockInTime(time);
      alert('Clocked in successfully!');
      fetchEmployeeData();
    } catch (error) {
      console.error('Error clocking in:', error);
      if (error.code === '23505') {
        alert('You have already clocked in today!');
        checkClockStatus();
      } else {
        alert('Failed to clock in: ' + error.message);
      }
    }
  };

  const handleClockOut = async () => {
    try {
      const now = new Date();
      const time = now.toTimeString().split(' ')[0];

      const existing = await getLatestAttendanceForToday();

      if (!existing) {
        alert('No clock-in record found for today!');
        return;
      }

      if (existing.clock_out) {
        alert('You have already clocked out today!');
        setClockedIn(false);
        setClockInTime(null);
        return;
      }

      const { error } = await supabase
        .from('attendance')
        .update({ clock_out: time })
        .eq('id', existing.id);

      if (error) throw error;

      setClockedIn(false);
      setClockInTime(null);
      alert('Clocked out successfully!');
      fetchEmployeeData();
    } catch (error) {
      console.error('Error clocking out:', error);
      alert('Failed to clock out: ' + error.message);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-4 md:p-6 text-white shadow-lg">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          Welcome back, {user?.name || user?.username}!
        </h1>
        <p className="text-purple-100 text-sm md:text-base">
          {user?.position || 'Employee'} • {user?.department || 'General'}
        </p>
      </div>

      {/* Clock In/Out Section */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4 flex items-center">
          <Clock className="w-5 h-5 md:w-6 md:h-6 mr-2 text-purple-600" />
          Attendance
        </h2>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div>
            <p className="text-gray-600 mb-2 text-sm md:text-base">
              {clockedIn ? 'You clocked in at' : 'Not clocked in yet today'}
            </p>
            {clockedIn && (
              <p className="text-xl md:text-2xl font-bold text-green-600">{clockInTime}</p>
            )}
          </div>
          <button
            onClick={clockedIn ? handleClockOut : handleClockIn}
            className={`w-full sm:w-auto flex items-center justify-center px-5 md:px-6 py-2.5 md:py-3 rounded-lg font-semibold transition-all shadow-lg ${
              clockedIn
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {clockedIn ? (
              <>
                <LogOut className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                Clock Out
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                Clock In
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats Grid - Mobile: 2 cols, Tablet: 2 cols, Desktop: 4 cols */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
        {/* Leave Balance */}
        <div className="bg-white rounded-lg p-3 md:p-5 lg:p-6 shadow-md">
          <div className="flex items-center justify-between mb-2 md:mb-4">
            <div className="bg-blue-100 p-2 md:p-3 rounded-lg">
              <Calendar className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-blue-600" />
            </div>
            <span className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">
              {stats.leaveBalance}
            </span>
          </div>
          <p className="text-gray-600 font-medium text-xs md:text-sm lg:text-base">Leave Balance</p>
          <p className="text-[10px] md:text-xs lg:text-sm text-gray-500 mt-1">Days remaining</p>
        </div>

        {/* Attendance This Month */}
        <div className="bg-white rounded-lg p-3 md:p-5 lg:p-6 shadow-md">
          <div className="flex items-center justify-between mb-2 md:mb-4">
            <div className="bg-green-100 p-2 md:p-3 rounded-lg">
              <CheckCircle className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-green-600" />
            </div>
            <span className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">
              {stats.attendanceThisMonth}
            </span>
          </div>
          <p className="text-gray-600 font-medium text-xs md:text-sm lg:text-base">Attendance</p>
          <p className="text-[10px] md:text-xs lg:text-sm text-gray-500 mt-1">Days this month</p>
        </div>

        {/* Latest Payslip */}
        <div className="bg-white rounded-lg p-3 md:p-5 lg:p-6 shadow-md">
          <div className="flex items-center justify-between mb-2 md:mb-4">
            <div className="bg-purple-100 p-2 md:p-3 rounded-lg">
              <DollarSign className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-purple-600" />
            </div>
            <span className="text-sm md:text-lg lg:text-xl font-bold text-gray-900">
              {stats.latestPayslip ? formatCurrency(stats.latestPayslip.net_salary) : 'N/A'}
            </span>
          </div>
          <p className="text-gray-600 font-medium text-xs md:text-sm lg:text-base">Latest Payslip</p>
          <p className="text-[10px] md:text-xs lg:text-sm text-gray-500 mt-1">
            {stats.latestPayslip ? 'Net salary' : 'No payslip yet'}
          </p>
        </div>

        {/* Pending Leaves */}
        <div className="bg-white rounded-lg p-3 md:p-5 lg:p-6 shadow-md">
          <div className="flex items-center justify-between mb-2 md:mb-4">
            <div className="bg-yellow-100 p-2 md:p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-yellow-600" />
            </div>
            <span className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">
              {stats.pendingLeaves}
            </span>
          </div>
          <p className="text-gray-600 font-medium text-xs md:text-sm lg:text-base">Pending Requests</p>
          <p className="text-[10px] md:text-xs lg:text-sm text-gray-500 mt-1">Leave requests</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          <button
            onClick={() => navigate('/leave')}
            className="flex items-center p-3 md:p-4 border-2 border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
          >
            <Calendar className="w-6 h-6 md:w-8 md:h-8 text-purple-600 mr-3" />
            <div className="text-left">
              <p className="font-semibold text-gray-900 text-sm md:text-base">Request Leave</p>
              <p className="text-xs md:text-sm text-gray-600">Apply for time off</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/attendance')}
            className="flex items-center p-3 md:p-4 border-2 border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Clock className="w-6 h-6 md:w-8 md:h-8 text-blue-600 mr-3" />
            <div className="text-left">
              <p className="font-semibold text-gray-900 text-sm md:text-base">View Attendance</p>
              <p className="text-xs md:text-sm text-gray-600">Check your records</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/profile')}
            className="flex items-center p-3 md:p-4 border-2 border-green-200 rounded-lg hover:bg-green-50 transition-colors"
          >
            <FileText className="w-6 h-6 md:w-8 md:h-8 text-green-600 mr-3" />
            <div className="text-left">
              <p className="font-semibold text-gray-900 text-sm md:text-base">My Profile</p>
              <p className="text-xs md:text-sm text-gray-600">Update information</p>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Activity or Performance */}
      {stats.latestPayslip && (
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4 flex items-center">
            <DollarSign className="w-5 h-5 md:w-6 md:h-6 mr-2 text-purple-600" />
            Latest Payslip Details
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div>
              <p className="text-xs md:text-sm text-gray-600">Gross Salary</p>
              <p className="text-sm md:text-lg font-semibold text-gray-900">
                {formatCurrency(stats.latestPayslip.gross_salary)}
              </p>
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-600">Deductions</p>
              <p className="text-sm md:text-lg font-semibold text-red-600">
                {formatCurrency(stats.latestPayslip.deductions || 0)}
              </p>
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-600">Net Salary</p>
              <p className="text-sm md:text-lg font-semibold text-green-600">
                {formatCurrency(stats.latestPayslip.net_salary)}
              </p>
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-600">Payment Date</p>
              <p className="text-sm md:text-lg font-semibold text-gray-900">
                {new Date(stats.latestPayslip.pay_period_end).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
