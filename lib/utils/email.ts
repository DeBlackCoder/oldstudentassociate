import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.SMTP_FROM || 'RSSSOSAA <noreply@rsssosaa.org>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const LOGO_URL = `${APP_URL}/logo.png`;

export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  const safeUrl = resetUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Reset your RSSSOSAA password',
    text: `Reset your password using this link:\n${resetUrl}\n\nThe link expires in 30 minutes and can be used once. If you did not request it, ignore this email. Your password will remain unchanged.`,
    html: `<!DOCTYPE html><html><body style="margin:0;background:#f4f4f0;font-family:Arial,sans-serif">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
        <table width="100%" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden">
          ${emailHeader('Account recovery')}
          <tr><td style="padding:32px"><h1 style="font-size:23px;color:#121417">Reset your password</h1>
            <p style="font-size:14px;color:#555;line-height:1.7">Use the button below to choose a new password for your RSSSOSAA account.</p>
            <a href="${safeUrl}" style="display:inline-block;background:#1a472a;color:#fff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:bold">Choose a new password</a>
            <p style="font-size:13px;color:#777;line-height:1.7">This link expires in 30 minutes and can be used once. If you did not request it, ignore this email. Your password will remain unchanged.</p>
            <p style="font-size:12px;color:#777">If the button does not work, copy this link into your browser:</p>
            <p style="font-size:12px;word-break:break-all"><a href="${safeUrl}" style="color:#1a472a">${safeUrl}</a></p>
          </td></tr>
        </table>
      </td></tr></table></body></html>`,
  });
}

// Shared email header with logo
function emailHeader(subtitle = 'Old Students Association') {
  return `
    <tr>
      <td style="background:#1a472a;padding:28px 40px;text-align:center">
        <img src="${LOGO_URL}" alt="RSSSOSAA Logo" width="64" height="64"
          style="display:inline-block;width:64px;height:64px;object-fit:contain;border-radius:50%;background:#fff;padding:4px;margin-bottom:12px" />
        <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px">RSSSOSAA</p>
        <p style="margin:6px 0 0;color:rgba(255,255,255,0.6);font-size:12px;text-transform:uppercase;letter-spacing:2px">${subtitle}</p>
      </td>
    </tr>
  `;
}

// ── Verification code email ──────────────────────────────────────────
export async function sendVerificationEmail(email: string, code: string): Promise<void> {
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Your RSSSOSAA verification code',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <!-- Header -->
        ${emailHeader('Old Students Association')}
        <!-- Body -->
        <tr>
          <td style="padding:40px">
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#121417">Verify your email</h1>
            <p style="margin:0 0 32px;font-size:14px;color:#666;line-height:1.6">
              Enter the 4-digit code below to verify your email address and complete your account setup.
            </p>
            <!-- Code box -->
            <div style="background:#f6f5f0;border-radius:12px;padding:28px;text-align:center;margin-bottom:32px">
              <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:2px;color:#999">Your verification code</p>
              <p style="margin:0;font-size:48px;font-weight:800;letter-spacing:12px;color:#1a472a;font-family:monospace">${code}</p>
            </div>
            <p style="margin:0 0 8px;font-size:13px;color:#999;text-align:center">
              This code expires in <strong style="color:#121417">15 minutes</strong>.
            </p>
            <p style="margin:0;font-size:13px;color:#bbb;text-align:center">
              If you did not create an account, you can safely ignore this email.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f6f5f0;padding:20px 40px;text-align:center;border-top:1px solid #eee">
            <p style="margin:0;font-size:11px;color:#aaa">
              Rivers State Secondary Schools Old Students Association<br>
              Port Harcourt, Rivers State, Nigeria
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim(),
    text: `Your RSSSOSAA verification code is: ${code}\n\nThis code expires in 15 minutes.\n\nIf you did not create an account, ignore this email.`,
  });
}

// ── Application submitted confirmation ───────────────────────────────
export async function sendApplicationConfirmation(
  email: string,
  fullName: string,
  applicationRef: string
): Promise<void> {
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Application received — ${applicationRef}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        ${emailHeader('Old Students Association')}
        <tr><td style="padding:40px">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#121417">Application Received</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#666;line-height:1.6">
            Dear <strong>${fullName}</strong>, your membership application has been received and is currently under review.
          </p>
          <div style="background:#f6f5f0;border-radius:12px;padding:20px;margin-bottom:24px">
            <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#999">Application Reference</p>
            <p style="margin:0;font-size:16px;font-weight:700;color:#1a472a;font-family:monospace">${applicationRef}</p>
          </div>
          <p style="margin:0 0 8px;font-size:13px;color:#666;line-height:1.6">
            <strong>What happens next?</strong>
          </p>
          <ol style="margin:0 0 24px;padding-left:20px;font-size:13px;color:#666;line-height:2">
            <li>Pay your membership fee (₦2,000) to activate your application</li>
            <li>Our team will review and verify your details</li>
            <li>You will be notified once approved</li>
          </ol>
          <a href="${APP_URL}/register/payment?ref=${encodeURIComponent(applicationRef)}"
            style="display:inline-block;background:#1a472a;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 28px;border-radius:100px">
            Pay Membership Fee →
          </a>
        </td></tr>
        <tr><td style="background:#f6f5f0;padding:20px 40px;text-align:center;border-top:1px solid #eee">
          <p style="margin:0;font-size:11px;color:#aaa">RSSSOSAA · Port Harcourt, Rivers State</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim(),
    text: `Dear ${fullName},\n\nYour application (${applicationRef}) has been received.\n\nPay your fee at: ${APP_URL}/register/payment?ref=${encodeURIComponent(applicationRef)}`,
  });
}

// ── Application approved ─────────────────────────────────────────────
export async function sendApprovalEmail(
  email: string,
  fullName: string,
  membershipNumber: string
): Promise<void> {
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Congratulations — Your RSSSOSAA Membership is Approved!',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        ${emailHeader('Membership Approved')}
        <tr><td style="padding:40px">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#121417">Welcome, ${fullName}!</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#666;line-height:1.6">
            Your RSSSOSAA membership has been approved. You are now an official member of the Rivers State Secondary Schools Old Students Association.
          </p>
          <div style="background:#f6f5f0;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center">
            <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#999">Your Membership Number</p>
            <p style="margin:0;font-size:22px;font-weight:800;color:#1a472a;font-family:monospace;letter-spacing:2px">${membershipNumber}</p>
          </div>
          <a href="${APP_URL}/members/dashboard"
            style="display:inline-block;background:#1a472a;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 28px;border-radius:100px">
            View My Dashboard →
          </a>
          <p style="margin:24px 0 0;font-size:11px;color:#aaa;text-align:center">This is an automated message. Please do not reply to this email.</p>
        </td></tr>
        <tr><td style="background:#f6f5f0;padding:20px 40px;text-align:center;border-top:1px solid #eee">
          <p style="margin:0;font-size:11px;color:#aaa">RSSSOSAA · Port Harcourt, Rivers State</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim(),
    text: `Congratulations ${fullName}!\n\nYour membership has been approved.\nMembership Number: ${membershipNumber}\n\nLogin at: ${APP_URL}/members/dashboard`,
  });
}

// ── Application rejected ─────────────────────────────────────────────
export async function sendRejectionEmail(
  email: string,
  fullName: string,
  reason?: string
): Promise<void> {
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'RSSSOSAA Application Status Update',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        ${emailHeader('Application Status')}
        <tr><td style="padding:40px">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#121417">Application Update</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#666;line-height:1.6">
            Dear <strong>${fullName}</strong>, after reviewing your application we are unable to approve your membership at this time.
          </p>
          ${reason ? `
          <div style="background:#fff5f5;border-left:4px solid #e53e3e;border-radius:0 8px 8px 0;padding:16px;margin-bottom:24px">
            <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#c53030;text-transform:uppercase;letter-spacing:1px">Reason</p>
            <p style="margin:0;font-size:14px;color:#666">${reason}</p>
          </div>` : ''}
          <p style="margin:0 0 24px;font-size:13px;color:#666;line-height:1.6">
            For further information or to appeal this decision, please contact us at 
            <a href="mailto:info@rsssosaa.org" style="color:#1a472a">info@rsssosaa.org</a>.
          </p>
          <p style="margin:16px 0 0;font-size:11px;color:#aaa;text-align:center">This is an automated message. Please do not reply to this email.</p>
        </td></tr>
        <tr><td style="background:#f6f5f0;padding:20px 40px;text-align:center;border-top:1px solid #eee">
          <p style="margin:0;font-size:11px;color:#aaa">RSSSOSAA · Port Harcourt, Rivers State</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim(),
    text: `Dear ${fullName},\n\nYour application was not approved at this time.${reason ? '\n\nReason: ' + reason : ''}\n\nContact us: info@rsssosaa.org`,
  });
}

const ADMIN_NOTIFY_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || 'oldstudentassociation30@gmail.com';

// ── Admin notification: new registration ────────────────────────────
export async function notifyAdminNewRegistration(applicant: {
  fullName: string;
  email: string;
  phoneNumber: string;
  whatsappNumber: string;
  dateOfBirth: string;
  gender: string;
  residentialAddress: string;
  stateOfOrigin: string;
  lga: string;
  secondarySchool: string;
  graduationYear: number;
  positionHeldInSchool?: string;
  currentOccupation: string;
  employmentType: string;
  organizationName?: string;
  skills: string[];
  willingToParticipate: boolean;
  contributionAreas: string[];
  applicationRef: string;
  submittedAt: Date;
}): Promise<void> {
  const row = (label: string, value: string) =>
    `<tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#666;width:160px;vertical-align:top">${label}</td><td style="padding:8px 0 8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#121417;font-weight:500;vertical-align:top">${value || '—'}</td></tr>`;

  await transporter.sendMail({
    from: FROM,
    to: ADMIN_NOTIFY_EMAIL,
    subject: `[New Registration] ${applicant.fullName} — ${applicant.applicationRef}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        ${emailHeader('New Registration Alert')}
        <tr><td style="padding:32px 40px">
          <h2 style="margin:0 0 4px;font-size:18px;font-weight:700;color:#121417">New membership application received</h2>
          <p style="margin:0 0 24px;font-size:13px;color:#999">Submitted ${new Date(applicant.submittedAt).toLocaleString('en-GB')}</p>

          <!-- Ref banner -->
          <div style="background:#f6f5f0;border-radius:10px;padding:14px 18px;margin-bottom:28px;display:flex;align-items:center;gap:10px">
            <span style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#999">Application Ref:</span>
            <span style="font-size:15px;font-weight:700;color:#1a472a;font-family:monospace">${applicant.applicationRef}</span>
          </div>

          <!-- Personal -->
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#1a472a">Personal Information</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
            ${row('Full Name', applicant.fullName)}
            ${row('Email', applicant.email)}
            ${row('Phone', applicant.phoneNumber)}
            ${row('WhatsApp', applicant.whatsappNumber)}
            ${row('Date of Birth', applicant.dateOfBirth)}
            ${row('Gender', applicant.gender)}
            ${row('Address', applicant.residentialAddress)}
            ${row('State of Origin', applicant.stateOfOrigin)}
            ${row('LGA', applicant.lga)}
          </table>

          <!-- School -->
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#1a472a">School Information</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
            ${row('Secondary School', applicant.secondarySchool)}
            ${row('Graduation Year', String(applicant.graduationYear))}
            ${row('Position Held', applicant.positionHeldInSchool || 'None')}
          </table>

          <!-- Professional -->
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#1a472a">Professional Information</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
            ${row('Occupation', applicant.currentOccupation)}
            ${row('Employment Type', applicant.employmentType)}
            ${row('Organisation', applicant.organizationName || '—')}
            ${row('Skills', applicant.skills.join(', ') || '—')}
          </table>

          <!-- Participation -->
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#1a472a">Participation</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
            ${row('Willing to Participate', applicant.willingToParticipate ? 'Yes' : 'No')}
            ${row('Contribution Areas', applicant.contributionAreas.join(', ') || '—')}
          </table>

          <!-- CTA -->
          <a href="${APP_URL}/admin/dashboard/applications"
            style="display:inline-block;background:#1a472a;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:13px 26px;border-radius:100px">
            View in Admin Dashboard →
          </a>
        </td></tr>
        <tr><td style="background:#f6f5f0;padding:16px 40px;text-align:center;border-top:1px solid #eee">
          <p style="margin:0;font-size:11px;color:#aaa">RSSSOSAA Admin Notification · <a href="${APP_URL}/admin/dashboard" style="color:#1a472a;text-decoration:none">Dashboard</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim(),
    text: `New registration: ${applicant.fullName} (${applicant.email})\nRef: ${applicant.applicationRef}\n\nView: ${APP_URL}/admin/dashboard/applications`,
  });
}

// ── Event registration confirmation ─────────────────────────────────
export async function sendEventRegistrationConfirmation(
  email: string,
  fullName: string,
  eventTitle: string,
  eventDate: Date,
  eventLocation: string,
  eventCardRef: string,
  dashboardUrl: string
): Promise<void> {
  const formattedDate = new Date(eventDate).toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `You're registered for ${eventTitle}!`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        ${emailHeader('Events & Activities')}
        <tr><td style="padding:40px">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#121417">Registration Confirmed!</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#666;line-height:1.6">
            Dear <strong>${fullName}</strong>, you are registered for the event below.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
            <tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#666;width:110px;vertical-align:top">Event</td><td style="padding:8px 0 8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#121417;font-weight:500">${eventTitle}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#666;vertical-align:top">Date</td><td style="padding:8px 0 8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#121417;font-weight:500">${formattedDate}</td></tr>
            <tr><td style="padding:8px 0;font-size:13px;color:#666;vertical-align:top">Location</td><td style="padding:8px 0 8px 12px;font-size:13px;color:#121417;font-weight:500">${eventLocation}</td></tr>
          </table>
          <div style="background:#f6f5f0;border-radius:12px;padding:20px;margin-bottom:24px">
            <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#999">Event Card Reference</p>
            <p style="margin:0;font-size:16px;font-weight:700;color:#1a472a;font-family:monospace">${eventCardRef}</p>
          </div>
          <a href="${dashboardUrl}"
            style="display:inline-block;background:#1a472a;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 28px;border-radius:100px">
            View My Dashboard →
          </a>
          <p style="margin:24px 0 0;font-size:11px;color:#aaa;text-align:center">This is an automated message. Please do not reply to this email.</p>
        </td></tr>
        <tr><td style="background:#f6f5f0;padding:20px 40px;text-align:center;border-top:1px solid #eee">
          <p style="margin:0;font-size:11px;color:#aaa">RSSSOSAA · Port Harcourt, Rivers State</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim(),
    text: `Dear ${fullName},\n\nYou are registered for ${eventTitle}.\nDate: ${formattedDate}\nLocation: ${eventLocation}\nEvent Card Ref: ${eventCardRef}\n\nView your dashboard: ${dashboardUrl}\n\nThis is an automated message. Please do not reply to this email.`,
  });
}

// ── Admin notification: payment received ────────────────────────────
export async function notifyAdminPaymentReceived(applicant: {
  fullName: string;
  email: string;
  applicationRef: string;
  membershipNumber?: string;
  paymentRef?: string;
  paymentAmount?: number;
}): Promise<void> {
  const amountNaira = applicant.paymentAmount
    ? `₦${(applicant.paymentAmount / 100).toLocaleString()}`
    : '₦2,000';

  await transporter.sendMail({
    from: FROM,
    to: ADMIN_NOTIFY_EMAIL,
    subject: `[Payment Received] ${applicant.fullName} — ${applicant.applicationRef}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        ${emailHeader('Payment Received')}
        <tr><td style="padding:32px 40px">
          <h2 style="margin:0 0 4px;font-size:18px;font-weight:700;color:#121417">Membership fee payment received</h2>
          <p style="margin:0 0 24px;font-size:13px;color:#999">Paid via Paystack</p>

          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center">
            <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:#16a34a">Amount Received</p>
            <p style="margin:0;font-size:36px;font-weight:800;color:#15803d">${amountNaira}</p>
          </div>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
            <tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#666;width:140px">Member</td><td style="padding:8px 0 8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#121417;font-weight:500">${applicant.fullName}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#666">Email</td><td style="padding:8px 0 8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#121417;font-weight:500">${applicant.email}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#666">Application Ref</td><td style="padding:8px 0 8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#1a472a;font-family:monospace;font-weight:700">${applicant.applicationRef}</td></tr>
            ${applicant.paymentRef ? `<tr><td style="padding:8px 0;font-size:13px;color:#666">Payment Ref</td><td style="padding:8px 0 8px 12px;font-size:13px;color:#121417;font-family:monospace">${applicant.paymentRef}</td></tr>` : ''}
          </table>

          <a href="${APP_URL}/admin/dashboard/applications"
            style="display:inline-block;background:#1a472a;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:13px 26px;border-radius:100px">
            Review Application →
          </a>
        </td></tr>
        <tr><td style="background:#f6f5f0;padding:16px 40px;text-align:center;border-top:1px solid #eee">
          <p style="margin:0;font-size:11px;color:#aaa">RSSSOSAA Admin Notification · <a href="${APP_URL}/admin/dashboard" style="color:#1a472a;text-decoration:none">Dashboard</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim(),
    text: `Payment received from ${applicant.fullName} (${applicant.email})\nAmount: ${amountNaira}\nRef: ${applicant.applicationRef}\n\nReview: ${APP_URL}/admin/dashboard/applications`,
  });
}
