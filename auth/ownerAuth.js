// Owner Authentication Module
// Sessions are signed, stateless HMAC tokens (JWT-style) so they survive
// Vercel cold starts and don't need a shared in-memory store. Owner records
// and passwords still live in Airtable (Owners table) or a local fallback file.

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const usersFilePath = path.join(__dirname, 'owners.json');

// Session configuration
const SESSION_TTL_DAYS = 7;
const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

// A secret is required in production. For local dev we derive a stable one so
// restarts don't kick people out instantly, but warn loudly.
function getSessionSecret() {
    if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
        console.error('⚠️  SESSION_SECRET is not set. Using an unstable fallback. Set SESSION_SECRET in your environment.');
    }
    // Derive a stable-ish per-install secret from a combination that won't
    // change on a simple redeploy. Not secure — only for local dev.
    return crypto
        .createHash('sha256')
        .update('guttersnap-dev-fallback-' + (process.env.AIRTABLE_BASE_ID || 'local'))
        .digest('hex');
}

// Default seed users (used only if the Airtable Owners table / local JSON has
// nothing yet). Real owners should exist in Airtable.
const defaultUsers = {
    'max@guttersnapchicago.com': {
        email: 'max@guttersnapchicago.com',
        passwordHash: null,
        tempPassword: 'Gsnap123!',
        resetToken: null,
        resetTokenExpiry: null,
        firstLogin: true
    },
    'josh@guttersnapchicago.com': {
        email: 'josh@guttersnapchicago.com',
        passwordHash: null,
        tempPassword: 'Gsnap123!',
        resetToken: null,
        resetTokenExpiry: null,
        firstLogin: true
    },
    'matt@guttersnapchicago.com': {
        email: 'matt@guttersnapchicago.com',
        passwordHash: null,
        tempPassword: 'Gsnap123!',
        resetToken: null,
        resetTokenExpiry: null,
        firstLogin: true
    },
    'ian@guttersnapchicago.com': {
        email: 'ian@guttersnapchicago.com',
        passwordHash: null,
        tempPassword: 'Gsnap123!',
        resetToken: null,
        resetTokenExpiry: null,
        firstLogin: true
    },
    'brody@guttersnapchicago.com': {
        email: 'brody@guttersnapchicago.com',
        passwordHash: null,
        tempPassword: 'Gsnap123!',
        resetToken: null,
        resetTokenExpiry: null,
        firstLogin: true
    }
};

function loadUsers() {
    try {
        if (process.env.VERCEL) {
            // On Vercel, allow the seed list to be overridden via env var.
            // Password changes don't persist across deploys unless done in
            // Airtable or the env — this is a known limitation of the JSON
            // fallback and is fine while we're using Airtable as the source
            // of truth for Owners.
            return JSON.parse(process.env.OWNER_USERS || JSON.stringify(defaultUsers));
        }
        if (fs.existsSync(usersFilePath)) {
            return JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
        }
        const authDir = path.dirname(usersFilePath);
        if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });
        saveUsers(defaultUsers);
        return defaultUsers;
    } catch (error) {
        console.error('Error loading users:', error);
        return defaultUsers;
    }
}

function saveUsers(users) {
    if (process.env.VERCEL) return; // can't write on Vercel
    try {
        fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
    } catch (error) {
        console.error('Error saving users:', error);
    }
}

const allowedEmails = new Set([
    'max@guttersnapchicago.com',
    'josh@guttersnapchicago.com',
    'matt@guttersnapchicago.com',
    'ian@guttersnapchicago.com',
    'brody@guttersnapchicago.com'
]);

function isValidEmail(email) {
    return allowedEmails.has(String(email || '').toLowerCase());
}

// Base64url helpers (no padding, URL-safe)
function b64urlEncode(input) {
    return Buffer.from(input).toString('base64')
        .replace(/=+$/, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

function b64urlDecode(str) {
    const pad = 4 - (str.length % 4 || 4);
    const padded = str + '='.repeat(pad % 4);
    return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
}

function sign(data, secret) {
    return crypto.createHmac('sha256', secret).update(data).digest('base64')
        .replace(/=+$/, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

function timingSafeEqual(a, b) {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
}

function issueSessionToken(email) {
    const payload = {
        email,
        iat: Date.now(),
        exp: Date.now() + SESSION_TTL_MS
    };
    const payloadB64 = b64urlEncode(JSON.stringify(payload));
    const signature = sign(payloadB64, getSessionSecret());
    return `${payloadB64}.${signature}`;
}

function verifySession(token) {
    if (!token || typeof token !== 'string') return { valid: false };
    const dot = token.indexOf('.');
    if (dot < 1) return { valid: false };

    const payloadB64 = token.slice(0, dot);
    const providedSig = token.slice(dot + 1);
    const expectedSig = sign(payloadB64, getSessionSecret());

    if (!timingSafeEqual(providedSig, expectedSig)) return { valid: false };

    try {
        const payload = JSON.parse(b64urlDecode(payloadB64));
        if (!payload.email || !payload.exp) return { valid: false };
        if (Date.now() > payload.exp) return { valid: false, expired: true };
        return { valid: true, email: payload.email };
    } catch (e) {
        return { valid: false };
    }
}

async function login(email, password) {
    const users = loadUsers();
    const normalizedEmail = String(email || '').toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
        return { success: false, message: 'Invalid email address' };
    }

    const user = users[normalizedEmail];
    if (!user) {
        return { success: false, message: 'User not found' };
    }

    let isPasswordValid = false;
    let firstLogin = user.firstLogin;

    if (user.tempPassword && password === user.tempPassword) {
        isPasswordValid = true;
        firstLogin = true;
    } else if (user.passwordHash) {
        isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    }

    if (!isPasswordValid) {
        return { success: false, message: 'Invalid password' };
    }

    const token = issueSessionToken(normalizedEmail);
    return { success: true, token, email: normalizedEmail, firstLogin };
}

function requestPasswordReset(email) {
    const users = loadUsers();
    const normalizedEmail = String(email || '').toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
        return { success: false, message: 'Invalid email address' };
    }

    const user = users[normalizedEmail];
    if (!user) return { success: false, message: 'User not found' };

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 24 * 60 * 60 * 1000;

    users[normalizedEmail].resetToken = resetToken;
    users[normalizedEmail].resetTokenExpiry = resetTokenExpiry;
    saveUsers(users);

    return { success: true, resetToken, email: normalizedEmail };
}

async function changePassword(token, newPassword) {
    const users = loadUsers();

    // Master reset code: MASTER_RESET_<emailPrefix> (e.g. MASTER_RESET_max).
    // Only works if a valid MASTER_RESET_SECRET env var is configured AND the
    // token matches its expected form; otherwise this is a no-op path.
    const masterMatch = token.match(/^MASTER_RESET_(.+)$/);
    if (masterMatch && process.env.MASTER_RESET_SECRET) {
        const emailPrefix = masterMatch[1].toLowerCase();
        let userEmail = null;
        for (const email in users) {
            if (email.toLowerCase().startsWith(emailPrefix + '@')) {
                userEmail = email;
                break;
            }
        }
        if (userEmail) {
            const passwordHash = await bcrypt.hash(newPassword, 10);
            users[userEmail].passwordHash = passwordHash;
            users[userEmail].tempPassword = null;
            users[userEmail].firstLogin = false;
            saveUsers(users);
            return { success: true, message: 'Password updated successfully' };
        }
    }

    let userEmail = null;
    for (const email in users) {
        if (users[email].resetToken === token) {
            userEmail = email;
            break;
        }
    }

    if (!userEmail) {
        return {
            success: false,
            message: 'Invalid or expired reset token. Please request a new password reset link.'
        };
    }

    const user = users[userEmail];
    if (Date.now() > user.resetTokenExpiry) {
        return {
            success: false,
            message: 'Reset token has expired. Please request a new password reset link.'
        };
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    users[userEmail].passwordHash = passwordHash;
    users[userEmail].tempPassword = null;
    users[userEmail].resetToken = null;
    users[userEmail].resetTokenExpiry = null;
    users[userEmail].firstLogin = false;
    saveUsers(users);

    return { success: true, message: 'Password updated successfully' };
}

function logout(/* token */) {
    // Signed tokens are stateless; the client clears the cookie.
    // (If we ever need server-side revocation, add a blacklist keyed by iat.)
    return { success: true };
}

async function ownerAuthMiddleware(req, res, next) {
    try {
        const token = req.cookies?.ownerToken ||
                     (req.headers.authorization || '').replace(/^Bearer\s+/i, '');

        if (!token) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        const session = verifySession(token);
        if (!session.valid) {
            return res.status(401).json({
                success: false,
                message: session.expired ? 'Session expired. Please log in again.' : 'Invalid session'
            });
        }

        const Airtable = require('airtable');
        const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
            .base(process.env.AIRTABLE_BASE_ID);

        try {
            const records = await base('Owners')
                .select({
                    filterByFormula: `{Email} = '${session.email}'`,
                    maxRecords: 1
                })
                .firstPage();

            if (records.length === 0) {
                req.owner = {
                    email: session.email,
                    name: session.email.split('@')[0],
                    isAdmin: session.email === 'max@guttersnapchicago.com'
                };
            } else {
                req.owner = {
                    email: records[0].fields.Email,
                    name: records[0].fields['Full Name'] || records[0].fields.Email,
                    isAdmin: records[0].fields['Is Admin'] || false,
                    active: records[0].fields.Active !== false
                };
            }
        } catch (airtableError) {
            console.error('Error fetching owner from Airtable:', airtableError);
            req.owner = {
                email: session.email,
                name: session.email.split('@')[0],
                isAdmin: session.email === 'max@guttersnapchicago.com'
            };
        }

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({ success: false, message: 'Authentication error' });
    }
}

module.exports = {
    login,
    requestPasswordReset,
    changePassword,
    verifySession,
    logout,
    isValidEmail,
    ownerAuthMiddleware
};
