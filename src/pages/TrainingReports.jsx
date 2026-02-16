import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, Search, Users } from 'lucide-react';
import {
  getTrainingEmployeeReports,
  getTrainingReports,
} from '../services/trainingService';
import { useApp } from '../context/AppContext';
import Loading from '../components/common/Loading';

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function TrainingReports() {
  const navigate = useNavigate();
  const { showError } = useApp();

  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('courses');
  const [courseRows, setCourseRows] = useState([]);
  const [employeeRows, setEmployeeRows] = useState([]);

  const [courseSearch, setCourseSearch] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeStatus, setEmployeeStatus] = useState('all');
  const [employeeCourse, setEmployeeCourse] = useState('all');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [courseResult, employeeResult] = await Promise.all([
        getTrainingReports(),
        getTrainingEmployeeReports(),
      ]);

      if (!courseResult.success) {
        showError(courseResult.error || 'Failed to load course reports.');
      } else {
        setCourseRows(courseResult.data || []);
      }

      if (!employeeResult.success) {
        showError(employeeResult.error || 'Failed to load employee reports.');
      } else {
        setEmployeeRows(employeeResult.data || []);
      }

      setLoading(false);
    };

    load();
  }, []);

  const filteredCourseRows = useMemo(() => {
    return courseRows.filter((row) =>
      row.title?.toLowerCase().includes(courseSearch.toLowerCase())
    );
  }, [courseRows, courseSearch]);

  const employeeCourseOptions = useMemo(() => {
    const map = new Map();
    for (const row of employeeRows) {
      if (!map.has(row.course_id)) map.set(row.course_id, row.course_title);
    }
    return [...map.entries()].sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  }, [employeeRows]);

  const filteredEmployeeRows = useMemo(() => {
    return employeeRows.filter((row) => {
      const text = `${row.employee_name || ''} ${row.employee_email || ''} ${row.course_title || ''}`
        .toLowerCase();
      const matchesSearch = text.includes(employeeSearch.toLowerCase());
      const matchesCourse =
        employeeCourse === 'all' ? true : String(row.course_id) === String(employeeCourse);
      const matchesStatus =
        employeeStatus === 'all'
          ? true
          : employeeStatus === 'overdue'
          ? Boolean(row.overdue)
          : row.status === employeeStatus;

      return matchesSearch && matchesCourse && matchesStatus;
    });
  }, [employeeRows, employeeSearch, employeeStatus, employeeCourse]);

  const courseSummary = useMemo(() => {
    const totalAttempts = courseRows.reduce((sum, row) => sum + (row.attempts || 0), 0);
    const totalEnrollments = courseRows.reduce((sum, row) => sum + (row.enrollments || 0), 0);
    const weightedPassRate = totalAttempts
      ? Math.round(
          courseRows.reduce((sum, row) => sum + (row.pass_rate || 0) * (row.attempts || 0), 0) /
            totalAttempts
        )
      : 0;

    return {
      courses: courseRows.length,
      enrollments: totalEnrollments,
      attempts: totalAttempts,
      passRate: weightedPassRate,
    };
  }, [courseRows]);

  const employeeSummary = useMemo(() => {
    const total = employeeRows.length;
    const completed = employeeRows.filter((row) => row.status === 'completed').length;
    const inProgress = employeeRows.filter((row) => row.status === 'in_progress').length;
    const overdue = employeeRows.filter((row) => row.overdue).length;

    return { total, completed, inProgress, overdue };
  }, [employeeRows]);

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Training Reports</h1>
          <p className="text-gray-600 mt-1">Course analytics and employee-level progress.</p>
        </div>
        <button
          onClick={() => navigate('/training/admin')}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setView('courses')}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${
              view === 'courses'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Course Summary
          </button>
          <button
            onClick={() => setView('employees')}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${
              view === 'employees'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Employee Progress
          </button>
        </div>
      </div>

      {view === 'courses' ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <ReportCard label="Courses" value={courseSummary.courses} />
            <ReportCard label="Enrollments" value={courseSummary.enrollments} />
            <ReportCard label="Attempts" value={courseSummary.attempts} />
            <ReportCard label="Pass Rate" value={`${courseSummary.passRate}%`} />
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={courseSearch}
                onChange={(event) => setCourseSearch(event.target.value)}
                placeholder="Search course title..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Course</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Enrollments</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Started</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Completed</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Avg Score</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Attempts</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Pass Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCourseRows.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-10 text-center text-gray-500">
                      No course report rows found.
                    </td>
                  </tr>
                ) : (
                  filteredCourseRows.map((row) => (
                    <tr key={row.course_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.title}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 capitalize">{row.status}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{row.enrollments}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{row.started}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{row.completed}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{row.average_score}%</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{row.attempts}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{row.pass_rate}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <EmployeeCard label="Assignments" value={employeeSummary.total} />
            <EmployeeCard label="Completed" value={employeeSummary.completed} />
            <EmployeeCard label="In Progress" value={employeeSummary.inProgress} />
            <EmployeeCard label="Overdue" value={employeeSummary.overdue} />
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={employeeSearch}
                  onChange={(event) => setEmployeeSearch(event.target.value)}
                  placeholder="Search employee, email, or course..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <select
                value={employeeCourse}
                onChange={(event) => setEmployeeCourse(event.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">All courses</option>
                {employeeCourseOptions.map(([courseId, title]) => (
                  <option key={courseId} value={courseId}>
                    {title}
                  </option>
                ))}
              </select>

              <select
                value={employeeStatus}
                onChange={(event) => setEmployeeStatus(event.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">All statuses</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Course</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Assigned</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Due</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Completion</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Latest Score</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Attempts</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Pass</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEmployeeRows.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-4 py-10 text-center text-gray-500">
                      No employee rows found.
                    </td>
                  </tr>
                ) : (
                  filteredEmployeeRows.map((row) => (
                    <tr key={`${row.user_id}-${row.course_id}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{row.employee_name}</p>
                        <p className="text-xs text-gray-500">{row.employee_email}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.course_title}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{formatDate(row.assigned_at)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{formatDate(row.due_date)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{row.completion_percent}%</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">
                        {row.latest_score == null ? '-' : `${row.latest_score}%`}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{row.attempts}</td>
                      <td className="px-4 py-3 text-right">
                        {row.pass_status == null ? (
                          <span className="text-xs text-gray-500">-</span>
                        ) : (
                          <span
                            className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              row.pass_status
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {row.pass_status ? 'Pass' : 'Fail'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            row.overdue
                              ? 'bg-red-100 text-red-800'
                              : row.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : row.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {row.overdue ? 'Overdue' : String(row.status || 'assigned').replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function EmployeeCard({ label, value }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
      <p className="text-xs text-gray-600 uppercase">{label}</p>
      <div className="flex items-center justify-between mt-1">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <Users className="w-4 h-4 text-purple-500" />
      </div>
    </div>
  );
}

function ReportCard({ label, value }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
      <p className="text-xs text-gray-600 uppercase">{label}</p>
      <div className="flex items-center justify-between mt-1">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <BarChart3 className="w-4 h-4 text-blue-500" />
      </div>
    </div>
  );
}
