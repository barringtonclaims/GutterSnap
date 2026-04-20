// Quote link signing. We keep the existing id-only URLs working (so any
// already-sent quotes still open) but add a signed `t=` parameter to new URLs
// so random Quote ID guessing gets rejected.

const crypto = require('crypto');

function getSecret() {
    if (process.env.QUOTE_LINK_SECRET) return process.env.QUOTE_LINK_SECRET;
    if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
    return crypto.createHash('sha256')
        .update('guttersnap-quote-link-' + (process.env.AIRTABLE_BASE_ID || 'local'))
        .digest('hex');
}

// sign(quoteId, customerEmail) — scoped to the quote + the recipient so a leaked
// link can't be rotated onto a different quote.
function signQuoteLink(quoteId, customerEmail) {
    const payload = `${quoteId}.${String(customerEmail || '').toLowerCase()}`;
    return crypto.createHmac('sha256', getSecret())
        .update(payload)
        .digest('base64')
        .replace(/=+$/, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .slice(0, 16); // short, URL-friendly
}

function verifyQuoteLink(quoteId, customerEmail, providedToken) {
    if (!providedToken) return false;
    const expected = signQuoteLink(quoteId, customerEmail);
    if (expected.length !== providedToken.length) return false;
    try {
        return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(providedToken));
    } catch (e) {
        return false;
    }
}

function buildAcceptUrl(baseUrl, quoteId, option, customerEmail) {
    const t = signQuoteLink(quoteId, customerEmail);
    const params = new URLSearchParams();
    params.set('id', quoteId);
    if (option) params.set('option', option);
    params.set('t', t);
    return `${baseUrl}/accept-quote-enhanced.html?${params.toString()}`;
}

function buildPortalUrl(baseUrl, quoteId, customerEmail) {
    const t = signQuoteLink(quoteId, customerEmail);
    return `${baseUrl}/my-quote.html?id=${encodeURIComponent(quoteId)}&t=${t}`;
}

module.exports = {
    signQuoteLink,
    verifyQuoteLink,
    buildAcceptUrl,
    buildPortalUrl
};
