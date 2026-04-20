// Quote History

let allQuotes = [];
let currentFilter = 'all';

// Status values in Airtable are capitalized ("Sent", "Accepted", "Declined",
// "Draft", "Expired"). We normalize for comparison but display as-is.
function normStatus(s) { return String(s || '').toLowerCase(); }

async function loadQuotes() {
    try {
        const res = await fetch('/api/quotes/my-quotes', { credentials: 'same-origin' });
        if (res.status === 401) {
            window.location.href = 'ownerlogin.html';
            return;
        }
        const data = await res.json();
        if (data.success) {
            allQuotes = data.quotes || [];
            renderQuotes();
        } else {
            showError(data.message || 'Error loading quotes');
        }
    } catch (e) {
        console.error(e);
        showError('Error loading quotes. Please refresh the page.');
    }
}

function renderQuotes() {
    const container = document.getElementById('quotesContainer');
    const filtered = currentFilter === 'all'
        ? allQuotes
        : allQuotes.filter(q => normStatus(q.status) === currentFilter);

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No ${currentFilter === 'all' ? '' : currentFilter} quotes found</h3>
                <p>Create your first quote to get started.</p>
                <a href="quote-calculator.html" style="display:inline-block;margin-top:20px;background:#EE9844;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Create Quote</a>
            </div>`;
        return;
    }

    let html = `<table class="quotes-table">
        <thead><tr>
            <th>Quote ID</th><th>Customer</th><th>Address</th><th>Total</th><th>Created</th><th>Status</th><th>Actions</th>
        </tr></thead><tbody>`;

    filtered.forEach(q => {
        const selection = normStatus(q.customerSelection);
        const selectedOptionTotal = selection.includes('a') ? q.optionA?.total : q.optionB?.total;
        const displayTotal = selectedOptionTotal != null
            ? selectedOptionTotal
            : (q.optionB?.total || q.optionA?.total || 0);
        const date = q.createdDate ? new Date(q.createdDate).toLocaleDateString() : '—';
        const status = q.status || 'Draft';
        const s = normStatus(status);

        html += `<tr>
            <td><strong>${q.quoteId}</strong></td>
            <td>${q.customer?.name || ''}</td>
            <td>${q.customer?.address || ''}</td>
            <td>$${Number(displayTotal).toFixed(2)}</td>
            <td>${date}</td>
            <td><span class="status-badge status-${s}">${status}</span></td>
            <td>
                <a href="/my-quote.html?id=${q.quoteId}" target="_blank" class="action-btn btn-view">View</a>
                ${s === 'accepted' ? `<a href="/api/quotes/contract-pdf/${q.quoteId}" target="_blank" class="action-btn btn-view">Contract</a>` : ''}
                ${(s === 'sent' || s === 'draft' || s === 'expired') ? `<button onclick="resendQuote('${q.quoteId}')" class="action-btn btn-resend">Resend</button>` : ''}
            </td>
        </tr>`;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = tab.dataset.status;
        renderQuotes();
    });
});

async function resendQuote(quoteId) {
    if (!confirm('Resend this quote to the customer?')) return;
    try {
        const res = await fetch(`/api/quotes/resend/${encodeURIComponent(quoteId)}`, {
            method: 'POST',
            credentials: 'same-origin'
        });
        const data = await res.json();
        if (data.success) alert(data.message || 'Quote resent.');
        else alert('Error resending quote: ' + (data.message || 'Unknown error'));
    } catch (_) {
        alert('Error resending quote. Please try again.');
    }
}

function showError(message) {
    document.getElementById('quotesContainer').innerHTML = `
        <div class="empty-state"><h3>Error</h3><p>${message}</p></div>`;
}

loadQuotes();
