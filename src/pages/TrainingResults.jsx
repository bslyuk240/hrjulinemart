import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getEmployeeTrainingResults } from '../services/trainingService';
import { useAuth } from '../context/AuthContext';
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

export default function TrainingResults() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showError } = useApp();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      setLoading(true);
      const result = await getEmployeeTrainingResults(user.id);
      if (!result.success) {
        showError(result.error || 'Failed to load results.');
      } else {
        setRows(result.data || []);
      }
      setLoading(false);
    };
    load();
  }, [user?.id]);

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Results</h1>
          <p className="text-gray-600 mt-1">Completion, score, attempts, and pass status.</p>
        </div>
        <button
          onClick={() => navigate('/training')}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Training Home
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        <table className="w-full min-w-[850px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Course</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Completion</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Latest Score</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Attempts</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Pass</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Completion Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-10 text-center text-gray-500">
                  No results yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.course_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.course_title}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-right">{row.completion_percent || 0}%</td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-right">
                    {row.latest_score == null ? '-' : `${row.latest_score}%`}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-right">{row.attempts || 0}</td>
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
                  <td className="px-4 py-3 text-sm text-gray-700 text-right">
                    {formatDate(row.completion_date)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

