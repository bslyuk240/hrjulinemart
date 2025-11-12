import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import Loading from '../common/Loading';
import Modal from '../common/Modal';
import { getVendorResponses, deleteVendorResponse } from '../../services/vendorService';
import { getAllEmployees } from '../../services/employeeService';

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleString();
};

const formatFieldValue = (value, fallback = 'Not provided') => {
  if (value === null || value === undefined) {
    return fallback;
  }

  const text = `${value}`.trim();
  return text === '' ? fallback : text;
};

const DetailItem = ({ label, value, fallback, multiline }) => (
  <div>
    <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
    <p className={`text-sm text-gray-900 ${multiline ? 'whitespace-pre-line' : ''}`}>
      {formatFieldValue(value, fallback)}
    </p>
  </div>
);

export default function VendorResponsesList() {
  const { showError, showSuccess } = useApp();
  const { isAdmin } = useAuth();
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [submitters, setSubmitters] = useState({});
  const [employeeProfiles, setEmployeeProfiles] = useState({});

  const canDelete = isAdmin();

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

  const fetchSubmitters = async () => {
    const result = await getAllEmployees();
    if (result.success) {
      const map = {};
      const profiles = {};
      (result.data || []).forEach((employee) => {
        if (!employee?.id) return;
        profiles[employee.id] = employee;
        map[employee.id] = employee.name || employee.username || employee.email || 'Employee';
      });
      setSubmitters(map);
      setEmployeeProfiles(profiles);
    }
  };

  const resolveSubmitterName = (entry) =>
    submitters[entry?.submitted_by_id] ||
    entry?.submitted_by_name ||
    entry?.submitted_by_email ||
    'HR user';

  const resolveSubmitterEmail = (entry) => entry?.submitted_by_email || 'Not provided';

  const resolveSubmitterProfile = (entry) =>
    employeeProfiles[entry?.submitted_by_id] || null;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchSubmitters();
    fetchResponses();
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    const result = await deleteVendorResponse(deleteTarget.id);
    setDeleting(false);

    if (result.success) {
      showSuccess('Vendor entry removed.');
      fetchResponses();
      setDeleteTarget(null);
    } else {
      showError(result.error || 'Failed to delete vendor entry.');
    }
  };

  if (loading) {
    return <Loading />;
  }

  const renderMobileCard = (item) => (
    <div key={item.id} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500">Vendor</p>
          <p className="text-lg font-semibold text-gray-900">{formatFieldValue(item.vendor_name)}</p>
          <p className="text-xs text-gray-500">{formatFieldValue(item.business_address)}</p>
        </div>
        <p className="text-right text-xs text-gray-500">{formatDate(item.created_at)}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
        <div>
          <p>Category</p>
          <p className="text-gray-900 font-semibold">{formatFieldValue(item.category)}</p>
        </div>
        <div>
          <p>Submitted by</p>
          <p className="text-gray-900 font-semibold">
            {formatFieldValue(resolveSubmitterName(item))}
          </p>
          <p className="text-xs text-gray-400">{formatFieldValue(resolveSubmitterEmail(item))}</p>
        </div>
        <div>
          <p>Interest</p>
          <p className="text-gray-900 font-semibold">{formatFieldValue(item.interest)}</p>
        </div>
        <div>
          <p>Onboarding</p>
          <p className="text-gray-900 font-semibold">{formatFieldValue(item.onboarding)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
        <div>
          <p>Online</p>
          <p className="text-gray-900 font-semibold">{formatFieldValue(item.sells_online, 'No')}</p>
        </div>
        <div>
          <p>Vendor contact</p>
          <p className="text-gray-900 font-semibold">
            {formatFieldValue(item.vendor_phone || item.vendor_email, 'No contact')}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedEntry(item)}
          className="flex-1 text-xs font-semibold uppercase tracking-wide text-purple-600 border border-purple-600 rounded-xl px-3 py-2 hover:bg-purple-50 transition"
        >
          View
        </button>
        {canDelete && (
          <button
            onClick={() => setDeleteTarget(item)}
            className="flex-1 text-xs font-semibold uppercase tracking-wide text-red-600 border border-red-600 rounded-xl px-3 py-2 hover:bg-red-50 transition"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );

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
        </div>
      </div>

      {responses.length === 0 ? (
        <div className="p-6 rounded-xl border border-dashed border-gray-200 text-center text-gray-500">
          No vendor entries yet. Encourage your team to source new partners.
        </div>
      ) : (
        <>
          <div className="space-y-4 md:hidden">
            {responses.map(renderMobileCard)}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-gray-500 border-b">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Submitted By</th>
                  <th className="px-4 py-3">Interest</th>
                  <th className="px-4 py-3">Onboarding</th>
                  <th className="px-4 py-3">Online</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="text-gray-700 divide-y">
                {responses.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">{formatDate(item.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{formatFieldValue(item.vendor_name)}</div>
                      <div className="text-xs text-gray-400">{formatFieldValue(item.business_address)}</div>
                    </td>
                    <td className="px-4 py-3">{formatFieldValue(item.category)}</td>
                    <td className="px-4 py-3">
                      {formatFieldValue(resolveSubmitterName(item))}
                      <div className="text-xs text-gray-400">{formatFieldValue(resolveSubmitterEmail(item))}</div>
                    </td>
                    <td className="px-4 py-3 text-sm capitalize">{formatFieldValue(item.interest)}</td>
                    <td className="px-4 py-3 text-sm capitalize">{formatFieldValue(item.onboarding)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatFieldValue(item.sells_online, 'No')}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setSelectedEntry(item)}
                          className="px-3 py-1 rounded-xl border border-purple-600 text-purple-600 text-xs font-semibold uppercase tracking-wide hover:bg-purple-50 transition-colors"
                        >
                          View
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => setDeleteTarget(item)}
                            className="px-3 py-1 rounded-xl border border-red-600 text-red-600 text-xs font-semibold uppercase tracking-wide hover:bg-red-50 transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selectedEntry && (
        <Modal
          title="Vendor Entry Details"
          onClose={() => setSelectedEntry(null)}
          onConfirm={() => setSelectedEntry(null)}
          confirmText="Close"
        >
          {(() => {
            const profile = resolveSubmitterProfile(selectedEntry);
            if (!profile) return null;
            return (
              <div className="mb-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wider text-gray-500">Submitter profile</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-sm text-gray-700">
                  <div>
                    <p className="font-semibold text-gray-900">{formatFieldValue(profile.name)}</p>
                    <p className="text-xs text-gray-500">{formatFieldValue(profile.position)}</p>
                    <p className="text-xs text-gray-500">{formatFieldValue(profile.department)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-500">Contact</p>
                    <p>{formatFieldValue(profile.email)}</p>
                    <p>{formatFieldValue(profile.phone)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-500">Payroll info</p>
                    <p>{formatFieldValue(profile.employee_code)}</p>
                    <p>{formatFieldValue(profile.payment_mode)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-xs text-gray-500">
                  <p>Joined: {formatFieldValue(profile.join_date)}</p>
                  <p>Leave balance: {formatFieldValue(profile.leave_balance)}</p>
                  <p>Manager: {profile.is_manager ? 'Yes' : 'No'}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-xs text-gray-500">
                  <p>Bank: {formatFieldValue(profile.bank_name)}</p>
                  <p>Account: {formatFieldValue(profile.bank_account)}</p>
                  <p>Manager perms: {formatFieldValue(profile.manager_permissions)}</p>
                </div>
              </div>
            );
          })()}
          <div className="space-y-6 text-sm text-gray-700">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500">Submitted</p>
              <p className="font-semibold text-gray-900">{formatDate(selectedEntry.created_at)}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailItem label="Vendor" value={selectedEntry.vendor_name} />
              <DetailItem label="Address" value={selectedEntry.business_address} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailItem label="Submitted by" value={resolveSubmitterName(selectedEntry)} fallback="HR user" />
              <DetailItem label="Submitter email" value={resolveSubmitterEmail(selectedEntry)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailItem label="Vendor phone" value={selectedEntry.vendor_phone} />
              <DetailItem label="Vendor email" value={selectedEntry.vendor_email} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <DetailItem label="Category" value={selectedEntry.category} />
              <DetailItem label="Interest" value={selectedEntry.interest} />
              <DetailItem label="Onboarding" value={selectedEntry.onboarding} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailItem label="Sells online" value={selectedEntry.sells_online} fallback="No" />
              <DetailItem label="Where online" value={selectedEntry.where_online} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailItem label="Challenges" value={selectedEntry.challenges} multiline />
              <DetailItem label="Comments" value={selectedEntry.comments} multiline />
            </div>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="Delete vendor entry?"
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          confirmText={deleting ? 'Deleting...' : 'Delete'}
          confirmButtonClass="bg-red-600 hover:bg-red-700"
          cancelText="Cancel"
        >
          <p className="text-sm text-gray-700">
            Deleting this entry removes it permanently from the system. Are you sure you want to continue?
          </p>
        </Modal>
      )}
    </div>
  );
}
