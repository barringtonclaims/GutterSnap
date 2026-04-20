// Airtable Service - Handles all Airtable database operations
const Airtable = require('airtable');

// Lazy Airtable init. We used to build the base at module-load time, which
// crashed the entire serverless function with FUNCTION_INVOCATION_FAILED the
// moment a required env var was missing — even for requests that didn't touch
// Airtable (like serving a static file or answering /health). Deferring the
// init lets the app boot cleanly and fail per-request with a readable error.
let _base = null;
function base(tableName) {
    if (!_base) {
        const apiKey = process.env.AIRTABLE_API_KEY;
        const baseId = process.env.AIRTABLE_BASE_ID;
        if (!apiKey) throw new Error('AIRTABLE_API_KEY is not set. Configure it in the environment (Vercel → Project → Settings → Environment Variables).');
        if (!baseId) throw new Error('AIRTABLE_BASE_ID is not set. Configure it in the environment (Vercel → Project → Settings → Environment Variables).');
        _base = new Airtable({ apiKey }).base(baseId);
    }
    return _base(tableName);
}

// Table names
const TABLES = {
    OWNERS: 'Owners',
    PRICING: 'Pricing Configuration',
    SELF_INSPECTION: 'Self Inspection Requests',
    TECHNICIAN_REQUESTS: 'Technician Requests',
    QUOTES: 'Quotes',
    CUSTOMERS: 'Customers'
};

// ==========================================
// CUSTOMERS
// ==========================================

async function findOrCreateCustomer(customerData) {
    try {
        // First, try to find existing customer by email
        const existingRecords = await base(TABLES.CUSTOMERS)
            .select({
                filterByFormula: `{Email} = '${customerData.email}'`,
                maxRecords: 1
            })
            .firstPage();
        
        if (existingRecords.length > 0) {
            // Customer exists, update with new info if provided
            const existingCustomer = existingRecords[0];
            const updates = {};
            
            if (customerData.name && customerData.name !== existingCustomer.fields['Customer Name']) {
                updates['Customer Name'] = customerData.name;
            }
            if (customerData.phone && customerData.phone !== existingCustomer.fields['Phone']) {
                updates['Phone'] = customerData.phone;
            }
            if (customerData.address && customerData.address !== existingCustomer.fields['Address']) {
                updates['Address'] = customerData.address;
            }
            
            if (Object.keys(updates).length > 0) {
                const updatedRecord = await base(TABLES.CUSTOMERS).update(existingCustomer.id, updates);
                return { id: updatedRecord.id, fields: updatedRecord.fields, isNew: false };
            }
            
            return { id: existingCustomer.id, fields: existingCustomer.fields, isNew: false };
        } else {
            // Create new customer
            const newRecord = await base(TABLES.CUSTOMERS).create({
                'Customer Name': customerData.name || '',
                'Email': customerData.email,
                'Phone': customerData.phone || '',
                'Address': customerData.address || '',
                'Lead Source': customerData.leadSource || 'Website',
                'Status': customerData.status || 'New Lead',
                'Priority': 'Medium'
            });
            
            return { id: newRecord.id, fields: newRecord.fields, isNew: true };
        }
    } catch (error) {
        console.error('Error in findOrCreateCustomer:', error);
        throw error;
    }
}

async function assignCustomerToOwner(customerId, ownerEmail) {
    try {
        // First get the owner record ID
        const ownerRecords = await base(TABLES.OWNERS)
            .select({
                filterByFormula: `{Email} = '${ownerEmail}'`,
                maxRecords: 1
            })
            .firstPage();
        
        if (ownerRecords.length === 0) {
            throw new Error(`Owner not found: ${ownerEmail}`);
        }
        
        const ownerId = ownerRecords[0].id;
        
        // Update customer with owner assignment
        const updatedCustomer = await base(TABLES.CUSTOMERS).update(customerId, {
            'Assigned To': [ownerId]
        });
        
        return { success: true, customer: updatedCustomer.fields };
    } catch (error) {
        console.error('Error assigning customer:', error);
        throw error;
    }
}

async function updateCustomerStatus(customerId, newStatus) {
    try {
        const updatedRecord = await base(TABLES.CUSTOMERS).update(customerId, {
            'Status': newStatus
        });
        
        return { success: true, customer: updatedRecord.fields };
    } catch (error) {
        console.error('Error updating customer status:', error);
        throw error;
    }
}

async function linkCustomerToRecord(customerId, recordId, recordType) {
    try {
        // Get current customer to preserve existing links
        const customer = await base(TABLES.CUSTOMERS).find(customerId);
        const updates = {};
        
        switch (recordType) {
            case 'self-inspection':
                const currentSelfInspections = customer.fields['Self Inspections'] || [];
                updates['Self Inspections'] = [...currentSelfInspections, recordId];
                break;
            case 'technician':
                const currentTechRequests = customer.fields['Technician Requests'] || [];
                updates['Technician Requests'] = [...currentTechRequests, recordId];
                break;
            case 'quote':
                const currentQuotes = customer.fields['Quotes'] || [];
                updates['Quotes'] = [...currentQuotes, recordId];
                break;
        }
        
        await base(TABLES.CUSTOMERS).update(customerId, updates);
        return { success: true };
    } catch (error) {
        console.error('Error linking customer to record:', error);
        throw error;
    }
}

async function getCustomersForOwner(ownerEmail, includeUnassigned = false) {
    try {
        const ownerRecords = await base(TABLES.OWNERS)
            .select({
                filterByFormula: `{Email} = '${ownerEmail}'`,
                maxRecords: 1
            })
            .firstPage();

        if (ownerRecords.length === 0) {
            console.warn(`Owner not found in Owners table: ${ownerEmail}`);
            return [];
        }

        const ownerId = ownerRecords[0].id;

        const records = await base(TABLES.CUSTOMERS).select({}).all();

        const filtered = records.filter(record => {
            const assignedTo = record.fields['Assigned To'];
            const isAssignedToOwner = assignedTo && assignedTo.includes(ownerId);
            const isUnassigned = !assignedTo || assignedTo.length === 0;
            return includeUnassigned ? (isAssignedToOwner || isUnassigned) : isAssignedToOwner;
        });

        return filtered.map(record => ({ id: record.id, ...record.fields }));
    } catch (error) {
        console.error('Error getting customers for owner:', error);
        throw error;
    }
}

async function getUnassignedCustomers() {
    try {
        const records = await base(TABLES.CUSTOMERS)
            .select({
                filterByFormula: '{Assigned To} = BLANK()',
                sort: [{ field: 'Created Date', direction: 'desc' }]
            })
            .all();
        
        return records.map(record => ({
            id: record.id,
            ...record.fields
        }));
    } catch (error) {
        console.error('Error getting unassigned customers:', error);
        throw error;
    }
}

// ==========================================
// SELF INSPECTION REQUESTS
// ==========================================

async function createSelfInspectionRequest(data) {
    try {
        const record = await base(TABLES.SELF_INSPECTION).create({
            'Customer Name': data.customerName,
            'Customer Email': data.customerEmail,
            'Customer Phone': data.customerPhone,
            'Property Address': data.propertyAddress,
            'Notes': data.notes || '',
            'Inspection Type': 'Self-Inspection',
            'Status': 'New',
            'Photo - Front': data.photos.front || '',
            'Photo - Front Right Corner': data.photos.frontRightCorner || '',
            'Photo - Right Side': data.photos.rightSide || '',
            'Photo - Rear Right Corner': data.photos.rearRightCorner || '',
            'Photo - Rear': data.photos.rear || '',
            'Photo - Rear Left Corner': data.photos.rearLeftCorner || '',
            'Photo - Left Side': data.photos.leftSide || '',
            'Photo - Left Front Corner': data.photos.leftFrontCorner || '',
            'Photo - Gutter Swatch': data.photos.gutterSwatch || ''
        });

        return {
            success: true,
            requestId: record.id,
            data: record.fields
        };
    } catch (error) {
        console.error('Error creating self inspection request:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

async function getSelfInspectionRequest(requestId) {
    try {
        const record = await base(TABLES.SELF_INSPECTION).find(requestId);
        return {
            success: true,
            data: record.fields
        };
    } catch (error) {
        console.error('Error fetching self inspection request:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

async function updateSelfInspectionRequest(recordId, updates) {
    try {
        const updatedRecord = await base(TABLES.SELF_INSPECTION).update(recordId, updates);
        return { success: true, record: updatedRecord.fields };
    } catch (error) {
        console.error('Error updating self inspection request:', error);
        return { success: false, error: error.message };
    }
}

// ==========================================
// TECHNICIAN REQUESTS
// ==========================================

async function createTechnicianRequest(data) {
    try {
        // Format preferred date if provided (Airtable Date field expects YYYY-MM-DD)
        let preferredDate = null;
        if (data.preferredDate) {
            preferredDate = new Date(data.preferredDate).toISOString().split('T')[0];
        }
        
        const record = await base(TABLES.TECHNICIAN_REQUESTS).create({
            'Customer Name': data.customerName,
            'Customer Email': data.customerEmail,
            'Customer Phone': data.customerPhone,
            'Property Address': data.propertyAddress,
            'Meeting Preference': data.meetingPreference,
            'Preferred Date': preferredDate,
            'Preferred Time': data.preferredTime || '',
            'Notes': data.notes || '',
            'Status': 'New'
        });

        return {
            success: true,
            requestId: record.id,
            data: record.fields
        };
    } catch (error) {
        console.error('Error creating technician request:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

async function getTechnicianRequest(requestId) {
    try {
        const record = await base(TABLES.TECHNICIAN_REQUESTS).find(requestId);
        return {
            success: true,
            data: record.fields
        };
    } catch (error) {
        console.error('Error fetching technician request:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

async function updateTechnicianRequest(recordId, updates) {
    try {
        const updatedRecord = await base(TABLES.TECHNICIAN_REQUESTS).update(recordId, updates);
        
        return { 
            success: true, 
            record: updatedRecord.fields
        };
    } catch (error) {
        console.error('Error updating technician request:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
}


// ==========================================
// PRICING
// ==========================================

async function getPricing() {
    try {
        const records = await base(TABLES.PRICING)
            .select({
                filterByFormula: '{Active} = TRUE()'
            })
            .all();
        
        const pricing = {};
        records.forEach(record => {
            const code = record.fields['Item Code'];
            pricing[code] = {
                name: record.fields['Item Name'],
                price: record.fields['Price'],
                category: record.fields['Category'],
                unitType: record.fields['Unit Type'],
                floorLevel: record.fields['Floor Level']
            };
        });
        
        return pricing;
    } catch (error) {
        console.error('Error fetching pricing:', error);
        throw error;
    }
}

function calculateQuotePricing(measurements, pricing) {
    const TAX_RATE = 0.1025;
    
    // Option A: Protection Only (if retrofit possible)
    let optionA = null;
    if (measurements.retrofitPossible) {
        const prot1F = (measurements.firstFloor || 0) * (pricing.PROT_1F?.price || 28);
        const prot2F = (measurements.secondFloor || 0) * (pricing.PROT_2F?.price || 38);
        const prot3F = (measurements.thirdFloor || 0) * (pricing.PROT_3F?.price || 48);
        
        const subtotal = prot1F + prot2F + prot3F;
        const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
        
        optionA = {
            protection1F: prot1F,
            protection2F: prot2F,
            protection3F: prot3F,
            subtotal: subtotal,
            tax: tax,
            total: subtotal + tax
        };
    }
    
    // Option B: Complete System (always available)
    const prot1F = (measurements.firstFloor || 0) * (pricing.PROT_1F?.price || 28);
    const prot2F = (measurements.secondFloor || 0) * (pricing.PROT_2F?.price || 38);
    const prot3F = (measurements.thirdFloor || 0) * (pricing.PROT_3F?.price || 48);
    const gutter1F = (measurements.firstFloor || 0) * (pricing.GUTTER_1F?.price || 22);
    const gutter2F = (measurements.secondFloor || 0) * (pricing.GUTTER_2F?.price || 27);
    const gutter3F = (measurements.thirdFloor || 0) * (pricing.GUTTER_3F?.price || 37);
    const downspouts = (measurements.downspoutFeet || 0) * (pricing.DOWNSPOUT?.price || 20);
    const endCaps = (measurements.endCaps || 0) * (pricing.ENDCAP?.price || 20);
    const miters = (measurements.miters || 0) * (pricing.MITER?.price || 25);
    
    const subtotal = prot1F + prot2F + prot3F + gutter1F + gutter2F + gutter3F + downspouts + endCaps + miters;
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    
    const optionB = {
        protection1F: prot1F,
        protection2F: prot2F,
        protection3F: prot3F,
        gutterInstall1F: gutter1F,
        gutterInstall2F: gutter2F,
        gutterInstall3F: gutter3F,
        downspouts: downspouts,
        endCaps: endCaps,
        miters: miters,
        subtotal: subtotal,
        tax: tax,
        total: subtotal + tax
    };
    
    return { optionA, optionB };
}

// ==========================================
// QUOTES
// ==========================================

async function createQuote(quoteData) {
    try {
        // Fetch current pricing from Pricing Configuration table
        console.log('📊 Fetching pricing from Airtable...');
        const pricing = await getPricing();
        
        // Calculate quote pricing using current pricing
        console.log('💰 Calculating quote totals...');
        const { optionA, optionB } = calculateQuotePricing(quoteData.measurements, pricing);
        
        // Format valid until date (Airtable expects YYYY-MM-DD format for Date fields)
        let validUntilDate;
        if (quoteData.validUntil) {
            validUntilDate = new Date(quoteData.validUntil).toISOString().split('T')[0];
        } else {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 30);
            validUntilDate = futureDate.toISOString().split('T')[0];
        }
        
        // Build the record data
        const recordData = {
            'Quote ID': quoteData.quoteId,
            'Customer Name': quoteData.customer.name,
            'Customer Email': quoteData.customer.email,
            'Customer Phone': quoteData.customer.phone,
            'Property Address': quoteData.customer.address,
            '1st Floor Feet': quoteData.measurements.firstFloor || 0,
            '2nd Floor Feet': quoteData.measurements.secondFloor || 0,
            '3rd Floor Feet': quoteData.measurements.thirdFloor || 0,
            'Downspout Feet': quoteData.measurements.downspoutFeet || 0,
            'End Cap Count': quoteData.measurements.endCaps || 0,
            'Miter Count': quoteData.measurements.miters || 0,
            'Retrofit Possible': quoteData.measurements.retrofitPossible || false,
            'Status': 'Draft',
            'Created By': quoteData.createdBy,
            'Internal Notes': quoteData.notes || '',
            'Valid Until': validUntilDate
        };
        
        // Add Option A pricing if retrofit is possible
        if (optionA) {
            recordData['Option A - Protection 1F Cost'] = optionA.protection1F;
            recordData['Option A - Protection 2F Cost'] = optionA.protection2F;
            recordData['Option A - Protection 3F Cost'] = optionA.protection3F;
            recordData['Option A - Subtotal'] = optionA.subtotal;
            recordData['Option A - Tax'] = optionA.tax;
            recordData['Option A - Total'] = optionA.total;
        }
        
        // Add Option B pricing (always present)
        recordData['Option B - Protection 1F Cost'] = optionB.protection1F;
        recordData['Option B - Protection 2F Cost'] = optionB.protection2F;
        recordData['Option B - Protection 3F Cost'] = optionB.protection3F;
        recordData['Option B - Gutter Install 1F Cost'] = optionB.gutterInstall1F;
        recordData['Option B - Gutter Install 2F Cost'] = optionB.gutterInstall2F;
        recordData['Option B - Gutter Install 3F Cost'] = optionB.gutterInstall3F;
        recordData['Option B - Downspouts Cost'] = optionB.downspouts;
        recordData['Option B - End Caps Cost'] = optionB.endCaps;
        recordData['Option B - Miters Cost'] = optionB.miters;
        recordData['Option B - Subtotal'] = optionB.subtotal;
        recordData['Option B - Tax'] = optionB.tax;
        recordData['Option B - Total'] = optionB.total;
        
        console.log('💵 Option A Total:', optionA ? `$${optionA.total.toFixed(2)}` : 'N/A');
        console.log('💵 Option B Total:', `$${optionB.total.toFixed(2)}`);
        
        const record = await base(TABLES.QUOTES).create(recordData);

        return {
            success: true,
            quoteId: quoteData.quoteId,
            recordId: record.id,
            quote: formatQuoteForResponse(record.fields)
        };
    } catch (error) {
        console.error('Error creating quote in Airtable:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

async function getQuote(quoteId, { trackView = false } = {}) {
    try {
        const records = await base(TABLES.QUOTES)
            .select({
                filterByFormula: `{Quote ID} = '${quoteId}'`,
                maxRecords: 1
            })
            .firstPage();

        if (records.length === 0) {
            return { success: false, message: 'Quote not found' };
        }

        const record = records[0];

        // Auto-mark as Expired if past valid-until and not yet accepted.
        const validUntil = record.fields['Valid Until'];
        const status = record.fields['Status'];
        const isTerminal = ['Accepted', 'Declined'].includes(status);
        if (validUntil && !isTerminal && new Date(validUntil) < new Date() && status !== 'Expired') {
            try {
                await base(TABLES.QUOTES).update(record.id, { 'Status': 'Expired' });
                record.fields['Status'] = 'Expired';
            } catch (e) { /* non-fatal */ }
        }

        if (trackView) {
            try {
                await base(TABLES.QUOTES).update(record.id, {
                    'Viewed Count': (record.fields['Viewed Count'] || 0) + 1,
                    'Last Viewed': new Date().toISOString().split('T')[0]
                });
            } catch (e) { /* non-fatal */ }
        }

        return {
            success: true,
            quote: formatQuoteForResponse(record.fields, record.id)
        };
    } catch (error) {
        console.error('Error fetching quote:', error);
        return { success: false, error: error.message };
    }
}

// Fetch a quote by its Airtable record ID (what Customers.Quotes stores).
// This is what the owner dashboard should use — `getQuote` is for the public
// accept page where the customer has the short hex Quote ID.
async function getQuoteByRecordId(recordId) {
    try {
        const record = await base(TABLES.QUOTES).find(recordId);
        return {
            success: true,
            quote: formatQuoteForResponse(record.fields, record.id)
        };
    } catch (error) {
        if (error.statusCode === 404) {
            return { success: false, message: 'Quote not found' };
        }
        console.error('Error fetching quote by record id:', error);
        return { success: false, error: error.message };
    }
}

async function updateQuote(recordId, updates) {
    try {
        const updatedRecord = await base(TABLES.QUOTES).update(recordId, updates);
        
        return { 
            success: true, 
            record: updatedRecord.fields
        };
    } catch (error) {
        console.error('Error updating quote:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
}

async function updateQuoteStatus(quoteId, status) {
    try {
        const records = await base(TABLES.QUOTES)
            .select({
                filterByFormula: `{Quote ID} = '${quoteId}'`,
                maxRecords: 1
            })
            .firstPage();

        if (records.length === 0) {
            return { success: false, message: 'Quote not found' };
        }

        const updateData = {
            'Status': status
        };
        
        // Format date as YYYY-MM-DD for Airtable Date fields
        if (status === 'Sent') {
            updateData['Sent Date'] = new Date().toISOString().split('T')[0];
        }

        const record = await base(TABLES.QUOTES).update(records[0].id, updateData);

        return {
            success: true,
            quote: formatQuoteForResponse(record.fields)
        };
    } catch (error) {
        console.error('Error updating quote status:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

async function acceptQuote(quoteId, acceptanceData) {
    try {
        const records = await base(TABLES.QUOTES)
            .select({
                filterByFormula: `{Quote ID} = '${quoteId}'`,
                maxRecords: 1
            })
            .firstPage();

        if (records.length === 0) {
            return { success: false, message: 'Quote not found' };
        }

        // Format accepted date as YYYY-MM-DD
        let acceptedDate;
        if (acceptanceData.signedDate) {
            acceptedDate = new Date(acceptanceData.signedDate).toISOString().split('T')[0];
        } else {
            acceptedDate = new Date().toISOString().split('T')[0];
        }

        // Note: in the live Airtable base, "Accepted Terms" and "Accepted Date"
        // are text fields (not a checkbox / date), so we write strings. If the
        // schema is ever normalized these will still be accepted.
        const record = await base(TABLES.QUOTES).update(records[0].id, {
            'Status': 'Accepted',
            'Customer Selection': acceptanceData.selectedOption === 'optionA' ? 'Option A' : 'Option B',
            'Accepted Date': acceptedDate,
            'Signature Image': acceptanceData.signatureData || '',
            'Accepted Terms': acceptanceData.acceptedTerms ? 'Yes' : 'No'
        });

        return {
            success: true,
            quote: formatQuoteForResponse(record.fields)
        };
    } catch (error) {
        console.error('Error accepting quote:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

async function declineQuote(quoteId) {
    try {
        const records = await base(TABLES.QUOTES)
            .select({
                filterByFormula: `{Quote ID} = '${quoteId}'`,
                maxRecords: 1
            })
            .firstPage();

        if (records.length === 0) {
            return { success: false, message: 'Quote not found' };
        }

        const record = await base(TABLES.QUOTES).update(records[0].id, {
            'Status': 'Declined'
        });

        return {
            success: true,
            quote: formatQuoteForResponse(record.fields)
        };
    } catch (error) {
        console.error('Error declining quote:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Appends a dated line to a quote's Internal Notes field (activity log).
async function appendQuoteInternalNote(recordId, line) {
    try {
        const record = await base(TABLES.QUOTES).find(recordId);
        const existing = record.fields['Internal Notes'] || '';
        const stamp = new Date().toISOString();
        const next = existing
            ? `${existing}\n[${stamp}] ${line}`
            : `[${stamp}] ${line}`;
        await base(TABLES.QUOTES).update(recordId, { 'Internal Notes': next });
        return { success: true };
    } catch (error) {
        console.error('Error appending internal note:', error);
        return { success: false, error: error.message };
    }
}

async function getAllQuotesByOwner(ownerEmail) {
    try {
        // Note: the Quotes table doesn't have a "Created Date" field — the
        // closest equivalent is "Sent Date" (and Airtable's CREATED_TIME()
        // is available via formula if we ever need a true creation stamp).
        const records = await base(TABLES.QUOTES)
            .select({
                filterByFormula: `{Created By} = '${ownerEmail}'`,
                sort: [{ field: 'Sent Date', direction: 'desc' }]
            })
            .all();

        return {
            success: true,
            quotes: records.map(record => formatQuoteForResponse(record.fields, record.id))
        };
    } catch (error) {
        console.error('Error fetching quotes by owner:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ==========================================
// OWNERS
// ==========================================

async function getOwner(email) {
    try {
        const records = await base(TABLES.OWNERS)
            .select({
                filterByFormula: `{Email} = '${email}'`,
                maxRecords: 1
            })
            .firstPage();

        if (records.length === 0) {
            return { success: false, message: 'Owner not found' };
        }

        return {
            success: true,
            owner: records[0].fields
        };
    } catch (error) {
        console.error('Error fetching owner:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

async function getFirstAdminOwner() {
    try {
        const records = await base(TABLES.OWNERS)
            .select({
                filterByFormula: 'AND({Is Admin} = TRUE(), {Active} = TRUE())',
                maxRecords: 1
            })
            .firstPage();
        
        if (records.length > 0) {
            return {
                success: true,
                owner: {
                    id: records[0].id,
                    email: records[0].fields.Email,
                    name: records[0].fields['Full Name']
                }
            };
        }
        
        // Fallback to max@ if no admin found
        return {
            success: true,
            owner: {
                email: 'max@guttersnapchicago.com',
                name: 'Max McCaulley'
            }
        };
    } catch (error) {
        console.error('Error getting admin owner:', error);
        // Fallback
        return {
            success: true,
            owner: {
                email: 'max@guttersnapchicago.com',
                name: 'Max McCaulley'
            }
        };
    }
}

async function getAllOwners() {
    try {
        const records = await base(TABLES.OWNERS)
            .select({
                filterByFormula: '{Active} = TRUE()',
                sort: [{ field: 'Full Name', direction: 'asc' }]
            })
            .all();
        
        return records.map(record => ({
            id: record.id,
            ...record.fields
        }));
    } catch (error) {
        console.error('Error getting all owners:', error);
        throw error;
    }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function formatQuoteForResponse(fields, recordId = null) {
    return {
        quoteId: fields['Quote ID'],
        recordId: recordId,
        customer: {
            name: fields['Customer Name'],
            email: fields['Customer Email'],
            phone: fields['Customer Phone'],
            address: fields['Property Address']
        },
        measurements: {
            firstFloor: fields['1st Floor Feet'] || 0,
            secondFloor: fields['2nd Floor Feet'] || 0,
            thirdFloor: fields['3rd Floor Feet'] || 0,
            downspoutFeet: fields['Downspout Feet'] || 0,
            endCaps: fields['End Cap Count'] || 0,
            miters: fields['Miter Count'] || 0,
            retrofitPossible: fields['Retrofit Possible'] || false
        },
        optionA: fields['Retrofit Possible'] ? {
            total: fields['Option A - Total'] || 0,
            subtotal: fields['Option A - Subtotal'] || 0,
            tax: fields['Option A - Tax'] || 0
        } : null,
        optionB: {
            total: fields['Option B - Total'] || 0,
            subtotal: fields['Option B - Subtotal'] || 0,
            tax: fields['Option B - Tax'] || 0
        },
        status: fields['Status'] || 'Draft',
        customerSelection: fields['Customer Selection'] || null,
        createdBy: fields['Created By'],
        createdDate: fields['Created Date'],
        sentDate: fields['Sent Date'],
        validUntil: fields['Valid Until'],
        acceptedDate: fields['Accepted Date'],
        viewedCount: fields['Viewed Count'] || 0,
        lastViewed: fields['Last Viewed'],
        signatureDataURL: fields['Signature Image'],
        notes: fields['Internal Notes']
    };
}

module.exports = {
    // Customers
    findOrCreateCustomer,
    assignCustomerToOwner,
    updateCustomerStatus,
    linkCustomerToRecord,
    getCustomersForOwner,
    getUnassignedCustomers,
    
    // Self Inspection
    createSelfInspectionRequest,
    getSelfInspectionRequest,
    updateSelfInspectionRequest,
    
    // Technician Requests
    createTechnicianRequest,
    getTechnicianRequest,
    updateTechnicianRequest,
    
    // Quotes
    createQuote,
    getQuote,
    getQuoteByRecordId,
    updateQuote,
    updateQuoteStatus,
    acceptQuote,
    declineQuote,
    getAllQuotesByOwner,
    appendQuoteInternalNote,
    
    // Pricing
    getPricing,
    calculateQuotePricing,
    
    // Owners
    getOwner,
    getFirstAdminOwner,
    getAllOwners,
    
    // Tables reference
    TABLES
};

