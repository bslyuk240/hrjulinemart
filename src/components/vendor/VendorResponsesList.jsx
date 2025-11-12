import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import Loading from '../common/Loading';
import { getVendorResponses } from '../../services/vendorService';

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleString();
};

export default function VendorResponsesList() {
  const { showError } = useApp();
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchResponses = async () => {
    setLoading(true);
    const result = await getVendorResponses();
    setLoading(false);

    if (result.success) {
      setResponses(result.data || []);
    } else {
      showError(result.error || 'Failed to load vendor entries');
    }
  };

  useEffect(() => {
    fetchResponses();
  }, []);

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Recent Vendor Entries</h2>
          <p className="text-sm text-gray-500 mt-1">
            Submitted entries are visible to every role and notify the leadership team automatically.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/vendor-sourcing/new"
            className="px-4 py-2 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 text-white font-semibold shadow-sm hover:opacity-90 transition-all"
          >
            New Entry
          </Link>
          <button
            onClick={fetchResponses}
            className="px-4 py-2 rounded-xl border border-purple-600 text-purple-600 font-semibold hover:bg-purple-50 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {responses.length === 0 ? (
        <div className="p-6 rounded-xl border border-dashed border-gray-200 text-center text-gray-500">
          No vendor entries yet. Encourage your team to source new partners.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-gray-500 border-b">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Marketer</th>
                <th className="px-4 py-3">Interest</th>
                <th className="px-4 py-3">Onboarding</th>
                <th className="px-4 py-3">Online</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 divide-y">
              {responses.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">{formatDate(item.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{item.vendor_name || '—'}</div>
                    <div className="text-xs text-gray-400">{item.business_address}</div>
                  </td>
                  <td className="px-4 py-3">{item.category || '—'}</td>
                  <td className="px-4 py-3">
                    <div>{item.marketer_name || '—'}</div>
                    <div className="text-xs text-gray-400">{item.marketer_phone || item.marketer_email}</div>
                  </td>
                  <td className="px-4 py-3 text-sm capitalize">{item.interest || '—'}</td>
                  <td className="px-4 py-3 text-sm capitalize">{item.onboarding || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.sells_online || 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
