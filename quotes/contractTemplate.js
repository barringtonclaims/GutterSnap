// Formal Contract Email Template

function generateContractEmail(quote, selectedOption, acceptanceData, ownerName) {
    const option = selectedOption === 'optionA' ? quote.optionA : quote.optionB;
    const optionName = selectedOption === 'optionA' ? 'Protection Only' : 'Protection + New Gutters';
    const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Georgia', 'Times New Roman', serif; line-height: 1.8; color: #000; background: #fff; margin: 0; padding: 40px 20px; }
                .contract-container { max-width: 800px; margin: 0 auto; background: #ffffff; border: 2px solid #000; padding: 40px; }
                .letterhead { text-align: center; border-bottom: 3px double #000; padding-bottom: 20px; margin-bottom: 30px; }
                .company-name { font-size: 2rem; font-weight: 700; color: #EE9844; margin: 0; }
                .contract-title { text-align: center; font-size: 1.5rem; font-weight: 700; margin: 30px 0; text-transform: uppercase; letter-spacing: 2px; }
                .section { margin: 25px 0; }
                .section-title { font-weight: 700; font-size: 1.1rem; margin: 20px 0 10px 0; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 5px; }
                .info-grid { display: grid; grid-template-columns: 150px 1fr; gap: 10px; margin: 15px 0; }
                .info-label { font-weight: 600; }
                .work-description { background: #f9f9f9; padding: 20px; border-left: 4px solid #EE9844; margin: 20px 0; }
                .work-description ul { margin: 10px 0; padding-left: 25px; }
                .work-description li { margin: 8px 0; }
                .financial-summary { background: #f5f5f5; border: 2px solid #000; padding: 20px; margin: 25px 0; }
                .financial-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ddd; }
                .financial-total { font-size: 1.3rem; font-weight: 700; border-top: 3px double #000; padding-top: 15px; margin-top: 15px; }
                .signature-block { margin: 40px 0; padding: 20px 0; border-top: 2px solid #000; }
                .signature-row { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px; }
                .signature-field { border-bottom: 2px solid #000; padding: 10px 0; min-height: 80px; }
                .signature-field img { max-height: 60px; max-width: 100%; display: block; }
                @media (max-width: 600px) {
                    .contract-container { padding: 20px; border: 1px solid #000; }
                    .letterhead { padding-bottom: 15px; }
                    .company-name { font-size: 1.5rem; }
                    .contract-title { font-size: 1.2rem; letter-spacing: 1px; }
                    .info-grid { grid-template-columns: 120px 1fr; gap: 5px; font-size: 0.9rem; }
                    .section-title { font-size: 1rem; }
                    .work-description { padding: 15px; font-size: 0.9rem; }
                    .work-description li { font-size: 0.85rem; margin: 5px 0; }
                    .financial-summary { padding: 15px; }
                    .financial-row { font-size: 0.9rem; }
                    .financial-total { font-size: 1.1rem; }
                    .signature-row { grid-template-columns: 1fr; gap: 20px; }
                    .signature-field { min-height: 60px; }
                    .terms { font-size: 0.7rem; padding: 15px; }
                    .terms p { margin: 5px 0; }
                }
                .signature-label { font-size: 0.9rem; margin-top: 10px; }
                .terms { font-size: 0.75rem; line-height: 1.4; color: #666; margin: 30px 0; padding: 20px; background: #f9f9f9; border: 1px solid #ddd; }
                .terms p { margin: 8px 0; }
                .warranty-box { background: #E8F5E9; border: 2px solid #4CAF50; padding: 20px; margin: 20px 0; }
                @media print { body { padding: 0; } .contract-container { border: none; } }
            </style>
        </head>
        <body>
            <div class="contract-container">
                <!-- Letterhead -->
                <div class="letterhead">
                    <div class="company-name">GUTTERSNAP CHICAGO</div>
                    <div style="font-size: 0.9rem; margin-top: 10px;">Professional Gutter Protection Systems</div>
                    <div style="font-size: 0.85rem; color: #666; margin-top: 5px;">
                        Phone: (847) 443-1395 | Email: ${quote.createdBy}
                    </div>
                </div>

                <!-- Contract Title -->
                <div class="contract-title">Installation Agreement & Contract</div>

                <!-- Contract Details -->
                <div class="section">
                    <div class="info-grid">
                        <div class="info-label">Contract ID:</div>
                        <div>${quote.quoteId}</div>
                        <div class="info-label">Date Executed:</div>
                        <div>${currentDate}</div>
                        <div class="info-label">Valid Through:</div>
                        <div>${new Date(quote.validUntil).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                    </div>
                </div>

                <!-- Parties -->
                <div class="section">
                    <div class="section-title">Parties to Agreement</div>
                    <p><strong>Service Provider:</strong> GutterSnap Chicago, represented by ${ownerName}</p>
                    <p><strong>Customer:</strong> ${quote.customer.name}</p>
                    <p><strong>Property Address:</strong> ${quote.customer.address}</p>
                    <p><strong>Contact Information:</strong> ${quote.customer.email} | ${quote.customer.phone}</p>
                </div>

                <!-- Scope of Work -->
                <div class="section">
                    <div class="section-title">Scope of Work - ${optionName}</div>
                    <div class="work-description">
                        <p><strong>GutterSnap Chicago agrees to perform the following services:</strong></p>
                        ${selectedOption === 'optionA' ? `
                        <ul>
                            ${quote.measurements.firstFloor > 0 ? `<li>Professional installation of GutterSnap protection system on ${quote.measurements.firstFloor} linear feet of first floor gutters</li>` : ''}
                            ${quote.measurements.secondFloor > 0 ? `<li>Professional installation of GutterSnap protection system on ${quote.measurements.secondFloor} linear feet of second floor gutters</li>` : ''}
                            <li>Premium micro-mesh gutter guard material with custom-fitted aluminum frame system</li>
                            ${quote.measurements.downspoutFeet > 0 ? `<li>Installation and connection of ${quote.measurements.downspoutFeet} linear feet of downspouts</li>` : ''}
                            ${quote.measurements.endCaps > 0 ? `<li>Installation of ${quote.measurements.endCaps} end caps and miter joints</li>` : ''}
                            <li>Complete system testing and water flow verification</li>
                            <li>Full property cleanup and removal of all installation debris</li>
                            <li>Activation of lifetime warranty on protection system</li>
                        </ul>
                        ` : `
                        <ul>
                            ${quote.measurements.firstFloor > 0 ? `
                            <li>Complete removal and disposal of ${quote.measurements.firstFloor} linear feet of existing first floor gutters</li>
                            <li>Installation of new commercial-grade aluminum gutters on first floor (${quote.measurements.firstFloor} linear feet)</li>
                            <li>Installation of GutterSnap protection system on first floor gutters</li>
                            ` : ''}
                            ${quote.measurements.secondFloor > 0 ? `
                            <li>Complete removal and disposal of ${quote.measurements.secondFloor} linear feet of existing second floor gutters</li>
                            <li>Installation of new commercial-grade aluminum gutters on second floor (${quote.measurements.secondFloor} linear feet)</li>
                            <li>Installation of GutterSnap protection system on second floor gutters</li>
                            ` : ''}
                            <li>Premium micro-mesh gutter guard material with custom-fitted aluminum frame system</li>
                            <li>Secure fascia board mounting using rust-resistant fasteners</li>
                            ${quote.measurements.downspoutFeet > 0 ? `
                            <li>Installation of ${quote.measurements.downspoutFeet} linear feet of new downspouts</li>
                            <li>Underground drainage connection where applicable</li>
                            ` : ''}
                            ${quote.measurements.endCaps > 0 ? `<li>Professional sealing of ${quote.measurements.endCaps} end caps and miter joints</li>` : ''}
                            <li>Complete system testing and water flow verification</li>
                            <li>Full property cleanup and removal of all installation debris</li>
                            <li>Activation of lifetime warranty on both gutters and protection system</li>
                        </ul>
                        `}
                    </div>
                </div>

                <!-- Financial Summary -->
                <div class="section">
                    <div class="section-title">Financial Agreement</div>
                    <div class="financial-summary">
                        <div class="financial-row">
                            <span>Contract Amount:</span>
                            <span>${formatCurrency(option.total)}</span>
                        </div>
                        <div class="financial-row">
                            <span>Payment Terms:</span>
                            <span>Due upon completion or as otherwise agreed</span>
                        </div>
                        <div class="financial-row financial-total">
                            <span>TOTAL AMOUNT DUE:</span>
                            <span>${formatCurrency(option.total)}</span>
                        </div>
                    </div>
                </div>

                <!-- Warranty -->
                <div class="section">
                    <div class="warranty-box">
                        <div class="section-title" style="border: none; color: #2E7D32;">30-Year Transferable Warranty</div>
                        <p>GutterSnap Chicago warrants all materials and workmanship for thirty (30) years from the date of installation. This warranty is transferable to subsequent property owners and covers defects in materials, workmanship, and system performance under normal use and maintenance conditions.</p>
                    </div>
                </div>

                <!-- Signatures -->
                <div class="signature-block">
                    <div class="section-title">Signatures</div>
                    <p>By signing below, both parties agree to the terms and conditions outlined in this contract.</p>
                    
                    <div class="signature-row">
                        <div>
                            <div class="signature-field">
                                ${acceptanceData.signatureData ? `<img src="${acceptanceData.signatureData}" alt="Customer Signature" style="max-height: 60px; max-width: 200px; display: block;">` : '<div style="height: 60px;"></div>'}
                            </div>
                            <div class="signature-label">
                                <strong>Customer Signature</strong><br>
                                ${quote.customer.name}<br>
                                Date: ${new Date(acceptanceData.signedDate).toLocaleDateString()}
                            </div>
                        </div>
                        <div>
                            <div class="signature-field">
                                <div style="font-family: 'Brush Script MT', cursive; font-size: 2rem; color: #EE9844;">${ownerName}</div>
                            </div>
                            <div class="signature-label">
                                <strong>GutterSnap Representative</strong><br>
                                ${ownerName}, GutterSnap Chicago<br>
                                Date: ${currentDate}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Terms and Conditions -->
                <div class="terms">
                    <p style="font-weight: 700; text-align: center; margin-bottom: 15px;">TERMS AND CONDITIONS</p>
                    
                    <p><strong>1. ACCEPTANCE:</strong> This contract becomes binding upon customer's electronic signature and GutterSnap Chicago's acceptance. Customer acknowledges receiving a copy of this signed agreement via email.</p>
                    
                    <p><strong>2. SCOPE OF WORK:</strong> Work will be performed as described in the "Scope of Work" section above. Any changes or additions must be agreed upon in writing by both parties.</p>
                    
                    <p><strong>3. PAYMENT TERMS:</strong> Full payment is due upon completion of work unless financing arrangements have been made in advance. Accepted forms of payment include cash, check, credit card, or approved financing.</p>
                    
                    <p><strong>4. SCHEDULING:</strong> GutterSnap Chicago will contact customer within 5 business days to schedule installation. Installation will be completed within a reasonable timeframe based on current workload and weather conditions.</p>
                    
                    <p><strong>5. WARRANTY:</strong> All work is covered by GutterSnap Chicago's 30-year transferable warranty against defects in materials and workmanship. Warranty does not cover damage from acts of God, improper use, or lack of maintenance. Warranty is transferable to subsequent property owners.</p>
                    
                    <p><strong>6. LIABILITY:</strong> GutterSnap Chicago carries full liability insurance. Customer agrees to provide clear access to work areas and remove any obstacles that may interfere with installation.</p>
                    
                    <p><strong>7. CANCELLATION:</strong> Either party may cancel this agreement in writing prior to commencement of work. Once work has begun, customer is responsible for labor and materials costs incurred.</p>
                    
                    <p><strong>8. DISPUTE RESOLUTION:</strong> Any disputes arising from this contract shall be resolved through mediation or arbitration in Cook County, Illinois.</p>
                    
                    <p><strong>9. ENTIRE AGREEMENT:</strong> This contract represents the entire agreement between the parties and supersedes all prior negotiations, representations, or agreements.</p>
                    
                    <p style="margin-top: 20px; text-align: center; font-size: 0.7rem;">
                        GutterSnap Chicago | Professional Gutter Protection Systems<br>
                        Licensed & Insured | Contract ID: ${quote.quoteId}<br>
                        For questions or concerns, contact ${quote.createdBy} or call (847) 443-1395
                    </p>
                </div>

                <div style="background: #FFF5ED; padding: 20px; border-radius: 8px; text-align: center; margin-top: 30px;">
                    <p style="margin: 0; font-size: 0.9rem; color: #666;">
                        <strong>Important:</strong> Please keep this contract for your records. A copy has been securely stored and is available upon request. You can download a PDF version from the acceptance page or by calling us at (847) 443-1395.
                    </p>
                </div>
            </div>
        </body>
        </html>
    `;
}

function formatCurrency(amount) {
    return '$' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

module.exports = { generateContractEmail };

