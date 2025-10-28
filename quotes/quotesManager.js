// Quotes Manager Module
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const quotesFilePath = path.join(__dirname, 'quotes.json');

// Load quotes from file
function loadQuotes() {
    try {
        if (process.env.VERCEL) {
            // In Vercel, use in-memory storage (quotes reset on function restart)
            // For production, migrate to database
            return global.quotes || {};
        } else {
            if (fs.existsSync(quotesFilePath)) {
                const data = fs.readFileSync(quotesFilePath, 'utf8');
                return JSON.parse(data);
            } else {
                // Create quotes directory if it doesn't exist
                const quotesDir = path.dirname(quotesFilePath);
                if (!fs.existsSync(quotesDir)) {
                    fs.mkdirSync(quotesDir, { recursive: true });
                }
                saveQuotes({});
                return {};
            }
        }
    } catch (error) {
        console.error('Error loading quotes:', error);
        return {};
    }
}

// Save quotes to file
function saveQuotes(quotes) {
    if (process.env.VERCEL) {
        // In Vercel, store in memory
        global.quotes = quotes;
        console.log('Running on Vercel - quotes stored in memory only');
        return;
    }
    
    try {
        fs.writeFileSync(quotesFilePath, JSON.stringify(quotes, null, 2));
    } catch (error) {
        console.error('Error saving quotes:', error);
    }
}

// Generate unique quote ID
function generateQuoteId() {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Create new quote
function createQuote(quoteData) {
    const quotes = loadQuotes();
    const quoteId = generateQuoteId();
    
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30); // Valid for 30 days
    
    const quote = {
        quoteId,
        ...quoteData,
        validUntil: validUntil.toISOString(),
        status: 'draft',
        customerSelection: null,
        acceptedDate: null,
        customerSignature: null,
        sentDate: null,
        viewedCount: 0,
        lastViewed: null
    };
    
    quotes[quoteId] = quote;
    saveQuotes(quotes);
    
    return { success: true, quoteId, quote };
}

// Get quote by ID
function getQuote(quoteId) {
    const quotes = loadQuotes();
    const quote = quotes[quoteId];
    
    if (!quote) {
        return { success: false, message: 'Quote not found' };
    }
    
    // Check if expired
    if (new Date(quote.validUntil) < new Date()) {
        return { success: false, message: 'Quote has expired' };
    }
    
    // Increment view count
    quote.viewedCount = (quote.viewedCount || 0) + 1;
    quote.lastViewed = new Date().toISOString();
    quotes[quoteId] = quote;
    saveQuotes(quotes);
    
    return { success: true, quote };
}

// Update quote status to sent
function markQuoteAsSent(quoteId) {
    const quotes = loadQuotes();
    const quote = quotes[quoteId];
    
    if (!quote) {
        return { success: false, message: 'Quote not found' };
    }
    
    quote.status = 'sent';
    quote.sentDate = new Date().toISOString();
    quotes[quoteId] = quote;
    saveQuotes(quotes);
    
    return { success: true, quote };
}

// Accept quote
function acceptQuote(quoteId, acceptanceData) {
    const quotes = loadQuotes();
    const quote = quotes[quoteId];
    
    if (!quote) {
        return { success: false, message: 'Quote not found' };
    }
    
    if (quote.status === 'accepted') {
        return { success: false, message: 'Quote has already been accepted' };
    }
    
    // Check if expired
    if (new Date(quote.validUntil) < new Date()) {
        return { success: false, message: 'Quote has expired' };
    }
    
    quote.status = 'accepted';
    quote.customerSelection = acceptanceData.selectedOption;
    quote.acceptedDate = acceptanceData.signedDate || new Date().toISOString();
    quote.customerSignature = acceptanceData.signature || acceptanceData.signatureData;
    quote.signatureDataURL = acceptanceData.signatureData; // Store canvas signature
    quote.acceptedTerms = acceptanceData.acceptedTerms;
    
    quotes[quoteId] = quote;
    saveQuotes(quotes);
    
    return { success: true, quote };
}

// Decline quote
function declineQuote(quoteId) {
    const quotes = loadQuotes();
    const quote = quotes[quoteId];
    
    if (!quote) {
        return { success: false, message: 'Quote not found' };
    }
    
    quote.status = 'declined';
    quote.declinedDate = new Date().toISOString();
    
    quotes[quoteId] = quote;
    saveQuotes(quotes);
    
    return { success: true, quote };
}

// Get all quotes (for dashboard)
function getAllQuotes() {
    const quotes = loadQuotes();
    return Object.values(quotes).sort((a, b) => 
        new Date(b.createdDate) - new Date(a.createdDate)
    );
}

// Get quotes by status
function getQuotesByStatus(status) {
    const quotes = loadQuotes();
    return Object.values(quotes)
        .filter(q => q.status === status)
        .sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
}

module.exports = {
    createQuote,
    getQuote,
    markQuoteAsSent,
    acceptQuote,
    declineQuote,
    getAllQuotes,
    getQuotesByStatus
};

