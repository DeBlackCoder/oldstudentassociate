# Implementation Plan — Events System & Membership Card

## Codebase Summary

- **Framework**: Next.js 16 (App Router), TypeScript, Tailwind CSS v4
- **DB**: Mongoose 9 via `lib/db/mongodb.ts` → `connectDB()`
- **Admin auth**: `getAdminSession()` from `lib/utils/auth.ts` → returns `{ adminId, email, role }`
- **Member auth**: `getMemberSession()` from `lib/utils/member-auth.ts` → returns `{ memberId, email, role }`
- **Models live in**: `lib/models/` — study `Applicant.ts` and `Member.ts` for the exact Mongoose pattern
- **Notifications**: `lib/models/Notification.ts` — type enum is `'new_registration' | 'payment_received' | 'general'`
- **Email**: `lib/utils/email.ts` — nodemailer, HTML template with `emailHeader()` helper; `ADMIN_NOTIFY_EMAIL` env var
- **Paystack**: `app/api/payment/initialize/route.ts` (POST → returns `authorizationUrl`) and `app/api/payment/verify/route.ts` (GET with `?reference=`)
- **Admin layout nav**: `app/admin/dashboard/layout.tsx` — `navItems` array, dark theme `#0f1117` bg / `#1a472a` green; uses shadcn `Card/Table/Badge/Skeleton` + lucide-react
- **Member dashboard**: `app/members/dashboard/page.tsx` — `'use client'`, `Tab` union type, tabs rendered by `renderTabContent()` switch
- **`qrcode` package**: already installed (`"qrcode": "^1.5.4"`, `"@types/qrcode": "^1.5.6"`)
- **Build**: `npm run build` / **Dev**: `npm run dev` / **Lint**: `npm run lint`

---

## Part 1 — Event & EventRegistration Models

- [ ] 1. Create `lib/models/Event.ts`.
      Define `IEvent` interface with: `title (string)`, `description (string)`, `date (Date)`, `location (string)`, `registrationFee (number, kobo)`, `isFree (boolean)`, `maxAttendees (number, optional)`, `status ('Draft'|'Published'|'Cancelled'|'Completed')`, `createdBy (Schema.Types.ObjectId, ref: 'Admin')`, timestamps from `{ timestamps: true }`.
      Use the `models.Event || mongoose.model(...)` guard matching `Applicant.ts`.
      Files: `lib/models/Event.ts`
      Verify: `npm run build` — no TypeScript errors.

- [ ] 2. Create `lib/models/EventRegistration.ts`.
      Define `IEventRegistration` with: `eventId (ObjectId, ref: 'Event')`, `applicantId (ObjectId, ref: 'Applicant')`, `memberId (ObjectId, ref: 'Member')`, `fullName (string)`, `email (string)`, `membershipNumber (string)`, `paymentStatus ('unpaid'|'paid'|'free')`, `paymentRef (string, sparse)`, `paidAt (Date, optional)`, `registeredAt (Date, default Date.now)`, `eventCardRef (string, unique, sparse)`.
      Add compound index `{ eventId: 1, applicantId: 1 }` with `{ unique: true }` to prevent duplicate registrations.
      Files: `lib/models/EventRegistration.ts`
      Verify: `npm run build` — no TypeScript errors.

- [ ] 3. Extend `lib/models/Notification.ts` to add `'new_event'` to the `type` enum (both in the interface and Schema `enum` array).
      Files: `lib/models/Notification.ts`
      Verify: `npm run build` — no TypeScript errors.

---

## Part 2 — Admin: Events API Routes

- [ ] 4. Create `app/api/admin/events/route.ts`.
      **GET**: `getAdminSession()` → 401 if null; `connectDB()`; `Event.find({}).sort({ date: -1 }).lean()`; return list.
      **POST**: auth check; parse `{ title, description, date, location, registrationFee, isFree, maxAttendees, status }` from request body; validate required fields; `new Event({ ...fields, registrationFee: isFree ? 0 : registrationFee, createdBy: session.adminId })`; save; create `Notification({ type: 'new_event', title: 'New event created', message: \`New event created: \${title}\`, link: '/admin/dashboard/events' })`; return `{ success: true, event }`.
      Files: `app/api/admin/events/route.ts`
      Verify: `npm run build` — no TS errors.

- [ ] 5. Create `app/api/admin/events/[id]/route.ts`.
      **GET**: auth; `connectDB()`; `Event.findById(id)`; count registrations via `EventRegistration.countDocuments({ eventId: id })`; return `{ event, registrationCount }`.
      **PATCH**: auth; `Event.findByIdAndUpdate(id, body, { new: true })`; return updated event.
      **DELETE**: auth; find event; if `status !== 'Draft'` return 400 `{ error: 'Only Draft events can be deleted' }`; `Event.findByIdAndDelete(id)`; return `{ success: true }`.
      Files: `app/api/admin/events/[id]/route.ts`
      Verify: `npm run build` — no TS errors.

- [ ] 6. Create `app/api/admin/events/[id]/registrations/route.ts`.
      **GET**: auth; `connectDB()`; `EventRegistration.find({ eventId: id }).sort({ registeredAt: -1 }).lean()`; return list with all fields.
      Files: `app/api/admin/events/[id]/registrations/route.ts`
      Verify: `npm run build` — no TS errors.

---

## Part 3 — Admin: Events UI Page

- [ ] 7. Add `CalendarDays` to the lucide-react import in `app/admin/dashboard/layout.tsx` and insert `{ href: '/admin/dashboard/events', label: 'Events', icon: CalendarDays }` into `navItems` after the Members entry (index 3, pushing Reports to index 4).
      Files: `app/admin/dashboard/layout.tsx`
      Verify: `npm run build` — no TS errors; sidebar renders Events nav item.

- [ ] 8. Create `app/admin/dashboard/events/page.tsx`.
      `'use client'`. Dark theme matching existing admin pages: page background is `#0f1117` (inherited from layout `<main>`), card backgrounds `rgba(255,255,255,0.04)` with `border: '1px solid rgba(255,255,255,0.06)'`, white text, `#1a472a` green accents.
      State: `activeTab: 'list'|'create'`, `events[]`, `loading`, `submitting`, form fields.
      **Events List tab**: fetch `GET /api/admin/events` on mount; render a table with columns: Title / Date / Location / Fee / Status badge (color-coded: Draft=gray, Published=green, Cancelled=red, Completed=blue) / Attendee Count (from a second fetch of registration count per event, or include count in the list API response — choose to include it in the GET response by aggregating with `EventRegistration.countDocuments` per event in a `Promise.all`) / Actions (Edit button → PATCH modal, Delete button → only shown for Draft status).
      **Create Event tab**: form fields: `title (text)`, `description (textarea)`, `date (datetime-local)`, `location (text)`, fee toggle Free/Paid (if Paid: naira number input, stored as `value * 100` kobo), `maxAttendees (number, optional)`, `status (select: Draft/Published)`; submit → `POST /api/admin/events`; on success set `activeTab = 'list'` and refetch.
      Files: `app/admin/dashboard/events/page.tsx`
      Verify: `npm run build` — no TS errors; page loads at `/admin/dashboard/events`.

---

## Part 4 — Member: Events API Routes

- [ ] 9. Create `app/api/member/events/route.ts`.
      **GET**: `getMemberSession()` → 401; `connectDB()`; find `Member` by `session.memberId`; find `Applicant` by `member.applicantId`; fetch `Event.find({ status: 'Published' }).sort({ date: 1 }).lean()`; for each event, check `EventRegistration.findOne({ eventId, applicantId })` to get registration status; return events with `isRegistered`, `registrationId`, `paymentStatus` appended.
      Files: `app/api/member/events/route.ts`
      Verify: `npm run build` — no TS errors.

- [ ] 10. Create `app/api/member/events/[id]/register/route.ts`.
       **POST**: `getMemberSession()` → 401; `connectDB()`; find `Member`, find `Applicant` via `member.applicantId`; if `!applicant` or `applicant.status !== 'Approved'` → return 403 `{ error: 'Only approved members can register for events' }`; find `Event` by id → 404 if not found or not Published; check `EventRegistration.findOne({ eventId: id, applicantId })` → 409 if already registered.
       **Generate eventCardRef**: `EVT/${id.toString().slice(-4)}/${new Date().getFullYear()}/${paddedCount}` where `paddedCount` is `String(totalRegistrationsForEvent + 1).padStart(4, '0')`.
       **If `event.isFree`**: create `EventRegistration({ eventId, applicantId, memberId: member._id, fullName: applicant.fullName, email: applicant.email, membershipNumber: applicant.membershipNumber, paymentStatus: 'free', registeredAt: new Date(), eventCardRef })`; send confirmation email (step 15); return `{ success: true, registrationId }`.
       **If paid**: initialize Paystack using exact same pattern as `app/api/payment/initialize/route.ts` — `fetch('https://api.paystack.co/transaction/initialize', ...)` with `amount: event.registrationFee`, `reference: eventCardRef`, `callback_url: \`\${APP_URL}/members/dashboard?tab=events&payment=success\``; create EventRegistration with `paymentStatus: 'unpaid'`, `eventCardRef` already set; return `{ success: true, authorizationUrl }`.
       Files: `app/api/member/events/[id]/register/route.ts`
       Verify: `npm run build` — no TS errors.

- [ ] 11. Create `app/api/member/events/[id]/verify-payment/route.ts` for the Paystack callback flow.
       **GET** with `?reference=`: `getMemberSession()` → 401; verify Paystack transaction (same pattern as `app/api/payment/verify/route.ts`); find `EventRegistration` by `eventCardRef = reference`; if `txn.status === 'success'` update `paymentStatus = 'paid'`, `paymentRef = txn.reference`, `paidAt = new Date(txn.paid_at)`; send confirmation email; return `{ success: true }`.
       Files: `app/api/member/events/[id]/verify-payment/route.ts`
       Verify: `npm run build` — no TS errors.

- [ ] 12. Create `app/api/member/events/[id]/registration-card/route.ts`.
       **GET**: `getMemberSession()` → 401; `connectDB()`; find `Member`; find `EventRegistration` by `{ eventId: id, memberId: member._id }` → 404 if not found; if `paymentStatus === 'unpaid'` → 403 `{ error: 'Payment required to view event card' }`; find `Event`; return `{ eventTitle, eventDate, eventLocation, fullName, membershipNumber, eventCardRef }`.
       Files: `app/api/member/events/[id]/registration-card/route.ts`
       Verify: `npm run build` — no TS errors.

---

## Part 5 — Member Dashboard: Events Tab

- [ ] 13. Update the `'events'` case in `renderTabContent()` in `app/members/dashboard/page.tsx`.
       Add state: `events: EventItem[]`, `eventsLoading: boolean` (fetch from `/api/member/events` in a `useEffect` that runs when `activeTab === 'events'`).
       Add interface `EventItem { _id, title, date, location, registrationFee, isFree, isRegistered, registrationId?, paymentStatus? }`.
       Render: list of event cards (matching the existing neumorphic `rounded-3xl bg-[#F6F5F0]` style); each card shows title, date (formatted `toLocaleDateString('en-GB', { weekday:'short', year:'numeric', month:'short', day:'numeric' })`), location, fee (`Free` or `₦${(fee/100).toLocaleString()}`).
       If `isRegistered && (paymentStatus === 'paid' || paymentStatus === 'free')`: show green `Registered ✓` badge + `View Event Card` button → `Link` to `/members/dashboard/event-card/${registrationId}`.
       If `isRegistered && paymentStatus === 'unpaid'`: show amber `Payment Pending` badge + `Complete Payment` button that calls the Paystack re-initialize flow.
       If not registered and event is Published: show `Register` button. Free events → call `POST /api/member/events/[id]/register` directly, refresh list on success. Paid events → call same POST, get back `authorizationUrl`, do `window.location.href = authorizationUrl`.
       Keep existing guards (`if (!profileComplete) return <FormRequiredNotice />` and `if (!isPaid) return <PaymentRequiredNotice />`).
       Files: `app/members/dashboard/page.tsx`
       Verify: `npm run build` — no TS errors.

---

## Part 6 — Membership Card: Download Button

- [ ] 14. In the `'application'` case of `renderTabContent()` in `app/members/dashboard/page.tsx`, enhance the existing membership card block (already present when `isApproved && member.membershipNumber`).
       Add a `Download Card` button below the card div that calls `window.print()`.
       Add a `<style>` tag injected via `useEffect` (or a `<style jsx global>`) containing:
       ```css
       @media print {
         body > * { display: none !important; }
         #membership-card-print { display: block !important; }
       }
       ```
       Wrap the card div with `id="membership-card-print"` and add `style={{ display: 'none' }}` to the print-only version (show on screen too — remove the display:none; the `@media print` rule hides everything else).
       Enhance the card content to include: member since year (from `member.paidAt || member.submittedAt`), a QR-code placeholder div (`6×6 grid of tiny squares`, labelled 'Scan to Verify', with verify URL text `${APP_URL}/verify-member?id=${member.membershipNumber}` shown in tiny font below it).
       Files: `app/members/dashboard/page.tsx`
       Verify: `npm run build` — no TS errors; print preview shows only the card.

---

## Part 7 — Event Card Page

- [ ] 15. Create `app/members/dashboard/event-card/[registrationId]/page.tsx`.
       `'use client'`. On mount, fetch `GET /api/member/event-card/${registrationId}` (see item 16).
       Render: dark green card matching membership card style (`bg-[#1a472a]`, dot pattern background, white text). Show: logo (`/logo.png`), event title (large bold), event date (formatted), event location, member name, membership number, event card ref (monospace, prominent). Print/Save button using `window.print()` with same `@media print` isolation pattern (wrap card in `id="event-card-print"`).
       Loading state: spinner matching the dashboard's `<Loader2>` pattern.
       Error state: message if registration not found or payment pending.
       Files: `app/members/dashboard/event-card/[registrationId]/page.tsx`
       Verify: `npm run build` — no TS errors.

- [ ] 16. Create `app/api/member/event-card/[registrationId]/route.ts`.
       **GET**: `getMemberSession()` → 401; `connectDB()`; find `EventRegistration` by `_id = registrationId` and `memberId = member._id` (security: member can only fetch their own card); if `paymentStatus === 'unpaid'` → 403; populate `eventId` to get event details; return `{ eventTitle, eventDate, eventLocation, fullName, membershipNumber, eventCardRef }`.
       Note: this is a different route from item 12 (item 12 looks up by eventId, this one looks up by registrationId — the event card page uses registrationId from the URL).
       Files: `app/api/member/event-card/[registrationId]/route.ts`
       Verify: `npm run build` — no TS errors.

---

## Part 8 — Email: Event Registration Confirmation

- [ ] 17. Add `sendEventRegistrationConfirmation()` to `lib/utils/email.ts`.
       Signature: `(email: string, fullName: string, eventTitle: string, eventDate: Date, eventLocation: string, eventCardRef: string, dashboardUrl: string): Promise<void>`.
       Subject: `"You're registered for ${eventTitle}!"`.
       Body: use `emailHeader('Events & Activities')` pattern; show event title, formatted date (`toLocaleDateString('en-GB', { weekday:'long', year:'numeric', month:'long', day:'numeric' })`), location, event card ref in monospace box, link to `dashboardUrl`. Footer: `"This is an automated message. Please do not reply to this email."` matching `sendApprovalEmail` footer pattern.
       Call this function from both the free and paid (post-verify) registration flows in items 10 and 11.
       Files: `lib/utils/email.ts`
       Verify: `npm run build` — no TS errors.

---

## Ambiguities & Decisions

1. **Notification type for new_event**: The existing `Notification` model's `type` enum only has `'new_registration' | 'payment_received' | 'general'`. The plan adds `'new_event'` to the enum. This requires modifying the model (item 3).

2. **Registration count in events list API**: The GET `/api/admin/events` will return `registrationCount` per event using `Promise.all(events.map(e => EventRegistration.countDocuments({ eventId: e._id })))` — avoids a separate API call per row from the UI.

3. **Event card ref for paid events**: The `eventCardRef` is generated upfront when the `EventRegistration` is created (before payment). The Paystack `reference` is set to this `eventCardRef` so that the verify route can find the registration by `eventCardRef` after callback.

4. **`qrcode` library**: Already installed. The plan uses a CSS grid div placeholder for the QR code on the membership card (no real QR encoding needed since `/verify-member` page already exists). If a real QR code image is desired, `qrcode.toDataURL(url)` can be called in a `useEffect` and rendered as an `<img>`.

5. **Member dashboard `isPaid` check for Events tab**: The existing `PaymentRequiredNotice` guard stays — events tab requires the member's membership fee to be paid, consistent with all other tabs.

6. **Admin Events page dark theme**: Uses the same pattern as the existing admin dashboard — no shadcn `<Card>` with white bg; instead raw divs with `background: rgba(255,255,255,0.04)` and white text, matching what the dark layout already does.
