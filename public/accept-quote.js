// Accept Quote JavaScript

let quoteData = null;
let selectedOption = null;

// DOM Elements
const loadingState = document.getElementById('loadingState');
const quoteContent = document.getElementById('quoteContent');
const alertContainer = document.getElementById('alertContainer');
const quoteSubheader = document.getElementById('quoteSubheader');
const quoteInfo = document.getElementById('quoteInfo');
const optionsSection = document.getElementById('optionsSection');
const acceptanceForm = document.getElementById('acceptanceForm');
const customerName = document.getElementById('customerName');
const customerEmail = document.getElementById('customerEmail');
const customerSignature = document.getElementById('customerSignature');
const acceptTerms = document.getElementById('acceptTerms');
const submitBtn = document.getElementById('submitBtn');
const declineBtn = document.getElementById('declineBtn');

// Format currency
function formatCurrency(amount) {
    return '$' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Show alert
function showAlert(type, message) {
    const alertClass = type === 'success' ? 'alert-success' : 'alert-error';
    alertContainer.innerHTML = `
        <div class="alert ${alertClass}">
            ${message}
        </div>
    `;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Clear alert
function clearAlert() {
    alertContainer.innerHTML = '';
}

// Load quote from URL parameter
async function loadQuote() {
    const urlParams = new URLSearchParams(window.location.search);
    const quoteId = urlParams.get('id');
    const option = urlParams.get('option'); // optionA or optionB

    if (!quoteId) {
        showAlert('error', 'Invalid quote link. Please check the URL and try again.');
        return;
    }

    loadingState.style.display = 'block';

    try {
        const response = await fetch(`/api/quotes/${quoteId}`);
        const result = await response.json();

        if (result.success) {
            quoteData = result.quote;
            selectedOption = option || null; // Pre-select option if provided in URL
            renderQuote();
        } else {
            showAlert('error', result.message || 'Quote not found. It may have expired or been removed.');
        }
    } catch (error) {
        console.error('Error loading quote:', error);
        showAlert('error', 'Error loading quote. Please check your connection and try again.');
    } finally {
        loadingState.style.display = 'none';
    }
}

// Render quote
function renderQuote() {
    if (!quoteData) return;

    // Show quote content
    quoteContent.style.display = 'block';

    // Set subheader
    if (quoteData.measurements.retrofitPossible) {
        quoteSubheader.textContent = 'Please select your preferred option';
    } else {
        quoteSubheader.textContent = 'Complete System Installation';
    }

    // Render quote info
    quoteInfo.innerHTML = `
        <div class="quote-info-row">
            <span><strong>Quote ID:</strong></span>
            <span>${quoteData.quoteId}</span>
        </div>
        <div class="quote-info-row">
            <span><strong>Property:</strong></span>
            <span>${quoteData.customer.address}</span>
        </div>
        <div class="quote-info-row">
            <span><strong>Valid Until:</strong></span>
            <span>${new Date(quoteData.validUntil).toLocaleDateString()}</span>
        </div>
    `;

    // Render options
    renderOptions();

    // Pre-fill customer info
    customerName.value = quoteData.customer.name;
    customerEmail.value = quoteData.customer.email;

    // Enable submit button when terms accepted
    acceptTerms.addEventListener('change', () => {
        submitBtn.disabled = !acceptTerms.checked || !selectedOption;
    });
}

// Render options
function renderOptions() {
    let optionsHTML = '';

    // Option A (Protection Only) - if available
    if (quoteData.optionA && quoteData.measurements.retrofitPossible) {
        const isSelected = selectedOption === 'optionA';
        optionsHTML += `
            <h3>Choose Your Option:</h3>
            <div class="option-card ${isSelected ? 'selected' : ''}" onclick="selectOption('optionA')">
                <div class="option-header">
                    <input type="radio" name="option" value="optionA" class="option-radio" ${isSelected ? 'checked' : ''}>
                    <h4>Option A: Protection Only</h4>
                </div>
                <p class="option-description">
                    Perfect for gutters in good condition. Add our premium protection system without replacing existing gutters.
                </p>
                <div class="option-pricing">
                    ${quoteData.measurements.firstFloor > 0 ? `
                        <div class="pricing-line">
                            <span>1st Floor Protection (${quoteData.measurements.firstFloor} ft)</span>
                            <span>${formatCurrency(quoteData.optionA.firstFloorCost)}</span>
                        </div>
                    ` : ''}
                    ${quoteData.measurements.secondFloor > 0 ? `
                        <div class="pricing-line">
                            <span>2nd Floor Protection (${quoteData.measurements.secondFloor} ft)</span>
                            <span>${formatCurrency(quoteData.optionA.secondFloorCost)}</span>
                        </div>
                    ` : ''}
                    ${quoteData.measurements.downspoutFeet > 0 ? `
                        <div class="pricing-line">
                            <span>Downspouts (${quoteData.measurements.downspoutFeet} ft)</span>
                            <span>${formatCurrency(quoteData.optionA.downspoutsCost)}</span>
                        </div>
                    ` : ''}
                    ${quoteData.measurements.endCaps > 0 ? `
                        <div class="pricing-line">
                            <span>End Caps / Miters (${quoteData.measurements.endCaps})</span>
                            <span>${formatCurrency(quoteData.optionA.endCapsCost)}</span>
                        </div>
                    ` : ''}
                    <div class="pricing-line">
                        <span>Subtotal</span>
                        <span>${formatCurrency(quoteData.optionA.subtotal)}</span>
                    </div>
                    <div class="pricing-line">
                        <span>Tax (10.25%)</span>
                        <span>${formatCurrency(quoteData.optionA.tax)}</span>
                    </div>
                    <div class="pricing-line total">
                        <span>TOTAL</span>
                        <span>${formatCurrency(quoteData.optionA.total)}</span>
                    </div>
                </div>
            </div>
        `;
    }

    // Option B (Protection + New Gutters) - always available
    const isBSelected = selectedOption === 'optionB';
    const onlyOption = !quoteData.optionA || !quoteData.measurements.retrofitPossible;
    
    if (!onlyOption) {
        optionsHTML += '<div style="margin: 20px 0; text-align: center; color: #999; font-weight: 600;">— OR —</div>';
    } else {
        optionsHTML += '<h3>Your Quote:</h3>';
    }

    optionsHTML += `
        <div class="option-card ${isBSelected ? 'selected' : ''}" onclick="selectOption('optionB')">
            <div class="option-header">
                <input type="radio" name="option" value="optionB" class="option-radio" ${isBSelected ? 'checked' : ''}>
                <h4>Option B: Protection + New Gutters</h4>
            </div>
            <p class="option-description">
                Complete system with new gutter installation and premium protection. ${onlyOption ? 'Based on our inspection, we recommend this complete system for best results.' : 'Best value for long-term performance.'}
            </p>
            <div class="option-pricing">
                ${quoteData.measurements.firstFloor > 0 ? `
                    <div class="pricing-line">
                        <span>1st Floor Complete System (${quoteData.measurements.firstFloor} ft)</span>
                        <span>${formatCurrency(quoteData.optionB.firstFloorCost)}</span>
                    </div>
                ` : ''}
                ${quoteData.measurements.secondFloor > 0 ? `
                    <div class="pricing-line">
                        <span>2nd Floor Complete System (${quoteData.measurements.secondFloor} ft)</span>
                        <span>${formatCurrency(quoteData.optionB.secondFloorCost)}</span>
                    </div>
                ` : ''}
                ${quoteData.measurements.downspoutFeet > 0 ? `
                    <div class="pricing-line">
                        <span>Downspouts (${quoteData.measurements.downspoutFeet} ft)</span>
                        <span>${formatCurrency(quoteData.optionB.downspoutsCost)}</span>
                    </div>
                ` : ''}
                ${quoteData.measurements.endCaps > 0 ? `
                    <div class="pricing-line">
                        <span>End Caps / Miters (${quoteData.measurements.endCaps})</span>
                        <span>${formatCurrency(quoteData.optionB.endCapsCost)}</span>
                    </div>
                ` : ''}
                <div class="pricing-line">
                    <span>Subtotal</span>
                    <span>${formatCurrency(quoteData.optionB.subtotal)}</span>
                </div>
                <div class="pricing-line">
                    <span>Tax (10.25%)</span>
                    <span>${formatCurrency(quoteData.optionB.tax)}</span>
                </div>
                <div class="pricing-line total">
                    <span>TOTAL</span>
                    <span>${formatCurrency(quoteData.optionB.total)}</span>
                </div>
            </div>
        </div>
    `;

    optionsSection.innerHTML = optionsHTML;

    // If only one option, auto-select it
    if (onlyOption && !selectedOption) {
        selectOption('optionB');
    }
}

// Select option
function selectOption(option) {
    selectedOption = option;
    
    // Update UI
    document.querySelectorAll('.option-card').forEach(card => {
        card.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
    
    // Update radio button
    const radio = event.currentTarget.querySelector('input[type="radio"]');
    if (radio) {
        radio.checked = true;
    }
    
    // Enable submit button if terms accepted
    submitBtn.disabled = !acceptTerms.checked;
}

// Submit acceptance
acceptanceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();

    if (!selectedOption) {
        showAlert('error', 'Please select an option before accepting.');
        return;
    }

    if (customerSignature.value.trim().toLowerCase() !== quoteData.customer.name.trim().toLowerCase()) {
        showAlert('error', 'Signature must match your name exactly.');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';

    try {
        const response = await fetch(`/api/quotes/accept/${quoteData.quoteId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                selectedOption: selectedOption,
                signature: customerSignature.value,
                acceptedDate: new Date().toISOString()
            })
        });

        const result = await response.json();

        if (result.success) {
            // Show success message
            quoteContent.innerHTML = `
                <div class="card-header" style="background: #4CAF50;">
                    <h2>Quote Accepted!</h2>
                    <p>Thank you for choosing GutterSnap Chicago</p>
                </div>
                <div class="card-body" style="text-align: center; padding: 60px 40px;">
                    <h3 style="color: #2E7D32; margin-bottom: 20px;">Your quote has been confirmed</h3>
                    <p style="font-size: 1.1rem; color: #666; margin-bottom: 30px;">
                        A confirmation email has been sent to ${quoteData.customer.email}
                    </p>
                    <div style="background: #E8F5E9; padding: 30px; border-radius: 12px; margin-top: 30px;">
                        <h4 style="color: #2E7D32; margin-bottom: 15px;">What's Next?</h4>
                        <ol style="text-align: left; color: #2E7D32; line-height: 1.8;">
                            <li>We'll call you within 1 business day to schedule installation</li>
                            <li>Our certified technicians will complete the work professionally</li>
                            <li>Final walkthrough and warranty activation</li>
                        </ol>
                    </div>
                    <p style="margin-top: 30px; color: #666;">
                        Questions? Call us at <strong>(847) 443-1395</strong>
                    </p>
                </div>
            `;
        } else {
            showAlert('error', result.message || 'Error accepting quote. Please try again.');
            submitBtn.disabled = false;
            submitBtn.textContent = '✓ Confirm & Accept Quote';
        }
    } catch (error) {
        console.error('Error accepting quote:', error);
        showAlert('error', 'Error submitting acceptance. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = '✓ Confirm & Accept Quote';
    }
});

// Decline button
declineBtn.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to decline this quote?')) {
        return;
    }

    try {
        await fetch(`/api/quotes/decline/${quoteData.quoteId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        quoteContent.innerHTML = `
            <div class="card-header" style="background: #666;">
                <h2>Quote Declined</h2>
                <p>Thank you for your consideration</p>
            </div>
            <div class="card-body" style="text-align: center; padding: 60px 40px;">
                <p style="font-size: 1.1rem; color: #666; margin-bottom: 20px;">
                    We've noted that you're not ready to proceed at this time.
                </p>
                <p style="color: #666;">
                    If you change your mind or have questions, feel free to contact us at<br>
                    <strong>(847) 443-1395</strong>
                </p>
            </div>
        `;
    } catch (error) {
        console.error('Error declining quote:', error);
        showAlert('error', 'Error processing decline. Please try again.');
    }
});

// Load quote on page load
loadQuote();

