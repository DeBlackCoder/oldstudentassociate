# Programmes, welfare, scholarships and meeting minutes

## What was built

The association now has a database-backed community portal. Administrators can create, preview, edit, publish and archive programmes, welfare initiatives, scholarships and past meeting minutes. The homepage and Activities page display live published content through section tabs. No sample names, donations or scholarship awards are inserted into the database.

The follow-up work adds password recovery, quarterly dues, member payment/contribution directories and landing-page highlights. See [Payments guide](./PAYMENTS_GUIDE.md) and [Password recovery guide](./PASSWORD_RECOVERY.md) for the account and payment workflows.

Membership forms now stay **Saved** until the one-time registration payment is confirmed. That confirmation submits the form automatically for review. Completed forms reopen through **Edit form**, and **Registration payment** has its own dashboard tab alongside **Quarterly payments**. The signed-in homepage shows **View dashboard**. Dashboard white surfaces use black text. See the [registration guide](./REGISTRATION_GUIDE.md) for this workflow.

| Section | Visitors without an account | Verified member accounts | Administrators |
| --- | --- | --- | --- |
| Programmes | Read published details | Read published details | Manage records |
| Welfare | Read published details, donor names and beneficiary names | Same public access | Manage initiatives and named entries |
| Scholarships | Read opportunities and requirements | Apply, track decisions and withdraw pending applications | Manage opportunities and review applications |
| Meeting minutes | Sign-in required | Read all published minutes, even before membership payment/approval | Manage and read minutes |

Admin and Super Admin accounts can make changes. Verifier accounts have read-only access to the new admin sections. Every protected request checks the account in the database; deactivated admin accounts cannot use these features even if they have an unexpired cookie.

## Where to find the features

| Page | Address |
| --- | --- |
| Homepage community tabs | `/` |
| Public activities hub | `/activities` |
| Programmes | `/programmes` |
| Public welfare | `/welfare` |
| Scholarships | `/scholarships` |
| Member programmes tab | `/members/dashboard?tab=programmes` |
| Member welfare tab | `/members/dashboard?tab=welfare` |
| Member scholarships and applications | `/members/dashboard?tab=scholarships` |
| Member minutes tab | `/members/dashboard?tab=minutes` |
| Standalone meeting minutes | `/members/minutes` |
| Admin programmes / community editor | `/admin/dashboard/community` |
| Admin welfare | `/admin/dashboard/welfare` |
| Admin scholarships | `/admin/dashboard/scholarships` |
| Admin meeting minutes | `/admin/dashboard/minutes` |
| Member quarterly dues and payment/contribution lists | `/members/dashboard?tab=payments` |
| Admin payment review | `/admin/dashboard/payments` |
| Password recovery | `/forgot-password` |

Public navigation and footer links lead to the public sections. The member dashboard includes the four new tabs on desktop and in its mobile menu. The admin sidebar links to the four editing sections. The admin community portal also includes an Applications tab for scholarship review.

## Interface improvements

Public and member sections use the association's green, cream and gold palette, with icon navigation, clear headings and responsive content cards. Programme cards show their date, venue and fee before expanding. Welfare cards show donor/beneficiary counts and names, with full tables in the details. Scholarship cards show the award amount, available awards, deadline and application-window status. Meeting cards highlight their date, chairperson, decision count and action-point count.

Readers can search all full text and use category filters, scholarship-window filters or meeting-year filters when multiple choices are available. Upcoming programmes appear first, open scholarship opportunities precede closed ones, and minutes are ordered by meeting date. Loading placeholders, helpful empty states and retry controls handle loading/error cases.

The homepage shows the five newest created records in each public tab, with a link to the full list. Before those tabs, an automatic right-to-left strip highlights programmes, welfare and scholarships. It pauses on hover or with its Pause button, and provides a stable scrolling row for keyboard users and reduced-motion preferences. Empty sections show clearly labelled example ideas; these do not create database records.

Admin pages use the existing dark dashboard style, with published/draft/archive counts, compact record actions and search/visibility filters. Forms group overview and section details, provide a clear text-upload control and keep Save/Preview controls visible at the bottom. The navigation adapts to smaller screens, and the chat hint is hidden on mobile so it does not cover page controls.

## Publishing and editing

Administrators also have a normal member account. Signing in opens `/members/dashboard`, where they can use the normal tabs, application/profile flow, events, programmes, welfare, scholarships and minutes. **Admin Panel** in the account header or mobile menu switches to `/admin/dashboard`. **My Account** in the admin header, profile menu or mobile sidebar returns to the normal dashboard without signing in again.

An administrator's member account is created/linked automatically after successful admin authentication. If a member account already exists for that email, its password, profile, saved drafts, application and payment data are preserved. Already signed-in administrators with an admin-only cookie can also access normal account features immediately. The normal membership payment/approval requirements still apply to membership cards and event registration. Admin role permissions apply in the Admin Panel. Signing out from either area clears both sessions.

1. Sign in with an active Admin or Super Admin account.
2. Open one of the new admin sidebar sections.
3. Choose **Create record** and enter its title, summary, full text and section-specific details.
4. Choose a visibility state and use **Preview** to review how readers will see the information.
5. Save the record. Published records appear on reader pages when those pages load or refresh.
6. Use **Edit** to revise any field or change visibility. Search and visibility filters help find existing records.

| Visibility | Behaviour |
| --- | --- |
| Draft | Only administrators can see the record. Required fields must still be completed to save. |
| Published | Public for programmes, welfare and scholarships; restricted to verified members and active administrators for minutes. |
| Archived | Hidden from readers and retained for admin reference. |

**Archive** asks for confirmation and hides a record without deleting its history. To restore it, edit the archived record and choose Published or Draft. Changes are logged through the existing AuditLog collection. Text is rendered as plain text, with line breaks preserved; uploaded HTML is never executed.

## Programmes

Each programme includes:

- Title, summary and a full description.
- Category, organiser and contact email.
- Start date/time, optional end date/time and venue or online format.
- Who can participate, objectives and an optional capacity.
- Participation fee in naira, with zero shown as Free.
- Optional registration link and a schedule containing times/session labels and activities.

Readers can expand a programme to see all details, contact the organiser by email, or follow its registration link. Programme registration links point to the registration form or service chosen by the administrator; this module does not create a separate programme booking/payment workflow. The existing Events system remains available for event attendance registration.

Date/time inputs use the administrator's device time zone and are stored as ISO timestamps. Reader-facing date/time information is displayed in West Africa Time (WAT). Date-only welfare entries and action deadlines retain their calendar date.

## Welfare

An initiative includes its purpose and full description, support category, start date, optional end date, contact email and an optional fundraising target.

Use **Add donor** and **Add beneficiary** to maintain the named records. Each entry contains:

- Full name.
- Optional membership number to link member contribution/support counts reliably.
- Optional donation or support amount/value, entered in naira.
- Optional date.
- Contribution/support description.

Administrators can edit or remove individual entries before saving. When Published, the names and entered details are visible to members and visitors without signing in. The editor reminds administrators that this information will be public.

Reader pages show separate donor and beneficiary tables. An omitted amount is displayed as **Not disclosed**; a recorded zero remains zero. Donation/support totals sum only the amounts entered. A target is displayed when supplied.

This is a welfare record and recognition feature. It does not collect online donations, transfer funds to beneficiaries, or independently verify financial transactions. The contact link lets visitors enquire about contributing or receiving support.

## Meeting minutes

Every minutes record contains:

- Title, summary and full meeting text.
- Meeting date/time and venue/format.
- Chairperson and recording secretary.
- Attendees and optional apologies.
- Agenda/discussion pointers.
- Decisions and resolutions.
- Action points, including the action, responsible person, optional due date and progress.
- Optional next meeting date/time.

Action progress can be Open, In Progress or Completed. Administrators can revisit the minutes and update progress. Published records are listed with the most recent meeting first and support text search.

### Uploading meeting text

1. Open the Meeting minutes editor.
2. Upload a UTF-8 `.txt` or `.md` file, or paste text directly into Full meeting minutes.
3. A file can be up to 200 KB and its text can contain up to 100,000 characters.
4. Uploading loads the file text into the editor and replaces the existing full-text field. Review it before saving.
5. Fill the meeting metadata, agenda, decisions and action points separately, then Preview and Save.

The text is stored in MongoDB when the record is saved; the original file is not stored separately. Markdown files are displayed as plain text. PDF/Word uploads and automatic extraction of names/actions from the text are not part of this implementation. Published minutes must be for a meeting that has already happened.

All verified member accounts can read Published minutes. Membership fee payment, profile completion and application approval are not required. Anonymous visitors cannot read them through either the list or individual-record API. Administrators can preview minutes in the editor and read them on the standalone minutes page.

## Scholarships

### Creating an opportunity

Enter:

- Title, summary, full description and sponsor.
- Eligible academic level(s).
- Award amount per recipient in naira and number of available awards.
- Opening date/time and application deadline.
- Eligibility criteria, one per line.
- Required document names, one per line.
- Selection process/award terms and enquiries email.

Award amounts must be positive, award slots must be positive whole numbers, and the deadline must follow the opening time. The website labels the application window Upcoming, Open or Closed. Only Published opportunities within their opening/deadline window accept applications. Closing dates are enforced by the server as well as the interface.

### Applying

1. Open a Published scholarship and expand its details.
2. Check the eligibility, award terms, required documents and deadline.
3. Sign in, or create and verify an account. An approved/paid association membership is not required to apply.
4. Select **Start application**.
5. Enter full name, phone number, institution, course, academic level, academic result and a personal statement of at least 100 characters.
6. Provide an HTTP/HTTPS link for every required document. Shared links must grant reviewers access; files are not uploaded to this portal.
7. Confirm the accuracy declaration and submit.

The account email and account ownership are assigned by the server, not supplied by the applicant. One application per account per scholarship is enforced by a MongoDB unique index, including concurrent submissions.

### Tracking and withdrawal

The member Scholarships tab lists that account's applications, document links, submitted dates, review dates, status and applicant-facing feedback. Applications remain available in the account even if their opportunity is later archived.

Submitted or Under Review applications can be withdrawn after confirmation. A Withdrawn application cannot be resubmitted for that same opportunity. Approved and Rejected applications cannot be withdrawn.

### Admin review

Open **Scholarship applications** in the admin community portal. Search by applicant, institution, email or scholarship, and filter by status. Open an application to inspect its details and document links.

Admins can set Under Review, Approved or Rejected. Rejections require feedback explaining the decision. Applicant feedback is shown in the member dashboard. Internal review notes are available only to administrators and are excluded from member API responses. A withdrawn application cannot be reviewed or reopened. Review decisions are audit logged.

Scholarship eligibility is assessed by administrators using the published criteria and supporting documents. An approval records the association's decision; it does not trigger a bank payment or automatically allocate/disburse funds. Administrators remain responsible for checking the available number of awards before approving recipients. Decisions are visible in the dashboard; this module does not send scholarship decision emails.

## Technical implementation

The new features use the existing Next.js application, authentication cookies and MongoDB connection. No additional environment variables or dependencies are required.

| Collection | Purpose |
| --- | --- |
| CommunityContent | Typed programme, welfare, scholarship and minutes records, visibility, admin ownership and timestamps. |
| ScholarshipApplication | Applicant information, document links, review status, feedback, private notes and ownership. |
| AuditLog (existing) | Content creation/editing/archiving and scholarship reviews. |

Content details are validated by section-specific Zod schemas before saving. Invalid dates, negative amounts, unsafe URL protocols, oversized content and unknown fields are rejected. Application data is isolated by the signed-in account. Public responses use an explicit projection that omits administrator identities.

MongoDB/Mongoose creates the new collections and indexes as the features are used. The application route waits for its unique index before accepting scholarship applications. No seed script or data migration is required.

| API | Purpose / access |
| --- | --- |
| `GET /api/community?kind=programmes\|welfare\|scholarships\|minutes` | Published records; minutes require member/admin access. |
| `GET /api/community/[id]` | Individual Published record with the same visibility/access rules. |
| `GET /api/admin/community?kind=...` | All states of a section; active admins. |
| `POST /api/admin/community` | Create; Admin/Super Admin. |
| `PUT /api/admin/community/[id]` | Validated complete edit; Admin/Super Admin. |
| `DELETE /api/admin/community/[id]` | Archive; Admin/Super Admin. |
| `POST /api/community/[id]/apply` | Apply for an open scholarship; verified member account. |
| `GET /api/member/scholarships` | Current account's applications and feedback. |
| `DELETE /api/member/scholarships/[id]` | Withdraw current account's eligible application. |
| `GET /api/admin/scholarship-applications` | Admin application list; optional scholarshipId/status filters. |
| `PATCH /api/admin/scholarship-applications/[id]` | Review; Admin/Super Admin. |

New code is primarily in `components/community/`, `lib/community/`, the two new models, and the API routes above. The existing events, membership payment and application approval flows retain their current responsibilities.

## Validation and operating checklist

Follow-up validation: production build, TypeScript and targeted ESLint passed. All 72 isolated tests passed: 16 community, 13 account integration, 28 payments and 15 password recovery. Fourteen production-browser checks passed for member/admin payments, bank-transfer forms and review, contribution directories, recovery forms, automatic callback verification, five-item landing limits, right-to-left highlights and mobile layout. Browser checks used intercepted API fixtures and reported no runtime exceptions.

The Super Admin account update and real production login were verified against the configured database, including normal-account access and Admin Panel permissions. The live member/admin dues APIs returned successfully, and directory privacy and anonymous-access restrictions were checked. No real payment was initiated and no test emails were sent. SMTP connection verification timed out even with network permission, so delivery requires a reachable configured mail server.

Run the targeted tests with:

```powershell
npm run test:community
```

The feature tests cover the four record schemas, donor/beneficiary values, invalid/reversed dates, scholarship windows and awards, required documents, unsafe links, account-field injection, review feedback, withdrawal rules, past-meeting publication, editor normalisation and public projections. The targeted test suite passes, and the new feature files pass ESLint.

Production builds and TypeScript checks pass. Live HTTP checks verified all three public lists/pages and the anonymous-access restrictions for the new admin APIs, minutes, scholarship applications and withdrawal/review routes. Headless desktop/mobile browser checks verified welfare search, no horizontal overflow, scholarship application controls, the welfare admin editor and a real text-file selection loading into the minutes editor. Browser UI checks used intercepted fixtures, so no sample donor, beneficiary, applicant or minutes records were written to the configured database. A complete review/award lifecycle with real user accounts has not been exercised against that database; the manual checklist below covers it.

Type-check the project with:

```powershell
npx tsc --noEmit --incremental false
```

Build with `npm run build`. The application still requires its existing MongoDB/auth configuration, and its existing Google font setup requires network access during a fresh production build.

For a manual acceptance check in a development database:

1. Create one record in each section as Draft and confirm it is absent from reader pages.
2. Preview and publish a programme; check the objectives, schedule, fee and contact link.
3. Publish welfare with a donor and beneficiary; check both names while signed out, including an undisclosed amount.
4. Upload and publish past meeting text; check metadata, agenda, decisions and action points from a member account.
5. Confirm signed-out requests for minutes are rejected.
6. Publish an open scholarship with document requirements; submit an application from a verified account.
7. Confirm another submission from that account is rejected.
8. Review the application and check applicant feedback appears without internal notes.
9. Withdraw a separate pending application; confirm it cannot be approved or resubmitted.
10. Archive and restore content; confirm reader visibility follows the saved state.
11. Sign in as a Verifier and confirm editing/review actions are unavailable and write APIs reject them.

The checks do not populate the configured database with demonstration data or send emails to members. Real content must be entered and published by administrators.
