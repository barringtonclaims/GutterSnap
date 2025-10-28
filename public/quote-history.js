// Quote History JavaScript

let allQuotes = [];
let currentFilter = 'all';

// Check authentication
const ownerEmail = sessionStorage.getItem('ownerEmail');
if (!ownerEmail) {
    window.location.href = 'ownerlogin.html';
}

// Load quotes
async function loadQuotes() {
    try {
        const response = await fetch('/api/quotes/my-quotes', {
            headers: {
                'Authorization': sessionStorage.getItem('ownerToken')
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            allQuotes = result.quotes;
            renderQuotes();
        } else {
            showError('Error loading quotes');
        }
    } catch (error) {
        console.error('Error loading quotes:', error);
        showError('Error loading quotes. Please refresh the page.');
    }
}

// Render quotes table
function renderQuotes() {
    const container = document.getElementById('quotesContainer');
    
    // Filter quotes
    let filteredQuotes = allQuotes;
    if (currentFilter !== 'all') {
        filteredQuotes = allQuotes.filter(q => q.status === currentFilter);
    }
    
    if (filteredQuotes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No ${currentFilter === 'all' ? '' : currentFilter} quotes found</h3>
                <p>Create your first quote to get started!</p>
                <a href="quote-calculator.html" style="display: inline-block; margin-top: 20px; background: #EE9844; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Create Quote</a>
            </div>
        `;
        return;
    }
    
    let tableHTML = `
        <table class="quotes-table">
            <thead>
                <tr>
                    <th>Quote ID</th>
                    <th>Customer</th>
                    <th>Address</th>
                    <th>Total</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    filteredQuotes.forEach(quote => {
        const total = quote.customerSelection === 'optionA' 
            ? quote.optionA?.total 
            : quote.optionB?.total;
        
        const date = new Date(quote.createdDate).toLocaleDateString();
        
        tableHTML += `
            <tr>
                <td><strong>${quote.quoteId}</strong></td>
                <td>${quote.customer.name}</td>
                <td>${quote.customer.address}</td>
                <td>$${total ? total.toFixed(2) : 'N/A'}</td>
                <td>${date}</td>
                <td><span class="status-badge status-${quote.status}">${quote.status.toUpperCase()}</span></td>
                <td>
                    ${quote.status === 'accepted' ? `
                        <a href="/api/quotes/contract-pdf/${quote.quoteId}" target="_blank" class="action-btn btn-view">View Contract</a>
                    ` : ''}
                    ${quote.status === 'sent' ? `
                        <button onclick="resendQuote('${quote.quoteId}')" class="action-btn btn-resend">Resend</button>
                    ` : ''}
                </td>
            </tr>
        `;
    });
    
    tableHTML += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = tableHTML;
}

// Filter tabs
document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = tab.dataset.status;
        renderQuotes();
    });
});

// Resend quote
async function resendQuote(quoteId) {
    if (!confirm('Resend this quote to the customer?')) return;
    
    try {
        const response = await fetch(`/api/quotes/resend/${quoteId}`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Quote resent successfully!');
        } else {
            alert('Error resending quote: ' + result.message);
        }
    } catch (error) {
        alert('Error resending quote. Please try again.');
    }
}

// Show error
function showError(message) {
    document.getElementById('quotesContainer').innerHTML = `
        <div class="empty-state">
            <h3>Error</h3>
            <p>${message}</p>
        </div>
    `;
}

// Load quotes on page load
loadQuotes();


