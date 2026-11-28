import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getAdminSession } from '@/lib/utils/auth';
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { replyMessage } = await request.json();
    if (!replyMessage?.trim()) {
      return NextResponse.json({ error: 'Reply message is required.' }, { status: 400 });
    }

    const { id } = await params;

    await connectDB();
    const msg = await ContactMessage.findById(id);
    if (!msg) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

    // Send reply email to the original sender
    await transporter.sendMail({
      from: FROM,
      to: `${msg.name} <${msg.email}>`,
      subject: `Re: ${msg.subject}`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
          <div style="background:#1a472a;padding:28px 40px;text-align:center">
            <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px">RSSSOSAA</p>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.6);font-size:12px;text-transform:uppercase;letter-spacing:2px">Reply to your message</p>
          </div>
          <div style="padding:32px 40px">
            <p style="margin:0 0 6px;font-size:15px;color:#374151">Dear <strong>${msg.name}</strong>,</p>
            <p style="margin:0 0 24px;font-size:14px;color:#6b7280">Thank you for reaching out. Here is our response to your message:</p>

            <div style="background:#f0fdf4;border-left:4px solid #1a472a;border-radius:0 8px 8px 0;padding:20px 24px;margin-bottom:28px">
              <p style="margin:0;font-size:14px;color:#374151;line-height:1.8;white-space:pre-wrap">${replyMessage.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
            </div>

            <div style="background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;padding:16px 20px;margin-bottom:24px">
              <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:1px">Your original message</p>
              <p style="margin:0 0 4px;font-size:12px;color:#6b7280"><strong>Subject:</strong> ${msg.subject}</p>
              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;white-space:pre-wrap">${msg.message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
            </div>

            <p style="margin:0;font-size:13px;color:#9ca3af">
              If you have further questions, feel free to reply to this email or contact us at
              <a href="mailto:oldstudentsassociation94@gmail.com" style="color:#1a472a;text-decoration:none">oldstudentsassociation94@gmail.com</a>.
            </p>
          </div>
          <div style="background:#f9fafb;padding:16px 40px;text-align:center;border-top:1px solid #e5e7eb">
            <p style="margin:0;font-size:11px;color:#9ca3af">RSSSOSAA — Rivers State Secondary Schools Old Students Association</p>
          </div>
        </div>
      `,
      text: `Dear ${msg.name},\n\n${replyMessage.trim()}\n\n---\nOriginal message:\n${msg.message}\n\nRSSSOSAA`,
    });

    // Mark as read and record reply
    await ContactMessage.findByIdAndUpdate(id, {
      read: true,
      repliedAt: new Date(),
      repliedBy: (session as any).fullName || (session as any).email || 'Admin',
      replyMessage: replyMessage.trim(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reply error:', error);
    return NextResponse.json({ error: 'Failed to send reply' }, { status: 500 });
  }
}
