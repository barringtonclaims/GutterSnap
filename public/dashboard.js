// Dashboard State
let currentOwner = null;
let currentCustomer = null;
let allOwners = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadOwnerInfo();
    setupTabs();
    await loadDashboardData();
    
    // Refresh every 30 seconds
    setInterval(() => loadDashboardData(), 30000);
});

// Load owner info from session
async function loadOwnerInfo() {
    try {
        const response = await fetch('/api/owner/verify', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            window.location.href = '/ownerlogin.html';
            return;
        }
        
        const data = await response.json();
        currentOwner = data.owner;
        
        document.getElementById('ownerName').textContent = currentOwner.name;
        document.getElementById('ownerEmail').textContent = currentOwner.email;
        
        // Show admin-only elements
        if (currentOwner.isAdmin) {
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = '';
            });
        }
    } catch (error) {
        console.error('Error loading owner info:', error);
        window.location.href = '/ownerlogin.html';
    }
}

// Tab switching
function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
}

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');
}

// Load all dashboard data
async function loadDashboardData() {
    await Promise.all([
        loadLeads(),
        loadJobs()
    ]);
}

// Load leads
async function loadLeads() {
    const loading = document.getElementById('leadsLoading');
    const container = document.getElementById('leadsContainer');
    const empty = document.getElementById('leadsEmpty');
    
    try {
        const response = await fetch('/api/dashboard/leads', {
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to fetch leads');
        
        const data = await response.json();
        const leads = data.leads || [];
        
        loading.style.display = 'none';
        
        if (leads.length === 0) {
            empty.style.display = 'block';
            container.style.display = 'none';
        } else {
            empty.style.display = 'none';
            container.style.display = 'grid';
            container.innerHTML = leads.map(lead => renderLeadCard(lead)).join('');
        }
        
        document.getElementById('leadsCount').textContent = leads.length;
    } catch (error) {
        console.error('Error loading leads:', error);
        loading.innerHTML = '<p style="color: red;">Error loading leads. Please refresh.</p>';
    }
}

// Load jobs
async function loadJobs() {
    const loading = document.getElementById('jobsLoading');
    const container = document.getElementById('jobsContainer');
    const empty = document.getElementById('jobsEmpty');
    
    try {
        const response = await fetch('/api/dashboard/jobs', {
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to fetch jobs');
        
        const data = await response.json();
        const jobs = data.jobs || [];
        
        loading.style.display = 'none';
        
        if (jobs.length === 0) {
            empty.style.display = 'block';
            container.style.display = 'none';
        } else {
            empty.style.display = 'none';
            container.style.display = 'grid';
            container.innerHTML = jobs.map(job => renderJobCard(job)).join('');
        }
        
        document.getElementById('jobsCount').textContent = jobs.length;
    } catch (error) {
        console.error('Error loading jobs:', error);
        loading.innerHTML = '<p style="color: red;">Error loading jobs. Please refresh.</p>';
    }
}

// Render lead card
function renderLeadCard(lead) {
    const hasPhotos = lead.selfInspection && lead.selfInspection.hasPhotos;
    const hasTechRequest = !!lead.technicianRequest;
    const hasQuote = !!lead.latestQuote;
    
    let badges = '';
    
    // Show unassigned badge for admins
    if (lead.isUnassigned) {
        badges += `<span class="badge priority-high">⚠️ Unassigned</span>`;
    }
    
    if (hasPhotos) {
        badges += `<span class="badge photo">${lead.selfInspection.photoCount} photos</span>`;
    }
    if (lead.priority) {
        badges += `<span class="badge priority-${lead.priority.toLowerCase()}">${lead.priority}</span>`;
    }
    badges += `<span class="badge status">${lead.status || 'New Lead'}</span>`;
    
    let details = '';
    
    // Self-inspection details
    if (hasPhotos) {
        details += `
            <div class="detail-row">
                <span class="detail-label">Type:</span>
                <span class="detail-value">Self-Inspection (Ready for Quote)</span>
            </div>
        `;
    }
    
    // Technician request details
    if (hasTechRequest) {
        const meetingPref = lead.technicianRequest.meetingPreference || 'Not specified';
        details += `
            <div class="detail-row">
                <span class="detail-label">Type:</span>
                <span class="detail-value">Technician Request</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Meeting:</span>
                <span class="detail-value">${meetingPref}</span>
            </div>
        `;
        if (lead.technicianRequest.preferredDate) {
            details += `
                <div class="detail-row">
                    <span class="detail-label">Preferred Date:</span>
                    <span class="detail-value">${formatDate(lead.technicianRequest.preferredDate)}</span>
                </div>
            `;
        }
    }
    
    // Quote details
    let daysSinceSent = 0;
    if (hasQuote) {
        const quote = lead.latestQuote;
        daysSinceSent = quote.sentDate ? Math.floor((new Date() - new Date(quote.sentDate)) / (1000 * 60 * 60 * 24)) : 0;

        const isExpired = String(quote.status || '').toLowerCase() === 'expired' ||
            (quote.validUntil && new Date(quote.validUntil) < new Date() && !['Accepted', 'Declined'].includes(quote.status));

        details += `
            <div class="detail-row">
                <span class="detail-label">Quote #${quote.id}:</span>
                <span class="detail-value">${quote.status}${isExpired ? ' (expired)' : ''}${daysSinceSent > 0 ? ` · ${daysSinceSent}d ago` : ''}</span>
            </div>
        `;

        details += `
            <div class="quote-options">
                ${quote.optionA ? `
                    <div class="quote-option">
                        <strong>Option A · Protection only</strong>
                        <div class="price">$${Number(quote.optionA.total || 0).toLocaleString()}</div>
                    </div>
                ` : ''}
                ${quote.optionB ? `
                    <div class="quote-option">
                        <strong>${quote.optionA ? 'Option B · Full replacement' : 'Recommended'}</strong>
                        <div class="price">$${Number(quote.optionB.total || 0).toLocaleString()}</div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Action buttons based on lead type
    let actions = '';

    if (hasPhotos && !hasQuote) {
        actions += `<button class="btn btn-success" onclick="writeQuote('${lead.id}')">Write quote</button>`;
    }

    if (hasTechRequest && !String(lead.status || '').includes('Scheduled')) {
        actions += `<button class="btn btn-primary" onclick="scheduleVisit('${lead.id}')">Schedule inspection</button>`;
    }

    if (hasQuote) {
        const q = lead.latestQuote;
        const portalLink = q.portalLink || `/my-quote.html?id=${q.id}`;
        actions += `<a class="btn btn-primary" href="${portalLink}" target="_blank">View quote</a>`;
        actions += `<button class="btn btn-secondary" onclick="copyCustomerLink('${encodeURIComponent(portalLink)}')">Copy customer link</button>`;
        if (String(q.status || '').toLowerCase() !== 'accepted') {
            actions += `<button class="btn btn-warning" onclick="resendQuote('${q.id}')">Resend to customer</button>`;
        }
    }

    if (currentOwner.isAdmin) {
        actions += `<button class="btn btn-secondary" onclick="assignCustomer('${lead.id}')">Reassign</button>`;
    }
    
    return `
        <div class="customer-card">
            <div class="customer-card-header">
                <div class="customer-info">
                    <h3>${lead.name}</h3>
                    <p>${lead.email}</p>
                    <p>${lead.phone}</p>
                    <p>${lead.address}</p>
                </div>
                <div class="customer-badges">
                    ${badges}
                </div>
            </div>
            
            <div class="customer-details">
                ${details}
            </div>
            
            <div class="action-buttons">
                ${actions}
            </div>
        </div>
    `;
}

// Render job card
function renderJobCard(job) {
    const quote = job.acceptedQuote;
    
    return `
        <div class="customer-card">
            <div class="customer-card-header">
                <div class="customer-info">
                    <h3>${job.name}</h3>
                    <p>${job.email}</p>
                    <p>${job.phone}</p>
                    <p>${job.address}</p>
                </div>
                <div class="customer-badges">
                    <span class="badge status">${job.status}</span>
                </div>
            </div>
            
            <div class="customer-details">
                ${job.scheduledDate ? `
                    <div class="detail-row">
                        <span class="detail-label">Scheduled:</span>
                        <span class="detail-value">${formatDate(job.scheduledDate)}</span>
                    </div>
                ` : ''}
                ${quote ? `
                    <div class="detail-row">
                        <span class="detail-label">Selected:</span>
                        <span class="detail-value">${quote.customerSelection}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Total:</span>
                        <span class="detail-value price" style="font-size: 20px; font-weight: bold; color: #27ae60;">$${quote.total.toLocaleString()}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Accepted:</span>
                        <span class="detail-value">${formatDate(quote.acceptedDate)}</span>
                    </div>
                ` : ''}
            </div>
            
            <div class="action-buttons">
                ${quote ? `<button class="btn btn-primary" onclick="viewContract('${quote.id}')">📄 View Contract</button>` : ''}
                <button class="btn btn-secondary" onclick="viewCustomer('${job.id}')">👁️ View Details</button>
            </div>
        </div>
    `;
}

// Action Functions
async function writeQuote(customerId) {
    // Redirect to quote calculator with customer ID pre-filled
    window.location.href = `/quote-calculator.html?customerId=${customerId}`;
}

async function scheduleVisit(customerId) {
    currentCustomer = customerId;
    document.getElementById('scheduleModal').classList.add('active');
    
    // Set min date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('scheduleDate').min = today;
}

function closeScheduleModal() {
    document.getElementById('scheduleModal').classList.remove('active');
    currentCustomer = null;
}

async function confirmSchedule() {
    const date = document.getElementById('scheduleDate').value;
    const time = document.getElementById('scheduleTime').value;
    const notes = document.getElementById('scheduleNotes').value;
    
    if (!date) {
        alert('Please select a date');
        return;
    }
    
    try {
        const response = await fetch(`/api/customers/${currentCustomer}/schedule`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ scheduledDate: date, scheduledTime: time, notes })
        });
        
        if (!response.ok) throw new Error('Failed to schedule');
        
        alert('Customer scheduled successfully!');
        closeScheduleModal();
        loadDashboardData();
    } catch (error) {
        console.error('Error scheduling:', error);
        alert('Error scheduling customer. Please try again.');
    }
}

function copyCustomerLink(encodedUrl) {
    const url = decodeURIComponent(encodedUrl);
    const fullUrl = url.startsWith('http') ? url : (window.location.origin + url);
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(fullUrl).then(
            () => toast('Link copied: ' + fullUrl),
            () => fallbackCopy(fullUrl)
        );
    } else {
        fallbackCopy(fullUrl);
    }
}

function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast('Link copied'); } catch (_) { prompt('Copy this link:', text); }
    document.body.removeChild(ta);
}

function toast(msg) {
    let t = document.getElementById('dashToast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'dashToast';
        t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1a1a1a;color:#fff;padding:12px 18px;border-radius:8px;font-size:14px;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,.2);max-width:90vw;';
        document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { t.style.opacity = '0'; }, 2500);
}

async function resendQuote(quoteId) {
    if (!confirm('Resend this quote to the customer?')) return;
    try {
        const res = await fetch(`/api/quotes/resend/${encodeURIComponent(quoteId)}`, {
            method: 'POST',
            credentials: 'include'
        });
        const data = await res.json();
        if (data.success) toast(data.message || 'Quote resent');
        else alert(data.message || 'Could not resend quote.');
    } catch (e) {
        alert('Network error resending quote.');
    }
}

async function followUp(customerId) {
    alert('AI Follow-up feature coming soon!');
}

async function assignCustomer(customerId) {
    currentCustomer = customerId;
    
    // Load owners if not already loaded
    if (allOwners.length === 0) {
        await loadOwners();
    }
    
    const select = document.getElementById('assignOwnerSelect');
    select.innerHTML = '<option value="">Select an owner...</option>' + 
        allOwners.map(owner => `<option value="${owner.Email}">${owner['Full Name']} (${owner.Email})</option>`).join('');
    
    document.getElementById('assignModal').classList.add('active');
}

function closeAssignModal() {
    document.getElementById('assignModal').classList.remove('active');
    currentCustomer = null;
}

async function confirmAssignment() {
    const ownerEmail = document.getElementById('assignOwnerSelect').value;
    
    if (!ownerEmail) {
        alert('Please select an owner');
        return;
    }
    
    try {
        const response = await fetch(`/api/customers/${currentCustomer}/assign`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ ownerEmail })
        });
        
        if (!response.ok) throw new Error('Failed to assign');
        
        alert('Customer reassigned successfully!');
        closeAssignModal();
        // Reload the leads to reflect the new assignment
        loadDashboardData();
    } catch (error) {
        console.error('Error assigning customer:', error);
        alert('Error assigning customer. Please try again.');
    }
}

async function loadOwners() {
    try {
        const response = await fetch('/api/owners', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            allOwners = data.owners || [];
        }
    } catch (error) {
        console.error('Error loading owners:', error);
        // Fallback to hardcoded owners
        allOwners = [
            { Email: 'max@guttersnapchicago.com', 'Full Name': 'Max McCaulley' },
            { Email: 'josh@guttersnapchicago.com', 'Full Name': 'Josh' },
            { Email: 'matt@guttersnapchicago.com', 'Full Name': 'Matt' },
            { Email: 'ian@guttersnapchicago.com', 'Full Name': 'Ian' },
            { Email: 'brody@guttersnapchicago.com', 'Full Name': 'Brody' }
        ];
    }
}

function viewContract(quoteId) {
    window.open(`/api/quotes/contract-pdf/${quoteId}`, '_blank');
}

function viewCustomer(customerId) {
    // TODO: Implement customer detail view
    alert('Customer detail view coming soon!');
}

function showSettings() {
    // TODO: Implement admin settings
    alert('Admin settings coming soon!');
}

function logout() {
    fetch('/api/owner/logout', {
        method: 'POST',
        credentials: 'include'
    }).then(() => {
        window.location.href = '/ownerlogin.html';
    });
}

// Utility functions
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

