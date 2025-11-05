import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { 
  getAllAttendance, 
  deleteAttendance,
  clockIn,
  clockOut,
  getTodayAttendance,
  calculateWorkHours,
} from '../../services/attendanceService';
import { 
  Plus, 
  Search, 
  Filter,
  Clock,
  LogIn,
  LogOut,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  Calendar,
  BarChart3
} from 'lucide-react';
import AttendanceForm from './AttendanceForm';
import AttendanceReport from './AttendanceReport';
import Loading from '../common/Loading';
import Modal from '../common/Modal';
import { supabase } from '../../services/supabase';

export default function AttendanceList({ employees }) {
  const { showSuccess, showError } = useApp();
  const { user, isAdmin, isManager } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [filteredAttendance, setFilteredAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
  });
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null, name: '' });
  const [showDetails, setShowDetails] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const statusOptions = ['present', 'absent', 'late', 'half_day', 'on_leave'];

  useEffect(() => {
    fetchAttendance();
    checkTodayAttendance();
  }, []);

  useEffect(() => {
    filterAttendance();
  }, [searchTerm, filterStatus, filterDate, attendance]);

  useEffect(() => {
    if (attendance.length >= 0) fetchStats();
  }, [attendance]);

  const fetchAttendance = async () => {
    setLoading(true);
    const result = await getAllAttendance();
    
    if (result.success) {
      let attendanceData = result.data;
      if (!isAdmin() && !isManager()) {
        attendanceData = attendanceData.filter(record => record.employee_id === user.id);
      }
      setAttendance(attendanceData);
      setFilteredAttendance(attendanceData);
    } else showError(result.error || 'Failed to fetch attendance records');
    setLoading(false);
  };

  const checkTodayAttendance = async () => {
    if (user?.id) {
      const result = await getTodayAttendance(user.id);
      if (result.success && result.data) setTodayAttendance(result.data);
    }
  };

  const fetchStats = () => {
    const currentDate = new Date();
    const startOfMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;

    const monthlyAttendance = attendance.filter(r => r.date >= startOfMonth);
    setStats({
      total: monthlyAttendance.length,
      present: monthlyAttendance.filter(r => r.status === 'present').length,
      absent: monthlyAttendance.filter(r => r.status === 'absent').length,
      late: monthlyAttendance.filter(r => r.status === 'late').length,
    });
  };

  const filterAttendance = () => {
    let filtered = [...attendance];
    if (searchTerm) filtered = filtered.filter(r => r.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()));
    if (filterStatus) filtered = filtered.filter(r => r.status === filterStatus);
    if (filterDate) filtered = filtered.filter(r => r.date === filterDate);
    setFilteredAttendance(filtered);
  };

  const handleClockIn = async () => {
    const employee = employees.find(e => e.id === user.id);
    if (!employee) return showError('Employee data not found');

    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const { data: existing } = await supabase.from('attendance').select('*').eq('employee_id', user.id).eq('date', today).single();
      if (existing) return showError('You have already clocked in today!');
      const result = await clockIn({ employee_id: employee.id, employee_name: employee.name });
      if (result.success) {
        showSuccess('Clocked in successfully');
        fetchAttendance();
        checkTodayAttendance();
      } else showError(result.error || 'Failed to clock in');
    } catch (error) {
      showError('Failed to clock in');
    }
  };

  const handleClockOut = async () => {
    if (!todayAttendance) return showError('No clock-in record found for today');
    try {
      const result = await clockOut(todayAttendance.id);
      if (result.success) {
        showSuccess('Clocked out successfully');
        fetchAttendance();
        setTodayAttendance(null);
      } else showError(result.error || 'Failed to clock out');
    } catch {
      showError('Failed to clock out');
    }
  };

  const handleDelete = async () => {
    const result = await deleteAttendance(deleteModal.id);
    if (result.success) {
      showSuccess('Attendance record deleted');
      fetchAttendance();
    } else showError(result.error || 'Failed to delete');
    setDeleteModal({ show: false, id: null, name: '' });
  };

  const formatDate = d => (d ? new Date(d).toLocaleDateString('en-GB') : 'N/A');
  const formatTime = t => (t ? t.substring(0, 5) : '--:--');
  const clearFilters = () => { setSearchTerm(''); setFilterStatus(''); setFilterDate(''); };

  const getStatusBadge = s => ({
    present: 'bg-green-100 text-green-800',
    absent: 'bg-red-100 text-red-800',
    late: 'bg-yellow-100 text-yellow-800',
    half_day: 'bg-orange-100 text-orange-800',
    on_leave: 'bg-blue-100 text-blue-800',
  }[s] || 'bg-gray-100 text-gray-800');

  const getStatusIcon = s => ({
    present: <CheckCircle className="w-4 h-4" />,
    absent: <XCircle className="w-4 h-4" />,
    late: <AlertCircle className="w-4 h-4" />,
  }[s] || <Clock className="w-4 h-4" />);

  if (loading) return <Loading />;

  return (
    <div className="p-4 md:p-6 space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Attendance Management</h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base">
            {isAdmin() || isManager()
              ? 'Track employee attendance and working hours'
              : 'Track your attendance and working hours'}
          </p>
        </div>
        {(isAdmin() || isManager()) && (
          <div className="flex gap-2 flex-nowrap">
            <button
              onClick={() => setShowReport(true)}
              className="flex items-center px-3 md:px-5 py-2 md:py-2 bg-purple-600 text-white text-xs md:text-sm whitespace-nowrap rounded-lg hover:bg-purple-700 transition-colors shadow-md"
            >
              <BarChart3 className="w-4 h-4 md:w-5 md:h-5 mr-1" /> Generate Report
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center px-3 md:px-5 py-2 md:py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs md:text-sm whitespace-nowrap rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
            >
              <Plus className="w-4 h-4 md:w-5 md:h-5 mr-1" /> Mark Attendance
            </button>
          </div>
        )}
      </div>

      {/* Clock In/Out Card */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-3 sm:p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="bg-white bg-opacity-20 p-2 sm:p-3 rounded-lg">
              <Clock className="w-5 h-5 md:w-8 md:h-8" />
            </div>
            <div>
              <h3 className="text-base md:text-xl font-bold">Quick Clock In/Out</h3>
              <p className="text-purple-100 text-xs md:text-sm">
                {todayAttendance && todayAttendance.clock_in
                  ? `Clocked in at ${formatTime(todayAttendance.clock_in)}`
                  : 'Not clocked in yet today'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleClockIn}
              disabled={todayAttendance && todayAttendance.clock_in}
              className="flex items-center px-4 md:px-6 py-2 md:py-3 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-all font-semibold shadow-md disabled:opacity-50"
            >
              <LogIn className="w-4 h-4 md:w-5 md:h-5 mr-2" /> Clock In
            </button>
            <button
              onClick={handleClockOut}
              disabled={!todayAttendance || todayAttendance.clock_out}
              className="flex items-center px-4 md:px-6 py-2 md:py-3 bg-white text-red-600 rounded-lg hover:bg-red-50 transition-all font-semibold shadow-md disabled:opacity-50"
            >
              <LogOut className="w-4 h-4 md:w-5 md:h-5 mr-2" /> Clock Out
            </button>
          </div>
        </div>
        {todayAttendance && todayAttendance.clock_out && (
          <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-white border-opacity-20 text-sm md:text-base">
            <p className="text-purple-100">
              Today's work hours:{' '}
              <span className="font-bold text-white">
                {calculateWorkHours(todayAttendance.clock_in, todayAttendance.clock_out)}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Stats Cards (responsive same as dashboard) */}
      {(isAdmin() || isManager()) && (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
          {[
            { label: 'Total Records', value: stats.total, color: 'from-blue-500 to-blue-600', icon: <Users className="w-5 h-5 md:w-6 md:h-6" /> },
            { label: 'Present', value: stats.present, color: 'from-green-500 to-green-600', icon: <CheckCircle className="w-5 h-5 md:w-6 md:h-6" /> },
            { label: 'Absent', value: stats.absent, color: 'from-red-500 to-red-600', icon: <XCircle className="w-5 h-5 md:w-6 md:h-6" /> },
            { label: 'Late', value: stats.late, color: 'from-yellow-500 to-yellow-600', icon: <AlertCircle className="w-5 h-5 md:w-6 md:h-6" /> },
          ].map((card, i) => (
            <div key={i} className={`bg-gradient-to-br ${card.color} rounded-lg p-3 sm:p-5 lg:p-6 text-white shadow-md`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-white/80">{card.label}</p>
                  <p className="text-xl md:text-3xl font-bold mt-2">{card.value}</p>
                </div>
                <div className="bg-white bg-opacity-20 p-2 md:p-3 rounded-lg">{card.icon}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-3 md:p-5">
        <div className="flex items-center gap-2 mb-3 md:mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-base md:text-lg font-semibold text-gray-900">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4">
          {(isAdmin() || isManager()) && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
              />
            </div>
          )}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
          >
            <option value="">All Status</option>
            {statusOptions.map(s => (
              <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
            ))}
          </select>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
          />
          <button
            onClick={clearFilters}
            className="px-3 md:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm md:text-base"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Mobile List (cards) */}
      <div className="md:hidden space-y-3">
        {filteredAttendance.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-4 text-center text-gray-500">No attendance records found</div>
        ) : (
          filteredAttendance.map((record) => (
            <div key={record.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{formatDate(record.date)}</p>
                  {(isAdmin() || isManager()) && (
                    <p className="text-base font-semibold text-gray-900">{record.employee_name}</p>
                  )}
                </div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(record.status)}`}>
                  {record.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
                <div>
                  <p className="text-gray-500">Clock In</p>
                  <p className="font-medium">{formatTime(record.clock_in)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Clock Out</p>
                  <p className="font-medium">{formatTime(record.clock_out)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Hours</p>
                  <p className="font-medium">{calculateWorkHours(record.clock_in, record.clock_out)}</p>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => { setSelectedRecord(record); setShowDetails(true); }}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  View
                </button>
                {isAdmin() && (
                  <button
                    onClick={() => setDeleteModal({ show: true, id: record.id, name: record.employee_name })}
                    className="ml-2 px-3 py-1.5 text-sm border border-red-600 text-red-700 rounded-lg hover:bg-red-50"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">Date</th>
                {(isAdmin() || isManager()) && (
                  <th className="px-6 py-4 text-left text-sm font-semibold">Employee</th>
                )}
                <th className="px-6 py-4 text-center text-sm font-semibold">Clock In</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Clock Out</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Work Hours</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Status</th>
                {isAdmin() && (
                  <th className="px-6 py-4 text-center text-sm font-semibold">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin() ? "7" : (isAdmin() || isManager()) ? "6" : "5"} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <Calendar className="w-16 h-16 mb-4" />
                      <p className="text-lg font-medium">No attendance records found</p>
                      <p className="text-sm mt-2">Mark attendance to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAttendance.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatDate(record.date)}
                    </td>
                    {(isAdmin() || isManager()) && (
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{record.employee_name}</div>
                      </td>
                    )}
                    <td className="px-6 py-4 text-center">
                      <span className="font-mono text-sm text-gray-700">
                        {formatTime(record.clock_in)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-mono text-sm text-gray-700">
                        {formatTime(record.clock_out)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-semibold text-blue-600">
                        {calculateWorkHours(record.clock_in, record.clock_out)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(record.status)}`}>
                        {getStatusIcon(record.status)}
                        {record.status.replace('_', ' ')}
                      </span>
                    </td>
                    {isAdmin() && (
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setDeleteModal({ 
                              show: true, 
                              id: record.id, 
                              name: record.employee_name 
                            })}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Results Count */}
        {filteredAttendance.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing <span className="font-medium">{filteredAttendance.length}</span> of{' '}
              <span className="font-medium">{attendance.length}</span> records
            </p>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetails && selectedRecord && (
        <Modal
          title="Attendance Details"
          onClose={() => { setShowDetails(false); setSelectedRecord(null); }}
          onConfirm={() => { setShowDetails(false); setSelectedRecord(null); }}
          confirmText="Close"
          cancelText="Back"
        >
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-500">Date:</span> <span className="font-medium">{formatDate(selectedRecord.date)}</span></p>
            {(isAdmin() || isManager()) && (
              <p><span className="text-gray-500">Employee:</span> <span className="font-medium">{selectedRecord.employee_name}</span></p>
            )}
            <p><span className="text-gray-500">Clock In:</span> <span className="font-medium">{formatTime(selectedRecord.clock_in)}</span></p>
            <p><span className="text-gray-500">Clock Out:</span> <span className="font-medium">{formatTime(selectedRecord.clock_out)}</span></p>
            <p><span className="text-gray-500">Hours:</span> <span className="font-medium">{calculateWorkHours(selectedRecord.clock_in, selectedRecord.clock_out)}</span></p>
            <p>
              <span className="text-gray-500">Status:</span>{' '}
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(selectedRecord.status)}`}>
                {selectedRecord.status}
              </span>
            </p>
          </div>
        </Modal>
      )}

      {/* Attendance Form Modal */}
      {showForm && (
        <AttendanceForm
          employees={employees}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            fetchAttendance();
          }}
        />
      )}

      {/* Attendance Report Modal */}
      {showReport && (
        <AttendanceReport
          onClose={() => setShowReport(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <Modal
          title="Delete Attendance Record"
          onClose={() => setDeleteModal({ show: false, id: null, name: '' })}
          onConfirm={handleDelete}
          confirmText="Delete"
          confirmButtonClass="bg-red-600 hover:bg-red-700"
        >
          <p className="text-gray-700">
            Are you sure you want to delete the attendance record for{' '}
            <span className="font-semibold">{deleteModal.name}</span>?
          </p>
          <p className="text-red-600 text-sm mt-2">
            This action cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}
