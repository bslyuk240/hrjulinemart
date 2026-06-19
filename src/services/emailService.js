const API_BASE_URL = import.meta.env.VITE_API_URL
  || (import.meta.env.PROD ? '/.netlify/functions' : '/api');

const buildApiUrl = (path) => `${API_BASE_URL}${path}`;

const emailPathToType = (path) => path.replace(/^\/email\//, '');

const postJson = async (path, payload) => {
  const response = await fetch(buildApiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const errorMsg = data.error || 'Failed to send email.';
    import('./auditLogService').then(({ logAudit, AUDIT_ACTIONS, AUDIT_ENTITIES }) => {
      logAudit({
        action: AUDIT_ACTIONS.SEND,
        entityType: AUDIT_ENTITIES.EMAIL,
        entityLabel: emailPathToType(path),
        summary: `Email send failed: ${emailPathToType(path)}`,
        details: { path, error: errorMsg, recipient: payload.to || payload.candidateEmail || payload.refereeEmail },
        status: 'failed',
      }).catch(() => {});
    }).catch(() => {});
    return {
      success: false,
      error: errorMsg,
    };
  }

  return data;
};

export const sendOnboardingEmail = async (
  candidateEmail,
  candidateName,
  position,
  onboardingToken
) => postJson('/email/onboarding', {
  candidateEmail,
  candidateName,
  position,
  onboardingToken,
});

export const sendReferenceRequestEmail = async (
  refereeEmail,
  refereeName,
  candidateName,
  position,
  referenceToken
) => postJson('/email/reference-request', {
  refereeEmail,
  refereeName,
  candidateName,
  position,
  referenceToken,
});

export const sendReferenceReminderEmail = async (
  refereeEmail,
  refereeName,
  candidateName,
  position,
  referenceToken
) => postJson('/email/reference-reminder', {
  refereeEmail,
  refereeName,
  candidateName,
  position,
  referenceToken,
});

export const testEmailConfiguration = async (testRecipient) => postJson('/email/test', {
  recipientEmail: testRecipient,
});

// ── Leave notifications ─────────────────────────────────────────────────────

/** to: string[] — manager / admin emails */
export const sendLeaveSubmittedEmail = (to, employeeName, leaveType, startDate, endDate, days, reason) =>
  postJson('/email/leave-submitted', { to, employeeName, leaveType, startDate, endDate, days, reason });

/** to: string — employee email */
export const sendLeaveApprovedEmail = (to, employeeName, leaveType, startDate, endDate, days) =>
  postJson('/email/leave-approved', { to, employeeName, leaveType, startDate, endDate, days });

/** to: string — employee email */
export const sendLeaveRejectedEmail = (to, employeeName, leaveType, startDate, endDate) =>
  postJson('/email/leave-rejected', { to, employeeName, leaveType, startDate, endDate });

// ── Payroll notification ────────────────────────────────────────────────────

/** to: string — employee email */
export const sendPayslipReadyEmail = (to, employeeName, month, year, netSalary, payslipNo) =>
  postJson('/email/payslip-ready', { to, employeeName, month, year, netSalary, payslipNo });

// ── Resignation notifications ───────────────────────────────────────────────

/** to: string[] — manager / admin emails */
export const sendResignationSubmittedEmail = (to, employeeName, position, department, lastWorkingDate, reason) =>
  postJson('/email/resignation-submitted', { to, employeeName, position, department, lastWorkingDate, reason });

/** to: string — employee email */
export const sendResignationApprovedEmail = (to, employeeName, lastWorkingDate) =>
  postJson('/email/resignation-approved', { to, employeeName, lastWorkingDate });

/** to: string — employee email */
export const sendResignationRejectedEmail = (to, employeeName, comments) =>
  postJson('/email/resignation-rejected', { to, employeeName, comments });

// ── Announcement ────────────────────────────────────────────────────────────

/** to: string — one employee email at a time (caller loops) */
export const sendAnnouncementEmail = (to, employeeName, title, body, priority, senderName) =>
  postJson('/email/announcement', { to, employeeName, title, body, priority, senderName });

export const sendOnboardingApprovedEmail = async (
  candidateEmail,
  candidateName,
  position,
  employeeCode
) => postJson('/email/onboarding-approved', {
  candidateEmail,
  candidateName,
  position,
  employeeCode,
});

// ── Training notifications ────────────────────────────────────────────────────

/** to: string — employee email */
export const sendTrainingCourseAssignedEmail = (
  to,
  employeeName,
  courseTitle,
  dueDate,
  assignedByName
) => postJson('/email/training-course-assigned', {
  to,
  employeeName,
  courseTitle,
  dueDate,
  assignedByName,
});
