import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Mail,
  Search,
  X,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';
import {
  getAuditLogs,
  getAuditFilterOptions,
  formatAuditAction,
  formatEntityType,
} from '../services/auditLogService';
import {
  getEmailLogs,
  getEmailLogFilterOptions,
  formatEmailType,
} from '../services/emailLogService';
import { useApp } from '../context/AppContext';
import Loading from '../components/common/Loading';

const fmtDateTime = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const StatusBadge = ({ status }) => {
  const map = {
    success: 'bg-green-100 text-green-800',
    sent: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    skipped: 'bg-yellow-100 text-yellow-800',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
};

function DetailDrawer({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} aria-hidden="true" />
      <aside className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
            aria-label="Close details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </aside>
    </>
  );
}

function JsonBlock({ data }) {
  if (data == null) {
    return <p className="text-sm text-gray-500">No additional details recorded.</p>;
  }
  return (
    <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-words">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export default function AuditLogPage() {
  const { showError } = useApp();
  const [tab, setTab] = useState('activity');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    action: '',
    entityType: '',
    emailType: '',
    status: '',
    actorId: '',
    fromDate: '',
    toDate: '',
  });
  const [filterOptions, setFilterOptions] = useState({
    actions: [],
    entityTypes: [],
    actors: [],
    emailTypes: [],
  });

  const pageSize = 50;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const loadFilterOptions = useCallback(async () => {
    const [auditOpts, emailOpts] = await Promise.all([
      getAuditFilterOptions(),
      getEmailLogFilterOptions(),
    ]);
    if (auditOpts.success) {
      setFilterOptions((prev) => ({
        ...prev,
        actions: auditOpts.data.actions,
        entityTypes: auditOpts.data.entityTypes,
        actors: auditOpts.data.actors,
      }));
    }
    if (emailOpts.success) {
      setFilterOptions((prev) => ({ ...prev, emailTypes: emailOpts.data.emailTypes }));
    }
  }, []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    const result = tab === 'activity'
      ? await getAuditLogs({
          page,
          pageSize,
          search: filters.search,
          action: filters.action,
          entityType: filters.entityType,
          status: filters.status,
          actorId: filters.actorId,
          fromDate: filters.fromDate,
          toDate: filters.toDate,
        })
      : await getEmailLogs({
          page,
          pageSize,
          search: filters.search,
          emailType: filters.emailType,
          status: filters.status,
          fromDate: filters.fromDate,
          toDate: filters.toDate,
        });

    if (!result.success) {
      showError(result.error || 'Failed to load logs.');
      setRows([]);
      setTotal(0);
    } else {
      setRows(result.data.rows);
      setTotal(result.data.total);
    }
    setLoading(false);
  }, [tab, page, filters, showError]);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    setPage(1);
    setSelected(null);
  }, [tab, filters.search, filters.action, filters.entityType, filters.emailType, filters.status, filters.actorId, filters.fromDate, filters.toDate]);

  const summaryStats = useMemo(() => {
    if (tab !== 'email') return null;
    const sent = rows.filter((r) => r.status === 'sent').length;
    const failed = rows.filter((r) => r.status === 'failed').length;
    const skipped = rows.filter((r) => r.status === 'skipped').length;
    return { sent, failed, skipped };
  }, [tab, rows]);

  const resetFilters = () => {
    setFilters({
      search: '',
      action: '',
      entityType: '',
      emailType: '',
      status: '',
      actorId: '',
      fromDate: '',
      toDate: '',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-600 mt-1">
          Comprehensive activity history for all users, plus email delivery success and failure records.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab('activity')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'activity' ? 'bg-purple-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Activity className="w-4 h-4" />
          Activity Log
        </button>
        <button
          type="button"
          onClick={() => setTab('email')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'email' ? 'bg-purple-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Mail className="w-4 h-4" />
          Email Log
        </button>
      </div>

      {tab === 'email' && summaryStats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Sent (this page)</p>
              <p className="text-xl font-bold text-gray-900">{summaryStats.sent}</p>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3">
            <XCircle className="w-8 h-8 text-red-500" />
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Failed (this page)</p>
              <p className="text-xl font-bold text-gray-900">{summaryStats.failed}</p>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Skipped (this page)</p>
              <p className="text-xl font-bold text-gray-900">{summaryStats.skipped}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder={tab === 'activity' ? 'Search summary, user, or entity…' : 'Search recipient, subject, or sender…'}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <input
            type="date"
            value={filters.fromDate}
            onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <input
            type="date"
            value={filters.toDate}
            onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          {tab === 'activity' ? (
            <>
              <select
                value={filters.action}
                onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All actions</option>
                {filterOptions.actions.map((action) => (
                  <option key={action} value={action}>{formatAuditAction(action)}</option>
                ))}
              </select>
              <select
                value={filters.entityType}
                onChange={(e) => setFilters((f) => ({ ...f, entityType: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All modules</option>
                {filterOptions.entityTypes.map((type) => (
                  <option key={type} value={type}>{formatEntityType(type)}</option>
                ))}
              </select>
              <select
                value={filters.actorId}
                onChange={(e) => setFilters((f) => ({ ...f, actorId: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All users</option>
                {filterOptions.actors.map((actor) => (
                  <option key={actor.id} value={actor.id}>{actor.name}</option>
                ))}
              </select>
              <select
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All statuses</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
              </select>
            </>
          ) : (
            <>
              <select
                value={filters.emailType}
                onChange={(e) => setFilters((f) => ({ ...f, emailType: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All email types</option>
                {filterOptions.emailTypes.map((type) => (
                  <option key={type} value={type}>{formatEmailType(type)}</option>
                ))}
              </select>
              <select
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All statuses</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="skipped">Skipped</option>
              </select>
            </>
          )}
          <button
            type="button"
            onClick={resetFilters}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Reset filters
          </button>
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {tab === 'activity' ? (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">When</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Module</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Summary</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">When</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Recipient</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Subject</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Triggered By</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                      No log entries found for the selected filters.
                    </td>
                  </tr>
                ) : tab === 'activity' ? (
                  rows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => setSelected({ type: 'activity', row })}
                      className="hover:bg-purple-50 cursor-pointer"
                    >
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {fmtDateTime(row.created_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <p className="font-medium text-gray-900">{row.actor_name}</p>
                        <p className="text-xs text-gray-500 capitalize">{row.actor_role}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatAuditAction(row.action)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatEntityType(row.entity_type)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">{row.summary}</td>
                      <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                    </tr>
                  ))
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => setSelected({ type: 'email', row })}
                      className="hover:bg-purple-50 cursor-pointer"
                    >
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{fmtDateTime(row.created_at)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatEmailType(row.email_type)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{row.recipient}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">{row.subject || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.triggered_by_name || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              {total} total · Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-white"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-white"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <DetailDrawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.type === 'email' ? 'Email Log Details' : 'Activity Details'}
      >
        {selected?.type === 'activity' && selected.row && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-gray-500">Timestamp</p><p className="font-medium">{fmtDateTime(selected.row.created_at)}</p></div>
              <div><p className="text-gray-500">Status</p><StatusBadge status={selected.row.status} /></div>
              <div><p className="text-gray-500">User</p><p className="font-medium">{selected.row.actor_name}</p></div>
              <div><p className="text-gray-500">Role</p><p className="font-medium capitalize">{selected.row.actor_role}</p></div>
              <div><p className="text-gray-500">Action</p><p className="font-medium">{formatAuditAction(selected.row.action)}</p></div>
              <div><p className="text-gray-500">Module</p><p className="font-medium">{formatEntityType(selected.row.entity_type)}</p></div>
              {selected.row.entity_label && (
                <div className="col-span-2"><p className="text-gray-500">Entity</p><p className="font-medium">{selected.row.entity_label}</p></div>
              )}
              {selected.row.entity_id && (
                <div className="col-span-2"><p className="text-gray-500">Entity ID</p><p className="font-medium font-mono text-xs">{selected.row.entity_id}</p></div>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Summary</p>
              <p className="text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-lg p-3">{selected.row.summary}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">Full details</p>
              <JsonBlock data={selected.row.details} />
            </div>
          </div>
        )}

        {selected?.type === 'email' && selected.row && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-gray-500">Timestamp</p><p className="font-medium">{fmtDateTime(selected.row.created_at)}</p></div>
              <div><p className="text-gray-500">Status</p><StatusBadge status={selected.row.status} /></div>
              <div><p className="text-gray-500">Email type</p><p className="font-medium">{formatEmailType(selected.row.email_type)}</p></div>
              <div><p className="text-gray-500">Recipient</p><p className="font-medium break-all">{selected.row.recipient}</p></div>
              <div className="col-span-2"><p className="text-gray-500">Subject</p><p className="font-medium">{selected.row.subject || '—'}</p></div>
              {selected.row.message_id && (
                <div className="col-span-2"><p className="text-gray-500">Message ID</p><p className="font-medium font-mono text-xs break-all">{selected.row.message_id}</p></div>
              )}
              {selected.row.error_message && (
                <div className="col-span-2"><p className="text-gray-500">Error</p><p className="font-medium text-red-700">{selected.row.error_message}</p></div>
              )}
              {selected.row.triggered_by_name && (
                <div className="col-span-2"><p className="text-gray-500">Triggered by</p><p className="font-medium">{selected.row.triggered_by_name}</p></div>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">Metadata</p>
              <JsonBlock data={selected.row.metadata} />
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}
