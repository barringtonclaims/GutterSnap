// Owner Authentication Module
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// In-memory storage for users (for production, use a proper database)
// Structure: { email: { email, passwordHash, tempPassword, resetToken, resetTokenExpiry, firstLogin } }
const usersFilePath = path.join(__dirname, 'owners.json');

// Initialize default users
const defaultUsers = {
    'max@guttersnapchicago.com': {
        email: 'max@guttersnapchicago.com',
        passwordHash: null, // Will be set on first login
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

// Load or initialize users
function loadUsers() {
    try {
        if (process.env.VERCEL) {
            // In Vercel, use environment variable or in-memory storage
            // For production, you'd want to use a database
            return JSON.parse(process.env.OWNER_USERS || JSON.stringify(defaultUsers));
        } else {
            if (fs.existsSync(usersFilePath)) {
                const data = fs.readFileSync(usersFilePath, 'utf8');
                return JSON.parse(data);
            } else {
                // Create auth directory if it doesn't exist
                const authDir = path.dirname(usersFilePath);
                if (!fs.existsSync(authDir)) {
                    fs.mkdirSync(authDir, { recursive: true });
                }
                saveUsers(defaultUsers);
                return defaultUsers;
            }
        }
    } catch (error) {
        console.error('Error loading users:', error);
        return defaultUsers;
    }
}

// Save users to file
function saveUsers(users) {
    if (process.env.VERCEL) {
        // In Vercel, we can't save to filesystem
        // For production, use a database
        console.log('Running on Vercel - users stored in memory only');
        return;
    }
    
    try {
        fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
    } catch (error) {
        console.error('Error saving users:', error);
    }
}

// Active sessions storage (token -> email)
const activeSessions = new Map();

// Validate email format
function isValidEmail(email) {
    const allowedEmails = [
        'max@guttersnapchicago.com',
        'josh@guttersnapchicago.com',
        'matt@guttersnapchicago.com',
        'ian@guttersnapchicago.com',
        'brody@guttersnapchicago.com'
    ];
    return allowedEmails.includes(email.toLowerCase());
}

// Login function
async function login(email, password) {
    const users = loadUsers();
    const normalizedEmail = email.toLowerCase();
    
    if (!isValidEmail(normalizedEmail)) {
        return { success: false, message: 'Invalid email address' };
    }
    
    const user = users[normalizedEmail];
    if (!user) {
        return { success: false, message: 'User not found' };
    }
    
    let isPasswordValid = false;
    let firstLogin = user.firstLogin;
    
    // Check if using temporary password
    if (user.tempPassword && password === user.tempPassword) {
        isPasswordValid = true;
        firstLogin = true;
    } 
    // Check if using regular password
    else if (user.passwordHash) {
        isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    }
    
    if (!isPasswordValid) {
        return { success: false, message: 'Invalid password' };
    }
    
    // Generate session token
    const token = crypto.randomBytes(32).toString('hex');
    activeSessions.set(token, normalizedEmail);
    
    return { 
        success: true, 
        token, 
        email: normalizedEmail,
        firstLogin 
    };
}

// Request password reset
function requestPasswordReset(email) {
    const users = loadUsers();
    const normalizedEmail = email.toLowerCase();
    
    if (!isValidEmail(normalizedEmail)) {
        return { success: false, message: 'Invalid email address' };
    }
    
    const user = users[normalizedEmail];
    if (!user) {
        return { success: false, message: 'User not found' };
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 86400000; // 24 hours from now (extended for serverless)
    
    users[normalizedEmail].resetToken = resetToken;
    users[normalizedEmail].resetTokenExpiry = resetTokenExpiry;
    saveUsers(users);
    
    return { 
        success: true, 
        resetToken,
        email: normalizedEmail
    };
}

// Change password with reset token
async function changePassword(token, newPassword) {
    const users = loadUsers();
    
    // Check for master reset code (works for any owner)
    // Format: MASTER_RESET_[email without @domain]
    const masterResetPattern = /^MASTER_RESET_(.+)$/;
    const masterMatch = token.match(masterResetPattern);
    
    if (masterMatch) {
        const emailPrefix = masterMatch[1].toLowerCase();
        // Find user with this email prefix
        for (const email in users) {
            if (email.toLowerCase().startsWith(emailPrefix + '@')) {
                userEmail = email;
                break;
            }
        }
        
        if (userEmail) {
            console.log('Using master reset code for:', userEmail);
            // Hash the new password
            const passwordHash = await bcrypt.hash(newPassword, 10);
            
            // Update user
            users[userEmail].passwordHash = passwordHash;
            users[userEmail].tempPassword = null;
            users[userEmail].firstLogin = false;
            saveUsers(users);
            
            return { success: true, message: 'Password updated successfully' };
        }
    }
    
    // Find user with this reset token
    let userEmail = null;
    for (const email in users) {
        if (users[email].resetToken === token) {
            userEmail = email;
            break;
        }
    }
    
    if (!userEmail) {
        console.log('Reset token not found:', token);
        console.log('Available users:', Object.keys(users));
        return { success: false, message: 'Invalid or expired reset token. Please request a new password reset link or contact support.' };
    }
    
    const user = users[userEmail];
    
    // Check if token is expired
    if (Date.now() > user.resetTokenExpiry) {
        console.log('Reset token expired for:', userEmail);
        return { success: false, message: 'Reset token has expired. Please request a new password reset link or contact support.' };
    }
    
    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // Update user
    users[userEmail].passwordHash = passwordHash;
    users[userEmail].tempPassword = null; // Remove temp password
    users[userEmail].resetToken = null;
    users[userEmail].resetTokenExpiry = null;
    users[userEmail].firstLogin = false;
    
    saveUsers(users);
    
    return { success: true, message: 'Password updated successfully' };
}

// Verify session token
function verifySession(token) {
    if (!token) {
        return { valid: false };
    }
    
    const email = activeSessions.get(token);
    if (!email) {
        return { valid: false };
    }
    
    return { valid: true, email };
}

// Logout (invalidate session)
function logout(token) {
    activeSessions.delete(token);
    return { success: true };
}

module.exports = {
    login,
    requestPasswordReset,
    changePassword,
    verifySession,
    logout,
    isValidEmail
};

