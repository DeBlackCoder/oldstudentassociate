# AI auto-reply cron for unanswered contact messages

This change adds a Vercel cron job that fires hourly, finds contact messages with no human reply after 5 hours, generates a contextual response using Gemini, emails the user, and marks the message as handled. The implementation covers the full path: DB query → AI generation with model fallback → email send → DB update, all inside a per-message try/catch that prevents one failure from aborting the batch. The auth guard departs from a common dev-mode pattern in a way that blocks local testing without a secret set.

Watch for: **Auth guard is fail-closed even in dev** (confirmed) — the route returns 401 whenever `CRON_SECRET` is unset, which means local cron testing requires the env var even in development. This is a deliberate trade-off worth documenting, but could silently block debugging. **Raw user input in email HTML** (confirmed) — `safeReply` and `safeMsg` are escaped, but `msg.name` and `msg.subject` are interpolated raw into the email template despite coming from user-submitted contact form data.

**Verdict**: NEEDS_CHANGES

---

## High-level view

The cron auth guard is fail-closed: it returns 401 whenever `CRON_SECRET` is missing from the environment, not just when it's present and wrong. Every local `curl` or test invocation without the secret set will be rejected. This is more secure than the common dev-bypass pattern (allow-all when unset), but it's undocumented and will silently confuse anyone debugging the cron locally.

The DB query uses `{ repliedAt: null }` to match documents where the field is absent or explicitly null, and combines it with the `aiReplied: { $ne: true }` guard. The field is never set to explicit `null` in the schema — it's just omitted — so the `null` filter is correct for the way Mongoose writes these documents.

The Gemini fallback loops through four model candidates and continues past 404/503 errors. The fallback condition is checked against both a numeric `.status` property and a string `.message`, which handles both SDK-structured errors and plain JS `Error` objects. Non-retriable errors are re-thrown immediately and caught by the per-message handler.

The email HTML uses `#1a472a` header and `#f0fdf4` reply block, which matches the admin reply route exactly. However, `msg.name` and `msg.subject` are interpolated into the HTML template without escaping. If either field contains `<`, `>`, or `"` characters — possible since contact form input is user-supplied — the email HTML is malformed or injectable. The `replyText` is correctly escaped via `safeReply`, making the gap asymmetric and easy to miss.

`aiReplied` is added to both the TypeScript interface (as `aiReplied?: boolean`) and the Mongoose schema (with `default: false`), and all five DB fields — `repliedAt`, `repliedBy`, `replyMessage`, `aiReplied`, `read` — are written in the `findByIdAndUpdate` call. `vercel.json` specifies the correct path and `"0 * * * *"` schedule.

---

<details>
<summary>Issues (2)</summary>

1. **Raw name/subject in email HTML** — `msg.name` and `msg.subject` are interpolated into the HTML template without escaping. Only `replyText` is sanitized. Any `<`, `>`, or `"` in either field (user-supplied contact form input) will malform the email HTML or allow content injection. Apply the same `.replace(/</g, '&lt;').replace(/>/g, '&gt;')` transform to `msg.name` and `msg.subject` before interpolation, exactly as done for `safeReply` and `safeMsg`.

2. **Fail-closed auth in dev is undocumented** — When `CRON_SECRET` is unset the route unconditionally returns 401, unlike many Next.js examples that allow unauthenticated local calls. This is a fine security posture but should be called out in `.env.example` or a comment so developers don't spend time debugging a silent 401 during local testing. Low priority but worth a one-line comment.

</details>

---

<details>
<summary>Details</summary>

### Raw user input in email HTML

`msg.name` and `msg.subject` appear in four places in the HTML template: the greeting (`Dear <strong>${msg.name}</strong>`), the `to:` header (not HTML, safe), the original-message block subject line, and the reply-quote heading. Only `msg.message` is sanitized into `safeMsg`; `msg.name` and `msg.subject` are interpolated directly. Both fields come from a user-submitted contact form and are stored verbatim in MongoDB — the schema applies no sanitization. A name like `</strong><script>` or a subject containing `"` would malform the email HTML structure. This is a confirmed gap: the `safeReply` and `safeMsg` variables show the author was thinking about escaping, making the omission of `safeName` and `safeSubject` a likely oversight rather than a deliberate choice.

The fix is straightforward — define `safeName` and `safeSubject` alongside `safeReply` and `safeMsg`, then substitute them in the template.

### Auth guard behavior

```
if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

The condition rejects when `cronSecret` is falsy (empty string, undefined) OR when the header doesn't match. This means an unset `CRON_SECRET` in `.env.local` will reject every call, including `curl localhost:3000/api/cron/ai-reply` during local development. The `.env.example` entry (`CRON_SECRET=your-cron-secret-here`) implies the variable is optional ("for dev you might leave it blank") but the code treats it as required. The behavior is more secure than dev-bypass, but the mismatch between the example file's framing and the actual behavior is a documentation gap. A single comment in the route — `// set CRON_SECRET in .env.local; this route is always protected` — would eliminate the confusion.



</details>

---

<details>
<summary>File map</summary>

- `app/api/cron/ai-reply/route.ts` — new GET handler: auth guard, DB query, Gemini generation, email send, DB update
- `lib/models/ContactMessage.ts` — added `aiReplied?: boolean` to interface and schema
- `vercel.json` — added hourly cron entry pointing to `/api/cron/ai-reply`
- `.env.example` — documented `CRON_SECRET` and `GEMINI_API_KEY` variables

Full diff: `git diff main -- app/api/cron/ai-reply/route.ts lib/models/ContactMessage.ts vercel.json .env.example`

</details>
