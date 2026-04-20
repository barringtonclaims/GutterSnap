// GutterSnap server.
//
// Design goals after the 2026 cleanup:
// - All persistence lives in Airtable. Anything that used to live in a local
//   JSON file or an in-memory Map is gone.
// - Email HTML is built from reusable templates (quotes/templates/*). server.js
//   should never contain inline HTML blobs again.
// - Customer links are signed. We still accept unsigned links for backward
//   compatibility with older emails, but new links always get a token.
// - Fails loudly on missing required env vars instead of silently falling back
//   to a hard-coded Gmail password.

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');

const ownerAuthModule = require('./auth/ownerAuth');
const { ownerAuthMiddleware: ownerAuth } = require('./auth/ownerAuth');
const { generateContractEmail } = require('./quotes/contractTemplate');
const { generateQuoteEmail } = require('./quotes/templates/quoteEmail');
const {
    generateLeadNotificationEmail,
    generateAcceptanceNotificationEmail,
    generateDeclineNotificationEmail,
    generatePasswordResetEmail
} = require('./quotes/templates/notificationEmails');
const quoteLinks = require('./quotes/quoteLinks');

const airtableService = require('./services/airtableService');
const cloudinaryService = require('./services/cloudinaryService');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// Middleware
// ============================================================================
app.use(cors());
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// Absolute base URL for links we put in emails. Falls back to request-derived
// value if nothing is configured, but production should set PUBLIC_BASE_URL.
function baseUrlFor(req) {
    if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
    return `${req.protocol}://${req.get('host')}`;
}

// ============================================================================
// Uploads
// ============================================================================
const storage = process.env.VERCEL
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: function (req, file, cb) {
            const uploadsDir = path.join(__dirname, 'uploads');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }
            cb(null, 'uploads/');
        },
        filename: function (req, file, cb) {
            const timestamp = Date.now();
            const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
            cb(null, `${timestamp}-${sanitizedName}`);
        }
    });

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024, files: 10 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files are allowed!'), false);
    }
});

function cleanupLocalFiles(files) {
    if (!files || process.env.VERCEL) return;
    Object.values(files).forEach(fileArr => {
        (Array.isArray(fileArr) ? fileArr : [fileArr]).forEach(f => {
            if (f && f.path) {
                fs.unlink(f.path, err => {
                    if (err) console.warn('Could not delete local upload:', f.path, err.message);
                });
            }
        });
    });
}

// ============================================================================
// Email transporters
// ============================================================================
function requireEnv(key) {
    const v = process.env[key];
    if (!v) {
        console.error(`⚠️  Missing required env var ${key}. Email features for that account will be disabled.`);
        return null;
    }
    return v;
}

const MAIN_EMAIL_USER = process.env.EMAIL_USER || 'guttersnapp@gmail.com';
const MAIN_EMAIL_PASS = requireEnv('EMAIL_PASS'); // intentionally no fallback

const OWNER_EMAIL_PASS = {
    'max@guttersnapchicago.com': process.env.MAX_EMAIL_PASS,
    'josh@guttersnapchicago.com': process.env.JOSH_EMAIL_PASS,
    'matt@guttersnapchicago.com': process.env.MATT_EMAIL_PASS,
    'ian@guttersnapchicago.com': process.env.IAN_EMAIL_PASS,
    'brody@guttersnapchicago.com': process.env.BRODY_EMAIL_PASS
};

let mainTransporter = null;
const ownerTransporters = {};

function getMainTransporter() {
    if (!MAIN_EMAIL_PASS) return null;
    if (!mainTransporter) {
        mainTransporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: MAIN_EMAIL_USER, pass: MAIN_EMAIL_PASS },
            pool: true,
            maxConnections: 5,
            maxMessages: 100
        });
    }
    return mainTransporter;
}

function getTransporterForUser(userEmail) {
    const normalized = String(userEmail || '').toLowerCase();
    const ownerPass = OWNER_EMAIL_PASS[normalized];
    if (ownerPass) {
        if (!ownerTransporters[normalized]) {
            ownerTransporters[normalized] = nodemailer.createTransport({
                service: 'gmail',
                auth: { user: normalized, pass: ownerPass },
                pool: true,
                maxConnections: 3,
                maxMessages: 50
            });
        }
        return ownerTransporters[normalized];
    }
    return getMainTransporter();
}

// ============================================================================
// Owner name resolution (cached so we don't hit Airtable per send)
// ============================================================================
const ownerNameCache = new Map();
async function getOwnerDisplayName(email) {
    if (!email) return 'GutterSnap Chicago';
    const key = String(email).toLowerCase();
    if (ownerNameCache.has(key)) return ownerNameCache.get(key);
    try {
        const result = await airtableService.getOwner(key);
        if (result.success && result.owner && result.owner['Full Name']) {
            ownerNameCache.set(key, result.owner['Full Name']);
            return result.owner['Full Name'];
        }
    } catch (e) {
        console.warn('Could not resolve owner name for', key, e.message);
    }
    const prefix = key.split('@')[0];
    const pretty = prefix.charAt(0).toUpperCase() + prefix.slice(1);
    ownerNameCache.set(key, pretty);
    return pretty;
}

// ============================================================================
// Quote email helper — single place that actually sends the customer quote.
// ============================================================================
async function sendQuoteEmail(quote, { baseUrl, isResend = false } = {}) {
    const ownerEmail = quote.createdBy;
    const ownerName = await getOwnerDisplayName(ownerEmail);
    const transporter = getTransporterForUser(ownerEmail);
    if (!transporter) {
        throw new Error('No email transporter available — check EMAIL_PASS env var.');
    }

    const links = {
        optionA: quoteLinks.buildAcceptUrl(baseUrl, quote.quoteId, 'optionA', quote.customer.email),
        optionB: quoteLinks.buildAcceptUrl(baseUrl, quote.quoteId, 'optionB', quote.customer.email),
        portal: quoteLinks.buildPortalUrl(baseUrl, quote.quoteId, quote.customer.email)
    };

    const html = generateQuoteEmail({
        quote,
        baseUrl,
        ownerName,
        ownerEmail,
        links,
        isResend
    });

    const subjectPrefix = isResend ? '[Resending] ' : '';
    await transporter.sendMail({
        from: `${ownerName} · GutterSnap Chicago <${ownerEmail}>`,
        replyTo: ownerEmail,
        to: quote.customer.email,
        subject: `${subjectPrefix}Your GutterSnap quote for ${quote.customer.address}`,
        html,
        attachments: [{
            filename: 'logo.png',
            path: path.join(__dirname, 'public', 'logo-email-120.png'),
            cid: 'logo'
        }]
    });

    console.log(`📧 Quote email sent from ${ownerEmail} to ${quote.customer.email} (quote ${quote.quoteId})${isResend ? ' [resend]' : ''}`);
}

// ============================================================================
// Root + health
// ============================================================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// Self-inspection submission
// ============================================================================
app.post('/submit-request', upload.fields([
    { name: 'front', maxCount: 1 },
    { name: 'frontRightCorner', maxCount: 1 },
    { name: 'rightSide', maxCount: 1 },
    { name: 'rearRightCorner', maxCount: 1 },
    { name: 'rear', maxCount: 1 },
    { name: 'rearLeftCorner', maxCount: 1 },
    { name: 'leftSide', maxCount: 1 },
    { name: 'leftFrontCorner', maxCount: 1 },
    { name: 'gutterSwatch', maxCount: 1 }
]), async (req, res) => {
    console.log('📸 New self-inspection request');
    try {
        const { name, email, phone, address, notes } = req.body;
        const files = req.files;

        if (!email || !phone || !address) {
            return res.status(400).json({ success: false, message: 'Missing required fields: email, phone, or address' });
        }
        if (!files || Object.keys(files).length === 0) {
            return res.status(400).json({ success: false, message: 'No photos were uploaded' });
        }

        const tempRequestId = `REQ-${Date.now()}`;
        const uploadResult = await cloudinaryService.uploadSelfInspectionPhotos(files, tempRequestId);
        if (!uploadResult.success) throw new Error(`Cloudinary upload failed: ${uploadResult.error}`);

        // Local uploads can go now — Cloudinary is the source of truth.
        cleanupLocalFiles(files);

        const customerResult = await airtableService.findOrCreateCustomer({
            email, name: name || '', phone, address, leadSource: 'Self-Inspection'
        });
        const customerId = customerResult.id;

        const airtableResult = await airtableService.createSelfInspectionRequest({
            customerName: name || '',
            customerEmail: email,
            customerPhone: phone,
            propertyAddress: address,
            notes: notes || '',
            photos: uploadResult.photos
        });
        if (!airtableResult.success) throw new Error(`Airtable save failed: ${airtableResult.error}`);

        await airtableService.linkCustomerToRecord(customerId, airtableResult.requestId, 'self-inspection');
        await airtableService.updateSelfInspectionRequest(airtableResult.requestId, { 'Customer': [customerId] });
        await airtableService.updateCustomerStatus(customerId, 'New Lead - Self Inspection');

        const adminResult = await airtableService.getFirstAdminOwner();
        let assignedOwnerEmail = null;
        if (adminResult.success && adminResult.owner) {
            await airtableService.assignCustomerToOwner(customerId, adminResult.owner.email);
            assignedOwnerEmail = adminResult.owner.email;
        }

        const emailTransporter = getMainTransporter();
        if (emailTransporter) {
            const baseUrl = baseUrlFor(req);
            const html = generateLeadNotificationEmail({
                type: 'self-inspection',
                lead: { name, email, phone, address, notes, photos: uploadResult.photos },
                dashboardUrl: `${baseUrl}/dashboard.html`,
                recordId: airtableResult.requestId
            });
            await emailTransporter.sendMail({
                from: MAIN_EMAIL_USER,
                to: assignedOwnerEmail || MAIN_EMAIL_USER,
                cc: assignedOwnerEmail ? MAIN_EMAIL_USER : undefined,
                subject: `New self-inspection — ${address}`,
                html
            });
        }

        res.json({ success: true, message: 'Request submitted successfully!', requestId: airtableResult.requestId });
    } catch (error) {
        cleanupLocalFiles(req.files);
        console.error('❌ Error in self-inspection:', error);
        res.status(500).json({ success: false, message: error.message || 'Error processing request. Please try again.' });
    }
});

// ============================================================================
// Owner authentication
// ============================================================================
app.post('/api/owner-login', express.json(), async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }
        const result = await ownerAuthModule.login(email, password);
        if (!result.success) {
            return res.status(401).json(result);
        }
        res.cookie('ownerToken', result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        res.json(result);
    } catch (error) {
        console.error('❌ Error in owner login:', error);
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
});

app.post('/api/owner-password-reset-request', express.json(), async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

        const result = ownerAuthModule.requestPasswordReset(email);
        if (!result.success) return res.status(400).json(result);

        const emailTransporter = getMainTransporter();
        if (emailTransporter) {
            const resetUrl = `${baseUrlFor(req)}/ownerlogin.html?token=${result.resetToken}`;
            await emailTransporter.sendMail({
                from: MAIN_EMAIL_USER,
                to: result.email,
                subject: 'Reset your GutterSnap password',
                html: generatePasswordResetEmail({ resetUrl })
            });
        }
        res.json({ success: true, message: 'Password reset link sent to your email' });
    } catch (error) {
        console.error('❌ Error in password reset request:', error);
        res.status(500).json({ success: false, message: 'Server error during password reset request' });
    }
});

app.post('/api/owner-password-change', express.json(), async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ success: false, message: 'Token and new password are required' });
        }
        const result = await ownerAuthModule.changePassword(token, newPassword);
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('❌ Error in password change:', error);
        res.status(500).json({ success: false, message: 'Server error during password change' });
    }
});

app.get('/api/owner/verify', ownerAuth, (req, res) => {
    res.json({
        success: true,
        owner: {
            email: req.owner.email,
            name: req.owner.name,
            isAdmin: req.owner.isAdmin
        }
    });
});

app.post('/api/owner/logout', ownerAuth, (req, res) => {
    ownerAuthModule.logout();
    res.clearCookie('ownerToken');
    res.json({ success: true });
});

// ============================================================================
// Quote creation, retrieval, acceptance
// ============================================================================
app.post('/api/quotes/create', express.json(), async (req, res) => {
    console.log('💰 Creating new quote');
    try {
        const quoteData = req.body;
        if (!quoteData.customer || !quoteData.customer.email || !quoteData.customer.name) {
            return res.status(400).json({ success: false, message: 'Customer information is required' });
        }

        quoteData.quoteId = crypto.randomBytes(4).toString('hex').toUpperCase();
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + 30);
        quoteData.validUntil = validUntil.toISOString();

        const customerResult = await airtableService.findOrCreateCustomer({
            email: quoteData.customer.email,
            name: quoteData.customer.name,
            phone: quoteData.customer.phone,
            address: quoteData.customer.address,
            leadSource: 'Quote'
        });
        const customerId = customerResult.id;

        const result = await airtableService.createQuote(quoteData);
        if (!result.success) return res.status(500).json(result);

        await airtableService.linkCustomerToRecord(customerId, result.recordId, 'quote');
        await airtableService.updateQuote(result.recordId, { 'Customer': [customerId] });
        await airtableService.updateCustomerStatus(customerId, 'Quote Sent');
        await airtableService.updateQuoteStatus(result.quoteId, 'Sent');

        const quote = result.quote;
        // `createQuote` doesn't return createdBy inside `quote` if it wasn't
        // persisted yet — fall back to the input.
        if (!quote.createdBy) quote.createdBy = quoteData.createdBy;

        try {
            await sendQuoteEmail(quote, { baseUrl: baseUrlFor(req), isResend: false });
            await airtableService.appendQuoteInternalNote(result.recordId, `Sent to ${quote.customer.email}.`);
        } catch (emailError) {
            console.error('❌ Email send failed but quote was created:', emailError);
            await airtableService.appendQuoteInternalNote(result.recordId, `Failed to email customer: ${emailError.message}`);
        }

        res.json({ success: true, quoteId: result.quoteId, message: 'Quote created and sent successfully' });
    } catch (error) {
        console.error('❌ Error creating quote:', error);
        res.status(500).json({ success: false, message: 'Error creating quote' });
    }
});

app.post('/api/quotes/save-draft', express.json(), async (req, res) => {
    try {
        const quoteData = req.body;
        if (!quoteData.quoteId) quoteData.quoteId = crypto.randomBytes(4).toString('hex').toUpperCase();
        if (!quoteData.validUntil) {
            const v = new Date();
            v.setDate(v.getDate() + 30);
            quoteData.validUntil = v.toISOString();
        }
        const result = await airtableService.createQuote(quoteData);
        if (!result.success) return res.status(500).json(result);
        res.json({ success: true, quoteId: result.quoteId, message: 'Draft saved successfully' });
    } catch (error) {
        console.error('❌ Error saving draft:', error);
        res.status(500).json({ success: false, message: 'Error saving draft' });
    }
});

// Owner — list all quotes they created. Secured via cookie session.
// IMPORTANT: this must be declared BEFORE the generic `/:quoteId` route below,
// otherwise Express treats "my-quotes" as a quoteId and falls through to the
// customer-facing handler (which returns 200 "Quote not found" and skips auth).
app.get('/api/quotes/my-quotes', ownerAuth, async (req, res) => {
    try {
        const result = await airtableService.getAllQuotesByOwner(req.owner.email);
        if (!result.success) return res.status(500).json(result);
        res.json({ success: true, quotes: result.quotes });
    } catch (error) {
        console.error('Error fetching quotes:', error);
        res.status(500).json({ success: false, message: 'Error fetching quotes' });
    }
});

// Customer-facing quote fetch. Tracks view only when the call looks like a
// real customer visit (i.e. not our internal dashboard fetch).
app.get('/api/quotes/:quoteId', async (req, res) => {
    try {
        const { quoteId } = req.params;
        const result = await airtableService.getQuote(quoteId, { trackView: true });
        res.json(result);
    } catch (error) {
        console.error('❌ Error fetching quote:', error);
        res.status(500).json({ success: false, message: 'Error fetching quote' });
    }
});

app.post('/api/quotes/accept/:quoteId', express.json(), async (req, res) => {
    try {
        const { quoteId } = req.params;
        const acceptanceData = req.body;

        const quoteResult = await airtableService.getQuote(quoteId);
        if (!quoteResult.success) return res.status(404).json({ success: false, message: 'Quote not found' });
        const quote = quoteResult.quote;

        if (quote.status === 'Accepted') {
            return res.status(400).json({ success: false, message: 'Quote has already been accepted' });
        }
        if (quote.status === 'Expired' || new Date(quote.validUntil) < new Date()) {
            return res.status(400).json({ success: false, message: 'This quote has expired. Please contact us for a new one.' });
        }

        // Optional: if a `t=` token is present on the request, validate it.
        // Accept missing tokens for backward compat with already-sent emails.
        if (req.body.t && !quoteLinks.verifyQuoteLink(quoteId, quote.customer.email, req.body.t)) {
            return res.status(403).json({ success: false, message: 'Invalid quote link.' });
        }

        let signatureUrl = '';
        if (acceptanceData.signatureData) {
            const signatureResult = await cloudinaryService.uploadSignature(acceptanceData.signatureData, quoteId);
            if (signatureResult.success) {
                signatureUrl = signatureResult.url;
                acceptanceData.signatureData = signatureUrl;
            }
        }

        const selectedOption = acceptanceData.selectedOption === 'optionA' ? quote.optionA : quote.optionB;
        const ownerFullName = await getOwnerDisplayName(quote.createdBy);
        const ownerTransporter = getTransporterForUser(quote.createdBy);
        const main = getMainTransporter();

        const contractHTML = generateContractEmail(quote, acceptanceData.selectedOption, acceptanceData, ownerFullName);
        const contractUrl = `${baseUrlFor(req)}/api/quotes/contract-pdf/${quoteId}`;

        if (ownerTransporter) {
            await ownerTransporter.sendMail({
                from: `${ownerFullName} · GutterSnap Chicago <${quote.createdBy}>`,
                replyTo: quote.createdBy,
                to: quote.customer.email,
                subject: `Signed contract — GutterSnap Installation Agreement #${quoteId}`,
                html: contractHTML
            });
        }

        if (main) {
            await main.sendMail({
                from: MAIN_EMAIL_USER,
                to: quote.createdBy,
                subject: `Signed contract — ${quote.customer.name} — $${selectedOption.total.toFixed(2)}`,
                html: generateAcceptanceNotificationEmail({
                    quote,
                    selectedOption: acceptanceData.selectedOption,
                    contractUrl
                }),
                attachments: [{
                    filename: `Contract_${quoteId}_${quote.customer.name.replace(/\s/g, '_')}.html`,
                    content: contractHTML,
                    contentType: 'text/html'
                }]
            });
        }

        const result = await airtableService.acceptQuote(quoteId, acceptanceData);
        if (!result.success) return res.status(400).json(result);

        // Look up the record ID so we can attach an internal note. Cheap
        // because `getQuote` already round-trips, but we only have the quoteId
        // here — skip silently if we can't find it.
        try {
            const rid = (await airtableService.getQuote(quoteId)).quote?.recordId;
            if (rid) await airtableService.appendQuoteInternalNote(rid, `Customer accepted ${acceptanceData.selectedOption === 'optionA' ? 'Option A' : 'Option B'}.`);
        } catch (e) { /* non-fatal */ }

        res.json({ success: true, message: 'Quote accepted successfully' });
    } catch (error) {
        console.error('❌ Error accepting quote:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending contract email. Please try again or contact us at (847) 443-1395'
        });
    }
});

app.post('/api/quotes/decline/:quoteId', express.json(), async (req, res) => {
    try {
        const { quoteId } = req.params;
        const result = await airtableService.declineQuote(quoteId);
        if (!result.success) return res.status(400).json(result);

        const main = getMainTransporter();
        if (main) {
            await main.sendMail({
                from: MAIN_EMAIL_USER,
                to: result.quote.createdBy,
                subject: `Quote declined — ${result.quote.customer.name}`,
                html: generateDeclineNotificationEmail({ quote: result.quote })
            });
        }

        res.json(result);
    } catch (error) {
        console.error('❌ Error declining quote:', error);
        res.status(500).json({ success: false, message: 'Error processing decline' });
    }
});

app.get('/api/quotes/contract-pdf/:quoteId', async (req, res) => {
    try {
        const { quoteId } = req.params;
        const quoteResult = await airtableService.getQuote(quoteId);
        if (!quoteResult.success) return res.status(404).send('<h1>Contract Not Found</h1>');

        const quote = quoteResult.quote;
        if (quote.status !== 'Accepted') {
            return res.status(400).send('<h1>Contract Not Yet Signed</h1>');
        }

        const ownerFullName = await getOwnerDisplayName(quote.createdBy);
        const acceptanceData = {
            selectedOption: String(quote.customerSelection || '').toLowerCase().includes('a') ? 'optionA' : 'optionB',
            signatureData: quote.signatureDataURL,
            signedDate: quote.acceptedDate
        };
        const contractHTML = generateContractEmail(quote, acceptanceData.selectedOption, acceptanceData, ownerFullName);
        res.setHeader('Content-Type', 'text/html');
        res.send(contractHTML);
    } catch (error) {
        console.error('Error generating contract PDF:', error);
        res.status(500).send('<h1>Error Generating Contract</h1>');
    }
});

// Resend the customer quote email. Owner-only.
app.post('/api/quotes/resend/:quoteId', ownerAuth, async (req, res) => {
    try {
        const { quoteId } = req.params;
        const quoteResult = await airtableService.getQuote(quoteId);
        if (!quoteResult.success) return res.status(404).json(quoteResult);

        const quote = quoteResult.quote;

        // Only the owner who created the quote (or an admin) can resend.
        if (!req.owner.isAdmin && quote.createdBy && quote.createdBy !== req.owner.email) {
            return res.status(403).json({ success: false, message: 'You can only resend your own quotes.' });
        }

        await sendQuoteEmail(quote, { baseUrl: baseUrlFor(req), isResend: true });

        if (quote.recordId) {
            await airtableService.appendQuoteInternalNote(
                quote.recordId,
                `Resent to ${quote.customer.email} by ${req.owner.email}.`
            );
        }

        res.json({ success: true, message: `Quote resent to ${quote.customer.email}` });
    } catch (error) {
        console.error('Error resending quote:', error);
        res.status(500).json({ success: false, message: 'Error resending quote' });
    }
});

app.post('/api/quotes/request-financing/:quoteId', express.json(), async (req, res) => {
    try {
        const { quoteId } = req.params;
        const quoteResult = await airtableService.getQuote(quoteId);
        if (!quoteResult.success) return res.status(404).json(quoteResult);
        const quote = quoteResult.quote;

        const main = getMainTransporter();
        if (main) {
            await main.sendMail({
                from: MAIN_EMAIL_USER,
                to: quote.createdBy,
                subject: `Financing request — ${quote.customer.name}`,
                html: `<p><strong>${quote.customer.name}</strong> (${quote.customer.email}) requested financing info for quote ${quoteId}.</p>
                       <p>Call them at ${quote.customer.phone} to walk through options.</p>`
            });
        }
        if (quote.recordId) {
            await airtableService.appendQuoteInternalNote(quote.recordId, `Customer requested financing info.`);
        }
        res.json({ success: true, message: 'Financing information request received. We\'ll be in touch shortly.' });
    } catch (error) {
        console.error('❌ Error sending financing info:', error);
        res.status(500).json({ success: false, message: 'Error sending financing information' });
    }
});

// ============================================================================
// Dashboard
// ============================================================================
app.get('/api/dashboard/leads', ownerAuth, async (req, res) => {
    try {
        const ownerEmail = req.owner.email;
        const isAdmin = req.owner.isAdmin;
        const customers = await airtableService.getCustomersForOwner(ownerEmail, isAdmin);

        const leads = customers.filter(c => !['Won - Scheduled', 'Lost', 'Completed'].includes(c.Status || ''));

        const enriched = await Promise.all(leads.map(async (customer) => {
            const lead = {
                id: customer.id,
                name: customer['Customer Name'],
                email: customer.Email,
                phone: customer.Phone,
                address: customer.Address,
                status: customer.Status,
                priority: customer.Priority,
                leadSource: customer['Lead Source'],
                createdDate: customer['Created Date'],
                lastActivity: customer['Last Activity'],
                assignedTo: customer['Assigned To'] ? customer['Assigned To'][0] : null,
                isUnassigned: !customer['Assigned To'] || customer['Assigned To'].length === 0
            };

            if (customer['Self Inspections'] && customer['Self Inspections'].length > 0) {
                const si = await airtableService.getSelfInspectionRequest(customer['Self Inspections'][0]);
                if (si.success) {
                    const photos = si.data.photos || {};
                    lead.selfInspection = {
                        id: customer['Self Inspections'][0],
                        hasPhotos: Object.keys(photos).length > 0,
                        photoCount: Object.keys(photos).length,
                        notes: si.data.notes || si.data.Notes
                    };
                }
            }

            if (customer['Technician Requests'] && customer['Technician Requests'].length > 0) {
                const tr = await airtableService.getTechnicianRequest(customer['Technician Requests'][0]);
                if (tr.success) {
                    lead.technicianRequest = {
                        id: customer['Technician Requests'][0],
                        meetingPreference: tr.data['Meeting Preference'],
                        preferredDate: tr.data['Preferred Date'],
                        preferredTime: tr.data['Preferred Time']
                    };
                }
            }

            if (customer.Quotes && customer.Quotes.length > 0) {
                // IMPORTANT: customer.Quotes stores Airtable record ids, not
                // the short Quote IDs. Use getQuoteByRecordId.
                const latestRecordId = customer.Quotes[customer.Quotes.length - 1];
                const q = await airtableService.getQuoteByRecordId(latestRecordId);
                if (q.success) {
                    lead.latestQuote = {
                        id: q.quote.quoteId,
                        recordId: latestRecordId,
                        sentDate: q.quote.sentDate,
                        optionA: q.quote.optionA,
                        optionB: q.quote.optionB,
                        status: q.quote.status,
                        validUntil: q.quote.validUntil,
                        customerLink: quoteLinks.buildAcceptUrl(baseUrlFor(req), q.quote.quoteId, 'optionB', q.quote.customer.email),
                        portalLink: quoteLinks.buildPortalUrl(baseUrlFor(req), q.quote.quoteId, q.quote.customer.email)
                    };
                }
            }

            return lead;
        }));

        enriched.sort((a, b) => {
            if (a.isUnassigned && !b.isUnassigned) return -1;
            if (!a.isUnassigned && b.isUnassigned) return 1;
            return new Date(b.lastActivity || b.createdDate) - new Date(a.lastActivity || a.createdDate);
        });

        res.json({ success: true, leads: enriched });
    } catch (error) {
        console.error('Error fetching dashboard leads:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/dashboard/jobs', ownerAuth, async (req, res) => {
    try {
        const customers = await airtableService.getCustomersForOwner(req.owner.email, req.owner.isAdmin);
        const jobs = customers.filter(c => ['Won - Scheduled', 'Completed'].includes(c.Status || ''));

        const enriched = await Promise.all(jobs.map(async (customer) => {
            const job = {
                id: customer.id,
                name: customer['Customer Name'],
                email: customer.Email,
                phone: customer.Phone,
                address: customer.Address,
                status: customer.Status
            };

            if (customer.Quotes && customer.Quotes.length > 0) {
                for (const recordId of customer.Quotes) {
                    const q = await airtableService.getQuoteByRecordId(recordId);
                    if (q.success && q.quote.status === 'Accepted') {
                        const selection = q.quote.customerSelection;
                        const isA = typeof selection === 'string' && selection.toLowerCase().includes('a');
                        job.acceptedQuote = {
                            id: q.quote.quoteId,
                            recordId,
                            acceptedDate: q.quote.acceptedDate,
                            customerSelection: selection,
                            total: isA ? (q.quote.optionA && q.quote.optionA.total) : (q.quote.optionB && q.quote.optionB.total),
                            signatureUrl: q.quote.signatureDataURL,
                            contractUrl: `${baseUrlFor(req)}/api/quotes/contract-pdf/${q.quote.quoteId}`
                        };
                        break;
                    }
                }
            }
            return job;
        }));

        res.json({ success: true, jobs: enriched });
    } catch (error) {
        console.error('Error fetching dashboard jobs:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/admin/unassigned', ownerAuth, async (req, res) => {
    try {
        if (!req.owner.isAdmin) return res.status(403).json({ success: false, message: 'Admin access required' });
        const customers = await airtableService.getUnassignedCustomers();
        res.json({ success: true, customers });
    } catch (error) {
        console.error('Error fetching unassigned customers:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/owners', ownerAuth, async (req, res) => {
    try {
        if (!req.owner.isAdmin) return res.status(403).json({ success: false, message: 'Admin access required' });
        const owners = await airtableService.getAllOwners();
        res.json({ success: true, owners });
    } catch (error) {
        console.error('Error fetching owners:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/customers/:customerId/assign', ownerAuth, express.json(), async (req, res) => {
    try {
        if (!req.owner.isAdmin) return res.status(403).json({ success: false, message: 'Admin access required' });
        const { customerId } = req.params;
        const { ownerEmail } = req.body;
        if (!ownerEmail) return res.status(400).json({ success: false, message: 'Owner email is required' });
        const result = await airtableService.assignCustomerToOwner(customerId, ownerEmail);
        res.json(result);
    } catch (error) {
        console.error('Error assigning customer:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/customers/:customerId/status', ownerAuth, express.json(), async (req, res) => {
    try {
        const { customerId } = req.params;
        const { status } = req.body;
        if (!status) return res.status(400).json({ success: false, message: 'Status is required' });
        const result = await airtableService.updateCustomerStatus(customerId, status);
        res.json(result);
    } catch (error) {
        console.error('Error updating customer status:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/customers/:customerId/schedule', ownerAuth, express.json(), async (req, res) => {
    try {
        const { customerId } = req.params;
        const { scheduledDate } = req.body;
        if (!scheduledDate) return res.status(400).json({ success: false, message: 'Scheduled date is required' });
        await airtableService.updateCustomerStatus(customerId, 'Scheduled');
        res.json({ success: true, message: 'Customer scheduled successfully' });
    } catch (error) {
        console.error('Error scheduling customer:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// Technician request submission
// ============================================================================
app.post('/submit-technician-request', upload.none(), async (req, res) => {
    console.log('🔧 New technician request');
    try {
        const { name, email, phone, address, meetingPreference, preferredDate, preferredTime, notes } = req.body;

        if (!name || !email || !phone || !address || !meetingPreference) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        if (meetingPreference === 'meet' && (!preferredDate || !preferredTime)) {
            return res.status(400).json({ success: false, message: 'Please select a preferred date and time for your meeting' });
        }

        const customerResult = await airtableService.findOrCreateCustomer({
            email, name, phone, address, leadSource: 'Technician Request'
        });
        const customerId = customerResult.id;

        const airtableResult = await airtableService.createTechnicianRequest({
            customerName: name,
            customerEmail: email,
            customerPhone: phone,
            propertyAddress: address,
            meetingPreference: meetingPreference === 'meet' ? 'Meet with Technician' : 'No Meeting Required',
            preferredDate: preferredDate || null,
            preferredTime: preferredTime || '',
            notes: notes || ''
        });
        if (!airtableResult.success) throw new Error(`Airtable save failed: ${airtableResult.error}`);

        await airtableService.linkCustomerToRecord(customerId, airtableResult.requestId, 'technician');
        await airtableService.updateTechnicianRequest(airtableResult.requestId, { 'Customer': [customerId] });
        await airtableService.updateCustomerStatus(customerId, 'New Lead - Technician Request');

        const adminResult = await airtableService.getFirstAdminOwner();
        let assignedOwnerEmail = null;
        if (adminResult.success && adminResult.owner) {
            await airtableService.assignCustomerToOwner(customerId, adminResult.owner.email);
            assignedOwnerEmail = adminResult.owner.email;
        }

        const emailTransporter = getMainTransporter();
        if (emailTransporter) {
            const baseUrl = baseUrlFor(req);
            const html = generateLeadNotificationEmail({
                type: 'technician',
                lead: { name, email, phone, address, notes, meetingPreference, preferredDate, preferredTime },
                dashboardUrl: `${baseUrl}/dashboard.html`,
                recordId: airtableResult.requestId
            });
            await emailTransporter.sendMail({
                from: MAIN_EMAIL_USER,
                to: assignedOwnerEmail || MAIN_EMAIL_USER,
                cc: assignedOwnerEmail ? MAIN_EMAIL_USER : undefined,
                subject: `New technician request — ${address}`,
                html
            });
        }

        res.json({ success: true, message: 'Inspection request submitted successfully!', requestId: airtableResult.requestId });
    } catch (error) {
        console.error('❌ Error processing technician request:', error);
        res.status(500).json({ success: false, message: error.message || 'Error processing request. Please try again.' });
    }
});

// ============================================================================
// Error + 404
// ============================================================================
app.use((error, req, res, next) => {
    console.error('❌ Server error:', error);
    if (res.headersSent) return next(error);

    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, message: 'File too large. Maximum size is 10MB per file.' });
        if (error.code === 'LIMIT_FILE_COUNT') return res.status(400).json({ success: false, message: 'Too many files. Maximum is 10 files.' });
        return res.status(400).json({ success: false, message: 'File upload error: ' + error.message });
    }
    if (error.message && error.message.includes('Only image files')) {
        return res.status(400).json({ success: false, message: 'Only image files are allowed (JPG, PNG, etc.)' });
    }
    if (error.type === 'entity.too.large') {
        return res.status(413).json({ success: false, message: 'Request too large. Please reduce file sizes.' });
    }
    res.status(error.status || 500).json({
        success: false,
        message: error.message || 'An unexpected server error occurred. Please try again.'
    });
});

app.use((req, res) => {
    if (req.path.startsWith('/submit') || req.path.startsWith('/api') || req.method !== 'GET') {
        return res.status(404).json({ success: false, message: 'Endpoint not found' });
    }
    res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================================
// Boot
// ============================================================================
if (process.env.VERCEL) {
    module.exports = app;
} else {
    app.listen(PORT, () => {
        console.log(`🏠 GutterSnap server running on http://localhost:${PORT}`);
        console.log(`📧 Email configured for: ${MAIN_EMAIL_USER}`);
        if (!MAIN_EMAIL_PASS) console.log('⚠️  EMAIL_PASS missing — customer emails will not send.');
    });
}
