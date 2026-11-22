import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import connectDB from '@/lib/db/mongodb';
import ContactMessage from '@/lib/models/ContactMessage';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const MODEL_CANDIDATES = [
  'gemini-2.5-flash-preview-05-20',
  'gemini-2.5-flash',
  'gemini-2.0-flash-001',
  'gemini-1.5-flash-001',
];

const AI_SYSTEM_PROMPT = `You are RSSA Assistant, the official AI assistant for RSSSOSAA — the Rivers State Secondary Schools Old Students Association, Port Harcourt, Nigeria.
An admin has not yet replied to this contact form message. You are stepping in to provide a helpful, warm, professional response.
Keep your reply under 200 words. Do not make up specific facts you don't know. If the question is about something you can't answer (like a specific admin decision), acknowledge the message and say a human team member will follow up shortly.
Sign off as: "RSSA Assistant, on behalf of the RSSSOSAA Team"
Do not say you are an AI unless directly asked.
Contact email for further help: oldstudentassociation94@gmail.com`;

const FROM = process.env.SMTP_FROM || 'RSSSOSAA <noreply@rsssosaa.org>';

async function generateAIReply(name: string, subject: string, message: string): Promise<string> {
  const userPrompt = `Name: ${name}\nSubject: ${subject}\nMessage: ${message}`;
  let lastError: unknown;
  for (const modelName of MODEL_CANDIDATES) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: AI_SYSTEM_PROMPT,
        generationConfig: { temperature: 0.7, maxOutputTokens: 400 },
      });
      const result = await model.generateContent(userPrompt);
      return result.response.text();
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (
        e?.status === 404 || e?.status === 503 ||
        e?.message?.includes('404') || e?.message?.includes('503') ||
        e?.message?.includes('not found') || e?.message?.includes('Service Unavailable')
      ) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export async function GET(request: NextRequest) {
  // Auth check — require CRON_SECRET in all environments; fail-closed by default
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();

  const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
  // Use `null` filter: in MongoDB { field: null } matches both absent and explicit-null fields
  const messages = await ContactMessage.find({
    repliedAt: null,
    createdAt: { $lt: fiveHoursAgo },
    aiReplied: { $ne: true },
  });

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  let processed = 0;

  for (const msg of messages) {
    try {
      const replyText = await generateAIReply(msg.name, msg.subject, msg.message);

      const safeName = msg.name.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const safeSubject = msg.subject.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const safeReply = replyText.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const safeMsg = msg.message.replace(/</g, '&lt;').replace(/>/g, '&gt;');

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
              <p style="margin:0 0 6px;font-size:15px;color:#374151">Dear <strong>${safeName}</strong>,</p>
              <p style="margin:0 0 24px;font-size:14px;color:#6b7280">Thank you for reaching out. Here is our response to your message:</p>
              <div style="background:#f0fdf4;border-left:4px solid #1a472a;border-radius:0 8px 8px 0;padding:20px 24px;margin-bottom:28px">
                <p style="margin:0;font-size:14px;color:#374151;line-height:1.8;white-space:pre-wrap">${safeReply}</p>
              </div>
              <div style="background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;padding:16px 20px;margin-bottom:24px">
                <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:1px">Your original message</p>
                <p style="margin:0 0 4px;font-size:12px;color:#6b7280"><strong>Subject:</strong> ${safeSubject}</p>
                <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;white-space:pre-wrap">${safeMsg}</p>
              </div>
              <p style="margin:0;font-size:13px;color:#9ca3af">
                If you have further questions, feel free to contact us at
                <a href="mailto:oldstudentassociation94@gmail.com" style="color:#1a472a;text-decoration:none">oldstudentassociation94@gmail.com</a>.
              </p>
            </div>
            <div style="background:#f9fafb;padding:16px 40px;text-align:center;border-top:1px solid #e5e7eb">
              <p style="margin:0;font-size:11px;color:#9ca3af">RSSSOSAA — Rivers State Secondary Schools Old Students Association</p>
            </div>
          </div>
        `,
        text: `Dear ${msg.name},\n\n${replyText}\n\n---\nOriginal message:\n${msg.message}\n\nRSSSOSAA`,
      });

      await ContactMessage.findByIdAndUpdate(msg._id, {
        repliedAt: new Date(),
        repliedBy: 'AI Assistant',
        replyMessage: replyText,
        aiReplied: true,
        read: true,
      });

      processed++;
    } catch (err) {
      console.error(`AI reply failed for message ${msg._id}:`, err);
    }
  }

  return NextResponse.json({ success: true, processed });
}
