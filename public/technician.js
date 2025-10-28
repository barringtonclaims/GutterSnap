document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('technicianForm');
    const submitBtn = document.getElementById('submitBtn');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const dateInput = document.getElementById('preferredDate');
    const timeInput = document.getElementById('preferredTime');
    const meetingPref = document.getElementById('meetingPreference');
    const schedulingSection = document.getElementById('schedulingSection');
    const noMeetingMessage = document.getElementById('noMeetingMessage');

    // Set minimum date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];
    dateInput.min = minDate;

    // Handle meeting preference change
    meetingPref.addEventListener('change', function() {
        if (this.value === 'meet') {
            // Show scheduling section, hide no-meeting message
            schedulingSection.style.display = 'block';
            noMeetingMessage.style.display = 'none';
            
            // Make date and time required
            dateInput.required = true;
            timeInput.required = true;
        } else if (this.value === 'no-meet') {
            // Hide scheduling section, show no-meeting message
            schedulingSection.style.display = 'none';
            noMeetingMessage.style.display = 'block';
            
            // Make date and time not required and clear values
            dateInput.required = false;
            timeInput.required = false;
            dateInput.value = '';
            timeInput.value = '';
        } else {
            // Nothing selected
            schedulingSection.style.display = 'none';
            noMeetingMessage.style.display = 'none';
            dateInput.required = false;
            timeInput.required = false;
        }
    });

    // Phone number formatting
    const phoneInput = document.getElementById('phone');
    phoneInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 6) {
            value = `(${value.substring(0, 3)}) ${value.substring(3, 6)}-${value.substring(6, 10)}`;
        } else if (value.length >= 3) {
            value = `(${value.substring(0, 3)}) ${value.substring(3)}`;
        }
        e.target.value = value;
    });

    // Form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Clear any previous error messages
        hideError();
        
        // Validate all visible required fields
        const requiredInputs = form.querySelectorAll('[required]');
        let isValid = true;
        let missingFields = [];
        
        requiredInputs.forEach(input => {
            // Only validate if the field is visible (not in a hidden section)
            const isVisible = input.offsetParent !== null;
            if (isVisible && !input.value.trim()) {
                isValid = false;
                missingFields.push(input.name);
            }
        });
        
        if (!isValid) {
            showError('Please complete all required fields: ' + missingFields.join(', '));
            return;
        }
        
        // Only validate date if meeting preference is "meet"
        if (meetingPref.value === 'meet') {
            // Validate date is in the future
            const selectedDate = new Date(dateInput.value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (selectedDate < today) {
                showError('Please select a future date for your inspection.');
                return;
            }
        }
        
        // Show loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading-spinner"></span> Submitting...';
        
        try {
            const formData = new FormData(form);
            
            // Debug: log form data
            console.log('📤 Sending form data:');
            for (let [key, value] of formData.entries()) {
                console.log(`  ${key}: ${value}`);
            }
            
            // Add inspection type
            formData.append('inspectionType', 'technician');
            
            let response;
            try {
                response = await fetch('/submit-technician-request', {
                    method: 'POST',
                    body: formData,
                    // Don't set timeout too short
                    signal: AbortSignal.timeout(60000) // 60 second timeout
                });
            } catch (fetchError) {
                if (fetchError.name === 'AbortError' || fetchError.name === 'TimeoutError') {
                    throw new Error('Request is taking too long. Please check your internet connection and try again.');
                }
                throw new Error('Network error. Please check your internet connection and try again.');
            }
            
            // Parse response
            let result;
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                try {
                    result = await response.json();
                } catch (parseError) {
                    console.error('JSON parse error:', parseError);
                    throw new Error('Server error. Please try again in a few moments.');
                }
            } else {
                // Server didn't return JSON - log what we got
                const text = await response.text();
                console.error('Non-JSON response:', text.substring(0, 200));
                throw new Error('Server error. Please try again in a few moments.');
            }
            
            if (response.ok && result.success) {
                // Success! Hide form, back link, and show success message
                form.style.display = 'none';
                document.getElementById('backLink').style.display = 'none';
                successMessage.style.display = 'block';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                throw new Error(result.message || 'Submission failed. Please try again.');
            }
            
        } catch (error) {
            console.error('Submission error:', error);
            showError(error.message || 'There was an error submitting your request. Please check your internet connection and try again.');
            
            // Reset button
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="btn-text">Schedule Inspection</span>';
        }
    });

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function hideError() {
        errorMessage.style.display = 'none';
    }
});

