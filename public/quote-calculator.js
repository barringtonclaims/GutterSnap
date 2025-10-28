// Quote Calculator JavaScript

// Pricing Constants
const PRICING = {
    protection: {
        firstFloor: 28,   // Protection only - 1st floor
        secondFloor: 38    // Protection only - 2nd floor
    },
    gutters: {
        firstFloor: 22,    // Gutter replacement - 1st floor
        secondFloor: 27    // Gutter replacement - 2nd floor
    },
    combined: {
        firstFloor: 50,    // Protection + Gutters - 1st floor ($28 + $22)
        secondFloor: 65    // Protection + Gutters - 2nd floor ($38 + $27)
    },
    downspout: 20,         // Per linear foot
    endCap: 20,            // Per unit
    taxRate: 0.1025        // Chicago tax rate (10.25%)
};

// DOM Elements
const form = document.getElementById('quoteForm');
const firstFloorInput = document.getElementById('firstFloor');
const secondFloorInput = document.getElementById('secondFloor');
const downspoutFeetInput = document.getElementById('downspoutFeet');
const endCapsInput = document.getElementById('endCaps');
const retrofitCheckbox = document.getElementById('retrofitPossible');
const optionADiv = document.getElementById('optionA');
const optionBDiv = document.getElementById('optionB');
const optionADetails = document.getElementById('optionADetails');
const optionBDetails = document.getElementById('optionBDetails');
const alertContainer = document.getElementById('alertContainer');

// Calculate quote options
function calculateQuote() {
    const measurements = {
        firstFloor: parseFloat(firstFloorInput.value) || 0,
        secondFloor: parseFloat(secondFloorInput.value) || 0,
        downspoutFeet: parseFloat(downspoutFeetInput.value) || 0,
        endCaps: parseInt(endCapsInput.value) || 0,
        retrofitPossible: retrofitCheckbox.checked
    };

    // Calculate Option A (Protection Only) - only if retrofit possible
    let optionA = null;
    if (measurements.retrofitPossible) {
        optionA = {
            firstFloorCost: measurements.firstFloor * PRICING.protection.firstFloor,
            secondFloorCost: measurements.secondFloor * PRICING.protection.secondFloor,
            downspoutsCost: measurements.downspoutFeet * PRICING.downspout,
            endCapsCost: measurements.endCaps * PRICING.endCap
        };
        optionA.subtotal = optionA.firstFloorCost + optionA.secondFloorCost + 
                           optionA.downspoutsCost + optionA.endCapsCost;
        optionA.tax = optionA.subtotal * PRICING.taxRate;
        optionA.total = optionA.subtotal + optionA.tax;
    }

    // Calculate Option B (Protection + New Gutters) - always available
    const optionB = {
        firstFloorCost: measurements.firstFloor * PRICING.combined.firstFloor,
        secondFloorCost: measurements.secondFloor * PRICING.combined.secondFloor,
        downspoutsCost: measurements.downspoutFeet * PRICING.downspout,
        endCapsCost: measurements.endCaps * PRICING.endCap
    };
    optionB.subtotal = optionB.firstFloorCost + optionB.secondFloorCost + 
                       optionB.downspoutsCost + optionB.endCapsCost;
    optionB.tax = optionB.subtotal * PRICING.taxRate;
    optionB.total = optionB.subtotal + optionB.tax;

    return { optionA, optionB, measurements };
}

// Format currency
function formatCurrency(amount) {
    return '$' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Render quote options
function renderQuote() {
    const { optionA, optionB, measurements } = calculateQuote();

    // Render Option A (if available)
    if (optionA && measurements.retrofitPossible) {
        optionADiv.classList.remove('disabled');
        optionADetails.innerHTML = `
            ${measurements.firstFloor > 0 ? `
                <div class="line-item">
                    <span><strong>1st Floor Protection</strong></span>
                    <span></span>
                </div>
                <div class="line-item breakdown">
                    <span>${measurements.firstFloor} ft × $${PRICING.protection.firstFloor}/ft</span>
                    <span>${formatCurrency(optionA.firstFloorCost)}</span>
                </div>
            ` : ''}
            ${measurements.secondFloor > 0 ? `
                <div class="line-item">
                    <span><strong>2nd Floor Protection</strong></span>
                    <span></span>
                </div>
                <div class="line-item breakdown">
                    <span>${measurements.secondFloor} ft × $${PRICING.protection.secondFloor}/ft</span>
                    <span>${formatCurrency(optionA.secondFloorCost)}</span>
                </div>
            ` : ''}
            ${measurements.downspoutFeet > 0 ? `
                <div class="line-item">
                    <span><strong>Downspouts</strong></span>
                    <span></span>
                </div>
                <div class="line-item breakdown">
                    <span>${measurements.downspoutFeet} ft × $${PRICING.downspout}/ft</span>
                    <span>${formatCurrency(optionA.downspoutsCost)}</span>
                </div>
            ` : ''}
            ${measurements.endCaps > 0 ? `
                <div class="line-item">
                    <span><strong>End Caps / Miters</strong></span>
                    <span></span>
                </div>
                <div class="line-item breakdown">
                    <span>${measurements.endCaps} units × $${PRICING.endCap}</span>
                    <span>${formatCurrency(optionA.endCapsCost)}</span>
                </div>
            ` : ''}
            <div class="line-item subtotal-line">
                <span>Subtotal:</span>
                <span>${formatCurrency(optionA.subtotal)}</span>
            </div>
            <div class="line-item">
                <span>Tax (10.25%):</span>
                <span>${formatCurrency(optionA.tax)}</span>
            </div>
            <div class="line-item total-line">
                <span>TOTAL:</span>
                <span>${formatCurrency(optionA.total)}</span>
            </div>
        `;
    } else {
        optionADiv.classList.add('disabled');
        optionADetails.innerHTML = `
            <div class="line-item" style="color: #999;">
                <span>Not available - Retrofit not possible</span>
            </div>
        `;
    }

    // Render Option B
    optionBDiv.classList.remove('disabled');
    optionBDetails.innerHTML = `
        ${measurements.firstFloor > 0 ? `
            <div class="line-item">
                <span><strong>1st Floor Complete System</strong></span>
                <span></span>
            </div>
            <div class="line-item breakdown">
                <span>Protection: ${measurements.firstFloor} ft × $${PRICING.protection.firstFloor}</span>
                <span>${formatCurrency(measurements.firstFloor * PRICING.protection.firstFloor)}</span>
            </div>
            <div class="line-item breakdown">
                <span>New Gutters: ${measurements.firstFloor} ft × $${PRICING.gutters.firstFloor}</span>
                <span>${formatCurrency(measurements.firstFloor * PRICING.gutters.firstFloor)}</span>
            </div>
        ` : ''}
        ${measurements.secondFloor > 0 ? `
            <div class="line-item">
                <span><strong>2nd Floor Complete System</strong></span>
                <span></span>
            </div>
            <div class="line-item breakdown">
                <span>Protection: ${measurements.secondFloor} ft × $${PRICING.protection.secondFloor}</span>
                <span>${formatCurrency(measurements.secondFloor * PRICING.protection.secondFloor)}</span>
            </div>
            <div class="line-item breakdown">
                <span>New Gutters: ${measurements.secondFloor} ft × $${PRICING.gutters.secondFloor}</span>
                <span>${formatCurrency(measurements.secondFloor * PRICING.gutters.secondFloor)}</span>
            </div>
        ` : ''}
        ${measurements.downspoutFeet > 0 ? `
            <div class="line-item">
                <span><strong>Downspouts</strong></span>
                <span></span>
            </div>
            <div class="line-item breakdown">
                <span>${measurements.downspoutFeet} ft × $${PRICING.downspout}/ft</span>
                <span>${formatCurrency(optionB.downspoutsCost)}</span>
            </div>
        ` : ''}
        ${measurements.endCaps > 0 ? `
            <div class="line-item">
                <span><strong>End Caps / Miters</strong></span>
                <span></span>
            </div>
            <div class="line-item breakdown">
                <span>${measurements.endCaps} units × $${PRICING.endCap}</span>
                <span>${formatCurrency(optionB.endCapsCost)}</span>
            </div>
        ` : ''}
        <div class="line-item subtotal-line">
            <span>Subtotal:</span>
            <span>${formatCurrency(optionB.subtotal)}</span>
        </div>
        <div class="line-item">
            <span>Tax (10.25%):</span>
            <span>${formatCurrency(optionB.tax)}</span>
        </div>
        <div class="line-item total-line">
            <span>TOTAL:</span>
            <span>${formatCurrency(optionB.total)}</span>
        </div>
    `;
}

// Show alert message
function showAlert(type, message) {
    const alertClass = type === 'success' ? 'alert-success' : 'alert-error';
    alertContainer.innerHTML = `
        <div class="alert ${alertClass}">
            ${message}
        </div>
    `;
    alertContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Clear alert
function clearAlert() {
    alertContainer.innerHTML = '';
}

// Get form data
function getFormData() {
    const { optionA, optionB, measurements } = calculateQuote();
    
    return {
        customer: {
            name: document.getElementById('customerName').value,
            email: document.getElementById('customerEmail').value,
            phone: document.getElementById('customerPhone').value,
            address: document.getElementById('customerAddress').value
        },
        measurements: measurements,
        optionA: optionA,
        optionB: optionB,
        notes: document.getElementById('notes').value,
        createdBy: sessionStorage.getItem('ownerEmail') || 'unknown',
        createdDate: new Date().toISOString()
    };
}

// Send quote
async function sendQuote(quoteData) {
    try {
        const response = await fetch('/api/quotes/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(quoteData)
        });

        const result = await response.json();
        
        if (result.success) {
            showAlert('success', `Quote sent successfully to ${quoteData.customer.email}! Quote ID: ${result.quoteId}`);
            // Reset form after a delay
            setTimeout(() => {
                form.reset();
                renderQuote();
            }, 3000);
        } else {
            showAlert('error', result.message || 'Failed to send quote. Please try again.');
        }
    } catch (error) {
        console.error('Error sending quote:', error);
        showAlert('error', 'Error sending quote. Please check your connection and try again.');
    }
}

// Save draft
async function saveDraft(quoteData) {
    try {
        const response = await fetch('/api/quotes/save-draft', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(quoteData)
        });

        const result = await response.json();
        
        if (result.success) {
            showAlert('success', `Draft saved successfully! Quote ID: ${result.quoteId}`);
        } else {
            showAlert('error', result.message || 'Failed to save draft. Please try again.');
        }
    } catch (error) {
        console.error('Error saving draft:', error);
        showAlert('error', 'Error saving draft. Please check your connection and try again.');
    }
}

// Event Listeners
firstFloorInput.addEventListener('input', renderQuote);
secondFloorInput.addEventListener('input', renderQuote);
downspoutFeetInput.addEventListener('input', renderQuote);
endCapsInput.addEventListener('input', renderQuote);
retrofitCheckbox.addEventListener('change', renderQuote);

// Form submission (send quote)
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();
    
    const quoteData = getFormData();
    
    // Validate
    if (!quoteData.customer.name || !quoteData.customer.email || 
        !quoteData.customer.phone || !quoteData.customer.address) {
        showAlert('error', 'Please fill in all customer information fields.');
        return;
    }
    
    if (quoteData.measurements.firstFloor === 0 && quoteData.measurements.secondFloor === 0) {
        showAlert('error', 'Please enter measurements for at least 1st or 2nd floor.');
        return;
    }
    
    const sendBtn = document.getElementById('sendQuoteBtn');
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';
    
    await sendQuote(quoteData);
    
    sendBtn.disabled = false;
    sendBtn.textContent = 'Send Quote to Customer';
});

// Save draft button
document.getElementById('saveDraftBtn').addEventListener('click', async () => {
    clearAlert();
    
    const quoteData = getFormData();
    
    if (!quoteData.customer.name || !quoteData.customer.email) {
        showAlert('error', 'Please enter at least customer name and email to save draft.');
        return;
    }
    
    const draftBtn = document.getElementById('saveDraftBtn');
    draftBtn.disabled = true;
    draftBtn.textContent = 'Saving...';
    
    await saveDraft(quoteData);
    
    draftBtn.disabled = false;
    draftBtn.textContent = 'Save Draft';
});

// Initial render
renderQuote();

// Check if user is logged in
const ownerEmail = sessionStorage.getItem('ownerEmail');
if (!ownerEmail) {
    showAlert('error', 'You must be logged in to create quotes. Redirecting to login...');
    setTimeout(() => {
        window.location.href = 'ownerlogin.html';
    }, 2000);
}


