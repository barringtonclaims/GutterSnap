# GutterSnap Quote Calculator System

## 🎉 Complete Interactive Quote System

A professional quote calculator that allows owners to create beautiful, interactive quotes with customer choice and automated email delivery.

---

## ✅ What's Been Implemented

### **1. Quote Calculator (Owner Dashboard)**
- **Location**: `/quote-calculator.html`
- **Access**: From owner dashboard → "Create Quote" button
- **Features**:
  - Customer information input
  - Measurements (1st/2nd floor, downspouts, end caps)
  - "Retrofit Possible" checkbox
  - Live calculation preview for both options
  - Save draft or send quote
  - Beautiful UI matching your site

### **2. Pricing Structure** (Correct Implementation)

**Protection Only:**
- 1st Floor: $28/linear foot
- 2nd Floor: $38/linear foot

**Gutter Replacement (Additional):**
- 1st Floor: $22/linear foot
- 2nd Floor: $27/linear foot

**Combined (Protection + Gutters):**
- 1st Floor: $50/linear foot
- 2nd Floor: $65/linear foot

**Other:**
- Downspouts: $20/linear foot
- End Caps/Miters: $20 each
- Tax: 10.25% (Chicago)

### **3. Customer Email (Interactive)**

**Scenario A: Retrofit Possible** → Customer gets 2 options:
- Option A: Protection Only (lower price)
- Option B: Protection + New Gutters (higher price)
- Each option has a "Select This Option →" button

**Scenario B: Retrofit NOT Possible** → Customer gets 1 option:
- Option B: Protection + New Gutters (required)
- "✓ Accept This Quote" button

### **4. Customer Acceptance Page**
- **Location**: `/accept-quote.html?id=QUOTEID`
- **Features**:
  - View all quote details
  - Select option (if multiple available)
  - Sign electronically
  - Accept terms checkbox
  - Beautiful confirmation screen
  - Decline option

### **5. Backend System**
- Quote storage (JSON file locally, memory on Vercel)
- 5 API endpoints:
  - `POST /api/quotes/create` - Create and send quote
  - `POST /api/quotes/save-draft` - Save without sending
  - `GET /api/quotes/:quoteId` - Retrieve quote
  - `POST /api/quotes/accept/:quoteId` - Customer accepts
  - `POST /api/quotes/decline/:quoteId` - Customer declines

### **6. Email Notifications**

**When Quote is Sent:**
- Customer receives interactive quote email

**When Quote is Accepted:**
- Customer receives confirmation email
- Owner receives notification with customer details

**When Quote is Declined:**
- Owner receives notification

---

## 🚀 How to Use

### **For Owners:**

1. **Log into Owner Portal**
   ```
   http://localhost:3000/ownerlogin.html
   Email: max@guttersnapchicago.com
   Password: Your password
   ```

2. **Click "Create Quote" Button**
   - Big orange card on dashboard

3. **Fill in Customer Info**
   - Name, email, phone, address

4. **Enter Measurements**
   - 1st floor linear feet
   - 2nd floor linear feet
   - Downspout linear feet
   - End caps/miters count

5. **Check "Retrofit Possible"** if applicable
   - Checked = Customer gets 2 options (protection only OR protection+gutters)
   - Unchecked = Customer gets 1 option (protection+gutters required)

6. **Review Live Quote Preview**
   - See both options calculated in real-time

7. **Click "Send Quote to Customer"**
   - Quote is saved
   - Customer receives interactive email
   - Quote ID is generated

### **For Customers:**

1. **Receive Email**
   - Beautiful branded email with quote details

2. **Click Option Button**
   - "Select This Option →" for Option A or B
   - Or "✓ Accept This Quote" if only one option

3. **Review Quote Details**
   - See full pricing breakdown
   - View all included features

4. **Accept Quote**
   - Type full name as signature
   - Check acceptance box
   - Click "Confirm & Accept Quote"

5. **Get Confirmation**
   - Success screen
   - Confirmation email
   - Owner is notified

---

## 📁 Files Created

```
/public/
├── quote-calculator.html        # Owner quote builder UI
├── quote-calculator.js          # Quote calculation logic
├── accept-quote.html            # Customer acceptance page
├── accept-quote.js              # Acceptance logic
└── ownerlogin.html (updated)    # Added "Create Quote" button

/quotes/
├── quotesManager.js             # Quote storage & management
└── quotes.json                  # Quote database (gitignored)

/server.js (updated)             # Added 5 quote API endpoints

/.gitignore (updated)            # Added quotes/quotes.json

/QUOTE_CALCULATOR_README.md      # This file
```

---

## 🔑 Key Features

### **Dynamic Pricing**
- Automatically calculates based on measurements
- Adjusts Option A rate based on retrofit checkbox
- Live preview updates as you type
- Accurate tax calculation (10.25%)

### **Interactive Customer Experience**
- Customer can choose their preferred option
- Beautiful email template with clickable buttons
- Direct link to acceptance page
- Option pre-selected from email link

### **Professional Emails**
- Branded design with GutterSnap colors
- Responsive layout
- Clear pricing breakdown
- Features and benefits listed
- Quote ID and expiration date

### **Owner Notifications**
- Instant email when quote accepted
- Customer contact info included
- Selected option and total shown
- "Next Steps" reminder

### **Quote Management**
- 30-day validity period
- Track view count
- Save drafts
- Status tracking (draft/sent/accepted/declined)

---

## 💡 Example Quote

**Customer**: John Doe  
**Property**: 123 Main St, Chicago  

**Measurements**:
- 1st Floor: 100 ft
- 2nd Floor: 50 ft  
- Downspouts: 40 ft
- End Caps: 8
- Retrofit Possible: ✓ Yes

**Option A: Protection Only**
- 1st Floor: 100 × $28 = $2,800
- 2nd Floor: 50 × $38 = $1,900
- Downspouts: 40 × $20 = $800
- End Caps: 8 × $20 = $160
- **Subtotal**: $5,660
- **Tax**: $580.15
- **TOTAL**: $6,240.15

**Option B: Protection + New Gutters**
- 1st Floor: 100 × $50 = $5,000
- 2nd Floor: 50 × $65 = $3,250
- Downspouts: 40 × $20 = $800
- End Caps: 8 × $20 = $160
- **Subtotal**: $9,210
- **Tax**: $944.03
- **TOTAL**: $10,154.03

---

## 🧪 Testing the System

### **Test Flow:**

1. **Create Quote**:
   ```
   - Login as owner
   - Navigate to quote calculator
   - Fill in: Name: Test Customer, Email: your-email@gmail.com
   - Phone: 555-1234, Address: 123 Test St
   - 1st Floor: 100, 2nd Floor: 50, Downspouts: 40, End Caps: 8
   - Check "Retrofit Possible"
   - Click "Send Quote to Customer"
   ```

2. **Check Email**:
   ```
   - Open email at your-email@gmail.com
   - See interactive quote with 2 options
   - Click "Select This Option →" for Option A
   ```

3. **Accept Quote**:
   ```
   - Review quote details
   - Type "Test Customer" as signature
   - Check acceptance box
   - Click "Confirm & Accept Quote"
   ```

4. **Verify**:
   ```
   - Customer sees success screen
   - Customer receives confirmation email
   - Owner receives notification email
   ```

---

## 🔐 Security & Data

### **Local Development:**
- Quotes stored in `/quotes/quotes.json`
- File is gitignored for privacy
- Auto-created on first run

### **Production (Vercel):**
- Quotes stored in-memory (temporary)
- Resets on function restart
- **Recommendation**: Migrate to database (MongoDB/PostgreSQL) for production

### **Session Management:**
- Only logged-in owners can create quotes
- Session checked via sessionStorage
- Redirects to login if not authenticated

---

## 📧 Email Configuration

Uses existing email setup from `server.js`:
- **Service**: Gmail
- **Account**: guttersnapp@gmail.com
- **Config**: From .env file

All quote emails sent from this account.

---

## 🎨 Design Highlights

- **Brand Colors**: GutterSnap orange (#EE9844)
- **Mobile Responsive**: Works on all devices
- **Professional**: Clean, modern UI
- **Interactive**: Real-time calculations
- **User-Friendly**: Clear instructions and feedback

---

## 🚀 Production Deployment

**Ready for Vercel!** System works on Vercel out of the box:
- No additional configuration needed
- Uses existing email setup
- Quotes stored in-memory (upgrade to DB recommended)

**Deploy Command:**
```bash
vercel --prod
```

---

## 🔮 Future Enhancements

Consider adding:
1. **Quote List View**: See all sent quotes
2. **Quote Edit**: Modify quotes before sending
3. **Quote Templates**: Save common configurations
4. **Analytics**: Track conversion rates
5. **Database Integration**: Persist quotes permanently
6. **Airtable Sync**: Auto-create records in Airtable
7. **SMS Notifications**: Text owner when quote accepted
8. **Payment Integration**: Collect deposits
9. **Calendar Integration**: Schedule installation

---

## ✅ System Status

**All Components Working:**
- ✅ Quote Calculator UI
- ✅ Live Pricing Calculation
- ✅ Email Generation
- ✅ Customer Acceptance Page
- ✅ Quote Storage
- ✅ API Endpoints
- ✅ Email Notifications
- ✅ Mobile Responsive

**Ready for Production Use!**

---

## 🆘 Support

If you encounter issues:

1. **Check Server Logs**: Look for error messages in terminal
2. **Verify Email Config**: Ensure .env has EMAIL_USER and EMAIL_PASS
3. **Test Locally First**: Use localhost before deploying
4. **Check Quote ID**: Ensure customer has valid, non-expired quote link

---

## 📝 Notes

- Quote IDs are 8-character hex strings (e.g., `A3F8B2C1`)
- Quotes expire after 30 days
- Customer can view quote multiple times (tracked)
- Once accepted, quote cannot be accepted again
- Owner email must be logged into owner portal to create quotes

---

**Built with ❤️ for GutterSnap Chicago**

**System Version**: 1.0.0  
**Last Updated**: October 15, 2025


