// Clean modern quote email (Stripe/Linear-inspired).
// - Single-column, mobile-first layout
// - One prominent CTA per option
// - Real @media breakpoints
// - Logo via CID attachment (cid:logo)
// - Persistent quote link clearly highlighted so customers can return to it
//
// The caller is responsible for:
//   - Attaching the logo: { filename: 'logo.png', path: ..., cid: 'logo' }
//   - Setting `from` / `replyTo`

const BRAND_ORANGE = '#EE9844';
const BRAND_DARK = '#1a1a1a';
const BRAND_MUTED = '#6b7280';
const SURFACE = '#ffffff';
const BG = '#f6f7f9';
const BORDER = '#e5e7eb';
const SUCCESS = '#16a34a';

function formatMoney(n) {
    return '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function monthlyPayment(total, months, aprPct) {
    if (!aprPct) return total / months;
    const r = aprPct / 100 / 12;
    return total * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

function scopeLines(option, measurements) {
    const items = [];
    const m = measurements || {};
    if (option === 'optionA') {
        if (m.firstFloor > 0) items.push(`GutterSnap protection on ${m.firstFloor} ft of 1st floor gutters`);
        if (m.secondFloor > 0) items.push(`GutterSnap protection on ${m.secondFloor} ft of 2nd floor gutters`);
        if (m.thirdFloor > 0) items.push(`GutterSnap protection on ${m.thirdFloor} ft of 3rd floor gutters`);
        items.push('Premium micro-mesh guard with custom-fitted aluminum frame');
        if (m.downspoutFeet > 0) items.push(`${m.downspoutFeet} ft of downspout installation`);
        if (m.endCaps > 0) items.push(`${m.endCaps} end caps`);
        if (m.miters > 0) items.push(`${m.miters} miter joints`);
        items.push('System testing, full cleanup, and 30-year warranty');
    } else {
        if (m.firstFloor > 0) items.push(`Remove and replace ${m.firstFloor} ft of 1st floor gutters + install GutterSnap`);
        if (m.secondFloor > 0) items.push(`Remove and replace ${m.secondFloor} ft of 2nd floor gutters + install GutterSnap`);
        if (m.thirdFloor > 0) items.push(`Remove and replace ${m.thirdFloor} ft of 3rd floor gutters + install GutterSnap`);
        items.push('New commercial-grade aluminum gutters throughout');
        items.push('Premium micro-mesh guard with custom-fitted aluminum frame');
        if (m.downspoutFeet > 0) items.push(`${m.downspoutFeet} ft of new downspout installation`);
        if (m.endCaps > 0) items.push(`${m.endCaps} sealed end caps and miter joints`);
        items.push('System testing, full cleanup, and 30-year warranty');
    }
    return items;
}

function optionBlock({ title, blurb, total, acceptUrl, option, measurements }) {
    const terms = [
        { months: 12, rate: 0 },
        { months: 24, rate: 3.99 },
        { months: 36, rate: 5.99 },
        { months: 60, rate: 7.99 }
    ];

    const lines = scopeLines(option, measurements)
        .map(item => `<li style="padding:4px 0;color:${BRAND_MUTED};font-size:14px;line-height:1.5;">${item}</li>`)
        .join('');

    const financingRows = terms.map(t => {
        const m = monthlyPayment(total, t.months, t.rate).toFixed(2);
        const aprLabel = t.rate === 0
            ? `<span style="color:${SUCCESS};font-weight:600;">0% APR</span>`
            : `${t.rate}% APR`;
        return `<tr>
            <td style="padding:8px 0;color:${BRAND_MUTED};font-size:13px;">${t.months} mo — ${aprLabel}</td>
            <td style="padding:8px 0;text-align:right;color:${BRAND_DARK};font-weight:600;font-size:14px;">$${m}/mo</td>
        </tr>`;
    }).join('');

    return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${SURFACE};border:1px solid ${BORDER};border-radius:12px;margin:0 0 16px 0;">
        <tr><td style="padding:24px;">
            <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:${BRAND_ORANGE};font-weight:600;margin-bottom:4px;">${title}</div>
            <div style="font-size:15px;color:${BRAND_MUTED};margin-bottom:20px;">${blurb}</div>

            <div style="font-size:32px;font-weight:700;color:${BRAND_DARK};line-height:1;margin-bottom:4px;">${formatMoney(total)}</div>
            <div style="font-size:13px;color:${BRAND_MUTED};margin-bottom:20px;">Total investment, includes tax and materials.</div>

            <a href="${acceptUrl}" style="display:block;background:${BRAND_ORANGE};color:#ffffff;text-decoration:none;text-align:center;padding:14px 20px;border-radius:8px;font-weight:600;font-size:15px;margin-bottom:20px;">
                Review &amp; accept this option →
            </a>

            <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:${BRAND_DARK};font-weight:600;margin:8px 0;">What's included</div>
            <ul style="margin:0 0 20px 0;padding:0 0 0 18px;">${lines}</ul>

            <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:${BRAND_DARK};font-weight:600;margin:8px 0;">Financing (optional)</div>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid ${BORDER};">
                ${financingRows}
            </table>
            <div style="font-size:11px;color:${BRAND_MUTED};margin-top:8px;">Subject to credit approval. Reply to this email to apply.</div>
        </td></tr>
    </table>`;
}

/**
 * Build the customer-facing quote email.
 *
 * @param {Object} params
 * @param {Object} params.quote          - formatted quote from airtableService
 * @param {string} params.baseUrl        - e.g. "https://guttersnapchicago.com"
 * @param {string} params.ownerName      - owner full name ("Max McCaulley")
 * @param {string} params.ownerEmail     - owner email for signature
 * @param {Object} [params.links]        - { optionA, optionB, portal } override URLs
 * @param {boolean} [params.isResend]    - shows a gentle "just resending this" note
 * @returns {string} HTML
 */
function generateQuoteEmail({ quote, baseUrl, ownerName, ownerEmail, links = {}, isResend = false }) {
    const hasA = !!(quote.optionA && quote.measurements.retrofitPossible);
    const optionAUrl = links.optionA || `${baseUrl}/accept-quote-enhanced.html?id=${quote.quoteId}&option=optionA`;
    const optionBUrl = links.optionB || `${baseUrl}/accept-quote-enhanced.html?id=${quote.quoteId}&option=optionB`;
    const portalUrl = links.portal || `${baseUrl}/my-quote.html?id=${quote.quoteId}`;

    const validUntil = quote.validUntil
        ? new Date(quote.validUntil).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : '';

    const resendNote = isResend ? `
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px 16px;margin:0 0 20px 0;font-size:13px;color:#9a3412;">
            Just a quick resend in case the original got buried — everything below is still live.
        </div>
    ` : '';

    const optionsHtml = hasA
        ? optionBlock({
            title: 'Option A — Protection only',
            blurb: 'Keep your existing gutters, add the GutterSnap protection system on top.',
            total: quote.optionA.total,
            acceptUrl: optionAUrl,
            option: 'optionA',
            measurements: quote.measurements
          }) + optionBlock({
            title: 'Option B — Full replacement',
            blurb: 'New commercial-grade gutters with GutterSnap protection — a complete, warrantied system.',
            total: quote.optionB.total,
            acceptUrl: optionBUrl,
            option: 'optionB',
            measurements: quote.measurements
          })
        : optionBlock({
            title: 'Your recommended package',
            blurb: 'Based on our inspection, we recommend a complete system replacement for the best results.',
            total: quote.optionB.total,
            acceptUrl: optionBUrl,
            option: 'optionB',
            measurements: quote.measurements
          });

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your GutterSnap quote</title>
<style>
    body { margin:0; padding:0; background:${BG}; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color:${BRAND_DARK}; }
    a { color:${BRAND_ORANGE}; }
    .wrapper { max-width: 600px; margin: 0 auto; padding: 32px 16px; }
    .card { background:${SURFACE}; border:1px solid ${BORDER}; border-radius:16px; overflow:hidden; }
    .header { padding: 32px 32px 24px 32px; border-bottom: 1px solid ${BORDER}; }
    .body { padding: 24px 32px 16px 32px; }
    .footer { padding: 24px 32px 32px 32px; background: #fafafa; border-top: 1px solid ${BORDER}; color: ${BRAND_MUTED}; font-size: 13px; }
    .brand { font-size: 22px; font-weight: 700; color: ${BRAND_ORANGE}; letter-spacing: -0.01em; }
    h1 { margin: 16px 0 8px 0; font-size: 22px; line-height: 1.3; color: ${BRAND_DARK}; font-weight: 700; }
    p  { margin: 0 0 12px 0; font-size: 15px; line-height: 1.6; color: #374151; }
    .muted { color: ${BRAND_MUTED}; font-size: 13px; }
    .portal-pill { display: inline-block; background: #fff7ed; color: #9a3412; border: 1px solid #fed7aa; padding: 8px 14px; border-radius: 999px; font-size: 13px; font-weight: 500; text-decoration: none; }
    .divider { height:1px; background:${BORDER}; margin: 24px 0; }
    .sig { margin-top: 8px; padding-top: 16px; border-top: 1px solid ${BORDER}; font-size: 14px; }
    @media only screen and (max-width: 600px) {
        .wrapper { padding: 16px 0; }
        .card { border-radius: 0; border-left: none; border-right: none; }
        .header, .body, .footer { padding-left: 20px; padding-right: 20px; }
        h1 { font-size: 20px; }
    }
</style>
</head>
<body>
    <div class="wrapper">
        <div class="card">
            <div class="header">
                <img src="cid:logo" alt="GutterSnap" width="48" height="48" style="display:block;border:0;margin-bottom:16px;">
                <div class="brand">GutterSnap<span style="font-size:0.6em;vertical-align:super;">™</span></div>
                <h1>Here's your custom quote, ${quote.customer.name ? quote.customer.name.split(' ')[0] : 'there'}.</h1>
                <p class="muted">Prepared for ${quote.customer.address} • Quote #${quote.quoteId}${validUntil ? ` • valid through ${validUntil}` : ''}.</p>
            </div>
            <div class="body">
                ${resendNote}
                <p>Thanks for letting us take a look. Below is what we'd recommend — click either option to review the full details and e-sign.</p>

                <div style="margin-top:24px;">${optionsHtml}</div>

                <div class="divider"></div>

                <p style="margin-bottom:8px;"><strong>Can't find this email later?</strong> Bookmark your quote page — it's always available at the link below.</p>
                <a href="${portalUrl}" class="portal-pill">${portalUrl}</a>

                <div class="divider"></div>

                <p><strong>Included with every install</strong></p>
                <ul style="margin:0 0 0 18px;padding:0;color:#374151;font-size:14px;line-height:1.7;">
                    <li>30-year transferable warranty on materials and workmanship</li>
                    <li>Certified technicians, fully licensed and insured</li>
                    <li>Free annual maintenance inspection for the first year</li>
                </ul>

                <div class="sig">
                    Have questions? Just reply to this email or call <strong>(847) 443-1395</strong>.<br><br>
                    — ${ownerName}<br>
                    <span class="muted">${ownerEmail}</span>
                </div>
            </div>
            <div class="footer">
                GutterSnap Chicago • Professional gutter protection<br>
                This quote was prepared by ${ownerName}. Quote ID: ${quote.quoteId}.
            </div>
        </div>
    </div>
</body>
</html>`;
}

module.exports = { generateQuoteEmail };
