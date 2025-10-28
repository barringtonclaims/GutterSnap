// Email Template Generation for Quotes

function generateInstallProcedure(option, measurements) {
    if (option === 'optionA') {
        // Protection Only
        return `
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 15px 0;">
                <h4 style="margin: 0 0 15px 0; color: #333;">What's Included:</h4>
                <ul style="list-style: none; padding: 0; margin: 0; line-height: 1.8; color: #666;">
                    ${measurements.firstFloor > 0 ? `
                    <li style="padding: 5px 0; border-bottom: 1px solid #e0e0e0;">• Professional installation of GutterSnap protection system on ${measurements.firstFloor} linear feet of 1st floor gutters</li>
                    ` : ''}
                    ${measurements.secondFloor > 0 ? `
                    <li style="padding: 5px 0; border-bottom: 1px solid #e0e0e0;">• Professional installation of GutterSnap protection system on ${measurements.secondFloor} linear feet of 2nd floor gutters</li>
                    ` : ''}
                    <li style="padding: 5px 0; border-bottom: 1px solid #e0e0e0;">• Premium micro-mesh gutter guard material</li>
                    <li style="padding: 5px 0; border-bottom: 1px solid #e0e0e0;">• Custom-fitted aluminum frame system</li>
                    ${measurements.downspoutFeet > 0 ? `
                    <li style="padding: 5px 0; border-bottom: 1px solid #e0e0e0;">• ${measurements.downspoutFeet} linear feet of downspout installation and connection</li>
                    ` : ''}
                    ${measurements.endCaps > 0 ? `
                    <li style="padding: 5px 0; border-bottom: 1px solid #e0e0e0;">• ${measurements.endCaps} end caps and miter joints installed</li>
                    ` : ''}
                            <li style="padding: 5px 0; border-bottom: 1px solid #e0e0e0;">• Complete system testing and water flow verification</li>
                            <li style="padding: 5px 0; border-bottom: 1px solid #e0e0e0;">• Full property cleanup and debris removal</li>
                            <li style="padding: 5px 0;">• 30-year transferable warranty activation and documentation</li>
                </ul>
            </div>
        `;
    } else {
        // Protection + New Gutters
        return `
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 15px 0;">
                <h4 style="margin: 0 0 15px 0; color: #333;">Complete System Installation:</h4>
                <ul style="list-style: none; padding: 0; margin: 0; line-height: 1.8; color: #666;">
                    ${measurements.firstFloor > 0 ? `
                    <li style="padding: 5px 0; border-bottom: 1px solid #e0e0e0;">• Remove and dispose of ${measurements.firstFloor} linear feet of existing 1st floor gutters</li>
                    <li style="padding: 5px 0; border-bottom: 1px solid #e0e0e0;">• Install new commercial-grade aluminum gutters (1st floor - ${measurements.firstFloor} ft)</li>
                    <li style="padding: 5px 0; border-bottom: 1px solid #e0e0e0;">• Install GutterSnap protection system on 1st floor (${measurements.firstFloor} ft)</li>
                    ` : ''}
                    ${measurements.secondFloor > 0 ? `
                    <li style="padding: 5px 0; border-bottom: 1px solid #e0e0e0;">• Remove and dispose of ${measurements.secondFloor} linear feet of existing 2nd floor gutters</li>
                    <li style="padding: 5px 0; border-bottom: 1px solid #e0e0e0;">• Install new commercial-grade aluminum gutters (2nd floor - ${measurements.secondFloor} ft)</li>
                    <li style="padding: 5px 0; border-bottom: 1px solid #e0e0e0;">• Install GutterSnap protection system on 2nd floor (${measurements.secondFloor} ft)</li>
                    ` : ''}
                    <li style="padding: 5px 0; border-bottom: 1px solid #e0e0e0;">• Premium micro-mesh gutter guard material throughout</li>
                    <li style="padding: 5px 0; border-bottom: 1px solid #e0e0e0;">• Custom-fitted aluminum frame system</li>
                    <li style="padding: 5px 0; border-bottom: 1px solid #e0e0e0;">• Secure fascia board mounting with rust-resistant fasteners</li>
                    ${measurements.downspoutFeet > 0 ? `
                    <li style="padding: 5px 0; border-bottom: 1px solid #e0e0e0;">• ${measurements.downspoutFeet} linear feet of new downspout installation</li>
                    <li style="padding: 5px 0; border-bottom: 1px solid #e0e0e0;">• Underground drainage connection (where applicable)</li>
                    ` : ''}
                    ${measurements.endCaps > 0 ? `
                    <li style="padding: 5px 0; border-bottom: 1px solid #e0e0e0;">• ${measurements.endCaps} professionally sealed end caps and miter joints</li>
                    ` : ''}
                            <li style="padding: 5px 0; border-bottom: 1px solid #e0e0e0;">• Complete system testing and water flow verification</li>
                            <li style="padding: 5px 0; border-bottom: 1px solid #e0e0e0;">• Full property cleanup and debris removal</li>
                            <li style="padding: 5px 0;">• 30-year transferable warranty on both gutters and protection system</li>
                </ul>
            </div>
        `;
    }
}

function generateFinancingOptions(total) {
    const terms = [
        { months: 12, rate: 0 },    // 0% for 12 months
        { months: 24, rate: 3.99 }, // 3.99% for 24 months
        { months: 36, rate: 5.99 }, // 5.99% for 36 months
        { months: 60, rate: 7.99 }  // 7.99% for 60 months
    ];
    
    let financingHTML = `
        <div style="background: #FFF5ED; border: 2px solid #EE9844; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h4 style="margin: 0 0 15px 0; color: #EE9844;">Flexible Financing Available</h4>
            <p style="margin: 0 0 15px 0; color: #666;">Make it affordable with convenient monthly payments:</p>
            <div style="background: #ffffff; padding: 15px; border-radius: 8px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr style="border-bottom: 2px solid #EE9844;">
                        <th style="text-align: left; padding: 10px; color: #333;">Term</th>
                        <th style="text-align: right; padding: 10px; color: #333;">Monthly Payment</th>
                    </tr>
    `;
    
    terms.forEach(term => {
        let monthly;
        if (term.rate === 0) {
            monthly = total / term.months;
        } else {
            const monthlyRate = term.rate / 100 / 12;
            monthly = total * (monthlyRate * Math.pow(1 + monthlyRate, term.months)) / (Math.pow(1 + monthlyRate, term.months) - 1);
        }
        
        financingHTML += `
                    <tr style="border-bottom: 1px solid #e0e0e0;">
                        <td style="padding: 10px; color: #666;">${term.months} months ${term.rate === 0 ? '<span style="color: #4CAF50; font-weight: 600;">(0% APR)</span>' : `(${term.rate}% APR)`}</td>
                        <td style="padding: 10px; text-align: right; font-weight: 600; color: #EE9844;">$${monthly.toFixed(2)}/mo</td>
                    </tr>
        `;
    });
    
    financingHTML += `
                </table>
            </div>
            <p style="margin: 15px 0 0 0; font-size: 0.85rem; color: #999;">
                *Subject to credit approval. Click option below to apply for financing.
            </p>
        </div>
    `;
    
    return financingHTML;
}

module.exports = {
    generateInstallProcedure,
    generateFinancingOptions
};

