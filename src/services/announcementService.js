import { supabase } from './supabase';
import { sendAnnouncementEmail } from './emailService';

const TABLE = 'announcements';

// ── Read ────────────────────────────────────────────────────────────────────

export const getAllAnnouncements = async () => {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return { success: false, error: error.message };
  return { success: true, data: data || [] };
};

/**
 * Returns the newest pinned announcement visible to the given department.
 * Pass department=null to get any pinned announcement (admin view).
 */
export const getPinnedAnnouncement = async (department = null) => {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('pinned', true)
    .order('created_at', { ascending: false });

  if (error) return { success: false, error: error.message };

  const visible = (data || []).find(
    (a) => !a.target_department || a.target_department === department
  );
  return { success: true, data: visible || null };
};

/**
 * Returns announcements visible to the given employee department,
 * i.e. target_department IS NULL (all staff) or matches their dept.
 */
export const getAnnouncementsForDepartment = async (department) => {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) return { success: false, error: error.message };

  const visible = (data || []).filter(
    (a) => !a.target_department || a.target_department === department
  );
  return { success: true, data: visible };
};

// ── Write ───────────────────────────────────────────────────────────────────

export const createAnnouncement = async (announcement) => {
  const { data, error } = await supabase
    .from(TABLE)
    .insert([announcement])
    .select()
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
};

export const updateAnnouncement = async (id, updates) => {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
};

export const deleteAnnouncement = async (id) => {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
};

// ── Email blast ─────────────────────────────────────────────────────────────

/**
 * Fetch employee emails matching the target and send the announcement email.
 * Returns { sent: number, failed: number }.
 */
export const sendAnnouncementBlast = async (announcement) => {
  try {
    let query = supabase.from('employees').select('email, name, department');
    if (announcement.target_department) {
      query = query.eq('department', announcement.target_department);
    }
    const { data: employees } = await query;
    const targets = (employees || []).filter((e) => e.email);

    let sent = 0;
    let failed = 0;

    await Promise.all(
      targets.map(async (emp) => {
        try {
          await sendAnnouncementEmail(
            emp.email,
            emp.name,
            announcement.title,
            announcement.body,
            announcement.priority,
            announcement.created_by,
          );
          sent++;
        } catch {
          failed++;
        }
      })
    );

    return { success: true, sent, failed };
  } catch (err) {
    console.error('Announcement blast error:', err);
    return { success: false, error: err.message };
  }
};

// ── In-app notifications ────────────────────────────────────────────────────

/**
 * Batch-insert in-app notifications for all targeted employees.
 */
export const notifyAnnouncementInApp = async (announcement) => {
  try {
    let query = supabase.from('employees').select('id, department');
    if (announcement.target_department) {
      query = query.eq('department', announcement.target_department);
    }
    const { data: employees } = await query;
    if (!employees || employees.length === 0) return;

    const notifications = employees.map((emp) => ({
      user_id: emp.id,
      type: 'announcement',
      title: announcement.priority === 'urgent'
        ? `🔴 Urgent: ${announcement.title}`
        : `📢 ${announcement.title}`,
      message: announcement.body.substring(0, 120) + (announcement.body.length > 120 ? '…' : ''),
      data: { announcement_id: announcement.id },
      link: '/announcements',
      is_read: false,
      created_at: new Date().toISOString(),
    }));

    await supabase.from('notifications').insert(notifications);
  } catch (err) {
    console.warn('Announcement in-app notification error:', err);
  }
};

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Fetch all unique departments from the employees table. */
export const getEmployeeDepartments = async () => {
  const { data } = await supabase.from('employees').select('department');
  const depts = [...new Set((data || []).map((e) => e.department).filter(Boolean))].sort();
  return depts;
};
