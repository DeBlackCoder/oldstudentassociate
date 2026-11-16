# Quarterly dues and contribution records

## Member workflow

Open **Quarterly payments** in the normal account dashboard (`/members/dashboard?tab=payments`). Admin accounts use the same account tab, then use **Admin Panel → Payments** for administration. The separate **Registration payment** tab pays the one-time membership registration fee and automatically submits the saved form after confirmation; see the [registration guide](./REGISTRATION_GUIDE.md).

Dues are **₦2,000 every three months**, equivalent to **₦8,000 for a complete year**. This is separate from the existing one-time membership registration fee. Calendar quarters are January–March, April–June, July–September and October–December, using Nigeria's timezone. The ledger starts in 2026. An account owes quarters from its account-creation quarter onward; future quarters are not charged. A new year becomes available automatically. This is a recurring obligation with member-initiated payment, not an automatic card debit.

**My dues** shows eligible quarters and any pending, confirmed or rejected payment. Choose:

1. **Paystack**: the server creates a checkout for the exact quarter and amount. After paying, the callback verifies it and the signed Paystack webhook can also confirm it if the browser closes. A successful payment sets the quarter to Paid automatically.
2. **Bank transfer**: transfer to the bank account configured by the administrator. Enter the transfer reference, sender name and date. The record remains Pending until an administrator checks the actual bank statement and confirms or rejects it. A rejection includes a reason and allows resubmission.

A pending bank claim cannot be paid again until reviewed. Each account/year/quarter has one invoice, protected by a unique database index. Repeated callbacks/webhooks do not create additional paid quarters or increase payment counts. A bank reference can be used for only one quarter. Separate transfers are needed for separate quarters.

## Member payment status

**Member payment status** is visible to every verified account, including accounts awaiting membership approval. It lists verified account holders with their name, membership number/school where available, selected-year payment status, paid quarters and overall payment count. Search and status/year filters help find people.

Paid means all eligible quarters in the selected year have been confirmed. Pending means at least one outstanding quarter has a bank claim awaiting review. Other outstanding quarters remain unpaid. Accounts created after the selected year are shown as Not yet due.

Overall payment count is the sum of confirmed quarterly invoices, one confirmed membership registration payment where present, and confirmed paid event registrations. Free events, failed transactions and unconfirmed bank claims do not count. The directory includes a breakdown so these counts can be interpreted correctly. Transfer references, payer emails, banking evidence and admin notes are excluded from the member directory. They remain available to the payer or administrators as appropriate.

## Welfare contributions

**Welfare contributions** in Payments, also linked from the Welfare tab, lists every verified account and any external donors or beneficiaries found in published welfare records. It shows recorded contribution count, the sum of disclosed contribution values in naira, and the number of support entries received. An omitted donation amount contributes to the count but not to the disclosed total.

Administrators maintain these entries under **Admin Panel → Welfare**. Each donor/beneficiary entry can include an optional **membership number** to link it reliably to a member account. Without this, a unique matching full name is used. Ambiguous names are kept as separate external entries rather than assigning one person's donation to another account.

One donor entry represents one recorded contribution. Counts derive from the currently published records, so editing, removing or archiving an entry changes the displayed totals. Welfare is voluntary: zero contributions means **No recorded contribution**, not an unpaid debt. These records do not collect donations or disburse beneficiary funds.

## Administrator workflow

Open `/admin/dashboard/payments`. Filter the payment list, inspect the member, quarter, amount, sender, date and transfer reference, and compare them with the bank statement. Confirm only money actually received. Rejections require an explanation; members see that feedback and can resubmit.

Only Admin and Super Admin accounts can review. Verifiers can inspect records. The API only reviews Pending bank payments; it cannot manually change a Paystack payment to Paid. Concurrent approvals or approval after a successful Paystack notification cannot double-count the quarter. Review decisions are audit logged.

If a member pays through two separate Paystack checkouts for a quarter already paid, the second successful checkout is flagged as a duplicate. The admin page displays it for reconciliation. It does not create another dues credit or issue an automatic refund; investigate and resolve it through Paystack.

## Required configuration

Use the existing `MONGODB_URI`, `JWT_SECRET`, `PAYSTACK_SECRET_KEY` and `NEXT_PUBLIC_APP_URL`. Keep `MEMBERSHIP_FEE_KOBO` for the separate one-time registration fee; quarterly dues remain fixed at 200,000 kobo.

Configure the association bank account through **Admin Panel → Bank Account**. Configure the Paystack dashboard webhook URL as:

```text
https://YOUR-DOMAIN/api/payment/webhook
```

Set `NEXT_PUBLIC_APP_URL` to the real HTTPS site URL before deployment so checkout callbacks and reset emails return to that site. The current local environment uses a localhost URL and a live Paystack key. No live checkout or charge was created during implementation checks.

Webhook validation follows [Paystack's signature guidance](https://paystack.com/docs/payments/webhooks/); confirmations also check successful status, exact stored amount, NGN currency, checkout reference and payer email, and follow [Paystack's verification guidance](https://paystack.com/docs/payments/verify-payments/). A database outage returns an error so Paystack can retry instead of losing the confirmation.

Existing membership payment confirmation now handles normalized reference formats correctly and verifies the amount/currency/payer. Existing paid event references use Paystack-compatible characters; event confirmation also checks ownership when requested by a member and verifies the fee/payer before updating the registration.

## API and storage

| Endpoint | Access and purpose |
| --- | --- |
| `GET /api/member/dues?year=2026` | Verified account; own quarterly status plus member and welfare directories. |
| `POST /api/member/dues` | Verified account; `{year, quarter, method: "paystack"}` starts checkout, or `method: "bank"` plus `bankReference`, `senderName`, `transferDate` submits a transfer claim. |
| `GET /api/member/dues/verify?reference=...` | Verified account; only verifies its own checkout. |
| `GET /api/admin/dues?status=Pending` | Active admin; review list, permissions and duplicate charges. |
| `PATCH /api/admin/dues/[id]` | Admin/Super Admin; `{decision: "approve" or "reject", note}`. |
| `POST /api/payment/webhook` | Signed Paystack events; automatic dues, membership and event confirmation. |

`DuesPayment` stores the unique quarterly invoice and bank-review trail. `DuesCheckout` stores immutable checkout references, expected amounts and payer identities, including duplicate-charge flags. They are created automatically by Mongoose. Welfare counts use existing `CommunityContent` records. No fabricated payment or donation data is seeded.

For a development/test Paystack account, test successful checkout, duplicate webhook delivery, mismatched amount/currency, cross-account verification, pending transfer, approval/rejection, repeat review, year rollover and a new account's first eligible quarter. Inspect the directory after each confirmation and ensure private transfer details are absent.

Implementation validation passed: 28 isolated payment tests, production build/TypeScript, targeted ESLint, and production-browser checks of dues, bank submission, member/welfare directories, admin approval, Verifier restrictions and the automatic callback. Browser submissions were intercepted fixtures; no actual Paystack transaction or bank claim was created. Live authenticated read-only checks confirmed the configured database responds correctly and private banking fields are excluded from shared member rows.
