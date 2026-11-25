# Membership form, payment and dashboard

## Member workflow

1. Sign in or create your member account with a Google account whose email is verified. See [Google sign-in setup](./GOOGLE_SIGNIN.md).
2. Complete the membership form and save it. This stores a complete application under your account with one application reference.
3. On the next page, choose **Yes** if you already paid the registration fee directly to an administrator. This submits your application and sends a payment report to **Admin Panel → Payments → Registration fee review**. An Admin or Super Admin must verify receipt before the application can be accepted. Choose **No** to continue to Paystack or bank-transfer payment.
4. Paystack confirms successful payments automatically. A bank transfer remains unconfirmed until an authorised administrator verifies receipt. Confirmed Paystack or bank payments submit the saved form automatically. An in-person report submits it immediately, but payment must still be confirmed before the application can be accepted.
5. The administrator reviews the paid application. Membership approval and the membership card remain subject to that review.

After the first complete save, the **Complete Your Profile** prompt disappears. The dashboard provides separate **Edit form** and **Registration payment** tabs. Edit form reopens the saved fields so the member can change them and save again. Registration payment shows the registration payment's current status and available payment controls. Quarterly dues and the shared payment directory remain available in **Quarterly payments**.

Editing the same application preserves its application reference, confirmed payment, review status, membership number and existing administrator remarks. It does not create another application, require another registration payment or reset an approval. The email field belongs to the signed-in account and cannot be used to edit another person's form.

When signed-in members or administrators return to the homepage, the membership sign-up/sign-in buttons are replaced by **View Dashboard**. That link opens the normal member dashboard; administrators can still enter administration through **Admin Panel**.

## Application states

| State | Meaning | Available for formal admin review? |
| --- | --- | --- |
| Saved, unpaid | A complete form is stored, awaiting confirmed registration payment. | No |
| Pending, payment verification | The application is submitted; an administrator must confirm the in-person payment before it can be accepted. | No |
| Pending, payment report rejected | The in-person payment report was not confirmed. The application remains submitted but unpaid; the member can retry the report or pay online. | No |
| Pending, paid | Payment was confirmed and the submitted application is available for acceptance review. | Yes |
| Approved, paid | The administrator approved the submitted application. | Already reviewed |
| Rejected, paid | The administrator rejected the submitted application. | Already reviewed |

The registration payment is separate from the ₦2,000 quarterly association dues. See [Payments guide](./PAYMENTS_GUIDE.md) for dues, contribution counts and payment directories.

Older applications that were marked Pending before payment are withheld from the formal review list until their registration payment is confirmed. Their existing details and application references are preserved. Administrators may inspect saved/unpaid records for bank-transfer verification, but cannot approve or reject them before payment.

Admins and Super Admins open **Admin Panel → Payments → Registration fee review** (`/admin/dashboard/payments`) to verify bank transfers and in-person payment reports. An in-person report submits the application immediately, but the application remains unavailable for acceptance until payment is confirmed. Admins may reject an unconfirmed in-person report with a reason; the applicant is emailed and can retry the report or continue to online payment. This does not reject the membership application. After payment confirmation, open the linked application or **Applications** to accept or reject it. Verifier accounts can inspect this payment list but cannot confirm or reject payment reports.

## Payment confirmation

Paystack confirmation checks successful transaction status, expected amount, NGN currency, payment reference and payer email. A successful browser callback or signed webhook confirms payment and submits the saved form in one database update. Browser checkout and verification require the member's verified account and are limited to that member's linked application. The signed webhook also confirms payment if the member closes the browser. Repeated confirmation requests do not create additional applications or resubmit an already-reviewed application.

Bank-transfer and in-person payment verification are restricted to administrators authorised to edit applications. Confirmations are recorded with their method, reference, amount, date and audit trail. Bank-transfer confirmation submits the saved form; in-person confirmation makes the already-submitted application available for acceptance review. Repeating the confirmation cannot produce a second registration payment.

Application confirmation messages and new-registration notifications are triggered after the first confirmed registration payment, rather than when an unpaid form is saved.

## Storage and endpoints

| Endpoint | Purpose |
| --- | --- |
| `POST /api/register` | Save or update the authenticated member's complete form. |
| `GET /api/member/draft` | Load the member's partial draft or complete saved form for editing. |
| `POST /api/member/draft` | Save an in-progress form draft without submitting an application. |
| `GET /api/member/me` | Return the dashboard's current form, application and payment state. |
| `POST /api/payment/initialize` | Start Paystack checkout for the signed-in member's own saved form. |
| `GET /api/payment/verify` | Verify Paystack confirmation and automatically submit a saved application. |
| `POST /api/payment/webhook` | Process signed payment notifications and automatically submit a saved application. |
| `GET /api/admin/registration-payments` | Return saved/unpaid registration forms for bank-payment verification. |
| `POST /api/admin/applications/[id]/mark-paid` | Verify a received bank transfer and automatically submit the saved application. |
| `POST /api/admin/applications/[id]/reject-payment-claim` | Reject a pending in-person payment report, record the reason, and notify the member. |

The Member record links to its single Applicant record. Applicant status distinguishes Saved forms from submitted Pending applications. `submittedAt` is set when payment is confirmed or an in-person payment report submits the application; saving an unpaid form does not set that date.

## Validation

The isolated registration tests mock authentication cookies, model queries, email delivery and payment responses. They cover ownership, repeated form saves, editing a paid application, automatic submission, repeat payment callbacks and the exclusion of unpaid applications from formal review. They do not charge Paystack, send real email or modify configured accounts.

Dashboard pages also apply legible dark text to white tables, inputs and panels, including the administrator's event lists.

Verification completed: 101 isolated portal tests passed, including 23 registration and six login-response tests. Twelve production browser checks covered signed-in/signed-out homepage actions, saved-form editing and save-to-payment navigation, bound account email, registration checkout instructions, dashboard contrast and mobile layout. The checks used intercepted fixtures, with no real payment, email or registration-form changes.

The login page now handles unexpected HTML/API failures with a retry message instead of displaying a JSON parser error. Email input is normalized; valid JSON credential and verification messages are preserved. A real sign-in with the configured Super Admin account was checked on the development and production servers.

Run the focused checks using `npm run test:registration` and `npm run test:login`. Date-only birth and declaration dates are displayed without changing their calendar day in the reader's timezone.
