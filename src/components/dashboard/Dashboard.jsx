import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { 
  Users, 
  DollarSign, 
  Calendar,
  TrendingUp,
  Building,
  Clock,
  FileText,
  UserCheck,
  UserX,
  AlertCircle,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import Loading from '../common/Loading';
import StatsCard from './StatsCard';
import QuickActions from './QuickActions';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    totalPayroll: 0,
    monthlyPayroll: 0,
    departments: 0,
    pendingLeaves: 0,
    averageSalary: 0,
    newEmployeesThisMonth: 0,
  });
  const [recentPayrolls, setRecentPayrolls] = useState([]);
  const [recentEmployees, setRecentEmployees] = useState([]);
  const [departmentStats, setDepartmentStats] = useState([]);
  const [pendingRequests, setPendingRequests] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchEmployeeStats(),
        fetchPayrollStats(),
        fetchRecentPayrolls(),
        fetchRecentEmployees(),
        fetchDepartmentStats(),
        fetchPendingRequests(),
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
    setLoading(false);
  };

  const fetchEmployeeStats = async () => {
    try {
      // Get all employees
      const { data: employees, error } = await supabase
        .from('employees')
        .select('*');

      if (error) throw error;

      const totalEmployees = employees?.length || 0;
      const activeEmployees = employees?.filter(emp => emp.can_login)?.length || 0;
      
      // Calculate average salary
      const totalSalary = employees?.reduce((sum, emp) => sum + (parseFloat(emp.salary) || 0), 0) || 0;
      const averageSalary = totalEmployees > 0 ? totalSalary / totalEmployees : 0;

      // Get unique departments
      const departments = [...new Set(employees?.map(emp => emp.department))].filter(Boolean).length;

      // Get new employees this month
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      
      const newEmployeesThisMonth = employees?.filter(emp => {
        if (!emp.join_date) return false;
        const joinDate = new Date(emp.join_date);
        return joinDate.getMonth() === currentMonth && joinDate.getFullYear() === currentYear;
      })?.length || 0;

      setStats(prev => ({
        ...prev,
        totalEmployees,
        activeEmployees,
        departments,
        averageSalary,
        newEmployeesThisMonth,
      }));
    } catch (error) {
      console.error('Error fetching employee stats:', error);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const { count, error } = await supabase
        .from('requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Pending');
      if (error) throw error;
      setPendingRequests(count || 0);
    } catch (e) {
      console.error('Error fetching pending requests:', e);
    }
  };
const fetchPayrollStats = async () => {
    try {
      // Get all payroll records
      const { data: payrolls, error } = await supabase
        .from('payrolls')
        .select('*');

      if (error) throw error;

      // Calculate total payroll
      const totalPayroll = payrolls?.reduce((sum, p) => sum + (parseFloat(p.net_salary) || 0), 0) || 0;

      // Get current month payroll
      const currentDate = new Date();
      const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
      const currentYear = currentDate.getFullYear();
      
      console.log('Current Month:', currentMonth, 'Current Year:', currentYear); // Debug log
      
      const monthlyPayrollRecords = payrolls?.filter(p => {
        // Debug each record
        console.log('Checking payroll:', p.month, p.year, 'vs', currentMonth, currentYear);
        return p.month === currentMonth && parseInt(p.year) === currentYear;
      });
      
      console.log('Monthly payroll records found:', monthlyPayrollRecords?.length); // Debug log
      
      const monthlyPayroll = monthlyPayrollRecords?.reduce((sum, p) => sum + (parseFloat(p.net_salary) || 0), 0) || 0;

      setStats(prev => ({
        ...prev,
        totalPayroll,
        monthlyPayroll,
      }));
    } catch (error) {
      console.error('Error fetching payroll stats:', error);
    }
  };

  const fetchRecentPayrolls = async () => {
    try {
      const { data, error } = await supabase
        .from('payrolls')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentPayrolls(data || []);
    } catch (error) {
      console.error('Error fetching recent payrolls:', error);
    }
  };

  const fetchRecentEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentEmployees(data || []);
    } catch (error) {
      console.error('Error fetching recent employees:', error);
    }
  };

  const fetchDepartmentStats = async () => {
    try {
      const { data: employees, error } = await supabase
        .from('employees')
        .select('department, salary');

      if (error) throw error;

      // Group by department
      const deptMap = {};
      employees?.forEach(emp => {
        if (emp.department) {
          if (!deptMap[emp.department]) {
            deptMap[emp.department] = { count: 0, totalSalary: 0 };
          }
          deptMap[emp.department].count++;
          deptMap[emp.department].totalSalary += parseFloat(emp.salary) || 0;
        }
      });

      const deptStats = Object.entries(deptMap).map(([name, data]) => ({
        name,
        count: data.count,
        totalSalary: data.totalSalary,
      })).sort((a, b) => b.count - a.count);

      setDepartmentStats(deptStats);
    } catch (error) {
      console.error('Error fetching department stats:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  if (loading) return <Loading />;

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 overflow-x-hidden">
      {/* Header */}
      <div>
        <h1 className="text-xl lg:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {/* Total Employees */}
        <StatsCard
          title="Total Employees"
          value={stats.totalEmployees}
          icon={Users}
          color="purple"
          trend={stats.newEmployeesThisMonth > 0 ? `+${stats.newEmployeesThisMonth} this month` : null}
        />

        {/* Monthly Payroll */}
        <StatsCard
          title="Monthly Payroll"
          value={formatCurrency(stats.monthlyPayroll)}
          icon={DollarSign}
          color="green"
          subtitle="Current month"
        />

        {/* Active Employees */}
        <StatsCard
          title="Active Employees"
          value={stats.activeEmployees}
          icon={UserCheck}
          color="blue"
          subtitle={`${stats.totalEmployees - stats.activeEmployees} inactive`}
        />

        {/* Departments */}
        <StatsCard
          title="Departments"
          value={stats.departments}
          icon={Building}
          color="orange"
          subtitle="Active departments"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Payroll (All Time)</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(stats.totalPayroll)}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-3 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Average Salary</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(stats.averageSalary)}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-3 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">New This Month</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats.newEmployeesThisMonth}</p>
            </div>

            <div className="bg-blue-100 p-3 rounded-lg">
              <UserCheck className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Pending Requests */}
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Requests</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{pendingRequests}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>


      {/* Recent Payrolls Table */}
      <div className="hidden lg:block bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Payroll Records</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentPayrolls.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    No recent payroll records
                  </td>
                </tr>
              ) : (
                recentPayrolls.map((payroll) => (
                  <tr key={payroll.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{payroll.employee_name}</div>
                      <div className="text-sm text-gray-500">{payroll.payslip_no}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {payroll.month} {payroll.year}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-green-600">
                      {formatCurrency(payroll.gross_salary)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-blue-600">
                      {formatCurrency(payroll.net_salary)}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600">
                      {formatDate(payroll.generated_date)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Employees */}
      <div className="hidden lg:block bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recently Added Employees</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Salary</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Join Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentEmployees.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No recent employees
                  </td>
                </tr>
              ) : (
                recentEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-medium text-purple-600">{employee.employee_code}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{employee.name}</div>
                      <div className="text-sm text-gray-500">{employee.email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {employee.position || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {employee.department || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-green-600">
                      {formatCurrency(employee.salary)}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600">
                      {formatDate(employee.join_date)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}








