# Implementation Plan: AI Auto-Reply Cron System

## Context

- **Framework**: Next.js 16 (App Router), TypeScript strict mode
- **DB**: MongoDB via Mongoose (`lib/db/mongodb.ts` default export `connectDB`)
- **AI**: Google Gemini via `@google/generative-ai` (already installed, version 0.24.1)
- **Email**: nodemailer (already installed), SMTP env vars: `SMTP_HOST/PORT/SECURE/USER/PASS/FROM`
- **Build check**: `npx tsc --noEmit` (strict mode, `@/*` paths alias to root)
- **No vercel.json exists** — must be created from scratch

---

- [ ] 1. Add `aiReplied` field to the ContactMessage model.

  Add `aiReplied?: boolean` to the `IContactMessage` interface and add `aiReplied: { type: Boolean, default: false }` to `ContactMessageSchema`. This field is needed so the cron query can skip messages that already received an AI reply.

  Files: `lib/models/ContactMessage.ts`

  Verify: `npx tsc --noEmit` — no TypeScript errors.

---

- [ ] 2. Create the AI auto-reply cron route at `app/api/cron/ai-reply/route.ts`.

  Create a new file with an exported `GET` handler. Implement the full flow in order:

  **a. Auth guard**
  ```ts
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  ```

  **b. DB connection**
  Call `await connectDB()` (default import from `@/lib/db/mongodb`).

  **c. Query unanswered messages**
  Find all `ContactMessage` documents where:
  - `repliedAt: { $exists: false }` — never replied to
  - `createdAt: { $lt: new Date(Date.now() - 5 * 60 * 60 * 1000) }` — older than 5 hours
  - `aiReplied: { $ne: true }` — not already AI-replied

  **d. Per-message loop** (wrap entire per-message block in `try/catch`; on error `console.error` and `continue`):

  - **Generate AI reply** using the same model-fallback pattern from `app/api/chat/route.ts`:
    ```ts
    const MODEL_CANDIDATES = [
      'gemini-2.5-flash-preview-05-20',
      'gemini-2.5-flash',
      'gemini-3.8-flash',
      'gemini-2.0-flash-001',
      'gemini-1.5-flash-001',
    ];
    ```
    Use `genAI.getGenerativeModel({ model, systemInstruction: SYSTEM_PROMPT })` then `model.generateContent(userPrompt)` (NOT `startChat` — no history needed here).
    Retry on `err?.status === 404 || err?.status === 503` or matching message strings; throw on anything else.

  - **System prompt** (exact text):
    ```
    You are RSSA Assistant, the official AI assistant for RSSSOSAA — the Rivers State Secondary Schools Old Students Association, Port Harcourt, Nigeria.
    An admin has not yet replied to this contact form message. You are stepping in to provide a helpful, warm, professional response.
    Keep your reply under 200 words. Do not make up specific facts you don't know. If the question is about something you can't answer (like a specific admin decision), acknowledge the message and say a human team member will follow up shortly.
    Sign off as: "RSSA Assistant, on behalf of the RSSSOSAA Team"
    Do not say you are an AI unless directly asked.
    Contact email for further help: oldstudentassociation7@gmail.com
    ```

  - **User prompt**: `` `Name: ${msg.name}\nSubject: ${msg.subject}\nMessage: ${msg.message}` ``

  - **Send reply email** via nodemailer using the same HTML template structure from `app/api/admin/messages/[id]/reply/route.ts`:
    - `from`: `process.env.SMTP_FROM`
    - `to`: `` `${msg.name} <${msg.email}>` ``
    - `subject`: `` `Re: ${msg.subject}` ``
    - HTML: green header (`#1a472a`), reply block with green left border, original message block. Copy the exact HTML from the admin reply route, substituting `replyMessage` with the AI-generated text and `msg.name`/`msg.subject`/`msg.message` from the document.
    - Create the transporter inline in the route (same pattern: `nodemailer.createTransport({ host, port, secure, auth: { user, pass } })`).

  - **Mark message as processed** with `findByIdAndUpdate`:
    ```ts
    {
      repliedAt: new Date(),
      repliedBy: 'AI Assistant',
      replyMessage: aiReplyText,
      aiReplied: true,
      read: true,
    }
    ```

  **e. Return response**
  ```ts
  return NextResponse.json({ success: true, processed: count });
  ```
  where `count` is the number of successfully processed messages.

  Files: `app/api/cron/ai-reply/route.ts` (create new)

  Verify: `npx tsc --noEmit` — no TypeScript errors.

---

- [ ] 3. Create `vercel.json` with the cron schedule.

  `vercel.json` does not currently exist. Create it with the cron config. The schedule `"0 * * * *"` fires once per hour (at minute 0), which ensures no message waits longer than ~6 hours for an AI reply after the 5-hour threshold.

  ```json
  {
    "crons": [
      {
        "path": "/api/cron/ai-reply",
        "schedule": "0 * * * *"
      }
    ]
  }
  ```

  Files: `vercel.json` (create new at project root)

  Verify: `npx tsc --noEmit` still passes (vercel.json is not compiled; this is just a sanity check that no side-effects were introduced).

---

- [ ] 4. Append `CRON_SECRET` to `.env.example`.

  Add the line `CRON_SECRET=your-cron-secret-here` at the end of `.env.example`. This documents the env var for future deployments. Vercel will call the cron route with `Authorization: Bearer <CRON_SECRET>` automatically when this env var is set.

  Files: `.env.example`

  Verify: `npx tsc --noEmit` — clean pass confirms no regressions across the whole change set.

---

## Final verification

Run from the project root:

```bash
npx tsc --noEmit
```

Expected: zero errors. Fix any TypeScript errors (e.g., missing type annotations, implicit `any` from Mongoose query results) before considering the task done.

## Files NOT to touch

- `app/admin/dashboard/**` — admin UI
- `app/dashboard/**` — member dashboard
- Registration form pages
- Payment pages
- Any existing API routes other than the new cron route
