import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import connectDB from '@/lib/db/mongodb';
import ContactMessage from '@/lib/models/ContactMessage';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.SMTP_FROM || 'RSSSOSAA <noreply@rsssosaa.org>';
const TO = process.env.ADMIN_NOTIFY_EMAIL || 'oldstudentassociation7@gmail.com';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  try {
    const { name, email, subject, message } = await request.json();

    if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }

    // Save to database
    await connectDB();
    await ContactMessage.create({ name: name.trim(), email: email.trim(), subject: subject.trim(), message: message.trim() });

    // Notify admin by email
    await transporter.sendMail({
      from: FROM,
      to: TO,
      replyTo: `${name} <${email}>`,
      subject: `[Contact Form] ${subject}`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
          <div style="background:#1a472a;padding:28px 40px;text-align:center">
            <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px">RSSSOSAA</p>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.6);font-size:12px;text-transform:uppercase;letter-spacing:2px">New Contact Form Message</p>
          </div>
          <div style="padding:32px 40px">
            <p style="margin:0 0 24px;font-size:15px;color:#374151">You have received a new message via the website contact form.</p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#6b7280;width:120px;vertical-align:top;font-weight:600">From</td>
                <td style="padding:10px 0 10px 16px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#111827;font-weight:500">${name}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#6b7280;vertical-align:top;font-weight:600">Email</td>
                <td style="padding:10px 0 10px 16px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#111827;font-weight:500">
                  <a href="mailto:${email}" style="color:#1a472a;text-decoration:none">${email}</a>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;font-size:13px;color:#6b7280;vertical-align:top;font-weight:600">Subject</td>
                <td style="padding:10px 0 10px 16px;font-size:13px;color:#111827;font-weight:500">${subject}</td>
              </tr>
            </table>
            <div style="background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;padding:20px 24px;margin-bottom:24px">
              <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:1px">Message</p>
              <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;white-space:pre-wrap">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
            </div>
            <a href="${APP_URL}/admin/dashboard/messages"
              style="display:inline-block;background:#1a472a;color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:12px 24px;border-radius:100px">
              View &amp; Reply in Dashboard →
            </a>
          </div>
          <div style="background:#f9fafb;padding:16px 40px;text-align:center;border-top:1px solid #e5e7eb">
            <p style="margin:0;font-size:11px;color:#9ca3af">RSSSOSAA — Rivers State Secondary Schools Old Students Association</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json({ error: 'Failed to send message. Please try again.' }, { status: 500 });
  }
}
