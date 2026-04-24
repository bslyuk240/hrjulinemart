import nodemailer from 'nodemailer';

const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

const getEnv = (name, fallback = '') => process.env[name] || fallback;

const getEmailConfig = () => {
  const host = getEnv('SMTP_HOST', getEnv('VITE_SMTP_HOST', 'smtp.gmail.com'));
  const port = parseInt(getEnv('SMTP_PORT', getEnv('VITE_SMTP_PORT', '587')), 10);
  const user = getEnv('SMTP_USER', getEnv('VITE_SMTP_USER'));
  const pass = getEnv('SMTP_PASSWORD', getEnv('VITE_SMTP_PASSWORD'));

  return {
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  };
};

const COMPANY_NAME = getEnv('COMPANY_NAME', getEnv('VITE_COMPANY_NAME', 'JulineMart'));
const RAW_APP_URL = getEnv('APP_URL', getEnv('VITE_APP_URL', 'http://localhost:5173'));

/** Absolute site URL for links in email (relative or scheme-less URLs break many clients). */
const normalizePublicAppUrl = (raw) => {
  let u = String(raw || '').trim();
  if (!u) return 'http://localhost:5173';
  u = u.replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(u)) {
    u = `https://${u}`;
  }
  return u;
};

const APP_URL = normalizePublicAppUrl(RAW_APP_URL);

const escapeHtml = (s) => {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const publicReferenceUrl = (token) => `${APP_URL}/reference/${encodeURIComponent(token)}`;

const FROM_EMAIL = getEnv('SMTP_USER', getEnv('VITE_SMTP_USER'));

const ensureEmailConfig = () => {
  const config = getEmailConfig();
  if (!config.auth.user || !config.auth.pass) {
    return 'SMTP credentials are missing. Set SMTP_USER and SMTP_PASSWORD.';
  }
  return null;
};

const buildOnboardingEmail = (candidateName, position, onboardingToken) => {
  const onboardingUrl = `${APP_URL}/onboarding/${onboardingToken}`;
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 14);
  const formattedExpiry = expiryDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return {
    subject: `Welcome to ${COMPANY_NAME} - Complete Your Onboarding`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${COMPANY_NAME}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden;">
    <div style="background: #4f46e5; color: #fff; padding: 20px; text-align: center;">
      <h1 style="margin: 0;">Welcome to ${COMPANY_NAME}</h1>
    </div>
    <div style="padding: 20px;">
      <p>Dear ${candidateName},</p>
      <p>We are excited to have you join our team as <strong>${position}</strong>.</p>
      <p>Please use the link below to complete your onboarding form:</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${onboardingUrl}" style="display: inline-block; padding: 12px 20px; background: #4f46e5; color: #fff; text-decoration: none; border-radius: 6px;">Start Onboarding</a>
      </p>
      <p><strong>Important:</strong> This link will expire on ${formattedExpiry}.</p>
      <p>If you have any questions, please contact HR.</p>
      <p>Best regards,<br>HR Team<br>${COMPANY_NAME}</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
  };
};

const buildReferenceRequestEmail = (refereeName, candidateName, position, referenceToken) => {
  const referenceUrl = publicReferenceUrl(referenceToken);
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 14);
  const formattedExpiry = expiryDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const rn = escapeHtml(refereeName);
  const cn = escapeHtml(candidateName);
  const pos = escapeHtml(position);
  const co = escapeHtml(COMPANY_NAME);

  const text = [
    `Dear ${refereeName},`,
    '',
    `${candidateName} has applied for the position of ${position} with ${COMPANY_NAME} and has listed you as a referee.`,
    '',
    'Complete the reference form by opening this link in your browser:',
    referenceUrl,
    '',
    `This link will expire on ${formattedExpiry}.`,
    '',
    'If the link does not open, copy the entire line above into your browser address bar.',
    '',
    `Thank you,`,
    `HR Team — ${COMPANY_NAME}`,
  ].join('\n');

  return {
    subject: `Employment Reference Request - ${candidateName}`,
    text,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reference Request</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden;">
    <div style="background: #4f46e5; color: #fff; padding: 20px; text-align: center;">
      <h1 style="margin: 0;">Reference Request</h1>
    </div>
    <div style="padding: 20px;">
      <p>Dear ${rn},</p>
      <p>${cn} has applied for the position of <strong>${pos}</strong> with ${co} and has listed you as a referee.</p>
      <p>Please complete the reference form using the link below:</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${referenceUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 20px; background: #4f46e5; color: #fff !important; text-decoration: none; border-radius: 6px;">Complete Reference Form</a>
      </p>
      <p style="word-break: break-all; font-size: 14px; color: #444;">If the button does not open, tap or copy this link:<br><a href="${referenceUrl}" target="_blank" rel="noopener noreferrer">${referenceUrl}</a></p>
      <p><strong>Important:</strong> This link will expire on ${formattedExpiry}.</p>
      <p>Thank you for your time and assistance.</p>
      <p>Best regards,<br>HR Team<br>${co}</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
  };
};

const buildReferenceReminderEmail = (refereeName, candidateName, position, referenceToken) => {
  const referenceUrl = publicReferenceUrl(referenceToken);
  const rn = escapeHtml(refereeName);
  const cn = escapeHtml(candidateName);
  const pos = escapeHtml(position);
  const co = escapeHtml(COMPANY_NAME);

  const text = [
    `Dear ${refereeName},`,
    '',
    `This is a reminder to complete the reference for ${candidateName} (${position}).`,
    '',
    referenceUrl,
    '',
    `Thank you,`,
    `HR Team — ${COMPANY_NAME}`,
  ].join('\n');

  return {
    subject: `Reminder: Reference Request for ${candidateName}`,
    text,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Reference Reminder</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; padding: 20px; border-radius: 8px;">
    <p>Dear ${rn},</p>
    <p>This is a reminder to complete the reference for <strong>${cn}</strong> (${pos}).</p>
    <p style="text-align: center; margin: 24px 0;">
      <a href="${referenceUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 20px; background: #4f46e5; color: #fff !important; text-decoration: none; border-radius: 6px;">Complete Reference Form</a>
    </p>
    <p style="word-break: break-all; font-size: 14px; color: #444;">Or open: <a href="${referenceUrl}" target="_blank" rel="noopener noreferrer">${referenceUrl}</a></p>
    <p>Thank you for your help.</p>
    <p>Best regards,<br>HR Team<br>${co}</p>
  </div>
</body>
</html>
    `.trim(),
  };
};

const buildOnboardingApprovedEmail = (candidateName, position, employeeCode) => ({
  subject: `Onboarding Approved - Welcome to ${COMPANY_NAME}`,
  html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Onboarding Approved</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden;">
    <div style="background: #16a34a; color: #fff; padding: 20px; text-align: center;">
      <h1 style="margin: 0;">Onboarding Approved</h1>
    </div>
    <div style="padding: 20px;">
      <p>Dear ${candidateName},</p>
      <p>Congratulations! Your onboarding for the role of <strong>${position}</strong> has been approved.</p>
      <p>Your employee code is <strong>${employeeCode}</strong>.</p>
      <p>Our HR team will contact you with your start details and next steps.</p>
      <p>Best regards,<br>HR Team<br>${COMPANY_NAME}</p>
    </div>
  </div>
</body>
</html>
  `.trim(),
});

// ── Announcement (→ individual employee) ───────────────────────────────────
// NOTE: builder defined after helpers — hoisted here via forward ref in handler

// ── Shared layout helpers ───────────────────────────────────────────────────
const fmtDate = (d) => {
  try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch { return d || ''; }
};

const wrap = (headerBg, title, subtitle, body) => `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f5f5f5;padding:20px;margin:0;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <div style="background:${headerBg};color:#fff;padding:24px 20px;text-align:center;">
      <h1 style="margin:0;font-size:22px;">${title}</h1>
      ${subtitle ? `<p style="margin:6px 0 0;opacity:.9;font-size:14px;">${subtitle}</p>` : ''}
    </div>
    <div style="padding:24px 28px;">${body}</div>
    <div style="background:#f9fafb;padding:14px 28px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:12px;color:#6b7280;">© ${new Date().getFullYear()} ${COMPANY_NAME} HR System &nbsp;|&nbsp; Automated message — please do not reply.</p>
    </div>
  </div>
</body>
</html>`;

const btn = (url, label, color = '#4f46e5') =>
  `<p style="text-align:center;margin:24px 0;">
    <a href="${url}" style="display:inline-block;padding:12px 28px;background:${color};color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">${label}</a>
  </p>`;

const infoRow = (label, value) =>
  `<tr>
    <td style="padding:8px 12px;font-weight:bold;color:#374151;white-space:nowrap;width:42%;border-bottom:1px solid #e5e7eb;">${label}</td>
    <td style="padding:8px 12px;color:#374151;border-bottom:1px solid #e5e7eb;">${value}</td>
  </tr>`;

const infoTable = (rows) =>
  `<table cellpadding="0" cellspacing="0" style="width:100%;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;border-collapse:collapse;margin:16px 0;">${rows}</table>`;

// ── Leave Submitted (→ managers / admins) ───────────────────────────────────
const buildLeaveSubmittedEmail = (employeeName, leaveType, startDate, endDate, days, reason) => ({
  subject: `Leave Request – ${employeeName} (${leaveType}, ${days} day${days !== 1 ? 's' : ''})`,
  html: wrap(
    '#d97706', 'New Leave Request', `${COMPANY_NAME} HR · Action Required`,
    `<p>A leave request has been submitted and requires your review.</p>
    ${infoTable(`
      ${infoRow('Employee', employeeName)}
      ${infoRow('Leave Type', leaveType)}
      ${infoRow('From', fmtDate(startDate))}
      ${infoRow('To', fmtDate(endDate))}
      ${infoRow('Duration', `${days} day${days !== 1 ? 's' : ''}`)}
      ${reason ? infoRow('Reason', reason) : ''}
    `)}
    ${btn(`${APP_URL}/leave`, 'Review Leave Request', '#d97706')}
    <p style="color:#6b7280;font-size:13px;">Log in to approve or reject this request.</p>`
  ),
});

// ── Leave Approved (→ employee) ─────────────────────────────────────────────
const buildLeaveApprovedEmail = (employeeName, leaveType, startDate, endDate, days) => ({
  subject: `Your Leave Request Has Been Approved`,
  html: wrap(
    '#16a34a', 'Leave Request Approved ✓', `${COMPANY_NAME} HR`,
    `<p>Dear ${employeeName},</p>
    <p>Great news! Your leave request has been <strong>approved</strong>.</p>
    ${infoTable(`
      ${infoRow('Leave Type', leaveType)}
      ${infoRow('From', fmtDate(startDate))}
      ${infoRow('To', fmtDate(endDate))}
      ${infoRow('Duration', `${days} day${days !== 1 ? 's' : ''}`)}
    `)}
    ${btn(`${APP_URL}/leave`, 'View Leave Details', '#16a34a')}
    <p>If you have any questions, please contact the HR team.</p>
    <p>Best regards,<br>HR Team<br>${COMPANY_NAME}</p>`
  ),
});

// ── Leave Rejected (→ employee) ─────────────────────────────────────────────
const buildLeaveRejectedEmail = (employeeName, leaveType, startDate, endDate) => ({
  subject: `Update on Your Leave Request`,
  html: wrap(
    '#dc2626', 'Leave Request Not Approved', `${COMPANY_NAME} HR`,
    `<p>Dear ${employeeName},</p>
    <p>We regret to inform you that your leave request has <strong>not been approved</strong> at this time.</p>
    ${infoTable(`
      ${infoRow('Leave Type', leaveType)}
      ${infoRow('From', fmtDate(startDate))}
      ${infoRow('To', fmtDate(endDate))}
    `)}
    <p>If you'd like to discuss this decision or submit a revised request, please reach out to HR or your line manager.</p>
    ${btn(`${APP_URL}/leave`, 'View Leave History', '#4f46e5')}
    <p>Best regards,<br>HR Team<br>${COMPANY_NAME}</p>`
  ),
});

// ── Payslip Ready (→ employee) ──────────────────────────────────────────────
const buildPayslipReadyEmail = (employeeName, month, year, netSalary, payslipNo) => {
  const fmtMoney = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
  return {
    subject: `Your Payslip for ${month} ${year} is Ready`,
    html: wrap(
      '#4f46e5', 'Payslip Available', `${month} ${year} · ${COMPANY_NAME} Payroll`,
      `<p>Dear ${employeeName},</p>
      <p>Your payslip for <strong>${month} ${year}</strong> has been generated and is now available in the HR portal.</p>
      ${infoTable(`
        ${infoRow('Payslip No.', payslipNo || '—')}
        ${infoRow('Pay Period', `${month} ${year}`)}
        ${infoRow('Net Pay', `<strong style="color:#16a34a;font-size:16px;">${fmtMoney(netSalary)}</strong>`)}
      `)}
      ${btn(`${APP_URL}/payslips`, 'View & Download Payslip', '#4f46e5')}
      <p style="color:#6b7280;font-size:13px;">Log in to the HR portal to view the full salary breakdown and download your payslip.</p>
      <p>Best regards,<br>HR Team<br>${COMPANY_NAME}</p>`
    ),
  };
};

// ── Resignation Submitted (→ managers / admins) ─────────────────────────────
const buildResignationSubmittedEmail = (employeeName, position, department, lastWorkingDate, reason) => ({
  subject: `Resignation Notice – ${employeeName}`,
  html: wrap(
    '#b91c1c', 'Resignation Notice Received', `${COMPANY_NAME} HR · Requires Attention`,
    `<p>A resignation notice has been submitted and requires your attention.</p>
    ${infoTable(`
      ${infoRow('Employee', employeeName)}
      ${position ? infoRow('Position', position) : ''}
      ${department ? infoRow('Department', department) : ''}
      ${lastWorkingDate ? infoRow('Last Working Date', fmtDate(lastWorkingDate)) : ''}
      ${reason ? infoRow('Reason', reason) : ''}
    `)}
    ${btn(`${APP_URL}/resignation`, 'Review Resignation', '#b91c1c')}
    <p style="color:#6b7280;font-size:13px;">Log in to the HR system to review and process this resignation.</p>`
  ),
});

// ── Resignation Approved (→ employee) ──────────────────────────────────────
const buildResignationApprovedEmail = (employeeName, lastWorkingDate) => ({
  subject: `Your Resignation Has Been Accepted`,
  html: wrap(
    '#374151', 'Resignation Accepted', `${COMPANY_NAME} HR`,
    `<p>Dear ${employeeName},</p>
    <p>We have accepted your resignation. We sincerely appreciate the time and dedication you have given to ${COMPANY_NAME}.</p>
    ${lastWorkingDate ? infoTable(infoRow('Last Working Date', fmtDate(lastWorkingDate))) : ''}
    <p>Our HR team will be in touch regarding your exit formalities, final settlement, and any documentation required.</p>
    <p>We wish you all the very best in your future endeavours.</p>
    <p>Best regards,<br>HR Team<br>${COMPANY_NAME}</p>`
  ),
});

// ── Announcement (→ individual employee) ───────────────────────────────────
const buildAnnouncementEmail = (employeeName, title, body, priority, senderName) => {
  const isUrgent = priority === 'urgent';
  const headerBg = isUrgent ? '#b91c1c' : '#4f46e5';
  const urgentBadge = isUrgent
    ? `<p style="display:inline-block;background:#fee2e2;color:#b91c1c;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:bold;margin-bottom:16px;">🔴 URGENT NOTICE</p>`
    : `<p style="display:inline-block;background:#ede9fe;color:#4f46e5;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:bold;margin-bottom:16px;">📢 ANNOUNCEMENT</p>`;

  // Convert newlines in body to <br> for HTML
  const htmlBody = String(body || '').replace(/\n/g, '<br>');

  return {
    subject: isUrgent ? `🔴 URGENT: ${title}` : `📢 ${title} — ${COMPANY_NAME} HR`,
    html: wrap(
      headerBg, title, `${COMPANY_NAME} · ${senderName || 'HR Department'}`,
      `${urgentBadge}
      <p>Dear ${employeeName},</p>
      <div style="background:#f9fafb;border-left:4px solid ${headerBg};padding:16px 20px;border-radius:0 6px 6px 0;margin:16px 0;line-height:1.8;">
        ${htmlBody}
      </div>
      ${btn(`${APP_URL}/announcements`, 'View in HR Portal', headerBg)}
      <p style="color:#6b7280;font-size:13px;">This message was sent to you via the ${COMPANY_NAME} HR System. Please do not reply to this email — contact HR directly for any queries.</p>`
    ),
  };
};

// ── Resignation Rejected (→ employee) ──────────────────────────────────────
const buildResignationRejectedEmail = (employeeName, comments) => ({
  subject: `Regarding Your Resignation Request`,
  html: wrap(
    '#4f46e5', 'Resignation Request Update', `${COMPANY_NAME} HR`,
    `<p>Dear ${employeeName},</p>
    <p>After careful consideration, your resignation request has <strong>not been accepted</strong> at this time.</p>
    ${comments
      ? `<div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:0 6px 6px 0;margin:16px 0;">
          <p style="margin:0;font-weight:bold;color:#92400e;">Comments from HR:</p>
          <p style="margin:8px 0 0;color:#78350f;">${comments}</p>
        </div>`
      : ''}
    <p>We encourage you to speak with the HR team or your line manager to discuss any concerns. We truly value your contribution to ${COMPANY_NAME}.</p>
    <p>Best regards,<br>HR Team<br>${COMPANY_NAME}</p>`
  ),
});

// ───────────────────────────────────────────────────────────────────────────

const sendMail = async ({ to, subject, html, text }) => {
  const transporter = nodemailer.createTransport(getEmailConfig());
  const info = await transporter.sendMail({
    from: `"${COMPANY_NAME} HR" <${FROM_EMAIL}>`,
    to,
    subject,
    html,
    ...(text ? { text } : {}),
  });
  return info;
};

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { success: false, error: 'Method not allowed.' });
  }

  const configError = ensureEmailConfig();
  if (configError) {
    return jsonResponse(500, { success: false, error: configError });
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    payload = {};
  }

  const path = event.path || '';

  try {
    if (path.endsWith('/onboarding')) {
      const { candidateEmail, candidateName, position, onboardingToken } = payload;
      if (!candidateEmail || !candidateName || !position || !onboardingToken) {
        return jsonResponse(400, { success: false, error: 'Missing required fields.' });
      }
      const { subject, html } = buildOnboardingEmail(candidateName, position, onboardingToken);
      const info = await sendMail({ to: candidateEmail, subject, html });
      return jsonResponse(200, { success: true, messageId: info.messageId, message: 'Onboarding email sent successfully.' });
    }

    if (path.endsWith('/reference-request')) {
      const { refereeEmail, refereeName, candidateName, position, referenceToken } = payload;
      if (!refereeEmail || !refereeName || !candidateName || !position || !referenceToken) {
        return jsonResponse(400, { success: false, error: 'Missing required fields.' });
      }
      const { subject, html, text } = buildReferenceRequestEmail(refereeName, candidateName, position, referenceToken);
      const info = await sendMail({ to: refereeEmail, subject, html, text });
      return jsonResponse(200, { success: true, messageId: info.messageId, message: 'Reference request sent successfully.' });
    }

    if (path.endsWith('/reference-reminder')) {
      const { refereeEmail, refereeName, candidateName, position, referenceToken } = payload;
      if (!refereeEmail || !refereeName || !candidateName || !position || !referenceToken) {
        return jsonResponse(400, { success: false, error: 'Missing required fields.' });
      }
      const { subject, html, text } = buildReferenceReminderEmail(refereeName, candidateName, position, referenceToken);
      const info = await sendMail({ to: refereeEmail, subject, html, text });
      return jsonResponse(200, { success: true, messageId: info.messageId, message: 'Reference reminder sent successfully.' });
    }

    if (path.endsWith('/test')) {
      const { recipientEmail } = payload;
      if (!recipientEmail) {
        return jsonResponse(400, { success: false, error: 'Missing recipientEmail.' });
      }
      const transporter = nodemailer.createTransport(getEmailConfig());
      await transporter.verify();
      const info = await transporter.sendMail({
        from: FROM_EMAIL,
        to: recipientEmail,
        subject: 'Test Email - HR System',
        text: 'This is a test email to verify SMTP settings.',
      });
      return jsonResponse(200, { success: true, messageId: info.messageId, message: 'Email configuration is working.' });
    }

    if (path.endsWith('/onboarding-approved')) {
      const { candidateEmail, candidateName, position, employeeCode } = payload;
      if (!candidateEmail || !candidateName || !position || !employeeCode) {
        return jsonResponse(400, { success: false, error: 'Missing required fields.' });
      }
      const { subject, html } = buildOnboardingApprovedEmail(candidateName, position, employeeCode);
      const info = await sendMail({ to: candidateEmail, subject, html });
      return jsonResponse(200, { success: true, messageId: info.messageId, message: 'Onboarding approval email sent successfully.' });
    }

    // ── Leave Submitted (to managers/admins) ───────────────────────────────
    if (path.endsWith('/leave-submitted')) {
      const { to, employeeName, leaveType, startDate, endDate, days, reason } = payload;
      if (!employeeName || !leaveType || !startDate || !endDate) {
        return jsonResponse(400, { success: false, error: 'Missing required fields.' });
      }
      const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
      if (recipients.length === 0) {
        return jsonResponse(200, { success: true, message: 'No recipients — skipped.' });
      }
      const { subject, html } = buildLeaveSubmittedEmail(employeeName, leaveType, startDate, endDate, days, reason);
      const info = await sendMail({ to: recipients, subject, html });
      return jsonResponse(200, { success: true, messageId: info.messageId });
    }

    // ── Leave Approved (to employee) ───────────────────────────────────────
    if (path.endsWith('/leave-approved')) {
      const { to, employeeName, leaveType, startDate, endDate, days } = payload;
      if (!to || !employeeName) {
        return jsonResponse(400, { success: false, error: 'Missing required fields.' });
      }
      const { subject, html } = buildLeaveApprovedEmail(employeeName, leaveType, startDate, endDate, days);
      const info = await sendMail({ to, subject, html });
      return jsonResponse(200, { success: true, messageId: info.messageId });
    }

    // ── Leave Rejected (to employee) ───────────────────────────────────────
    if (path.endsWith('/leave-rejected')) {
      const { to, employeeName, leaveType, startDate, endDate } = payload;
      if (!to || !employeeName) {
        return jsonResponse(400, { success: false, error: 'Missing required fields.' });
      }
      const { subject, html } = buildLeaveRejectedEmail(employeeName, leaveType, startDate, endDate);
      const info = await sendMail({ to, subject, html });
      return jsonResponse(200, { success: true, messageId: info.messageId });
    }

    // ── Payslip Ready (to employee) ────────────────────────────────────────
    if (path.endsWith('/payslip-ready')) {
      const { to, employeeName, month, year, netSalary, payslipNo } = payload;
      if (!to || !employeeName || !month || !year) {
        return jsonResponse(400, { success: false, error: 'Missing required fields.' });
      }
      const { subject, html } = buildPayslipReadyEmail(employeeName, month, year, netSalary, payslipNo);
      const info = await sendMail({ to, subject, html });
      return jsonResponse(200, { success: true, messageId: info.messageId });
    }

    // ── Resignation Submitted (to managers/admins) ─────────────────────────
    if (path.endsWith('/resignation-submitted')) {
      const { to, employeeName, position, department, lastWorkingDate, reason } = payload;
      if (!employeeName) {
        return jsonResponse(400, { success: false, error: 'Missing required fields.' });
      }
      const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
      if (recipients.length === 0) {
        return jsonResponse(200, { success: true, message: 'No recipients — skipped.' });
      }
      const { subject, html } = buildResignationSubmittedEmail(employeeName, position, department, lastWorkingDate, reason);
      const info = await sendMail({ to: recipients, subject, html });
      return jsonResponse(200, { success: true, messageId: info.messageId });
    }

    // ── Resignation Approved (to employee) ────────────────────────────────
    if (path.endsWith('/resignation-approved')) {
      const { to, employeeName, lastWorkingDate } = payload;
      if (!to || !employeeName) {
        return jsonResponse(400, { success: false, error: 'Missing required fields.' });
      }
      const { subject, html } = buildResignationApprovedEmail(employeeName, lastWorkingDate);
      const info = await sendMail({ to, subject, html });
      return jsonResponse(200, { success: true, messageId: info.messageId });
    }

    // ── Announcement (one employee per call) ──────────────────────────────
    if (path.endsWith('/announcement')) {
      const { to, employeeName, title, body, priority, senderName } = payload;
      if (!to || !title || !body) {
        return jsonResponse(400, { success: false, error: 'Missing required fields.' });
      }
      const { subject, html } = buildAnnouncementEmail(employeeName || 'Team Member', title, body, priority, senderName);
      const info = await sendMail({ to, subject, html });
      return jsonResponse(200, { success: true, messageId: info.messageId });
    }

    // ── Resignation Rejected (to employee) ────────────────────────────────
    if (path.endsWith('/resignation-rejected')) {
      const { to, employeeName, comments } = payload;
      if (!to || !employeeName) {
        return jsonResponse(400, { success: false, error: 'Missing required fields.' });
      }
      const { subject, html } = buildResignationRejectedEmail(employeeName, comments);
      const info = await sendMail({ to, subject, html });
      return jsonResponse(200, { success: true, messageId: info.messageId });
    }

    return jsonResponse(404, { success: false, error: 'Endpoint not found.' });
  } catch (error) {
    console.error('Email function error:', error);
    return jsonResponse(500, { success: false, error: error.message || 'Failed to send email.' });
  }
};
