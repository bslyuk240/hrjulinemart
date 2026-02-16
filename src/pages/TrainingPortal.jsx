import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock3, Search } from 'lucide-react';
import { getEmployeeTrainingCourses } from '../services/trainingService';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import Loading from '../components/common/Loading';

const tabs = [
  { id: 'assigned', label: 'Assigned to you' },
  { id: 'all', label: 'All courses' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'completed', label: 'Completed' },
];

export default function TrainingPortal() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showError } = useApp();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('assigned');
  const [search, setSearch] = useState('');
  const [courses, setCourses] = useState([]);

  const loadCourses = async () => {
    if (!user?.id) return;
    setLoading(true);
    const result = await getEmployeeTrainingCourses(user.id);
    if (!result.success) {
      showError(result.error || 'Failed to load courses.');
    } else {
      setCourses(result.data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCourses();
  }, [user?.id]);

  const filtered = useMemo(() => {
    return courses
      .filter((course) => {
        if (activeTab === 'all') return true;
        if (activeTab === 'assigned') {
          return ['assigned', 'in_progress', 'completed'].includes(course.employee_status);
        }
        return course.employee_status === activeTab;
      })
      .filter((course) =>
        `${course.title || ''} ${course.category || ''}`
          .toLowerCase()
          .includes(search.toLowerCase())
      );
  }, [courses, activeTab, search]);

  if (loading) return <Loading />;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Training Home</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">Continue courses and track your progress.</p>
        </div>
        <button
          onClick={() => navigate('/training/results')}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 w-full sm:w-auto"
        >
          My Results
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 rounded-lg text-sm ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by title or category..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="md:col-span-2 xl:col-span-3 bg-white rounded-lg shadow-md p-10 text-center text-gray-500">
            No courses found for this view.
          </div>
        ) : (
          filtered.map((course) => (
            <article key={course.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-32 bg-gradient-to-r from-purple-600 to-blue-600 relative">
                {course.cover_url && (
                  <img
                    src={course.cover_url}
                    alt={course.title}
                    className="w-full h-full object-cover opacity-60"
                  />
                )}
                <div className="absolute top-3 right-3">
                  <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-white/90 text-gray-800 capitalize">
                    {course.difficulty || 'beginner'}
                  </span>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <h2 className="font-semibold text-gray-900">{course.title}</h2>
                  <p className="text-sm text-gray-600 line-clamp-2">{course.description || 'No description'}</p>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    {course.category || 'General'}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="w-3.5 h-3.5" />
                    {course.estimated_minutes || 0} min
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Completion</span>
                    <span>{course.completion_percent || 0}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                      style={{ width: `${Math.min(100, course.completion_percent || 0)}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/training/course/${course.id}`)}
                  className="w-full px-3 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700"
                >
                  {course.completion_percent > 0 ? 'Continue Course' : 'Start Course'}
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
