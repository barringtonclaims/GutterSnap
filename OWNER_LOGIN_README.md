# GutterSnap Chicago Owner Login Portal

## Overview

A secure login portal for GutterSnap Chicago owners, accessible at `/ownerlogin.html`.

## Features

- **Secure Authentication**: Password hashing with bcrypt
- **Email-based Password Reset**: Automated email verification for password changes
- **First-Time Login Flow**: Automatic password reset email on first login
- **Session Management**: Secure token-based sessions
- **Isolated from Main Site**: Completely separate from public-facing pages

## Authorized Users

The following email addresses have access to the owner portal:

- max@guttersnapchicago.com
- josh@guttersnapchicago.com
- matt@guttersnapchicago.com
- ian@guttersnapchicago.com
- brody@guttersnapchicago.com

## Default Credentials

**Temporary Password (for all users)**: `Gsnap123!`

⚠️ **IMPORTANT**: On first login, users will automatically receive an email to set a new secure password.

## Password Requirements

New passwords must meet the following criteria:
- At least 8 characters long
- Include uppercase and lowercase letters
- Include at least one number
- Include at least one special character (!@#$%^&*)

## How It Works

### First-Time Login Process

1. Owner visits `/ownerlogin.html`
2. Enters their email and temporary password (`Gsnap123!`)
3. System logs them in and sends a password reset email
4. Owner clicks the link in the email
5. Sets a new secure password
6. Can now log in with their new password

### Password Reset Process

1. Click "Request Password Reset" on the login page
2. Enter email address
3. Receive password reset link via email
4. Click link and set new password
5. Log in with new password

## API Endpoints

### POST `/api/owner-login`
Login with email and password.

**Request Body:**
```json
{
  "email": "max@guttersnapchicago.com",
  "password": "password"
}
```

**Response:**
```json
{
  "success": true,
  "token": "session_token",
  "email": "max@guttersnapchicago.com",
  "firstLogin": true
}
```

### POST `/api/owner-password-reset-request`
Request a password reset email.

**Request Body:**
```json
{
  "email": "max@guttersnapchicago.com"
}
```

### POST `/api/owner-password-change`
Change password using reset token.

**Request Body:**
```json
{
  "token": "reset_token",
  "newPassword": "NewSecurePass123!"
}
```

### POST `/api/owner-logout`
Logout and invalidate session.

**Request Body:**
```json
{
  "token": "session_token"
}
```

## Security Features

1. **Password Hashing**: All passwords are hashed using bcrypt (salt rounds: 10)
2. **Token-Based Sessions**: Secure random tokens for session management
3. **Token Expiration**: Password reset tokens expire after 1 hour
4. **Email Verification**: Password changes require email verification
5. **Input Validation**: All inputs are validated on both frontend and backend
6. **Isolated Access**: Portal is not linked from public pages

## File Structure

```
/public/
  ├── ownerlogin.html     # Login page UI
  └── ownerlogin.js       # Frontend logic
/auth/
  ├── ownerAuth.js        # Authentication module
  └── owners.json         # User database (gitignored)
/server.js                # API endpoints
```

## User Data Storage

### Development (Local)
User data is stored in `/auth/owners.json`. This file is automatically created on first run and is gitignored for security.

### Production (Vercel)
User data is stored in-memory. For a production environment, you should migrate to a proper database (MongoDB, PostgreSQL, etc.).

## Email Configuration

The system uses the existing email configuration from `server.js`:
- **Service**: Gmail
- **User**: Process.env.EMAIL_USER (guttersnapp@gmail.com)
- **Password**: Process.env.EMAIL_PASS

Password reset emails are sent automatically when:
1. A user logs in for the first time
2. A user requests a password reset

## Deployment Notes

### Local Development
1. Run `npm install` to install dependencies (bcrypt, express-session)
2. Start the server: `npm start`
3. Access the portal at: `http://localhost:3000/ownerlogin.html`

### Production (Vercel)
The system is compatible with Vercel deployment. However, note:
- User data is stored in-memory (sessions will be lost on function restarts)
- For production use, migrate to a database solution
- Ensure EMAIL_USER and EMAIL_PASS environment variables are set in Vercel

## Future Enhancements

Consider implementing:
1. **Database Integration**: Replace JSON file storage with PostgreSQL/MongoDB
2. **Dashboard Features**: Add analytics, reports, and management tools
3. **Two-Factor Authentication**: Additional security layer
4. **Activity Logging**: Track login attempts and actions
5. **Role-Based Access**: Different permission levels for different owners
6. **API Rate Limiting**: Prevent brute force attacks

## Support

For technical issues or questions, contact: guttersnapp@gmail.com

## Testing

To test the system:

1. Navigate to `/ownerlogin.html`
2. Log in with any authorized email and password `Gsnap123!`
3. Check email for password reset link
4. Set a new password
5. Log out and log back in with new password

## Security Notes

⚠️ **IMPORTANT SECURITY REMINDERS:**

1. Never commit `/auth/owners.json` to version control
2. Use strong, unique passwords
3. Keep email credentials secure
4. Regularly review access logs
5. For production, implement proper database with backups
6. Consider adding rate limiting to prevent brute force attacks
7. Use HTTPS in production (Vercel provides this automatically)

## No Impact on Existing Site

This owner login system is completely isolated:
- No links from public pages
- No modifications to existing functionality
- Independent authentication system
- Separate routing and endpoints
- No changes to existing forms or pages

