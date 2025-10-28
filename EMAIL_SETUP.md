# Email Setup for Individual Owner Accounts

## 🎯 What's Changed

Each owner now sends quotes from their **own email address** instead of the main company email. This makes it more personal and allows customers to reply directly to the owner who sent the quote.

## 📧 Email Configuration

### Your `.env` File Structure

Create or update your `.env` file with these entries:

```env
# Main company email (for internal notifications and fallback)
EMAIL_USER=guttersnapp@gmail.com
EMAIL_PASS=apuhygkrsxtjsbws

# Max's email account
MAX_EMAIL=max@guttersnapchicago.com
MAX_EMAIL_PASS=paste_max_app_password_here

# Josh's email account
JOSH_EMAIL=josh@guttersnapchicago.com
JOSH_EMAIL_PASS=paste_josh_app_password_here

# Matt's email account
MATT_EMAIL=matt@guttersnapchicago.com
MATT_EMAIL_PASS=paste_matt_app_password_here

# Ian's email account
IAN_EMAIL=ian@guttersnapchicago.com
IAN_EMAIL_PASS=paste_ian_app_password_here

# Brody's email account
BRODY_EMAIL=brody@guttersnapchicago.com
BRODY_EMAIL_PASS=paste_brody_app_password_here
```

## 🔑 Getting Gmail App Passwords

For each owner's Gmail account:

1. **Log into Gmail** at the owner's email address
2. **Go to Google Account Settings**: https://myaccount.google.com/
3. **Navigate to Security** → **2-Step Verification** (must be enabled)
4. **Scroll down** to "App passwords" section
5. **Generate a new app password**:
   - Select "Mail" for app
   - Select "Other" for device → Name it "GutterSnap Quote System"
6. **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)
7. **Paste into .env** (remove spaces): `abcdefghijklmnop`

## 💡 How It Works

### When an Owner Sends a Quote:

1. **Owner logs in** to their account (e.g., max@guttersnapchicago.com)
2. **Creates a quote** in the calculator
3. **Sends to customer**
4. **Email arrives from** "Max - GutterSnap Chicago <max@guttersnapchicago.com>"
5. **Customer replies** → Goes directly to Max's inbox

### Email Examples:

**From Field:**
```
From: Max - GutterSnap Chicago <max@guttersnapchicago.com>
Subject: Your GutterSnap Quote for 123 Main St
```

**Footer:**
```
This quote was prepared by Max (max@guttersnapchicago.com)
Questions? Call Max at (312) 555-SNAP or reply to this email.
```

## 🛡️ Fallback System

**If an owner hasn't configured their email:**
- System automatically uses the main company email (guttersnapp@gmail.com)
- Quote still works, just comes from company account
- Owner can add their credentials later

**Example:**
```env
# If you only configure Max and Josh:
MAX_EMAIL_PASS=max_password_here
JOSH_EMAIL_PASS=josh_password_here

# Matt, Ian, Brody quotes will send from guttersnapp@gmail.com
# (until you add their passwords)
```

## ✅ Setup Checklist

For each owner:
- [ ] Confirm Gmail account exists
- [ ] Enable 2-Step Verification on Gmail
- [ ] Generate App Password
- [ ] Add to `.env` file
- [ ] Restart server: `npm start`
- [ ] Test by creating a quote

## 🧪 Testing

**To test Max's email:**
1. Log in as max@guttersnapchicago.com
2. Create a test quote (use your personal email as customer)
3. Check your inbox
4. Verify "From" shows: "Max - GutterSnap Chicago"
5. Reply to email → Should go to max@guttersnapchicago.com

## 📊 Server Startup

When you start the server, you'll see:
```
✅ Main email server is ready
✅ Email configured for: max@guttersnapchicago.com
✅ Email configured for: josh@guttersnapchicago.com
✅ Email configured for: matt@guttersnapchicago.com
✅ Email configured for: ian@guttersnapchicago.com
✅ Email configured for: brody@guttersnapchicago.com
```

If a password is missing, that owner's email won't be configured (will use fallback).

## 🔐 Security Notes

**Important:**
- `.env` file is gitignored (never commits to GitHub)
- App passwords can be revoked anytime from Google Account
- Each owner only needs their own password
- Main company password remains as backup

## 🚀 Production (Vercel)

When deploying to Vercel:

1. **Go to Vercel Dashboard** → Your project → Settings → Environment Variables
2. **Add each variable**:
   ```
   MAX_EMAIL = max@guttersnapchicago.com
   MAX_EMAIL_PASS = [paste app password]
   JOSH_EMAIL = josh@guttersnapchicago.com
   JOSH_EMAIL_PASS = [paste app password]
   ... etc
   ```
3. **Redeploy** the project
4. **Test** on production domain

## 💼 Benefits

✅ **Personal touch** - Customers see who they're working with  
✅ **Direct replies** - Responses go to the right person  
✅ **Accountability** - Each owner manages their own quotes  
✅ **Professional** - Individual email addresses look more legitimate  
✅ **Tracking** - Easy to see who sent what in Gmail  

## 🆘 Troubleshooting

**"Email configuration error"**
- Check that 2-Step Verification is enabled
- Verify app password is correct (16 characters, no spaces)
- Make sure EMAIL_USER and EMAIL_PASS still work (fallback)

**"Emails still coming from guttersnapp@gmail.com"**
- Owner's password might be missing in .env
- Check server logs for which emails are configured
- Restart server after adding new passwords

**"530 Authentication error"**
- App password is wrong or expired
- Regenerate app password from Google Account

---

**All set!** Each owner can now send quotes from their own email address. 🎉


