// Owner-facing notification emails (new-lead, quote accepted, quote declined,
// quote resent). Same clean modern style as the customer email.

const BRAND_ORANGE = '#EE9844';
const BRAND_DARK = '#1a1a1a';
const BRAND_MUTED = '#6b7280';
const SURFACE = '#ffffff';
const BG = '#f6f7f9';
const BORDER = '#e5e7eb';

function baseStyles() {
    return `
    body { margin:0; padding:0; background:${BG}; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color:${BRAND_DARK}; }
    .wrapper { max-width: 600px; margin: 0 auto; padding: 32px 16px; }
    .card { background:${SURFACE}; border:1px solid ${BORDER}; border-radius:16px; overflow:hidden; }
    .header { padding: 28px 32px 20px 32px; border-bottom: 1px solid ${BORDER}; }
    .body { padding: 24px 32px; }
    .footer { padding: 20px 32px; background: #fafafa; border-top: 1px solid ${BORDER}; color: ${BRAND_MUTED}; font-size: 12px; }
    .brand { font-size: 18px; font-weight: 700; color: ${BRAND_ORANGE}; letter-spacing: -0.01em; margin-bottom: 8px; }
    h1 { margin: 0 0 6px 0; font-size: 20px; line-height: 1.3; font-weight: 700; }
    p { margin: 0 0 10px 0; font-size: 14px; line-height: 1.6; color: #374151; }
    .row { display: table; width: 100%; padding: 8px 0; border-bottom: 1px solid ${BORDER}; font-size: 14px; }
    .row .k { display: table-cell; color: ${BRAND_MUTED}; width: 140px; padding-right: 12px; }
    .row .v { display: table-cell; color: ${BRAND_DARK}; }
    .cta { display: inline-block; background: ${BRAND_ORANGE}; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600; font-size: 14px; }
    .pill { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
    @media only screen and (max-width: 600px) {
        .wrapper { padding: 16px 0; }
        .card { border-radius: 0; border-left: none; border-right: none; }
        .header, .body, .footer { padding-left: 20px; padding-right: 20px; }
        .row .k { display:block; width:auto; padding-right:0; margin-bottom: 2px; font-size: 12px; }
        .row .v { display:block; }
    }
    `;
}

function shell(title, inner) {
    return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>${baseStyles()}</style>
</head><body>
<div class="wrapper"><div class="card">
${inner}
</div></div>
</body></html>`;
}

function row(k, v) {
    if (!v && v !== 0) return '';
    return `<div class="row"><span class="k">${k}</span><span class="v">${v}</span></div>`;
}

/**
 * New self-inspection or technician-request lead notification to owner(s).
 * @param {Object} p
 * @param {string} p.type          - "self-inspection" | "technician"
 * @param {Object} p.lead          - { name, email, phone, address, notes, meetingPreference, preferredDate, preferredTime, photos: {key: url} }
 * @param {string} p.dashboardUrl  - e.g. "https://.../dashboard.html"
 * @param {string} p.recordId      - Airtable record id (for reference)
 */
function generateLeadNotificationEmail({ type, lead, dashboardUrl, recordId }) {
    const isSelf = type === 'self-inspection';
    const label = isSelf ? 'Self-Inspection' : 'Technician Request';

    const photoList = lead.photos
        ? Object.entries(lead.photos)
            .filter(([, url]) => url)
            .map(([key, url]) => `<li style="margin:4px 0;"><a href="${url}" style="color:${BRAND_ORANGE};">${key.replace(/([A-Z])/g, ' $1').toLowerCase().trim()}</a></li>`)
            .join('')
        : '';

    const schedulingRow = !isSelf && lead.meetingPreference
        ? row('Meeting', lead.meetingPreference === 'meet' ? 'Wants to meet with technician' : 'Technician can inspect unattended')
        : '';

    const scheduleDetail = !isSelf && lead.preferredDate
        ? row('Preferred', `${lead.preferredDate}${lead.preferredTime ? ' @ ' + lead.preferredTime : ''}`)
        : '';

    const photosBlock = isSelf && photoList ? `
        <div style="margin-top:16px;">
            <div style="font-size:13px;font-weight:600;color:${BRAND_DARK};margin-bottom:8px;">Uploaded photos</div>
            <ul style="margin:0;padding-left:18px;font-size:13px;color:${BRAND_MUTED};">${photoList}</ul>
        </div>` : '';

    const inner = `
        <div class="header">
            <div class="brand">GutterSnap</div>
            <h1>New ${label} request</h1>
            <p style="margin:0;color:${BRAND_MUTED};">${lead.address || 'Address not provided'}</p>
        </div>
        <div class="body">
            ${row('Name', lead.name || '—')}
            ${row('Email', lead.email)}
            ${row('Phone', lead.phone)}
            ${row('Address', lead.address)}
            ${schedulingRow}
            ${scheduleDetail}
            ${row('Notes', lead.notes || '')}
            ${photosBlock}
            <p style="margin-top:20px;">
                <a href="${dashboardUrl}" class="cta">Open in dashboard →</a>
            </p>
        </div>
        <div class="footer">
            Airtable record: ${recordId || '—'}
        </div>
    `;

    return shell(`New ${label} — ${lead.address || lead.name || lead.email}`, inner);
}

/**
 * Internal notification to owner when customer accepts a quote.
 * @param {Object} p
 * @param {Object} p.quote         - formatted quote
 * @param {string} p.selectedOption - "optionA" | "optionB"
 * @param {string} p.contractUrl   - signed contract URL
 */
function generateAcceptanceNotificationEmail({ quote, selectedOption, contractUrl }) {
    const option = selectedOption === 'optionA' ? quote.optionA : quote.optionB;
    const optionName = selectedOption === 'optionA' ? 'Option A — Protection only' : 'Option B — Protection + New gutters';
    const money = '$' + Number(option.total || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    const inner = `
        <div class="header">
            <div class="brand">GutterSnap</div>
            <h1>${quote.customer.name} just signed a contract.</h1>
            <p style="margin:0;color:${BRAND_MUTED};">${quote.customer.address}</p>
        </div>
        <div class="body">
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:20px;">
                <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#166534;font-weight:600;margin-bottom:4px;">Signed contract</div>
                <div style="font-size:28px;font-weight:700;color:#14532d;">${money}</div>
                <div style="font-size:13px;color:#166534;margin-top:4px;">${optionName}</div>
            </div>
            ${row('Customer', quote.customer.name)}
            ${row('Phone', quote.customer.phone)}
            ${row('Email', quote.customer.email)}
            ${row('Address', quote.customer.address)}
            ${row('Quote ID', quote.quoteId)}
            <p style="margin-top:20px;">
                <a href="${contractUrl}" class="cta">View signed contract →</a>
            </p>
            <p style="color:${BRAND_MUTED};">Next step: call the customer to schedule installation.</p>
        </div>
        <div class="footer">
            Contract also attached as an .html file for your records.
        </div>
    `;
    return shell(`Signed contract — ${quote.customer.name} — ${money}`, inner);
}

/**
 * Internal notification to owner when customer declines.
 */
function generateDeclineNotificationEmail({ quote }) {
    const inner = `
        <div class="header">
            <div class="brand">GutterSnap</div>
            <h1>${quote.customer.name} declined their quote.</h1>
        </div>
        <div class="body">
            ${row('Customer', quote.customer.name)}
            ${row('Email', quote.customer.email)}
            ${row('Address', quote.customer.address)}
            ${row('Quote ID', quote.quoteId)}
            <p style="color:${BRAND_MUTED};margin-top:16px;">They indicated they're not ready to proceed. Consider a follow-up in 30 days.</p>
        </div>
    `;
    return shell(`Quote declined — ${quote.customer.name}`, inner);
}

/**
 * Password reset email — clean, modern version.
 */
function generatePasswordResetEmail({ resetUrl }) {
    const inner = `
        <div class="header">
            <div class="brand">GutterSnap</div>
            <h1>Reset your password</h1>
        </div>
        <div class="body">
            <p>Someone asked to reset the password for the GutterSnap Chicago owner portal. If that was you, click below.</p>
            <p style="margin:20px 0;">
                <a href="${resetUrl}" class="cta">Reset password →</a>
            </p>
            <p style="color:${BRAND_MUTED};font-size:13px;">This link expires in 24 hours. If you didn't request this, you can safely ignore this email.</p>
            <p style="color:${BRAND_MUTED};font-size:12px;word-break:break-all;margin-top:16px;">${resetUrl}</p>
        </div>
    `;
    return shell('Reset your GutterSnap password', inner);
}

module.exports = {
    generateLeadNotificationEmail,
    generateAcceptanceNotificationEmail,
    generateDeclineNotificationEmail,
    generatePasswordResetEmail
};
