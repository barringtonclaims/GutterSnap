# GutterSnap changelog

A condensed history of changes that used to live in ~15 separate `*_COMPLETE.md`
files at the root of the repo. Those files were archived in the 2026 cleanup.

---

## 2026-04 — Permanence & continuity cleanup

Goal: make quotes durable, links permanent, and emails professional.

### Phase 1 — correctness bugs
- **Quote-ID vs record-id mismatch fixed.** The owner dashboard was passing
  Airtable record IDs into `airtableService.getQuote` (which expects the short
  Quote ID), so `latestQuote` was silently empty. Added
  `airtableService.getQuoteByRecordId` and switched dashboard calls to it.
- **Stateless sessions.** Replaced the in-memory `activeSessions` Map in
  `auth/ownerAuth.js` with HMAC-signed JWT-style tokens stored in an HTTP-only
  cookie. Sessions now survive Vercel cold starts. Requires `SESSION_SECRET`
  env var in production.
- **`/api/quotes/my-quotes` fixed.** Was previously reading the owner email out
  of the `Authorization` header and passing the session token by mistake. Now
  uses `ownerAuth` middleware and the verified cookie session.
- **Resend quote actually resends.** `/api/quotes/resend/:quoteId` now
  re-renders the clean-modern template and sends via the owner's own
  transporter, logs the resend in the quote's internal notes, and requires the
  caller to own the quote (or be admin).

### Phase 2 — customer portal
- **`/my-quote.html`** is now a permanent, mobile-friendly quote page. No
  login. Handles `sent` / `accepted` / `declined` / `expired` states with
  clear banners and scope lists. The email links to it as the "can't find
  this email later" fallback.
- **Copy-customer-link button** on every quote in the owner dashboard.
- **Expiry enforced on read.** `airtableService.getQuote` will auto-flip a
  quote from `Sent` → `Expired` if the `Valid Until` date has passed and the
  quote isn't terminal. The accept page refuses to load expired quotes.

### Phase 3 — polished emails
- **`quotes/templates/quoteEmail.js`** — a new Stripe/Linear-inspired
  quote email. Single column, one CTA per option, real `@media` breakpoints,
  quote-portal link prominently included so customers can always come back.
- **`quotes/templates/notificationEmails.js`** — unified styling for owner
  notifications: new lead (self-inspection + technician), signed contract,
  decline, password reset. All use a direct link into `/dashboard.html`.
- **Owner names from Airtable.** `OWNER_NAMES` hard-coded map removed. Names
  are now resolved via `airtableService.getOwner(email)` and cached per
  process. This is what finally kills the `Josh [LastName]` placeholder.
- **Inline HTML purged from `server.js`.** Every send path now consumes a
  template module.

### Phase 4 — housekeeping
- **No more hard-coded Gmail passwords.** `EMAIL_PASS` must be set, otherwise
  the main transporter is null and customer emails won't send (loud warning
  at startup instead of silent fallback to a leaked password).
- **Signed quote links.** `quotes/quoteLinks.js` HMACs `quoteId + customer
  email` into a short `t=` param. Both `/accept-quote-enhanced.html` and
  `/my-quote.html` forward the token. Unsigned legacy links still work so
  already-sent quotes don't break.
- **Dead files removed:** `quotes/quotesManager.js`, `quotes/emailTemplates.js`,
  `quotes/quotes.json`, `public/accept-quote.html`, `public/accept-quote.js`,
  and the 15+ loose `*_COMPLETE.md` docs at the repo root (archived here).
- **Uploads hygiene.** `.gitignore` updated, `uploads/` and `server.log`
  purged, and `server.js` now `fs.unlink`s local multer files after they're
  safely mirrored to Cloudinary.

---

## Earlier history (summarized)

### Setup & architecture
- Initial Express + Airtable + Cloudinary setup. CRM tables:
  `Customers`, `Owners`, `Pricing Configuration`, `Self Inspection Requests`,
  `Technician Requests`, `Quotes`. All writes flow through
  `services/airtableService.js`; no local JSON persistence remains.
- Single source of truth for customer→owner assignment: the `Customers.Assigned To`
  linked field. Older per-request owner assignment fields were removed.

### Owner login & quotes
- Bcrypt-hashed passwords for owners (seed passwords rotate through the
  `tempPassword` field in `defaultUsers`). Password reset via signed URL
  tokens, 24-hour expiry.
- Quote calculator generates either an Option A (protection only) or
  Option B (replacement) quote. Financing terms: 0% APR 12 mo, 3.99% 24 mo,
  5.99% 36 mo, 7.99% 60 mo.
- Accept flow captures a drawn signature, uploads it to Cloudinary, and
  emails both customer and owner a formal contract rendered by
  `quotes/contractTemplate.js`.

### Deploy
- Vercel deploy via `vercel.json` → `api/index.js` → `server.js`.
- Required env vars:
  - `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`
  - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
  - `EMAIL_USER`, `EMAIL_PASS` (Gmail app password)
  - `{MAX,JOSH,MATT,IAN,BRODY}_EMAIL_PASS` (owner-specific Gmail app passwords)
  - `SESSION_SECRET` (required in production)
  - `PUBLIC_BASE_URL` (e.g. `https://guttersnapchicago.com`)
  - `MASTER_RESET_SECRET` (optional — enables `MASTER_RESET_<prefix>` tokens)
