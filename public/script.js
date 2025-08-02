document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('photoForm');
    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    const successMessage = document.getElementById('successMessage');
    
    // Camera Mode Elements
    const cameraMode = document.getElementById('cameraMode');
    const startCameraBtn = document.getElementById('startCameraBtn');
    const backToFormBtn = document.getElementById('backToForm');
    const video = document.getElementById('camera');
    const canvas = document.getElementById('canvas');
    const preview = document.getElementById('preview');
    const captureBtn = document.getElementById('captureBtn');
    const nextPhotoBtn = document.getElementById('nextPhotoBtn');
    const photoTitle = document.getElementById('photoTitle');
    const photoCount = document.getElementById('photoCount');
    const photoInstructions = document.getElementById('photoInstructions');
    
    // Photo sequence for camera mode
    const photoSequence = [
        { id: 'front', title: 'Front of Home', instruction: 'Stand back to capture the entire front of your home' },
        { id: 'frontRightCorner', title: 'Front Right Corner', instruction: 'Position yourself at an angle to capture the front right corner' },
        { id: 'rightSide', title: 'Right Side', instruction: 'Move to capture the right side of your home' },
        { id: 'rearRightCorner', title: 'Rear Right Corner', instruction: 'Position yourself at an angle to capture the rear right corner' },
        { id: 'rear', title: 'Rear of Home', instruction: 'Stand back to capture the entire rear of your home' },
        { id: 'rearLeftCorner', title: 'Rear Left Corner', instruction: 'Position yourself at an angle to capture the rear left corner' },
        { id: 'leftSide', title: 'Left Side', instruction: 'Move to capture the left side of your home' },
        { id: 'leftFrontCorner', title: 'Left Front Corner', instruction: 'Position yourself at an angle to capture the left front corner' },
        { id: 'gutterSwatch', title: 'Gutter Color Swatch', instruction: 'Hold the color swatch up to your existing gutters or show your preferred color' }
    ];
    
    let currentPhotoIndex = 0;
    let stream = null;
    let capturedPhotos = {};
    
    // Start Camera Mode
    startCameraBtn.addEventListener('click', async function() {
        form.style.display = 'none';
        cameraMode.style.display = 'flex';
        currentPhotoIndex = 0;
        await startCamera();
        updatePhotoUI();
    });
    
    // Back to Form
    backToFormBtn.addEventListener('click', function() {
        stopCamera();
        cameraMode.style.display = 'none';
        form.style.display = 'block';
    });
    
    // Start Camera
    async function startCamera() {
        try {
            const constraints = {
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            };
            
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            video.style.display = 'block';
            preview.style.display = 'none';
        } catch (err) {
            console.error('Error accessing camera:', err);
            alert('Unable to access camera. Please make sure you have granted camera permissions or use the manual upload option.');
            backToFormBtn.click();
        }
    }
    
    // Stop Camera
    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        video.style.display = 'none';
    }
    
    // Update Photo UI
    function updatePhotoUI() {
        const currentPhoto = photoSequence[currentPhotoIndex];
        photoTitle.textContent = currentPhoto.title;
        photoCount.textContent = `${currentPhotoIndex + 1} of ${photoSequence.length}`;
        photoInstructions.textContent = currentPhoto.instruction;
        
        // Reset buttons
        captureBtn.style.display = 'flex';
        nextPhotoBtn.style.display = 'none';
        video.style.display = 'block';
        preview.style.display = 'none';
    }
    
    // Capture Photo
    captureBtn.addEventListener('click', function() {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        
        canvas.toBlob(function(blob) {
            const currentPhoto = photoSequence[currentPhotoIndex];
            const file = new File([blob], `${currentPhoto.id}.jpg`, { type: 'image/jpeg' });
            
            // Store the captured photo
            capturedPhotos[currentPhoto.id] = file;
            
            // Update the corresponding file input
            const fileInput = document.getElementById(currentPhoto.id);
            const dt = new DataTransfer();
            dt.items.add(file);
            fileInput.files = dt.files;
            
            // Trigger change event to update UI
            const event = new Event('change', { bubbles: true });
            fileInput.dispatchEvent(event);
            
            // Show preview
            preview.src = URL.createObjectURL(blob);
            video.style.display = 'none';
            preview.style.display = 'block';
            
            // Show next button
            captureBtn.style.display = 'none';
            nextPhotoBtn.style.display = 'block';
            nextPhotoBtn.textContent = currentPhotoIndex < photoSequence.length - 1 ? 'Next Photo →' : 'Finish';
        }, 'image/jpeg', 0.9);
    });
    
    // Next Photo
    nextPhotoBtn.addEventListener('click', function() {
        if (currentPhotoIndex < photoSequence.length - 1) {
            currentPhotoIndex++;
            updatePhotoUI();
        } else {
            // Finished all photos
            stopCamera();
            cameraMode.style.display = 'none';
            form.style.display = 'block';
            
            // Scroll to contact info section
            const contactSection = document.querySelector('.section:nth-child(3)');
            if (contactSection) {
                contactSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    });
    
    // Photo upload handling
    const photoInputs = document.querySelectorAll('input[type="file"]');
    
    photoInputs.forEach(input => {
        input.addEventListener('change', function(e) {
            const file = e.target.files[0];
            const card = e.target.closest('.photo-upload-card');
            const status = card.querySelector('.upload-status');
            
            if (file) {
                // Validate file size (10MB limit)
                if (file.size > 10 * 1024 * 1024) {
                    status.textContent = 'File too large (max 10MB)';
                    status.style.color = '#e53e3e';
                    e.target.value = '';
                    return;
                }
                
                // Validate file type
                if (!file.type.startsWith('image/')) {
                    status.textContent = 'Please select an image file';
                    status.style.color = '#e53e3e';
                    e.target.value = '';
                    return;
                }
                
                // Show success state
                card.classList.add('uploaded');
                status.textContent = `✓ ${file.name}`;
                status.style.color = '#38a169';
                
                // Create image preview
                const reader = new FileReader();
                reader.onload = function(e) {
                    // Remove existing preview
                    const existingPreview = card.querySelector('.image-preview');
                    if (existingPreview) {
                        existingPreview.remove();
                    }
                    
                    // Create new preview
                    const preview = document.createElement('div');
                    preview.className = 'image-preview';
                    preview.style.cssText = `
                        margin-top: 10px;
                        border-radius: 8px;
                        overflow: hidden;
                        max-width: 100%;
                    `;
                    
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.style.cssText = `
                        width: 100%;
                        height: 100px;
                        object-fit: cover;
                        display: block;
                    `;
                    
                    preview.appendChild(img);
                    card.appendChild(preview);
                };
                reader.readAsDataURL(file);
            } else {
                // Reset state
                card.classList.remove('uploaded');
                status.textContent = '';
                const preview = card.querySelector('.image-preview');
                if (preview) {
                    preview.remove();
                }
            }
            
            updateSubmitButton();
        });
    });
    
    // Form validation
    function validateForm() {
        const requiredInputs = form.querySelectorAll('[required]');
        let isValid = true;
        
        requiredInputs.forEach(input => {
            if (input.type === 'file') {
                if (!input.files || !input.files[0]) {
                    isValid = false;
                }
            } else {
                if (!input.value.trim()) {
                    isValid = false;
                }
            }
        });
        
        return isValid;
    }
    
    function updateSubmitButton() {
        const isValid = validateForm();
        submitBtn.disabled = !isValid;
        
        if (isValid) {
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
        } else {
            submitBtn.style.opacity = '0.6';
            submitBtn.style.cursor = 'not-allowed';
        }
    }
    
    // Real-time validation
    const formInputs = form.querySelectorAll('input, textarea');
    formInputs.forEach(input => {
        input.addEventListener('input', updateSubmitButton);
        input.addEventListener('change', updateSubmitButton);
    });
    
    // Initial validation
    updateSubmitButton();
    
    // Form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!validateForm()) {
            alert('Please fill in all required fields and upload all photos.');
            return;
        }
        
        // Show loading state
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline-flex';
        
        try {
            const formData = new FormData(form);
            
            const response = await fetch('/submit-request', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Hide form and show success message
                form.style.display = 'none';
                successMessage.style.display = 'block';
                
                // Hide the welcome section and camera notice
                const welcomeSection = document.querySelector('.welcome-section');
                if (welcomeSection) {
                    welcomeSection.style.display = 'none';
                }
                
                // Smooth scroll to success message
                successMessage.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
                
                // Confetti effect (simple)
                createConfetti();
                
            } else {
                throw new Error(result.message || 'Submission failed');
            }
            
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('There was an error submitting your request. Please try again.');
            
            // Reset loading state
            submitBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
        }
    });
    
    // Simple confetti effect
    function createConfetti() {
        const colors = ['#FF9933', '#FF4500', '#48bb78', '#ed8936', '#9f7aea'];
        const confettiCount = 50;
        
        for (let i = 0; i < confettiCount; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.style.cssText = `
                    position: fixed;
                    top: -10px;
                    left: ${Math.random() * 100}vw;
                    width: 10px;
                    height: 10px;
                    background: ${colors[Math.floor(Math.random() * colors.length)]};
                    pointer-events: none;
                    z-index: 1000;
                    border-radius: 50%;
                    animation: confettiFall 3s linear forwards;
                `;
                
                document.body.appendChild(confetti);
                
                // Remove confetti after animation
                setTimeout(() => {
                    confetti.remove();
                }, 3000);
                
            }, i * 100);
        }
    }
    
    // Add confetti animation CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes confettiFall {
            to {
                transform: translateY(100vh) rotate(360deg);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
    
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
    
    // Email validation
    const emailInput = document.getElementById('email');
    emailInput.addEventListener('blur', function(e) {
        const email = e.target.value;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (email && !emailRegex.test(email)) {
            e.target.style.borderColor = '#e53e3e';
            e.target.style.boxShadow = '0 0 0 3px rgba(229, 62, 62, 0.1)';
        } else {
            e.target.style.borderColor = '#e2e8f0';
            e.target.style.boxShadow = 'none';
        }
    });
    
    // Smooth scrolling for form sections
    const sections = document.querySelectorAll('.section');
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.transform = 'translateY(0)';
                entry.target.style.opacity = '1';
            }
        });
    }, observerOptions);
    
    sections.forEach(section => {
        section.style.transform = 'translateY(20px)';
        section.style.opacity = '0.8';
        section.style.transition = 'all 0.6s ease';
        observer.observe(section);
    });
});