import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { getAnnouncementsForDepartment } from '../services/announcementService';
import {
  Megaphone,
  Pin,
  AlertCircle,
  Clock,
  Building,
  Loader2,
} from 'lucide-react';

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

export default function StaffAnnouncements() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [department, setDepartment] = useState('');

  useEffect(() => {
    const fetchDeptAndAnnouncements = async () => {
      setLoading(true);
      let dept = '';

      // Get employee's department
      if (user?.id) {
        const { data: emp } = await supabase
          .from('employees')
          .select('department')
          .eq('id', user.id)
          .single();
        dept = emp?.department || '';
        setDepartment(dept);
      }

      const res = await getAnnouncementsForDepartment(dept);
      if (res.success) setAnnouncements(res.data);
      setLoading(false);
    };

    fetchDeptAndAnnouncements();
  }, [user]);

  const pinned = announcements.filter((a) => a.pinned);
  const rest = announcements.filter((a) => !a.pinned);

  return (
    <div className="max-w-3xl mx-auto space-y-5 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
          <Megaphone className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Announcements</h1>
          <p className="text-sm text-gray-500">
            Showing notices for{' '}
            <span className="font-medium text-gray-700">
              {department ? department : 'All Staff'}
            </span>
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <Megaphone className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="font-medium">No announcements yet</p>
          <p className="text-sm mt-1">Check back later for updates from HR.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pinned announcements */}
          {pinned.map((ann) => (
            <AnnouncementCard key={ann.id} ann={ann} />
          ))}

          {/* Divider if both sections exist */}
          {pinned.length > 0 && rest.length > 0 && (
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">Earlier</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
          )}

          {/* Rest */}
          {rest.map((ann) => (
            <AnnouncementCard key={ann.id} ann={ann} />
          ))}
        </div>
      )}
    </div>
  );
}

function AnnouncementCard({ ann }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = ann.body.length > 300;
  const displayBody = isLong && !expanded ? ann.body.substring(0, 300) + '…' : ann.body;

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
      ann.priority === 'urgent'
        ? 'border-red-200 shadow-red-50'
        : ann.pinned
        ? 'border-amber-200 shadow-amber-50'
        : 'border-gray-200'
    }`}>
      {/* Top accent bar */}
      <div className={`h-1 w-full ${
        ann.priority === 'urgent' ? 'bg-red-500' : ann.pinned ? 'bg-amber-400' : 'bg-purple-500'
      }`} />

      <div className="p-4 md:p-5">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {ann.pinned && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
              <Pin className="w-3 h-3" /> Pinned
            </span>
          )}
          {ann.priority === 'urgent' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
              <AlertCircle className="w-3 h-3" /> Urgent
            </span>
          )}
          {ann.target_department && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">
              <Building className="w-3 h-3" /> {ann.target_department}
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className={`font-bold text-gray-900 mb-2 ${
          ann.priority === 'urgent' ? 'text-red-900' : 'text-gray-900'
        } text-lg leading-snug`}>
          {ann.title}
        </h2>

        {/* Body */}
        <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{displayBody}</p>

        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-purple-600 text-sm font-medium hover:underline"
          >
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}

        {/* Footer */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            {fmtDate(ann.created_at)}
          </span>
          <span className="break-words">From: {ann.created_by}</span>
        </div>
      </div>
    </div>
  );
}
