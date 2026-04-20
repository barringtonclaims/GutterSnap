# GutterSnap Chicago

A full-stack CRM + quoting tool for GutterSnap Chicago: customers submit
self-inspections or technician requests, owners write and send quotes, and
customers review and e-sign them from any device.

- Backend: Node.js + Express, deployed on Vercel.
- Database: Airtable (Customers, Owners, Pricing Configuration, Self
  Inspection Requests, Technician Requests, Quotes).
- Media: Cloudinary (customer photos, signatures).
- Email: Nodemailer + Gmail (per-owner app passwords).

Recent change history lives in [`docs/CHANGELOG.md`](docs/CHANGELOG.md).

## Quick start

```bash
npm install
cp .env.example .env   # fill in values — see below
npm run dev
```

Then open http://localhost:3000.

## Environment variables

Required:

| Var | What |
| --- | --- |
| `AIRTABLE_API_KEY` | Airtable personal access token |
| `AIRTABLE_BASE_ID` | `appXXXX…` base id |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary creds |
| `EMAIL_USER` | main Gmail for system notifications (e.g. `guttersnapp@gmail.com`) |
| `EMAIL_PASS` | Gmail app password for `EMAIL_USER`. **No fallback** — if missing, customer emails will not send. |
| `SESSION_SECRET` | HMAC secret for owner session tokens. Required in production. |
| `PUBLIC_BASE_URL` | e.g. `https://guttersnapchicago.com` — used when building customer links inside emails |

Optional:

| Var | What |
| --- | --- |
| `MAX_EMAIL_PASS`, `JOSH_EMAIL_PASS`, `MATT_EMAIL_PASS`, `IAN_EMAIL_PASS`, `BRODY_EMAIL_PASS` | per-owner Gmail app passwords so quotes are sent from the individual owner's inbox |
| `QUOTE_LINK_SECRET` | dedicated secret for signed customer quote links. Falls back to `SESSION_SECRET`. |
| `MASTER_RESET_SECRET` | if set, unlocks `MASTER_RESET_<prefix>` one-shot password reset tokens |

## Architecture at a glance

```
public/               static customer + owner pages
  index.html          marketing / splash
  self-inspection.*   photo-upload flow
  technician.*        technician-request flow
  quote-calculator.*  owner quote builder
  accept-quote-enhanced.*  customer e-sign page
  my-quote.html       permanent customer quote portal (link-only, no login)
  dashboard.*         owner CRM dashboard
  ownerlogin.*        owner auth
api/index.js          thin Vercel wrapper around server.js
server.js             all HTTP routes
services/
  airtableService.js  single entrypoint for Airtable reads/writes
  cloudinaryService.js Cloudinary uploads (photos, signatures, contracts)
auth/
  ownerAuth.js        HMAC-signed cookie sessions + bcrypt passwords
quotes/
  contractTemplate.js formal HTML contract (used on accept)
  quoteLinks.js       HMAC signing for customer-facing quote URLs
  templates/
    quoteEmail.js         customer quote email (clean modern)
    notificationEmails.js owner notifications: new lead / accepted / declined / reset
```

## Data flow

1. **New lead** — customer submits `self-inspection` or `technician-request`
   form → we `findOrCreateCustomer` → write the request to its own Airtable
   table → auto-assign to first admin → email the assigned owner with a
   direct link to `/dashboard.html`.
2. **Quote created** — owner uses `/quote-calculator.html` → `POST /api/quotes/create`
   → record in `Quotes` + link to `Customer` → customer gets the clean-modern
   quote email with an Option A and/or Option B CTA, plus a persistent link
   to `/my-quote.html?id=…&t=…`.
3. **Quote viewed** — customer hits `/my-quote.html` or
   `/accept-quote-enhanced.html`; `Viewed Count` / `Last Viewed` get bumped.
   Expired quotes flip to `Status=Expired` automatically.
4. **Quote accepted** — customer e-signs; signature uploads to Cloudinary;
   customer gets the formal contract; owner gets a "signed contract"
   notification with the contract HTML attached.
5. **Owner dashboard** — `/dashboard.html` reads `GET /api/dashboard/leads`
   and `/api/dashboard/jobs` (cookie-authed), lists everything the owner is
   assigned to, and exposes **Copy customer link** and **Resend to customer**
   actions on every quote.

## Session model

Sessions are stateless HMAC-SHA256 tokens stored in an HTTP-only `ownerToken`
cookie. Nothing is kept in memory, so sessions survive Vercel cold starts.
See `auth/ownerAuth.js`.

## Deploy

Pushes to `main` deploy automatically on Vercel via `vercel.json`. Set every
required env var in the Vercel project settings before deploying.
