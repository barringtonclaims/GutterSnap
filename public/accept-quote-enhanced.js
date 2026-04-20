// Enhanced Accept Quote JavaScript with Signature Capture

let quoteData = null;
let selectedOption = null;
let signaturePad = null;
let signatureDataURL = null;

// DOM Elements
const quoteContent = document.getElementById('quoteContent');
const alertContainer = document.getElementById('alertContainer');
const quoteInfo = document.getElementById('quoteInfo');
const selectedOptionDisplay = document.getElementById('selectedOptionDisplay');
const financingTable = document.getElementById('financingTable');
const acceptanceForm = document.getElementById('acceptanceForm');
const customerName = document.getElementById('customerName');
const signatureDate = document.getElementById('signatureDate');
const acceptTerms = document.getElementById('acceptTerms');
const submitBtn = document.getElementById('submitBtn');
const financingBtn = document.getElementById('financingBtn');
const declineBtn = document.getElementById('declineBtn');
const clearSignatureBtn = document.getElementById('clearSignature');
const signaturePreview = document.getElementById('signaturePreview');
const signatureImage = document.getElementById('signatureImage');

// Initialize signature pad
function initSignaturePad() {
    const canvas = document.getElementById('signaturePad');
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext('2d').scale(ratio, ratio);
    
    signaturePad = new SignaturePad(canvas, {
        backgroundColor: 'rgb(255, 255, 255)',
        penColor: 'rgb(0, 0, 0)',
        minWidth: 1,
        maxWidth: 3
    });
    
    signaturePad.addEventListener('endStroke', () => {
        signatureDataURL = signaturePad.toDataURL();
        showSignaturePreview();
        checkFormValidity();
    });
}

// Show signature preview
function showSignaturePreview() {
    if (!signaturePad.isEmpty()) {
        signatureImage.src = signatureDataURL;
        signaturePreview.classList.add('active');
    }
}

// Clear signature
clearSignatureBtn.addEventListener('click', () => {
    signaturePad.clear();
    signaturePreview.classList.remove('active');
    signatureDataURL = null;
    checkFormValidity();
});

// Check if form is valid
function checkFormValidity() {
    const hasSignature = signaturePad && !signaturePad.isEmpty();
    const hasAcceptedTerms = acceptTerms.checked;
    submitBtn.disabled = !(hasSignature && hasAcceptedTerms);
}

acceptTerms.addEventListener('change', checkFormValidity);

// Format currency
function formatCurrency(amount) {
    return '$' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Calculate financing
function calculateFinancing(total) {
    const terms = [
        { months: 12, rate: 0 },
        { months: 24, rate: 3.99 },
        { months: 36, rate: 5.99 },
        { months: 60, rate: 7.99 }
    ];
    
    return terms.map(term => {
        let monthly;
        if (term.rate === 0) {
            monthly = total / term.months;
        } else {
            const monthlyRate = term.rate / 100 / 12;
            monthly = total * (monthlyRate * Math.pow(1 + monthlyRate, term.months)) / (Math.pow(1 + monthlyRate, term.months) - 1);
        }
        return { ...term, monthly };
    });
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

let linkToken = null;

async function loadQuote() {
    const urlParams = new URLSearchParams(window.location.search);
    const quoteId = urlParams.get('id');
    selectedOption = urlParams.get('option');
    linkToken = urlParams.get('t');

    if (!quoteId) {
        showAlert('error', 'Invalid quote link. Please check the URL and try again.');
        return;
    }

    try {
        const response = await fetch(`/api/quotes/${quoteId}`);
        const result = await response.json();

        if (!result.success) {
            showAlert('error', result.message || 'Quote not found or expired.');
            return;
        }

        quoteData = result.quote;

        const status = String(quoteData.status || '').toLowerCase();
        const isExpired = status === 'expired' ||
            (quoteData.validUntil && new Date(quoteData.validUntil) < new Date() && status !== 'accepted' && status !== 'declined');

        if (isExpired) {
            showAlert('error', 'This quote has expired. Please call us at (847) 443-1395 or email guttersnapp@gmail.com for an updated quote.');
            return;
        }
        if (status === 'accepted') {
            showAlert('success', 'You\'ve already signed this contract. Redirecting you to your receipt…');
            setTimeout(() => { window.location.href = `/my-quote.html?id=${quoteData.quoteId}${linkToken ? '&t=' + linkToken : ''}`; }, 1200);
            return;
        }
        if (status === 'declined') {
            showAlert('error', 'This quote was previously declined. Please contact us if you\'d like to revisit it.');
            return;
        }

        renderQuote();
        initSignaturePad();
    } catch (error) {
        console.error('Error loading quote:', error);
        showAlert('error', 'Error loading quote. Please try again.');
    }
}

// Render quote
function renderQuote() {
    if (!quoteData) return;

    quoteContent.style.display = 'block';

    // Quote info
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
        <div class="quote-info-row">
            <span><strong>Prepared By:</strong></span>
            <span>${quoteData.createdBy}</span>
        </div>
    `;

    // Render selected option
    const option = selectedOption === 'optionA' ? quoteData.optionA : quoteData.optionB;
    const optionName = selectedOption === 'optionA' ? 'Option A: Protection Only' : 'Option B: Protection + New Gutters';
    
    selectedOptionDisplay.innerHTML = `
        <div class="option-display">
            <h3>${optionName}</h3>
            <div class="price-display">
                <div class="total">${formatCurrency(option.total)}</div>
                <div style="text-align: center; color: #666; margin-top: 10px;">Total Investment (including tax)</div>
            </div>
        </div>
    `;

    // Render financing table
    const financing = calculateFinancing(option.total);
    let tableHTML = `
        <table class="financing-table">
            <tr>
                <th>Term</th>
                <th style="text-align: right;">Monthly Payment</th>
            </tr>
    `;
    
    financing.forEach(f => {
        tableHTML += `
            <tr>
                <td style="color: #666;">${f.months} months ${f.rate === 0 ? '<span style="color: #4CAF50; font-weight: 600;">(0% APR)</span>' : `(${f.rate}% APR)`}</td>
                <td style="text-align: right; font-weight: 600; color: #EE9844;">${formatCurrency(f.monthly)}/mo</td>
            </tr>
        `;
    });
    
    tableHTML += '</table>';
    financingTable.innerHTML = tableHTML;

    // Set form fields
    customerName.value = quoteData.customer.name;
    signatureDate.value = new Date().toLocaleDateString();
}

// Submit acceptance
acceptanceForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (signaturePad.isEmpty()) {
        showAlert('error', 'Please sign the document before accepting.');
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
                signatureData: signatureDataURL,
                signedDate: new Date().toISOString(),
                acceptedTerms: true,
                t: linkToken
            })
        });

        const result = await response.json();

        if (result.success) {
            // Show success with download link
            quoteContent.innerHTML = `
                <div class="card-header" style="background: #4CAF50;">
                    <h2>Contract Signed Successfully!</h2>
                    <p>Thank you for choosing GutterSnap Chicago</p>
                </div>
                <div class="card-body" style="text-align: center; padding: 60px 40px;">
                    <h3 style="color: #2E7D32; margin-bottom: 20px;">Your signed contract has been received</h3>
                    <p style="font-size: 1.1rem; color: #666; margin-bottom: 30px;">
                        A copy of the signed contract has been sent to ${quoteData.customer.email}
                    </p>
                    
                    <a href="/api/quotes/contract-pdf/${quoteData.quoteId}" target="_blank" 
                       style="display: inline-block; background: #EE9844; color: white; padding: 16px 32px; 
                              border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;
                              box-shadow: 0 4px 12px rgba(238,152,68,0.3);">
                        Download Signed Contract (PDF)
                    </a>
                    
                    <div style="background: #E8F5E9; padding: 30px; border-radius: 12px; margin-top: 30px;">
                        <h4 style="color: #2E7D32; margin-bottom: 15px;">What's Next?</h4>
                        <ol style="text-align: left; color: #2E7D32; line-height: 1.8; max-width: 500px; margin: 0 auto;">
                            <li>You'll receive a copy of the signed contract via email within 5 minutes</li>
                            <li>We'll call you within 1 business day to schedule installation</li>
                            <li>Our certified technicians will complete the work professionally</li>
                            <li>Final walkthrough and 30-year warranty activation</li>
                        </ol>
                    </div>
                    <p style="margin-top: 30px; color: #666;">
                        Questions? Call us at <strong>(847) 443-1395</strong>
                    </p>
                </div>
            `;
        } else {
            showAlert('error', result.message || 'Error processing acceptance.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Accept Quote & E-Sign Contract';
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('error', 'Connection error. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Accept Quote & E-Sign Contract';
    }
});

// Financing button
financingBtn.addEventListener('click', async () => {
    financingBtn.disabled = true;
    financingBtn.textContent = 'Sending...';
    
    try {
        const response = await fetch(`/api/quotes/request-financing/${quoteData.quoteId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const result = await response.json();

        if (result.success) {
            showAlert('success', 'Financing information has been sent to your email! Check your inbox for next steps.');
        } else {
            showAlert('error', 'Error sending financing information. Please call us at (847) 443-1395');
        }
    } catch (error) {
        showAlert('error', 'Connection error. Please call us at (847) 443-1395');
    } finally {
        financingBtn.disabled = false;
        financingBtn.textContent = "I'm Interested in Financing - Send Me Details";
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
        showAlert('error', 'Error processing decline. Please try again.');
    }
});

// Initialize on load
loadQuote();

