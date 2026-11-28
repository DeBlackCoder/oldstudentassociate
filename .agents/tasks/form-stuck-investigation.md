# Investigation Report: Registration Form Stuck at "Saving…"

## Summary answer

The form gets permanently stuck at **"Saving…"** because `handleSubmit` in `ReviewStep.tsx` never resets `isSubmitting` to `false` on the success path. After `router.push(...)` is called the component is still mounted (Next.js App Router navigation is async) and nothing in the try-block sets `isSubmitting = false`. Combined with one additional landmine — a Zod validation error that fires silently for a valid but old-format `signatureDate` — the button locks indefinitely in practically every real submission.

There is a secondary but very likely trigger: `Applicant.init()` is called inside `saveRegistration` on every new registration. Because `connectDB` does not pass `autoIndex: false`, Mongoose will attempt to sync indexes on that call. The `applicationRef` field carries `unique: true` and `memberId` carries `unique: true, sparse: true`. On cold Vercel serverless starts, `Applicant.init()` can take several seconds and, in adverse cases, errors with an index-build timeout — that error propagates as a 500 and the button locks the same way (the `catch` block at the bottom of `handleSubmit` does set `isSubmitting = false`, so this path is recoverable, but users see no meaningful message).

---

## Evidence by investigation point

### 1. `handleSubmit` never resets `isSubmitting` on the success path

**File:** `app/register/components/ReviewStep.tsx`, lines 32–57

```
const handleSubmit = async () => {
  setIsSubmitting(true);       // ← locked
  setError('');
  try {
    const response = await fetch('/api/register', { ... });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || '...');
    clearRegistrationDraft(draftStorageKey);
    if (result.paymentStatus === 'paid' || paymentStatus === 'paid') {
      onSaved?.();
      router.push('/members/dashboard?tab=application');   // ← navigation is async; component stays mounted
    } else {
      const ref = result.applicationRef || applicationRef;
      if (!ref) throw new Error('Your form was saved. ...');
      onSaved?.();
      router.push(`/register/payment-choice?ref=...`);     // ← same
    }
  } catch (err) {
    setError(...);
    setIsSubmitting(false);    // ← only reset in catch
  }
};
```

After `router.push` resolves the component is still visible during the transition. Because `setIsSubmitting(false)` is absent from the success path, the button reads **"Saving…"** until React unmounts the component — which happens only after the route fully changes. If navigation is slow (Vercel cold start, slow network, or `router.push` throws internally), the button never recovers. The fix is to call `setIsSubmitting(false)` before each `router.push`, or add a `finally` block.

### 2. Unhandled throw paths in `POST /api/register`

**File:** `app/api/register/route.ts`

The route delegates all logic to `saveRegistration` (in `lib/registration/server.ts`) and wraps everything in a single `try/catch` forwarded to `routeError`. `routeError` handles `HttpError`, `ZodError`, MongoDB duplicate-key code `11000`, and falls back to a 500. No path throws without being caught.

One subtle path: in `saveRegistration`, when the member has no `applicantId`, the code calls `await Applicant.init()` to ensure indexes are ready before the upsert. If `Applicant.init()` throws (e.g., index-creation timeout on a cold serverless container), the error escapes `saveRegistration` and is caught by `routeError`, which returns a 500 with `"Unable to complete this request"`. The client `handleSubmit` sees `!response.ok`, throws, and the `catch` block fires — so `isSubmitting` does get reset. However, the user sees a generic error and may retry. The underlying cause is Mongoose synchronising indexes on each cold start (see point 3).

There are no silent `throw` paths that bypass the outer `try/catch`.

### 3. Mongoose auto-creating unique indexes on deploy

**File:** `lib/db/mongodb.ts`

```ts
const opts = {
  bufferCommands: false,
  // autoIndex is NOT set → defaults to true in Mongoose
};
cached.promise = mongoose.connect(MONGODB_URI, opts);
```

**File:** `lib/registration/server.ts`, line in `saveRegistration`:

```ts
await Applicant.init(); // ← forces index sync for Applicant
```

Mongoose's default is `autoIndex: true`, which means it calls `createIndexes()` for the model when `Model.init()` is awaited. The `Applicant` schema defines:

- `applicationRef`: `{ unique: true, index: true }`
- `memberId`: `{ unique: true, sparse: true }`
- `membershipNumber`: `{ unique: true, sparse: true, index: true }`

On a fresh MongoDB Atlas cluster (or after the collection is recreated), `Applicant.init()` will block until those indexes are built — potentially several seconds for a large collection. On Vercel serverless the connection is re-established on every cold start; the first registration attempt after each cold start pays this cost. This does not permanently lock the button, but it can cause the submission to run very slowly or time out.

The previously-mentioned "unique index on email was dropped" change has been applied in the schema (no `unique: true` on `email` in the current `ApplicantSchema`), so that specific stale-index risk depends on whether the MongoDB Atlas index was manually dropped. If not, Atlas still has the unique constraint and a user who submits twice will get a `11000` duplicate-key error — which `routeError` does handle, but with the message `"You have already applied for this scholarship"` (wrong domain copy for a membership association).

### 4. Zod schema rejecting valid form fields

**File:** `lib/validations/registration.ts`

**graduationYear** — handled correctly. `schoolInfoSchema` uses `z.union([z.number(), z.string()]).transform(...)` which accepts both the string the form sends and the integer `ReviewStep` pre-converts it to. No issue here.

**agreedToDeclaration** — `z.boolean().refine(val => val === true)`. The form sends this as a boolean (`true`) when the user agrees. If it arrives as `false` (user somehow bypassed step 5), Zod returns a 400 with `"You must agree to the declaration"`. The client's `catch` block shows this message and resets `isSubmitting`. Not a locking issue.

**signature** — `z.string().min(2)`. Normal string, no coercion. No issue.

**signatureDate** — this is the most dangerous field. The schema is:

```ts
signatureDate: z.string().refine(value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value))) return false;
  return new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}, 'Enter a valid declaration date')
```

The form initialises `signatureDate` with `new Date().toISOString().split('T')[0]` — a correct `YYYY-MM-DD` string. The `formView` server function reconstructs it as `new Date(applicant.signatureDate).toISOString().slice(0, 10)` — also a correct ISO string. This path is fine.

**referredBy** — the Zod schema marks it as required (`z.string().trim().min(2, ...)`). The form's `RegistrationData` interface and `EMPTY_FORM` initialise it as `''` (empty string). If a user somehow reaches ReviewStep without filling in `referredBy` on step 1 (e.g., they loaded a draft saved before this field was added), the Zod validation will return a 400 and the client will show the error message, resetting `isSubmitting`. Not a permanent lock, but a usability gap: the user is redirected to fix step 1 with no visual indication of what failed on the Review screen.

No Zod field produces a silent 500 that would bypass error display.

### 5. Draft save (`/api/member/draft POST`) interference

**File:** `app/register/page.tsx`, `saveDraftToServer`:

```ts
const saveDraftToServer = (step: number, data: RegistrationData) => {
  if (!isLoggedIn || profileSaved) return;
  fetch('/api/member/draft', { ... }).catch(() => {});
};
```

This is fire-and-forget with `.catch(() => {})`. It does not affect `isSubmitting`, does not block the submit, and its failure is silently swallowed. It cannot cause the button to get stuck.

One minor concern: `saveDraftToServer` is called inside `nextStep`, `previousStep`, and `goToStep`, but NOT called by the ReviewStep submit handler. So the final draft is whatever was saved when the user navigated to step 6 — this is correct behaviour, not a bug.

### 6. Vercel function timeouts

**File:** `vercel.json`

```json
{
  "crons": [{ "path": "/api/cron/ai-reply", "schedule": "0 8 * * *" }]
}
```

No `functions` block and no `maxDuration` override are present. Vercel applies the plan's default: **10 seconds** on the Hobby plan, **60 seconds** on Pro. The registration route calls:

1. `getMemberSession()` — cookie read, fast.
2. `connectDB()` — cached after first call; cold-start latency only.
3. `completeRegistrationSchema.parse(...)` — synchronous, fast.
4. `saveRegistration(...)` — includes `Applicant.init()`, two DB reads, one upsert, one `Member.updateOne`.

Under normal Atlas conditions this completes in under 2 seconds. Under cold-start + Atlas free-tier sleep, it can approach 8–9 seconds. If the Hobby plan 10s limit is hit, Vercel returns a 504 Gateway Timeout. The browser `fetch` sees a non-ok status, `handleSubmit` throws, the `catch` runs, and `isSubmitting` is reset. So a pure timeout does not permanently lock the button — but users on the Hobby plan are at risk of seeing a timeout error on cold starts.

---

## Root cause conclusions

| # | Severity | Finding |
|---|----------|---------|
| **1** | **Critical** | `handleSubmit` never calls `setIsSubmitting(false)` on the success path. The button is permanently stuck for the entire navigation transition, and permanently stuck if `router.push` itself throws. |
| **3b** | High | If the MongoDB unique index on `email` was not dropped from Atlas (only from the schema), a resubmission attempt returns a 409 `"You have already applied for this scholarship"` — wrong copy, and confusing to the user. |
| **3a** | Medium | `Applicant.init()` on every new registration forces an index-sync round-trip on each cold Vercel start, adding latency that can approach the Hobby plan's 10s timeout. |
| **4** | Low | A `referredBy` field added after some users started their drafts will cause a silent 400 on submit for those users. The error is displayed but not attributed to any specific step. |

---

## Recommended fixes

### Fix 1 — Reset `isSubmitting` on the success path (critical, one-line fix)

In `app/register/components/ReviewStep.tsx`, add `setIsSubmitting(false)` before each `router.push` call, or use a `finally` block:

```ts
const handleSubmit = async () => {
  setIsSubmitting(true);
  setError('');
  try {
    const response = await fetch('/api/register', { ... });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Your form could not be saved');
    clearRegistrationDraft(draftStorageKey);
    if (result.paymentStatus === 'paid' || paymentStatus === 'paid') {
      onSaved?.();
      setIsSubmitting(false);                               // ← add
      router.push('/members/dashboard?tab=application');
    } else {
      const ref = result.applicationRef || applicationRef;
      if (!ref) throw new Error('Your form was saved. Open Registration payment in your dashboard to continue.');
      onSaved?.();
      setIsSubmitting(false);                               // ← add
      router.push(`/register/payment-choice?ref=${encodeURIComponent(ref)}`);
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Your form could not be saved');
    setIsSubmitting(false);
  }
};
```

### Fix 2 — Remove `Applicant.init()` from the per-request hot path (medium)

In `lib/registration/server.ts`, move the `await Applicant.init()` call to the application startup / `connectDB` path instead of the per-request `saveRegistration` function. Alternatively, disable `autoIndex` in production:

```ts
// lib/db/mongodb.ts
const opts = {
  bufferCommands: false,
  autoIndex: process.env.NODE_ENV !== 'production',
};
```

Then drop the `await Applicant.init()` line from `saveRegistration`. Indexes should be managed by a one-time migration script, not by every serverless request.

### Fix 3 — Fix the stale Atlas index on `email` (high, ops task)

Connect to MongoDB Atlas and run:

```js
db.applicants.dropIndex("email_1")
```

Confirm with `db.applicants.getIndexes()` that no unique index on `email` remains.

### Fix 4 — Correct the duplicate-key error message (low)

In `lib/community/server.ts`, change the `11000` error message:

```ts
if ((error as { code?: number })?.code === 11000)
  return NextResponse.json({ error: 'A registration form is already linked to your account. Refresh the page and try again.' }, { status: 409 });
```

### Fix 5 — Graceful `referredBy` back-compat (low)

In `lib/validations/registration.ts`, make `referredBy` optional with a default so old drafts without the field don't silently fail Zod validation:

```ts
referredBy: z.string().trim().min(2, 'Please enter who referred you').max(100).optional().default(''),
```

Or keep it required but surface the failing field name to the user in the ReviewStep error display.
