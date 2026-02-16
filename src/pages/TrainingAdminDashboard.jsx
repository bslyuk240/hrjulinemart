import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  BookOpen,
  CheckCircle2,
  Filter,
  Plus,
  Search,
  Trash2,
  Users,
  UploadCloud,
  Edit3,
} from 'lucide-react';
import {
  assignTrainingCourse,
  deleteTrainingCourse,
  getAllTrainingCourses,
  getTrainingDashboardStats,
  getTrainingEmployees,
  saveTrainingCourse,
} from '../services/trainingService';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import Loading from '../components/common/Loading';

const initialStats = {
  totalCourses: 0,
  publishedCourses: 0,
  draftCourses: 0,
  totalEnrollments: 0,
  totalAttempts: 0,
  averageScore: 0,
  passRate: 0,
};

export default function TrainingAdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showError, showSuccess } = useApp();

  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState(initialStats);
  const [employees, setEmployees] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [assigningCourse, setAssigningCourse] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [dueDate, setDueDate] = useState('');

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesStatus =
        statusFilter === 'all' ? true : course.status === statusFilter;
      const haystack = `${course.title || ''} ${course.category || ''} ${course.difficulty || ''}`
        .trim()
        .toLowerCase();
      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [courses, searchTerm, statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsResult, coursesResult, employeesResult] = await Promise.all([
        getTrainingDashboardStats(),
        getAllTrainingCourses({ includeDraft: true }),
        getTrainingEmployees(),
      ]);

      if (statsResult.success) setStats(statsResult.data);
      if (coursesResult.success) setCourses(coursesResult.data);
      if (employeesResult.success) setEmployees(employeesResult.data);

      if (!statsResult.success) showError(statsResult.error || 'Failed to load training stats.');
      if (!coursesResult.success) showError(coursesResult.error || 'Failed to load courses.');
      if (!employeesResult.success) showError(employeesResult.error || 'Failed to load employees.');
    } catch (error) {
      showError(error.message || 'Failed to load training dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTogglePublish = async (course) => {
    const nextStatus = course.status === 'published' ? 'draft' : 'published';
    const result = await saveTrainingCourse({ ...course, status: nextStatus }, user?.id);
    if (!result.success) {
      showError(result.error || 'Failed to update course status.');
      return;
    }
    showSuccess(
      nextStatus === 'published'
        ? 'Course published successfully.'
        : 'Course moved back to draft.'
    );
    fetchData();
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Delete this course and all modules, lessons, quizzes, and results?')) return;
    const result = await deleteTrainingCourse(courseId);
    if (!result.success) {
      showError(result.error || 'Failed to delete course.');
      return;
    }
    showSuccess('Course deleted.');
    fetchData();
  };

  const toggleSelectedUser = (employeeId) => {
    setSelectedUsers((prev) =>
      prev.includes(employeeId) ? prev.filter((id) => id !== employeeId) : [...prev, employeeId]
    );
  };

  const handleAssignCourse = async () => {
    if (!assigningCourse) return;
    if (!selectedUsers.length) {
      showError('Select at least one employee.');
      return;
    }

    const result = await assignTrainingCourse({
      courseId: assigningCourse.id,
      userIds: selectedUsers,
      assignedBy: user?.id,
      dueDate: dueDate || null,
    });

    if (!result.success) {
      showError(result.error || 'Failed to assign course.');
      return;
    }

    showSuccess(`Assigned to ${result.data.inserted} employee(s).`);
    setAssigningCourse(null);
    setSelectedUsers([]);
    setDueDate('');
    fetchData();
  };

  const openAssignmentModal = (course) => {
    setAssigningCourse(course);
    setSelectedUsers([]);
    setDueDate('');
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Training Dashboard</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">Create and manage courses for your team.</p>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full md:w-auto">
          <button
            onClick={() => navigate('/training/admin/editor')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
          >
            <Plus className="w-4 h-4" />
            New Course
          </button>
          <button
            onClick={() => navigate('/training/admin/reports')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <Activity className="w-4 h-4" />
            Reports
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Courses" value={stats.totalCourses} icon={BookOpen} />
        <StatCard label="Published" value={stats.publishedCourses} icon={CheckCircle2} />
        <StatCard label="Enrollments" value={stats.totalEnrollments} icon={Users} />
        <StatCard label="Pass Rate" value={`${stats.passRate}%`} icon={UploadCloud} />
      </div>

      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by title, category, or difficulty..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>
      </div>

      <div className="hidden md:block bg-white rounded-lg shadow-md overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Course</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Category</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Difficulty</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Duration</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Status</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredCourses.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-10 text-center text-gray-500">
                  No courses found.
                </td>
              </tr>
            ) : (
              filteredCourses.map((course) => (
                <tr key={course.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{course.title}</div>
                    <div className="text-xs text-gray-500 line-clamp-1">{course.description || 'No description'}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{course.category || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 capitalize">{course.difficulty || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{course.estimated_minutes || 0} min</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        course.status === 'published'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {course.status || 'draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => navigate(`/training/admin/editor/${course.id}`)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-50"
                      >
                        <Edit3 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleTogglePublish(course)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        {course.status === 'published' ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        onClick={() => openAssignmentModal(course)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-purple-300 text-purple-700 hover:bg-purple-50"
                      >
                        Assign
                      </button>
                      <button
                        onClick={() => handleDeleteCourse(course.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {filteredCourses.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
            No courses found.
          </div>
        ) : (
          filteredCourses.map((course) => (
            <div key={course.id} className="bg-white rounded-lg shadow-md p-4 space-y-3">
              <div>
                <p className="font-semibold text-gray-900">{course.title}</p>
                <p className="text-xs text-gray-500 line-clamp-2">{course.description || 'No description'}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <p>Category: <span className="text-gray-800">{course.category || '-'}</span></p>
                <p>Difficulty: <span className="text-gray-800 capitalize">{course.difficulty || '-'}</span></p>
                <p>Duration: <span className="text-gray-800">{course.estimated_minutes || 0} min</span></p>
                <p>
                  Status:{' '}
                  <span className={`font-medium ${course.status === 'published' ? 'text-green-700' : 'text-yellow-700'}`}>
                    {course.status || 'draft'}
                  </span>
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => navigate(`/training/admin/editor/${course.id}`)}
                  className="px-3 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleTogglePublish(course)}
                  className="px-3 py-2 text-sm rounded-md border border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  {course.status === 'published' ? 'Unpublish' : 'Publish'}
                </button>
                <button
                  onClick={() => openAssignmentModal(course)}
                  className="px-3 py-2 text-sm rounded-md border border-purple-300 text-purple-700 hover:bg-purple-50"
                >
                  Assign
                </button>
                <button
                  onClick={() => handleDeleteCourse(course.id)}
                  className="px-3 py-2 text-sm rounded-md border border-red-300 text-red-700 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {assigningCourse && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setAssigningCourse(null);
          }}
        >
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Assign Course</h2>
              <p className="text-sm text-gray-600 mt-1">{assigningCourse.title}</p>
            </div>
            <div className="p-5 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Due date (optional)</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="border rounded-lg divide-y max-h-72 overflow-y-auto">
                {employees.map((employee) => (
                  <label
                    key={employee.id}
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{employee.name}</p>
                      <p className="text-xs text-gray-500">
                        {employee.email} {employee.department ? `• ${employee.department}` : ''}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(employee.id)}
                      onChange={() => toggleSelectedUser(employee.id)}
                      className="w-4 h-4"
                    />
                  </label>
                ))}
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setAssigningCourse(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignCourse}
                className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700"
              >
                Assign Selected
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-600 uppercase">{label}</p>
          <p className="text-xl md:text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className="w-11 h-11 rounded-full bg-purple-100 flex items-center justify-center">
          <Icon className="w-5 h-5 text-purple-600" />
        </div>
      </div>
    </div>
  );
}
