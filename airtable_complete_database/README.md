# GutterSnap Complete Airtable Database Import

This folder contains all CSV files needed to set up your complete GutterSnap CRM database in Airtable.

## 📊 Database Structure

### 5 Tables Total:
1. **Owners** - Your team members and authentication
2. **Pricing Configuration** - Centralized pricing control
3. **Self Inspection Requests** - Customer photo submissions
4. **Technician Requests** - Professional inspection appointments
5. **Quotes** - Pricing quotes and contracts

## 📥 Import Order (IMPORTANT!)

Import tables in this exact order to avoid dependency issues:

### Step 1: Import `1_owners.csv`
- Table name: "Owners"
- This is your team/authentication table
- After import, change field types:
  - Email → Email
  - Active → Checkbox
  - First Login → Checkbox
  - Created Date → Created time

### Step 2: Import `2_pricing_configuration.csv`
- Table name: "Pricing Configuration"
- Your pricing control center
- After import, change field types:
  - Price → Currency
  - Active → Checkbox
  - Category → Single select
  - Unit Type → Single select
  - Floor Level → Single select

### Step 3: Import `3_self_inspection_requests.csv`
- Table name: "Self Inspection Requests"
- Customer photo submissions
- After import, change field types:
  - Request ID → Autonumber (or Number)
  - Customer Email → Email
  - Customer Phone → Phone number
  - Property Address → Long text
  - Status → Single select (New, Reviewing, Quote Sent, Archived)
  - Inspection Type → Single select (Self-Inspection)
  - Created Date → Created time
  - Last Modified → Last modified time
  - All Photo fields → URL
  - Customer → Link to "Customers" table
  - Assigned Quote → Link to "Quotes" table

### Step 4: Import `4_technician_requests.csv`
- Table name: "Technician Requests"
- Professional inspection scheduling
- After import, change field types:
  - Request ID → Autonumber (or Number)
  - Customer Email → Email
  - Customer Phone → Phone number
  - Property Address → Long text
  - Meeting Preference → Single select (Meet with Technician, No Meeting Required)
  - Preferred Time → Single select (Morning (8-11am), Afternoon (12-3pm), Evening (4-7pm))
  - Status → Single select (New, Scheduled, Completed, Quote Sent, Archived)
  - Created Date → Created time
  - Last Modified → Last modified time
  - Preferred Date → Date
  - Scheduled Date → Date
  - Customer → Link to "Customers" table
  - Assigned Quote → Link to "Quotes" table

### Step 5: Import `5_quotes.csv`
- Table name: "Quotes"
- Your quoting system
- After import, change field types:
  - Customer Email → Email
  - Customer Phone → Phone number
  - Property Address → Long text
  - All measurement fields → Number
  - All cost/price fields → Formula (see below)
  - Retrofit Possible → Checkbox
  - Status → Single select (Draft, Sent, Viewed, Accepted, Declined, Expired)
  - Customer Selection → Single select (Option A, Option B)
  - Created By → Link to "Owners" table
  - Date fields → Date
  - Signature Image → URL
  - Contract PDF → URL
  - Accepted Terms → Checkbox
  - Related Request Type → Single select (Self Inspection Request, Technician Request)

## 🧮 Setting Up Quote Formulas

After importing the Quotes table, convert these fields from Currency to Formula:

### Option A Formulas (Protection Only):
```
Option A - Protection 1F Cost:
IF({Retrofit Possible}, {1st Floor Feet} * 28, 0)

Option A - Protection 2F Cost:
IF({Retrofit Possible}, {2nd Floor Feet} * 38, 0)

Option A - Protection 3F Cost:
IF({Retrofit Possible}, {3rd Floor Feet} * 48, 0)

Option A - Subtotal:
{Option A - Protection 1F Cost} + {Option A - Protection 2F Cost} + {Option A - Protection 3F Cost}

Option A - Tax:
ROUND({Option A - Subtotal} * 0.1025, 2)

Option A - Total:
{Option A - Subtotal} + {Option A - Tax}
```

### Option B Formulas (Complete System):
```
Option B - Protection 1F Cost:
{1st Floor Feet} * 28

Option B - Protection 2F Cost:
{2nd Floor Feet} * 38

Option B - Protection 3F Cost:
{3rd Floor Feet} * 48

Option B - Gutter Install 1F Cost:
{1st Floor Feet} * 22

Option B - Gutter Install 2F Cost:
{2nd Floor Feet} * 27

Option B - Gutter Install 3F Cost:
{3rd Floor Feet} * 37

Option B - Downspouts Cost:
{Downspout Feet} * 20

Option B - End Caps Cost:
{End Cap Count} * 20

Option B - Miters Cost:
{Miter Count} * 25

Option B - Subtotal:
{Option B - Protection 1F Cost} + {Option B - Protection 2F Cost} + {Option B - Protection 3F Cost} + {Option B - Gutter Install 1F Cost} + {Option B - Gutter Install 2F Cost} + {Option B - Gutter Install 3F Cost} + {Option B - Downspouts Cost} + {Option B - End Caps Cost} + {Option B - Miters Cost}

Option B - Tax:
ROUND({Option B - Subtotal} * 0.1025, 2)

Option B - Total:
{Option B - Subtotal} + {Option B - Tax}
```

## 🔗 Creating Table Relationships

After all imports, create these relationships:

1. **Self Inspection Requests → Quotes**
   - In Self Inspection Requests: Add field "Assigned Quote" → Link to Quotes table

2. **Technician Requests → Quotes**
   - In Technician Requests: Add field "Assigned Quote" → Link to Quotes table

3. **Quotes → Requests**
   - The "Related Request ID" field can link to either Self Inspection or Technician requests

## 🎯 Quick Test

Test your setup:
1. Create a test quote with:
   - 1st Floor: 100 feet
   - 2nd Floor: 50 feet
   - Retrofit Possible: ✓
2. Verify:
   - Option A shows only protection costs
   - Option B shows full system costs
   - Tax calculates at 10.25%

## 💡 Pro Tips

1. **Create Views**:
   - "Active Quotes" (Status = Sent or Viewed)
   - "My Quotes" (Created By = current user)
   - "New Requests" (Status = New)

2. **Hide Fields**:
   - Hide intermediate calculation fields
   - Show only totals in main views

3. **Set Permissions**:
   - Only admins should edit Pricing Configuration
   - All owners can create quotes

4. **Color Coding**:
   - Use colors for Status fields
   - Red for overdue quotes
   - Green for accepted

## 📝 Sample Data Notes

- The CSV files include 2-3 sample records each
- Delete or keep samples as needed
- Request IDs can be changed to Autonumber fields for auto-generation
- Photo URLs are placeholders - will be replaced by real Cloudinary URLs

## Need Help?

If formulas aren't calculating correctly:
1. Check field names match exactly (including spaces)
2. Ensure number fields are set to Number type
3. Make sure Retrofit Possible is a checkbox
4. Verify all cost fields are formulas, not manual entries
