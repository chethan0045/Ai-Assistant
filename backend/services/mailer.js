// Email delivery with a Render-friendly HTTP provider (Resend) and an SMTP
// fallback for local dev. Render blocks outbound SMTP ports (25/465/587), so on
// the deployed app we MUST use an HTTP-based API. Locally, if RESEND_API_KEY is
// not set, we fall back to Gmail SMTP via nodemailer using env-var credentials.
//
// Required for production (Render): RESEND_API_KEY, optionally MAIL_FROM.
// Optional for local dev SMTP: MAIL_USER, MAIL_PASS.
const nodemailer = require('nodemailer');

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
// Resend lets you send from onboarding@resend.dev without a verified domain,
// but only to the address that owns the Resend account. To email arbitrary
// users, verify a domain in Resend and set MAIL_FROM, e.g.
//   MAIL_FROM="AI App <noreply@yourdomain.com>"
const MAIL_FROM = process.env.MAIL_FROM || 'AI App <onboarding@resend.dev>';

function otpHtml(otp, name) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f172a;border-radius:16px;color:#e2e8f0;">
      <h1 style="color:#818cf8;margin:0 0 8px;">AI</h1>
      <p style="margin:0 0 24px;color:#94a3b8;">Email Verification</p>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your verification code is:</p>
      <div style="text-align:center;margin:24px 0;">
        <span style="display:inline-block;padding:16px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px;font-size:32px;font-weight:bold;letter-spacing:8px;color:#fff;">${otp}</span>
      </div>
      <p style="color:#94a3b8;font-size:13px;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
      <hr style="border:none;border-top:1px solid #1e293b;margin:24px 0;">
      <p style="color:#64748b;font-size:12px;text-align:center;">AI - Your Intelligent Code Assistant</p>
    </div>
  `;
}

// Lazily build the SMTP transporter only when we actually fall back to it.
let _transporter = null;
function smtpTransporter() {
  if (_transporter) return _transporter;
  _transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
    // Fail fast instead of hanging the request if SMTP is blocked/slow.
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
  return _transporter;
}

async function sendViaResend({ to, subject, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: MAIL_FROM, to, subject, html }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Resend API ${res.status}: ${detail}`);
  }
  return res.json();
}

async function sendViaSmtp({ to, subject, html }) {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    throw new Error('No email provider configured. Set RESEND_API_KEY (recommended for deploys) or MAIL_USER/MAIL_PASS for local SMTP.');
  }
  return smtpTransporter().sendMail({ from: MAIL_FROM, to, subject, html });
}

/** Send the verification OTP. Uses Resend (HTTP) if configured, else SMTP. */
async function sendOTPEmail(email, otp, name) {
  const payload = {
    to: email,
    subject: 'AI - Email Verification OTP',
    html: otpHtml(otp, name),
  };
  if (RESEND_API_KEY) return sendViaResend(payload);
  return sendViaSmtp(payload);
}

module.exports = { sendOTPEmail };
