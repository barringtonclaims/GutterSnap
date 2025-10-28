// Only load dotenv in development
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const ownerAuth = require('./auth/ownerAuth');
const quotesManager = require('./quotes/quotesManager');
const { generateInstallProcedure, generateFinancingOptions } = require('./quotes/emailTemplates');
const { generateContractEmail } = require('./quotes/contractTemplate');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// Configure multer for file uploads
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
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 10 // Maximum 10 files
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Configure nodemailer with LAZY loading (create transporters only when needed)
let transporter = null;
const ownerTransporters = {};

// Owner names mapping
const OWNER_NAMES = {
    'max@guttersnapchicago.com': 'Max McCaulley',
    'josh@guttersnapchicago.com': 'Josh [LastName]',
    'matt@guttersnapchicago.com': 'Matt [LastName]',
    'ian@guttersnapchicago.com': 'Ian [LastName]',
    'brody@guttersnapchicago.com': 'Brody [LastName]'
};

// Helper to get owner full name
function getOwnerFullName(email) {
    return OWNER_NAMES[email] || email.split('@')[0];
}

// Email credentials configuration
const EMAIL_CONFIG = {
    main: {
        user: process.env.EMAIL_USER || 'guttersnapp@gmail.com',
        pass: process.env.EMAIL_PASS || 'apuhygkrsxtjsbws'
    },
    owners: {
        'max@guttersnapchicago.com': {
            user: process.env.MAX_EMAIL || 'max@guttersnapchicago.com',
            pass: process.env.MAX_EMAIL_PASS
        },
        'josh@guttersnapchicago.com': {
            user: process.env.JOSH_EMAIL || 'josh@guttersnapchicago.com',
            pass: process.env.JOSH_EMAIL_PASS
        },
        'matt@guttersnapchicago.com': {
            user: process.env.MATT_EMAIL || 'matt@guttersnapchicago.com',
            pass: process.env.MATT_EMAIL_PASS
        },
        'ian@guttersnapchicago.com': {
            user: process.env.IAN_EMAIL || 'ian@guttersnapchicago.com',
            pass: process.env.IAN_EMAIL_PASS
        },
        'brody@guttersnapchicago.com': {
            user: process.env.BRODY_EMAIL || 'brody@guttersnapchicago.com',
            pass: process.env.BRODY_EMAIL_PASS
        }
    }
};

console.log('Email configuration loaded (transporters will be created on first use)');

// Helper function to get main transporter (lazy creation)
function getMainTransporter() {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: EMAIL_CONFIG.main,
            pool: true,
            maxConnections: 5,
            maxMessages: 100
        });
    }
    return transporter;
}

// Helper function to get transporter for a user (lazy creation)
function getTransporterForUser(userEmail) {
    // Try to get owner-specific transporter
    if (EMAIL_CONFIG.owners[userEmail] && EMAIL_CONFIG.owners[userEmail].pass) {
        // Create if doesn't exist
        if (!ownerTransporters[userEmail]) {
            ownerTransporters[userEmail] = nodemailer.createTransport({
                service: 'gmail',
                auth: EMAIL_CONFIG.owners[userEmail],
                pool: true,
                maxConnections: 3,
                maxMessages: 50
            });
            console.log(`Created email transporter for: ${userEmail}`);
        }
        return ownerTransporters[userEmail];
    }
    // Otherwise fall back to main transporter
    return getMainTransporter();
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Self-inspection photo submission
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
    const startTime = Date.now();
    console.log('📸 ========== NEW SELF-INSPECTION REQUEST ==========');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('📋 Request body:', req.body);
    console.log('📁 Files received:', Object.keys(req.files || {}));
    
    // Log file sizes for debugging
    if (req.files) {
        Object.keys(req.files).forEach(key => {
            const file = req.files[key][0];
            const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
            console.log(`  - ${key}: ${sizeInMB}MB (${file.mimetype})`);
        });
        const totalSize = Object.values(req.files).reduce((sum, files) => sum + files[0].size, 0);
        console.log(`📊 Total upload size: ${(totalSize / (1024 * 1024)).toFixed(2)}MB`);
    }
    
    try {
        const { name, email, phone, address, notes, inspectionType } = req.body;
        const files = req.files;

        // Log what we got
        console.log('✅ Parsed fields:', { name, email, phone, address });

        // Validate required fields
        if (!email || !phone || !address) {
            console.log('❌ Validation failed - missing:', {
                email: !email,
                phone: !phone,
                address: !address
            });
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields: email, phone, or address' 
            });
        }

        // Validate files
        if (!files || Object.keys(files).length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'No photos were uploaded' 
            });
        }

        // Get email transporter (lazy loaded)
        const emailTransporter = getMainTransporter();
        if (!emailTransporter) {
            throw new Error('Email service is not configured');
        }

        // Prepare email attachments
        let attachments = [];
        Object.keys(files).forEach(fieldName => {
            const file = files[fieldName][0];
            
            if (process.env.VERCEL) {
                attachments.push({
                    filename: `${fieldName}.jpg`,
                    content: file.buffer
                });
            } else {
                attachments.push({
                    filename: `${fieldName}.jpg`,
                    path: file.path
                });
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER || 'guttersnapp@gmail.com',
            to: process.env.EMAIL_USER || 'guttersnapp@gmail.com',
            subject: `🏠 New Self-Inspection Request - ${address}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #EE9844; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                        .info-row { margin-bottom: 15px; }
                        .label { font-weight: bold; color: #EE9844; }
                        .photos-list { background: white; padding: 15px; border-radius: 8px; margin-top: 15px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h2>New GutterSnap Self-Inspection Request</h2>
                        </div>
                        <div class="content">
                            <div class="info-row">
                                <span class="label">Name:</span> ${name || 'Not provided'}
                            </div>
                            <div class="info-row">
                                <span class="label">Email:</span> ${email}
                            </div>
                            <div class="info-row">
                                <span class="label">Phone:</span> ${phone}
                            </div>
                            <div class="info-row">
                                <span class="label">Address:</span> ${address}
                            </div>
                            <div class="info-row">
                                <span class="label">Notes:</span> ${notes || 'No additional notes'}
                            </div>
                            
                            <div class="photos-list">
                                <strong>Photos Attached (${Object.keys(files).length}):</strong>
                    <ul>
                        ${Object.keys(files).map(fieldName => 
                            `<li>${fieldName.replace(/([A-Z])/g, ' $1').toLowerCase()}</li>`
                        ).join('')}
                    </ul>
                            </div>
                        </div>
                </div>
                </body>
                </html>
            `,
            attachments: attachments
        };

        console.log('📧 Attempting to send email...');
        const emailStart = Date.now();
        
        await emailTransporter.sendMail(mailOptions);

        const emailDuration = Date.now() - emailStart;
        console.log(`✅ Self-inspection email sent successfully in ${emailDuration}ms`);

        // Clean up local files after sending
        if (!process.env.VERCEL) {
            setTimeout(() => {
                Object.keys(files).forEach(fieldName => {
                    const filePath = files[fieldName][0].path;
                    fs.unlink(filePath, (err) => {
                        if (err) console.error('Error deleting file:', err);
                    });
                });
            }, 5000);
        }

        const totalDuration = Date.now() - startTime;
        console.log(`⏱️  Total request processing time: ${totalDuration}ms`);
        console.log('📸 ========== REQUEST COMPLETE ==========\n');

        res.json({ success: true, message: 'Request submitted successfully!' });

    } catch (error) {
        const errorDuration = Date.now() - startTime;
        console.error('❌ ========== ERROR IN SELF-INSPECTION ==========');
        console.error('⏰ Error occurred at:', new Date().toISOString());
        console.error('⏱️  Time elapsed before error:', errorDuration + 'ms');
        console.error('🔴 Error type:', error.name);
        console.error('🔴 Error code:', error.code);
        console.error('🔴 Error message:', error.message);
        console.error('🔴 Stack trace:', error.stack);
        console.error('📸 ========== END ERROR LOG ==========\n');
        
        let errorMessage = 'Error processing request. Please try again.';
        let statusCode = 500;
        
        if (error.code === 'EAUTH') {
            errorMessage = 'Email authentication failed. Please contact support.';
            console.error('💡 Hint: Check EMAIL_USER and EMAIL_PASS environment variables');
        } else if (error.code === 'ESOCKET' || error.code === 'ETIMEDOUT') {
            errorMessage = 'Network error. Please check your connection and try again.';
            console.error('💡 Hint: Email service connection timed out');
        } else if (error.message.includes('Email service')) {
            errorMessage = 'Email service is temporarily unavailable. Please try again later.';
            statusCode = 503;
        } else if (error.code === 'EMESSAGE') {
            errorMessage = 'Email could not be sent. Please try again.';
            console.error('💡 Hint: Check email message size and attachments');
        }
        
        res.status(statusCode).json({ success: false, message: errorMessage });
    }
});

// ============================================
// OWNER AUTHENTICATION ROUTES
// ============================================

// Owner Login
app.post('/api/owner-login', express.json(), async (req, res) => {
    console.log('🔐 Owner login attempt');
    
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and password are required' 
            });
        }
        
        const result = await ownerAuth.login(email, password);
        
        if (result.success) {
            console.log(`✅ Owner logged in: ${email}`);
            
            // REMOVED: Automatic first-time password reset email
            // Owners use temp password or master reset codes
            /*
            if (result.firstLogin) {
                try {
                    const resetResult = ownerAuth.requestPasswordReset(email);
                    if (resetResult.success) {
                        const emailTransporter = getMainTransporter();
                        const resetUrl = `${req.protocol}://${req.get('host')}/ownerlogin.html?token=${resetResult.resetToken}`;
                        
                        await emailTransporter.sendMail({
                            from: process.env.EMAIL_USER || 'guttersnapp@gmail.com',
                            to: email,
                            subject: 'Set Your GutterSnap Owner Portal Password',
                            html: `
                                <!DOCTYPE html>
                                <html>
                                <head>
                                    <style>
                                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                                        .header { background: #EE9844; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                                        .button { display: inline-block; background: #EE9844; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
                                        .info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
                                    </style>
                                </head>
                                <body>
                                    <div class="container">
                                        <div class="header">
                                            <h2>Welcome to GutterSnap Owner Portal</h2>
                                        </div>
                                        <div class="content">
                                            <p>Hello,</p>
                                            <p>You've successfully logged in to the GutterSnap Chicago Owner Portal for the first time. For security, please set a new password for your account.</p>
                                            
                                            <a href="${resetUrl}" class="button">Set Your Password</a>
                                            
                                            <div class="info">
                                                <p><strong>Password Requirements:</strong></p>
                                                <ul>
                                                    <li>At least 8 characters long</li>
                                                    <li>Include uppercase and lowercase letters</li>
                                                    <li>Include at least one number</li>
                                                    <li>Include at least one special character (!@#$%^&*)</li>
                                                </ul>
                                            </div>
                                            
                                            <p style="color: #666; font-size: 0.9em; margin-top: 20px;">This link will expire in 24 hours. If you didn't request this, please contact support immediately.</p>
                                            
                                            <p style="color: #666; font-size: 0.85em; margin-top: 30px;">If the button doesn't work, copy and paste this link into your browser:<br>
                                            <span style="word-break: break-all;">${resetUrl}</span></p>
                                        </div>
                                    </div>
                                </body>
                                </html>
                            `
                        });
                        
                        console.log(`📧 Password reset email sent to ${email}`);
                    }
                } catch (emailError) {
                    console.error('Error sending first login email:', emailError);
                    // Don't fail the login if email fails
                }
            }
            */
            
            res.json(result);
        } else {
            console.log(`❌ Login failed for ${email}: ${result.message}`);
            res.status(401).json(result);
        }
    } catch (error) {
        console.error('❌ Error in owner login:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during login' 
        });
    }
});

// Password Reset Request
app.post('/api/owner-password-reset-request', express.json(), async (req, res) => {
    console.log('🔑 Password reset request');
    
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email is required' 
            });
        }
        
        const result = ownerAuth.requestPasswordReset(email);
        
        if (result.success) {
            // Send password reset email
            const emailTransporter = getMainTransporter();
            if (emailTransporter) {
                const resetUrl = `${req.protocol}://${req.get('host')}/ownerlogin.html?token=${result.resetToken}`;
                
                await emailTransporter.sendMail({
                    from: process.env.EMAIL_USER || 'guttersnapp@gmail.com',
                    to: result.email,
                    subject: 'Reset Your GutterSnap Owner Portal Password',
                    html: `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <style>
                                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                                .header { background: #EE9844; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                                .button { display: inline-block; background: #EE9844; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="header">
                                    <h2>Password Reset Request</h2>
                                </div>
                                <div class="content">
                                    <p>Hello,</p>
                                    <p>You requested to reset your password for the GutterSnap Chicago Owner Portal. Click the button below to set a new password:</p>
                                    
                                    <a href="${resetUrl}" class="button">Reset Password</a>
                                    
                                    <p style="color: #666; font-size: 0.9em; margin-top: 20px;">This link will expire in 24 hours. If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
                                    
                                    <p style="color: #666; font-size: 0.85em; margin-top: 30px;">If the button doesn't work, copy and paste this link into your browser:<br>
                                    <span style="word-break: break-all;">${resetUrl}</span></p>
                                </div>
                            </div>
                        </body>
                        </html>
                    `
                });
                
                console.log(`📧 Password reset email sent to ${result.email}`);
            }
            
            res.json({ success: true, message: 'Password reset link sent to your email' });
        } else {
            console.log(`❌ Password reset failed: ${result.message}`);
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('❌ Error in password reset request:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during password reset request' 
        });
    }
});

// Change Password
app.post('/api/owner-password-change', express.json(), async (req, res) => {
    console.log('🔐 Password change attempt');
    
    try {
        const { token, newPassword } = req.body;
        
        if (!token || !newPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'Token and new password are required' 
            });
        }
        
        const result = await ownerAuth.changePassword(token, newPassword);
        
        if (result.success) {
            console.log('✅ Password changed successfully');
            res.json(result);
        } else {
            console.log(`❌ Password change failed: ${result.message}`);
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('❌ Error in password change:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during password change' 
        });
    }
});

// Logout
app.post('/api/owner-logout', express.json(), async (req, res) => {
    try {
        const { token } = req.body;
        const result = ownerAuth.logout(token);
        res.json(result);
    } catch (error) {
        console.error('❌ Error in logout:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during logout' 
        });
    }
});

// ============================================
// END OWNER AUTHENTICATION ROUTES
// ============================================

// ============================================
// QUOTE MANAGEMENT ROUTES
// ============================================

// Create new quote and send to customer
app.post('/api/quotes/create', express.json(), async (req, res) => {
    console.log('💰 Creating new quote');
    
    try {
        const quoteData = req.body;
        
        // Validate required fields
        if (!quoteData.customer || !quoteData.customer.email || !quoteData.customer.name) {
            return res.status(400).json({
                success: false,
                message: 'Customer information is required'
            });
        }
        
        // Create quote
        const result = quotesManager.createQuote(quoteData);
        
        if (!result.success) {
            return res.status(500).json(result);
        }
        
        // Mark as sent
        quotesManager.markQuoteAsSent(result.quoteId);
        
        // Send email to customer
        const mainTransporter = getMainTransporter();
        if (mainTransporter) {
            const quote = result.quote;
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            
            // Create email HTML based on retrofit possible
            let optionsHTML = '';
            
            if (quote.optionA && quote.measurements.retrofitPossible) {
                // Both options available
                const optionAUrl = `${baseUrl}/accept-quote-enhanced.html?id=${quote.quoteId}&option=optionA`;
                const optionBUrl = `${baseUrl}/accept-quote-enhanced.html?id=${quote.quoteId}&option=optionB`;
                
                optionsHTML = `
                    <div style="margin: 30px 0;">
                        <h3 style="color: #333; margin-bottom: 20px;">Great news! You have two options:</h3>
                        
                        <!-- Option A -->
                        <div style="background: #ffffff; border: 3px solid #EE9844; border-radius: 12px; padding: 25px; margin-bottom: 20px;">
                            <h4 style="color: #EE9844; margin: 0 0 10px 0; font-size: 1.3rem;">Option A: Protection Only</h4>
                            <p style="color: #666; margin-bottom: 15px;">Perfect for gutters in good condition</p>
                            
                            ${generateInstallProcedure('optionA', quote.measurements)}
                            
                            <div style="background: #E8F5E9; padding: 20px; border-radius: 8px; margin: 15px 0;">
                                <div style="text-align: center;">
                                    <div style="font-size: 1.6rem; font-weight: 700; color: #2E7D32; margin-bottom: 5px;">$${quote.optionA.total.toFixed(2)}</div>
                                    <div style="font-size: 0.9rem; color: #666; margin-bottom: 15px;">Total Investment</div>
                                    <div style="height: 2px; background: linear-gradient(to right, transparent, #4CAF50 20%, #4CAF50 80%, transparent); margin: 15px 0;"></div>
                                    <div style="font-size: 1.6rem; font-weight: 700; color: #EE9844; margin-bottom: 5px;">$${(quote.optionA.total * 0.0799 / 12 * Math.pow(1 + 0.0799/12, 60) / (Math.pow(1 + 0.0799/12, 60) - 1)).toFixed(2)}/mo</div>
                                    <div style="font-size: 0.9rem; color: #666; margin-bottom: 15px;">as low as (60 months)</div>
                                </div>
                                <div style="font-size: 0.85rem; color: #666; text-align: center; border-top: 1px solid #ddd; padding-top: 15px; margin-top: 10px;">Includes tax and all materials | Financing available</div>
                            </div>
                            
                            ${generateFinancingOptions(quote.optionA.total)}
                            
                            <a href="${optionAUrl}" style="display: block; background: #EE9844; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; text-align: center; font-weight: 600; margin-top: 15px;">Select This Option →</a>
                        </div>
                        
                        <div style="text-align: center; margin: 20px 0; color: #999; font-weight: 600;">— OR —</div>
                        
                        <!-- Option B -->
                        <div style="background: #ffffff; border: 3px solid #EE9844; border-radius: 12px; padding: 25px;">
                            <h4 style="color: #EE9844; margin: 0 0 10px 0; font-size: 1.3rem;">Option B: Protection + New Gutters</h4>
                            <p style="color: #666; margin-bottom: 15px;">Complete system replacement for maximum performance</p>
                            
                            ${generateInstallProcedure('optionB', quote.measurements)}
                            
                            <div style="background: #E8F5E9; padding: 20px; border-radius: 8px; margin: 15px 0;">
                                <div style="text-align: center;">
                                    <div style="font-size: 1.6rem; font-weight: 700; color: #2E7D32; margin-bottom: 5px;">$${quote.optionB.total.toFixed(2)}</div>
                                    <div style="font-size: 0.9rem; color: #666; margin-bottom: 15px;">Total Investment</div>
                                    <div style="height: 2px; background: linear-gradient(to right, transparent, #4CAF50 20%, #4CAF50 80%, transparent); margin: 15px 0;"></div>
                                    <div style="font-size: 1.6rem; font-weight: 700; color: #EE9844; margin-bottom: 5px;">$${(quote.optionB.total * 0.0799 / 12 * Math.pow(1 + 0.0799/12, 60) / (Math.pow(1 + 0.0799/12, 60) - 1)).toFixed(2)}/mo</div>
                                    <div style="font-size: 0.9rem; color: #666; margin-bottom: 15px;">as low as (60 months)</div>
                                </div>
                                <div style="font-size: 0.85rem; color: #666; text-align: center; border-top: 1px solid #ddd; padding-top: 15px; margin-top: 10px;">Includes tax and all materials | Financing available</div>
                            </div>
                            
                            ${generateFinancingOptions(quote.optionB.total)}
                            
                            <a href="${optionBUrl}" style="display: block; background: #EE9844; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; text-align: center; font-weight: 600; margin-top: 15px;">Select This Option →</a>
                        </div>
                    </div>
                `;
            } else {
                // Only Option B available
                const optionBUrl = `${baseUrl}/accept-quote-enhanced.html?id=${quote.quoteId}&option=optionB`;
                
                optionsHTML = `
                    <div style="margin: 30px 0;">
                        <h3 style="color: #333; margin-bottom: 10px;">Your Custom Quote:</h3>
                        <p style="color: #666; margin-bottom: 20px;">Based on our inspection, we recommend this complete system for best results.</p>
                        
                        <div style="background: #ffffff; border: 3px solid #EE9844; border-radius: 12px; padding: 25px;">
                            <h4 style="color: #EE9844; margin: 0 0 10px 0; font-size: 1.3rem;">Complete Protection + New Gutters</h4>
                            <p style="color: #666; margin-bottom: 15px;">Based on our inspection, we recommend this complete system for best results.</p>
                            
                            ${generateInstallProcedure('optionB', quote.measurements)}
                            
                            <div style="background: #E8F5E9; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #4CAF50;">
                                <div style="display: flex; justify-content: space-between; font-size: 1.4rem; font-weight: 700; color: #2E7D32;">
                                    <span>Total Investment:</span>
                                    <span>$${quote.optionB.total.toFixed(2)}</span>
                                </div>
                                <div style="font-size: 0.85rem; color: #666; margin-top: 5px;">Includes tax and all materials</div>
                            </div>
                            
                            ${generateFinancingOptions(quote.optionB.total)}
                            
                            <a href="${optionBUrl}" style="display: block; background: #4CAF50; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; text-align: center; font-weight: 600; margin-top: 15px;">Accept This Quote</a>
                        </div>
                    </div>
                `;
            }
            
            // Get the appropriate transporter for this owner
            const ownerTransporter = getTransporterForUser(quote.createdBy);
            const ownerName = quote.createdBy.split('@')[0];
            const capitalizedName = ownerName.charAt(0).toUpperCase() + ownerName.slice(1);
            
            const mailOptions = {
                from: `${capitalizedName} - GutterSnap Chicago <${quote.createdBy}>`,
                replyTo: quote.createdBy,
                to: quote.customer.email,
                subject: `Your GutterSnap Quote for ${quote.customer.address}`,
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <style>
                            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; margin: 0; padding: 0; }
                            .container { max-width: 650px; margin: 0 auto; background: #ffffff; }
                            .header { background: #f5f5f5; padding: 40px 30px; text-align: center; border-bottom: 3px solid #EE9844; }
                            .logo { width: 100px; height: 100px; margin-bottom: 20px; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges; }
                            .brand-name { color: #EE9844; font-size: 2.5rem; font-weight: 700; margin: 10px 0; }
                            .header h1 { margin: 10px 0 0 0; font-size: 1.5rem; color: #333; }
                            .header p { margin: 5px 0 0 0; font-size: 1rem; color: #666; }
                            .content { padding: 40px 30px; }
                            .footer { background: #f9f9f9; padding: 30px; text-align: center; color: #666; border-top: 1px solid #e0e0e0; }
                            .features { background: #E8F5E9; border-left: 4px solid #4CAF50; padding: 20px; margin: 30px 0; }
                            .features ul { margin: 10px 0; padding-left: 20px; }
                            .features li { color: #2E7D32; padding: 5px 0; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <img src="cid:logo" alt="GutterSnap Logo" width="100" height="100" style="display: block; margin: 0 auto 20px auto; -ms-interpolation-mode: bicubic; border: 0;">
                                <div class="brand-name">GutterSnap</div>
                                <h1>Your Custom Quote</h1>
                                <p>Professional Gutter Protection for ${quote.customer.address}</p>
                            </div>
                            <div class="content">
                                <p>Hi ${quote.customer.name},</p>
                                <p>Thank you for your interest in GutterSnap Chicago! We've prepared a custom quote for your property.</p>
                                
                                ${optionsHTML}
                                
                                <div class="features">
                                    <h4 style="margin: 0 0 15px 0; color: #2E7D32;">Included with All Options:</h4>
                                    <ul>
                                        <li>30-year transferable warranty on materials and workmanship</li>
                                        <li>Professional installation by certified technicians</li>
                                        <li>Free annual maintenance inspection</li>
                                        <li>24/7 customer support</li>
                                    </ul>
                                </div>
                                
                                <p style="color: #666; font-size: 0.95rem; margin-top: 30px;">
                                    <strong>Quote ID:</strong> ${quote.quoteId}<br>
                                    <strong>Valid Until:</strong> ${new Date(quote.validUntil).toLocaleDateString()}<br>
                                    ${quote.notes ? `<br><strong>Notes:</strong> ${quote.notes}` : ''}
                                </p>
                                
                                <p style="margin-top: 30px;">
                                    Questions? Call us at <strong>(847) 443-1395</strong> or reply to this email.
                                </p>
                            </div>
                            <div class="footer">
                                <p style="margin: 0;">GutterSnap Chicago | Professional Gutter Protection</p>
                                <p style="margin: 10px 0 0 0; font-size: 0.9rem;">This quote was prepared by ${capitalizedName} (${quote.createdBy})</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `,
                attachments: [{
                    filename: 'logo.png',
                    path: path.join(__dirname, 'public', 'logo-email-120.png'),
                    cid: 'logo'
                }]
            };
            
            await ownerTransporter.sendMail(mailOptions);
            console.log(`Quote email sent from ${quote.createdBy} to ${quote.customer.email}`);
        }
        
        res.json({ 
            success: true, 
            quoteId: result.quoteId,
            message: 'Quote created and sent successfully' 
        });
        
    } catch (error) {
        console.error('❌ Error creating quote:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error creating quote' 
        });
    }
});

// Save draft quote (don't send email)
app.post('/api/quotes/save-draft', express.json(), async (req, res) => {
    console.log('💾 Saving quote draft');
    
    try {
        const quoteData = req.body;
        const result = quotesManager.createQuote(quoteData);
        
        if (result.success) {
            res.json({ 
                success: true, 
                quoteId: result.quoteId,
                message: 'Draft saved successfully' 
            });
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('❌ Error saving draft:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error saving draft' 
        });
    }
});

// Get quote by ID
app.get('/api/quotes/:quoteId', async (req, res) => {
    try {
        const { quoteId } = req.params;
        const result = quotesManager.getQuote(quoteId);
        res.json(result);
    } catch (error) {
        console.error('❌ Error fetching quote:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching quote' 
        });
    }
});

// Accept quote
app.post('/api/quotes/accept/:quoteId', express.json(), async (req, res) => {
    console.log('✅ Quote acceptance');
    
    try {
        const { quoteId } = req.params;
        const acceptanceData = req.body;
        
        // First, verify quote exists and can be accepted
        const quoteResult = quotesManager.getQuote(quoteId);
        if (!quoteResult.success) {
            return res.status(404).json({ success: false, message: 'Quote not found' });
        }
        
        const quote = quoteResult.quote;
        
        if (quote.status === 'accepted') {
            return res.status(400).json({ success: false, message: 'Quote has already been accepted' });
        }
        
        if (new Date(quote.validUntil) < new Date()) {
            return res.status(400).json({ success: false, message: 'Quote has expired' });
        }
        
        // Prepare email data
        const selectedOption = acceptanceData.selectedOption === 'optionA' ? quote.optionA : quote.optionB;
        const optionName = acceptanceData.selectedOption === 'optionA' ? 'Option A: Protection Only' : 'Option B: Protection + New Gutters';
        const ownerTransporter = getTransporterForUser(quote.createdBy);
        const mainTransporter = getMainTransporter();
        const ownerName = quote.createdBy.split('@')[0];
        const capitalizedName = ownerName.charAt(0).toUpperCase() + ownerName.slice(1);
        const ownerFullName = getOwnerFullName(quote.createdBy);
        
        // FIRST: Send emails (if this fails, quote won't be marked as accepted)
        await ownerTransporter.sendMail({
            from: `${capitalizedName} - GutterSnap Chicago <${quote.createdBy}>`,
            replyTo: quote.createdBy,
            to: quote.customer.email,
            subject: `Signed Contract - GutterSnap Installation Agreement #${quoteId}`,
            html: generateContractEmail(quote, acceptanceData.selectedOption, acceptanceData, ownerFullName)
        });
        
            // Send notification to owner with the contract as HTML attachment
            const contractHTML = generateContractEmail(quote, acceptanceData.selectedOption, acceptanceData, ownerFullName);
            
            await mainTransporter.sendMail({
                from: process.env.EMAIL_USER || 'guttersnapp@gmail.com',
                to: quote.createdBy,
                subject: `SIGNED CONTRACT - ${quote.customer.name} - $${selectedOption.total.toFixed(2)}`,
                html: `
                    <h2>Customer Accepted Quote!</h2>
                    <p><strong>Customer:</strong> ${quote.customer.name}</p>
                    <p><strong>Phone:</strong> ${quote.customer.phone}</p>
                    <p><strong>Address:</strong> ${quote.customer.address}</p>
                    <p><strong>Selected:</strong> ${optionName}</p>
                    <p><strong>Total:</strong> $${selectedOption.total.toFixed(2)}</p>
                    <p><strong>Quote ID:</strong> ${quoteId}</p>
                    <hr>
                    <p><strong>Next Step:</strong> Call customer to schedule installation</p>
                    <p><strong>Signed contract is attached below as HTML file</strong> - open it in your browser to view/print.</p>
                `,
                attachments: [{
                    filename: `Contract_${quoteId}_${quote.customer.name.replace(/\s/g, '_')}.html`,
                    content: contractHTML,
                    contentType: 'text/html'
                }]
            });
        
        console.log(`✅ Acceptance emails sent for quote ${quoteId}`);
        
        // ONLY AFTER emails sent successfully: Mark quote as accepted
        const result = quotesManager.acceptQuote(quoteId, acceptanceData);
        
        if (!result.success) {
            return res.status(400).json(result);
        }
        
        res.json({ success: true, message: 'Quote accepted successfully' });
        
    } catch (error) {
        console.error('❌ Error accepting quote:', error);
        
        // Don't mark as accepted if email failed
        res.status(500).json({ 
            success: false, 
            message: 'Error sending contract email. Please try again or contact us at (847) 443-1395' 
        });
    }
});

// Decline quote
app.post('/api/quotes/decline/:quoteId', express.json(), async (req, res) => {
    console.log('❌ Quote declined');
    
    try {
        const { quoteId } = req.params;
        const result = quotesManager.declineQuote(quoteId);
        
        if (result.success) {
            const emailTransporter = getMainTransporter();
            if (emailTransporter) {
                const quote = result.quote;
                
                // Notify owner
                await emailTransporter.sendMail({
                    from: process.env.EMAIL_USER || 'guttersnapp@gmail.com',
                    to: quote.createdBy,
                    subject: `Quote Declined - ${quote.customer.name}`,
                    html: `
                        <h2>Quote Declined</h2>
                        <p><strong>Customer:</strong> ${quote.customer.name}</p>
                        <p><strong>Email:</strong> ${quote.customer.email}</p>
                        <p><strong>Address:</strong> ${quote.customer.address}</p>
                        <p><strong>Quote ID:</strong> ${quoteId}</p>
                        <p>Customer indicated they're not interested at this time.</p>
                    `
                });
            }
        }
        
        res.json(result);
    } catch (error) {
        console.error('❌ Error declining quote:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error processing decline' 
        });
    }
});

// Get all quotes for logged-in owner
app.get('/api/quotes/my-quotes', async (req, res) => {
    try {
        const ownerEmail = req.headers.authorization; // Simple auth check
        
        if (!ownerEmail) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }
        
        const allQuotes = quotesManager.getAllQuotes();
        
        // Filter quotes created by this owner
        const myQuotes = allQuotes.filter(q => q.createdBy === ownerEmail);
        
        res.json({ success: true, quotes: myQuotes });
    } catch (error) {
        console.error('Error fetching quotes:', error);
        res.status(500).json({ success: false, message: 'Error fetching quotes' });
    }
});

// Get contract as printable HTML/PDF
app.get('/api/quotes/contract-pdf/:quoteId', async (req, res) => {
    try {
        const { quoteId } = req.params;
        const quoteResult = quotesManager.getQuote(quoteId);
        
        if (!quoteResult.success) {
            return res.status(404).send('<h1>Contract Not Found</h1>');
        }
        
        const quote = quoteResult.quote;
        
        if (quote.status !== 'accepted') {
            return res.status(400).send('<h1>Contract Not Yet Signed</h1>');
        }
        
        const ownerFullName = getOwnerFullName(quote.createdBy);
        const acceptanceData = {
            selectedOption: quote.customerSelection,
            signatureData: quote.signatureDataURL,
            signedDate: quote.acceptedDate
        };
        
        const contractHTML = generateContractEmail(quote, quote.customerSelection, acceptanceData, ownerFullName);
        
        res.setHeader('Content-Type', 'text/html');
        res.send(contractHTML);
        
    } catch (error) {
        console.error('Error generating contract PDF:', error);
        res.status(500).send('<h1>Error Generating Contract</h1>');
    }
});

// Resend quote email
app.post('/api/quotes/resend/:quoteId', async (req, res) => {
    try {
        const { quoteId } = req.params;
        const quoteResult = quotesManager.getQuote(quoteId);
        
        if (!quoteResult.success) {
            return res.status(404).json(quoteResult);
        }
        
        const quote = quoteResult.quote;
        // Re-use the same email sending logic from create quote
        // For now, just mark as success
        res.json({ success: true, message: 'Quote resent (feature in progress)' });
        
    } catch (error) {
        console.error('Error resending quote:', error);
        res.status(500).json({ success: false, message: 'Error resending quote' });
    }
});

// Request financing information
app.post('/api/quotes/request-financing/:quoteId', express.json(), async (req, res) => {
    console.log('💳 Financing request');
    
    try {
        const { quoteId } = req.params;
        const quoteResult = quotesManager.getQuote(quoteId);
        
        if (!quoteResult.success) {
            return res.status(404).json(quoteResult);
        }
        
        const quote = quoteResult.quote;
        const emailTransporter = getMainTransporter();
        
        if (emailTransporter) {
            // Send financing info to customer
            await emailTransporter.sendMail({
                from: process.env.EMAIL_USER || 'guttersnapp@gmail.com',
                to: quote.customer.email,
                subject: 'GutterSnap Financing Options',
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <style>
                            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                            .header { background: #2196F3; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                            .info-box { background: #E3F2FD; padding: 20px; border-radius: 8px; margin: 20px 0; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h2>Your Financing Options</h2>
                            </div>
                            <div class="content">
                                <p>Hi ${quote.customer.name},</p>
                                <p>Thank you for your interest in financing your GutterSnap installation!</p>
                                
                                <div class="info-box">
                                    <h3 style="margin: 0 0 15px 0; color: #1976D2;">Flexible Payment Plans</h3>
                                    <p>We offer financing options to make your investment more affordable:</p>
                                    <ul>
                                        <li><strong>12 months at 0% APR</strong> - No interest if paid in full within 12 months</li>
                                        <li><strong>24 months at 3.99% APR</strong> - Low monthly payments</li>
                                        <li><strong>36 months at 5.99% APR</strong> - Extended terms</li>
                                        <li><strong>60 months at 7.99% APR</strong> - Lowest monthly payment</li>
                                    </ul>
                                </div>
                                
                                <div class="info-box">
                                    <h3 style="margin: 0 0 15px 0; color: #1976D2;">Next Steps</h3>
                                    <ol>
                                        <li>We'll call you within 1 business day to discuss financing options</li>
                                        <li>Simple online application (takes ~5 minutes)</li>
                                        <li>Instant credit decision in most cases</li>
                                        <li>Once approved, we schedule your installation!</li>
                                    </ol>
                                </div>
                                
                                <p style="margin-top: 30px;">
                                    <strong>Questions?</strong> Call us at <strong>(847) 443-1395</strong>
                                </p>
                                
                                <p style="font-size: 0.85rem; color: #999; margin-top: 20px;">
                                    *Financing subject to credit approval. Rates and terms may vary based on creditworthiness. Quote ID: ${quoteId}
                                </p>
                            </div>
                        </div>
                    </body>
                    </html>
                `
            });
            
            // Notify owner
            await emailTransporter.sendMail({
                from: process.env.EMAIL_USER || 'guttersnapp@gmail.com',
                to: quote.createdBy,
                subject: `Financing Request - ${quote.customer.name}`,
                html: `
                    <h2>Customer Requested Financing Information</h2>
                    <p><strong>Customer:</strong> ${quote.customer.name}</p>
                    <p><strong>Email:</strong> ${quote.customer.email}</p>
                    <p><strong>Phone:</strong> ${quote.customer.phone}</p>
                    <p><strong>Address:</strong> ${quote.customer.address}</p>
                    <p><strong>Quote ID:</strong> ${quoteId}</p>
                    <p><strong>Quote Total:</strong> $${(quote.optionA || quote.optionB).total.toFixed(2)}</p>
                    <hr>
                    <p><strong>Action Required:</strong> Call customer to discuss financing options and assist with application.</p>
                `
            });
        }
        
        res.json({ success: true, message: 'Financing information sent' });
        
    } catch (error) {
        console.error('❌ Error sending financing info:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error sending financing information' 
        });
    }
});

// ============================================
// END QUOTE MANAGEMENT ROUTES
// ============================================

// Technician inspection request (no photos required)
app.post('/submit-technician-request', upload.none(), async (req, res) => {
    console.log('🔧 Received technician inspection request');
    console.log('📋 Content-Type:', req.headers['content-type']);
    console.log('📋 Request body:', req.body);
    console.log('📋 Body keys:', Object.keys(req.body));
    
    try {
        const { name, email, phone, address, meetingPreference, preferredDate, preferredTime, notes } = req.body;

        // Log what we got
        console.log('Parsed fields:', { name, email, phone, address, meetingPreference, preferredDate, preferredTime });

        // Validate required fields
        if (!name || !email || !phone || !address || !meetingPreference) {
            console.log('❌ Validation failed - missing:', {
                name: !name,
                email: !email,
                phone: !phone,
                address: !address,
                meetingPreference: !meetingPreference
            });
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }

        // Additional validation if meeting is requested
        if (meetingPreference === 'meet' && (!preferredDate || !preferredTime)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please select a preferred date and time for your meeting' 
            });
        }

        // Get transporter (lazy loaded)
        const emailTransporter = getMainTransporter();
        if (!emailTransporter) {
            throw new Error('Email service is not configured');
        }

        const mailOptions = {
            from: process.env.EMAIL_USER || 'guttersnapp@gmail.com',
            to: process.env.EMAIL_USER || 'guttersnapp@gmail.com',
            subject: `🔧 New Technician Inspection Request - ${address}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #EE9844; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                        .info-row { margin-bottom: 15px; }
                        .label { font-weight: bold; color: #EE9844; }
                        .schedule { background: white; padding: 15px; border-radius: 8px; margin-top: 15px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h2>New Technician Inspection Request</h2>
                        </div>
                        <div class="content">
                            <div class="info-row">
                                <span class="label">Name:</span> ${name}
                            </div>
                            <div class="info-row">
                                <span class="label">Email:</span> ${email}
                            </div>
                            <div class="info-row">
                                <span class="label">Phone:</span> ${phone}
                            </div>
                            <div class="info-row">
                                <span class="label">Address:</span> ${address}
                            </div>
                            
                            <div class="info-row">
                                <span class="label">Meeting Preference:</span> ${meetingPreference === 'meet' ? 'Would like to meet with technician' : 'Technician can inspect without owner present'}
                            </div>
                            
                            ${meetingPreference === 'meet' ? `
                            <div class="schedule">
                                <strong>Preferred Schedule:</strong><br>
                                Date: ${preferredDate}<br>
                                Time: ${preferredTime}<br>
                                <em style="color: #666; font-size: 0.9em;">Technician will contact to confirm exact meeting time</em>
                            </div>
                            ` : `
                            <div class="schedule">
                                <strong>Scheduling:</strong><br>
                                <em style="color: #666;">Technician will schedule inspection at earliest convenience</em>
                            </div>
                            `}
                            
                            <div class="info-row" style="margin-top: 15px;">
                                <span class="label">Notes:</span> ${notes || 'No additional notes'}
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        await emailTransporter.sendMail(mailOptions);
        
        console.log('✅ Technician inspection email sent successfully');

        res.json({ success: true, message: 'Inspection request submitted successfully!' });

    } catch (error) {
        console.error('❌ Error processing technician request:', error);
        
        let errorMessage = 'Error processing request. Please try again.';
        let statusCode = 500;
        
        if (error.code === 'EAUTH') {
            errorMessage = 'Email authentication failed. Please contact support.';
        } else if (error.code === 'ESOCKET' || error.code === 'ETIMEDOUT') {
            errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('Email service')) {
            errorMessage = 'Email service is temporarily unavailable. Please try again later.';
            statusCode = 503;
        }
        
        res.status(statusCode).json({ success: false, message: errorMessage });
    }
});

// Error handling middleware - MUST return JSON for API routes
app.use((error, req, res, next) => {
    console.error('❌ Server error:', error);
    
    // Don't try to send response if headers already sent
    if (res.headersSent) {
        console.error('Headers already sent, cannot send error response');
        return next(error);
    }
    
    // Handle Multer errors
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                success: false, 
                message: 'File too large. Maximum size is 10MB per file.' 
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ 
                success: false, 
                message: 'Too many files. Maximum is 10 files.' 
            });
        }
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({ 
                success: false, 
                message: 'Unexpected file field. Please use the correct form.' 
            });
        }
        // Generic multer error
        return res.status(400).json({ 
            success: false, 
            message: 'File upload error: ' + error.message 
        });
    }
    
    // Handle file type errors
    if (error.message && error.message.includes('Only image files')) {
        return res.status(400).json({ 
            success: false, 
            message: 'Only image files are allowed (JPG, PNG, etc.)' 
        });
    }
    
    // Handle request entity too large
    if (error.type === 'entity.too.large') {
        return res.status(413).json({ 
            success: false, 
            message: 'Request too large. Please reduce file sizes.' 
        });
    }
    
    // Default error response - ALWAYS JSON
    res.status(error.status || 500).json({ 
        success: false, 
        message: error.message || 'An unexpected server error occurred. Please try again.' 
    });
});

// 404 handler - Return JSON for API routes, HTML for pages
app.use((req, res) => {
    // If it's an API route or POST request, return JSON
    if (req.path.startsWith('/submit') || req.path.startsWith('/api') || req.method !== 'GET') {
        return res.status(404).json({ 
            success: false, 
            message: 'Endpoint not found' 
        });
    }
    
    // Otherwise serve the homepage
    res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

// For Vercel, export the Express app
// For local development, start the server
if (process.env.VERCEL) {
    module.exports = app;
} else {
    app.listen(PORT, () => {
        console.log(`🏠 GutterSnap server running on http://localhost:${PORT}`);
        console.log(`📧 Email configured for: ${process.env.EMAIL_USER || 'guttersnapp@gmail.com'}`);
    });
}
