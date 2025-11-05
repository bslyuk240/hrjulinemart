import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { getAttendanceByDateRange, calculateWorkHours } from '../../services/attendanceService';
import { X, Download, Calendar, TrendingUp } from 'lucide-react';

export default function AttendanceReport({ onClose }) {
  const { showError } = useApp();
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState({
    totalRecords: 0,
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    onLeave: 0,
    totalHours: 0,
  });

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  useEffect(() => {
    generateReport();
  }, [month, year]);

  const generateReport = async () => {
    setLoading(true);
    
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    const result = await getAttendanceByDateRange(startDate, endDate);

    if (result.success) {
      setReportData(result.data);
      calculateSummary(result.data);
    } else {
      showError(result.error || 'Failed to generate report');
    }

    setLoading(false);
  };

  const calculateSummary = (data) => {
    const summary = {
      totalRecords: data.length,
      present: data.filter(r => r.status === 'present').length,
      absent: data.filter(r => r.status === 'absent').length,
      late: data.filter(r => r.status === 'late').length,
      halfDay: data.filter(r => r.status === 'half_day').length,
      onLeave: data.filter(r => r.status === 'on_leave').length,
      totalHours: 0,
    };

    // Calculate total work hours
    data.forEach(record => {
      if (record.clock_in && record.clock_out) {
        const hours = calculateWorkHours(record.clock_in, record.clock_out);
        const [h, m] = hours.split('h ').map(s => parseInt(s) || 0);
        summary.totalHours += h + (m / 60);
      }
    });

    setSummary(summary);
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Employee', 'Clock In', 'Clock Out', 'Work Hours', 'Status', 'Notes'];
    const rows = reportData.map(record => [
      record.date,
      record.employee_name,
      record.clock_in || '--:--',
      record.clock_out || '--:--',
      calculateWorkHours(record.clock_in, record.clock_out),
      record.status,
      record.notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${months[month - 1]}-${year}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getAttendanceRate = () => {
    if (summary.totalRecords === 0) return 0;
    return ((summary.present + summary.late + summary.halfDay) / summary.totalRecords * 100).toFixed(1);
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900">
            Attendance Report
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={exportToCSV}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Period Selection */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Select Period</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Month
                </label>
                <select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {months.map((m, index) => (
                    <option key={index} value={index + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Year
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="text-gray-600 mt-4">Generating report...</p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
                  <p className="text-sm opacity-90">Total Records</p>
                  <p className="text-3xl font-bold mt-2">{summary.totalRecords}</p>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
                  <p className="text-sm opacity-90">Present</p>
                  <p className="text-3xl font-bold mt-2">{summary.present}</p>
                </div>

                <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-4 text-white">
                  <p className="text-sm opacity-90">Absent</p>
                  <p className="text-3xl font-bold mt-2">{summary.absent}</p>
                </div>

                <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-4 text-white">
                  <p className="text-sm opacity-90">Late</p>
                  <p className="text-3xl font-bold mt-2">{summary.late}</p>
                </div>
              </div>

              {/* Analytics */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-900">Analytics</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Attendance Rate</p>
                    <p className="text-2xl font-bold text-purple-600">{getAttendanceRate()}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Half Days</p>
                    <p className="text-2xl font-bold text-orange-600">{summary.halfDay}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">On Leave</p>
                    <p className="text-2xl font-bold text-blue-600">{summary.onLeave}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Hours</p>
                    <p className="text-2xl font-bold text-green-600">{summary.totalHours.toFixed(1)}h</p>
                  </div>
                </div>
              </div>

              {/* Detailed Records */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Detailed Records</h3>
                </div>
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Clock In</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Clock Out</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Hours</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {reportData.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                            No records found for this period
                          </td>
                        </tr>
                      ) : (
                        reportData.map((record) => (
                          <tr key={record.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {new Date(record.date).toLocaleDateString('en-GB')}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {record.employee_name}
                            </td>
                            <td className="px-4 py-3 text-center text-sm font-mono text-gray-700">
                              {record.clock_in ? record.clock_in.substring(0, 5) : '--:--'}
                            </td>
                            <td className="px-4 py-3 text-center text-sm font-mono text-gray-700">
                              {record.clock_out ? record.clock_out.substring(0, 5) : '--:--'}
                            </td>
                            <td className="px-4 py-3 text-center text-sm font-semibold text-blue-600">
                              {calculateWorkHours(record.clock_in, record.clock_out)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full capitalize ${
                                record.status === 'present' ? 'bg-green-100 text-green-800' :
                                record.status === 'absent' ? 'bg-red-100 text-red-800' :
                                record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                record.status === 'half_day' ? 'bg-orange-100 text-orange-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {record.status.replace('_', ' ')}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}