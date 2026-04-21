import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  sendAnnouncementBlast,
  notifyAnnouncementInApp,
  getEmployeeDepartments,
} from '../services/announcementService';
import {
  Megaphone,
  Send,
  Trash2,
  Pin,
  PinOff,
  AlertCircle,
  Users,
  Building,
  Clock,
  CheckCircle,
  Loader2,
  ChevronDown,
} from 'lucide-react';

const PRIORITY_OPTS = [
  { value: 'normal', label: 'Normal', color: 'bg-blue-100 text-blue-700' },
  { value: 'urgent', label: '🔴 Urgent', color: 'bg-red-100 text-red-700' },
];

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

export default function Announcements() {
  const { user } = useAuth();
  const { showSuccess, showError } = useApp();

  const [announcements, setAnnouncements] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null); // { sent, failed }

  const [form, setForm] = useState({
    title: '',
    body: '',
    priority: 'normal',
    target_department: '',
    pinned: false,
  });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const [annRes, deptRes] = await Promise.all([
      getAllAnnouncements(),
      getEmployeeDepartments(),
    ]);
    if (annRes.success) setAnnouncements(annRes.data);
    setDepartments(deptRes || []);
    setLoading(false);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      showError('Please fill in both the title and body.');
      return;
    }

    setSending(true);
    setSendResult(null);

    const payload = {
      title: form.title.trim(),
      body: form.body.trim(),
      priority: form.priority,
      target_department: form.target_department || null,
      pinned: form.pinned,
      created_by: user?.name || user?.email || 'Admin',
    };

    // 1. Save to DB
    const created = await createAnnouncement(payload);
    if (!created.success) {
      showError('Failed to save announcement: ' + created.error);
      setSending(false);
      return;
    }

    const saved = created.data;

    // 2. Email blast + in-app notifications (parallel, non-blocking display)
    const [blastRes] = await Promise.all([
      sendAnnouncementBlast(saved),
      notifyAnnouncementInApp(saved).catch(() => {}),
    ]);

    setSendResult(blastRes);
    showSuccess(
      blastRes.success
        ? `Announcement sent to ${blastRes.sent} employee${blastRes.sent !== 1 ? 's' : ''}.`
        : 'Announcement saved but email delivery had issues.'
    );

    // Reset form & reload
    setForm({ title: '', body: '', priority: 'normal', target_department: '', pinned: false });
    await load();
    setSending(false);
  };

  const handleTogglePin = async (ann) => {
    const res = await updateAnnouncement(ann.id, { pinned: !ann.pinned });
    if (res.success) {
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === ann.id ? { ...a, pinned: !a.pinned } : a))
      );
      showSuccess(ann.pinned ? 'Announcement unpinned.' : 'Announcement pinned to dashboards.');
    } else {
      showError('Failed to update pin status.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement? This cannot be undone.')) return;
    const res = await deleteAnnouncement(id);
    if (res.success) {
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      showSuccess('Announcement deleted.');
    } else {
      showError('Failed to delete announcement.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
          <Megaphone className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Announcements</h1>
          <p className="text-sm text-gray-500 break-words">Compose and send notices to staff via email + in-app</p>
        </div>
      </div>

      {/* Composer */}
      <form onSubmit={handleSend} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-4 py-3 md:px-6 md:py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">New Announcement</h2>
        </div>
        <div className="p-4 md:p-6 space-y-4 md:space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Office Closure — Public Holiday"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              required
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Message *</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              placeholder="Write your announcement here…"
              rows={6}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none"
              required
            />
          </div>

          {/* Options row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
              <div className="flex gap-2">
                {PRIORITY_OPTS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, priority: opt.value }))}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                      form.priority === opt.value
                        ? opt.value === 'urgent'
                          ? 'bg-red-100 text-red-700 border-red-300'
                          : 'bg-purple-100 text-purple-700 border-purple-300'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Department */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <Building className="w-3.5 h-3.5 inline mr-1" />
                Target
              </label>
              <div className="relative">
                <select
                  value={form.target_department}
                  onChange={(e) => setForm((f) => ({ ...f, target_department: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm appearance-none bg-white"
                >
                  <option value="">All Staff</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Pin toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <Pin className="w-3.5 h-3.5 inline mr-1" />
                Pin to Dashboard
              </label>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, pinned: !f.pinned }))}
                className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium border transition-all ${
                  form.pinned
                    ? 'bg-amber-100 text-amber-700 border-amber-300'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {form.pinned ? '📌 Pinned' : 'Not pinned'}
              </button>
            </div>
          </div>

          {/* Target summary */}
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Users className="w-4 h-4" />
            <span>
              Sending to:{' '}
              <span className="font-medium text-gray-700">
                {form.target_department ? `${form.target_department} department` : 'All staff'}
              </span>
              {form.priority === 'urgent' && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                  <AlertCircle className="w-3 h-3 mr-1" /> Urgent
                </span>
              )}
            </span>
          </div>

          {/* Send result */}
          {sendResult && (
            <div className={`flex items-center space-x-2 p-3 rounded-xl text-sm ${
              sendResult.success ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
            }`}>
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>
                {sendResult.success
                  ? `✓ Delivered to ${sendResult.sent} employee${sendResult.sent !== 1 ? 's' : ''}`
                  : 'Saved, but some emails failed to deliver.'}
                {sendResult.failed > 0 && ` (${sendResult.failed} failed)`}
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={sending}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending…</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send Announcement</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* History */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 md:px-6 md:py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Sent Announcements</h2>
          <span className="text-sm text-gray-400">{announcements.length} total</span>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-purple-500" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No announcements sent yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {announcements.map((ann) => (
              <li key={ann.id} className="px-4 py-3 md:px-6 md:py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      {ann.pinned && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                          📌 Pinned
                        </span>
                      )}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        ann.priority === 'urgent'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {ann.priority === 'urgent' ? '🔴 Urgent' : 'Normal'}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">
                        <Building className="w-3 h-3 mr-1" />
                        {ann.target_department || 'All Staff'}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-800 text-sm md:text-base break-words">{ann.title}</p>
                    <p className="text-sm text-gray-500 line-clamp-2 mt-0.5 break-words">{ann.body}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />{fmtDate(ann.created_at)}
                      </span>
                      <span>By {ann.created_by}</span>
                    </div>
                  </div>

                  {/* Actions — stacked vertically so they never overflow */}
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleTogglePin(ann)}
                      title={ann.pinned ? 'Unpin' : 'Pin to dashboard'}
                      className={`p-2 rounded-lg transition-colors ${
                        ann.pinned
                          ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                          : 'text-gray-400 hover:bg-gray-100'
                      }`}
                    >
                      {ann.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(ann.id)}
                      title="Delete"
                      className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
