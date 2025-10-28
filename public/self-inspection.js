document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('selfInspectionForm');
    const submitBtn = document.getElementById('submitBtn');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');

    // Camera Mode Elements
    const cameraMode = document.getElementById('cameraMode');
    const startCameraBtn = document.getElementById('startCameraBtn');
    const exitCameraBtn = document.getElementById('exitCamera');
    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('cameraCanvas');
    const preview = document.getElementById('capturePreview');
    const captureBtn = document.getElementById('captureBtn');
    const nextPhotoBtn = document.getElementById('nextPhotoBtn');
    const photoTitle = document.getElementById('photoTitle');
    const photoCount = document.getElementById('photoCount');
    const photoInstruction = document.getElementById('photoInstruction');
    const photoProgressContainer = document.getElementById('photoProgressContainer');
    const photoThumbnails = document.getElementById('photoThumbnails');

    // Gutter Swatch Elements
    const swatchYesBtn = document.getElementById('swatchYesBtn');
    const swatchNoBtn = document.getElementById('swatchNoBtn');
    const swatchPhotoPrompt = document.getElementById('swatchPhotoPrompt');
    const noSwatchMessage = document.getElementById('noSwatchMessage');
    const captureSwatchBtn = document.getElementById('captureSwatchBtn');
    const swatchPhotoPreviewContainer = document.getElementById('swatchPhotoPreviewContainer');
    const swatchPhotoPreview = document.getElementById('swatchPhotoPreview');
    const gutterSwatchInput = document.getElementById('gutterSwatch');
    let hasGutterSwatch = null; // null = not selected, true = yes, false = no

    // Photo sequence for camera mode (without gutterSwatch - handled separately)
    const photoSequence = [
        { id: 'front', title: 'Front of Home', instruction: 'Stand back to capture the entire front of your home' },
        { id: 'frontRightCorner', title: 'Front Right Corner', instruction: 'Position yourself at the front right corner' },
        { id: 'rightSide', title: 'Right Side', instruction: 'Move to capture the right side of your home' },
        { id: 'rearRightCorner', title: 'Rear Right Corner', instruction: 'Position yourself at the rear right corner' },
        { id: 'rear', title: 'Rear of Home', instruction: 'Stand back to capture the entire rear of your home' },
        { id: 'rearLeftCorner', title: 'Rear Left Corner', instruction: 'Position yourself at the rear left corner' },
        { id: 'leftSide', title: 'Left Side', instruction: 'Move to capture the left side of your home' },
        { id: 'leftFrontCorner', title: 'Front Left Corner', instruction: 'Position yourself at the front left corner' }
    ];

    let currentPhotoIndex = 0;
    let stream = null;
    let isCapturingSwatch = false; // Flag to indicate we're capturing swatch photo
    let currentOrientation = 'portrait'; // Track current orientation

    // Function to add photo thumbnail to progress display
    function addPhotoThumbnail(photoId, photoTitle, imageUrl) {
        // Show the progress container if it's hidden
        photoProgressContainer.style.display = 'block';
        
        // Create thumbnail element
        const thumbnailDiv = document.createElement('div');
        thumbnailDiv.className = 'photo-thumbnail-item';
        thumbnailDiv.setAttribute('data-photo-id', photoId);
        thumbnailDiv.style.cssText = `
            position: relative;
            border-radius: 8px;
            overflow: hidden;
            border: 2px solid #EE9844;
            background: #f5f5f5;
        `;
        
        // Create image
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = photoTitle;
        img.style.cssText = `
            width: 100%;
            height: 100px;
            object-fit: cover;
            display: block;
        `;
        
        // Create label
        const label = document.createElement('div');
        label.textContent = photoTitle;
        label.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 6px 8px;
            font-size: 0.75rem;
            font-weight: 500;
            text-align: center;
        `;
        
        // Create checkmark
        const checkmark = document.createElement('div');
        checkmark.innerHTML = '✓';
        checkmark.style.cssText = `
            position: absolute;
            top: 6px;
            right: 6px;
            background: #4CAF50;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
        `;
        
        thumbnailDiv.appendChild(img);
        thumbnailDiv.appendChild(label);
        thumbnailDiv.appendChild(checkmark);
        photoThumbnails.appendChild(thumbnailDiv);
    }

    // Gutter Swatch Button Logic
    swatchYesBtn.addEventListener('click', function() {
        hasGutterSwatch = true;
        
        // Update button styles
        swatchYesBtn.style.background = '#EE9844';
        swatchYesBtn.style.color = 'white';
        swatchYesBtn.style.borderColor = '#EE9844';
        swatchNoBtn.style.background = 'white';
        swatchNoBtn.style.color = '#333';
        swatchNoBtn.style.borderColor = '#e0e0e0';
        
        // Show photo prompt, hide no message
        swatchPhotoPrompt.style.display = 'block';
        noSwatchMessage.style.display = 'none';
    });

    swatchNoBtn.addEventListener('click', function() {
        hasGutterSwatch = false;
        
        // Update button styles
        swatchNoBtn.style.background = '#EE9844';
        swatchNoBtn.style.color = 'white';
        swatchNoBtn.style.borderColor = '#EE9844';
        swatchYesBtn.style.background = 'white';
        swatchYesBtn.style.color = '#333';
        swatchYesBtn.style.borderColor = '#e0e0e0';
        
        // Show no message, hide photo prompt
        swatchPhotoPrompt.style.display = 'none';
        noSwatchMessage.style.display = 'block';
        
        // Clear any uploaded photo
        gutterSwatchInput.value = '';
        swatchPhotoPreviewContainer.style.display = 'none';
    });

    // Capture Swatch Button (opens camera for swatch photo)
    captureSwatchBtn.addEventListener('click', async function() {
        isCapturingSwatch = true; // Set flag
        cameraMode.style.display = 'block';
        photoTitle.textContent = 'Gutter Color Swatch';
        photoCount.textContent = 'Swatch Photo';
        photoInstruction.textContent = 'Hold the color swatch close to your existing gutters or show your preferred color';
        await startCamera();
        updateCameraLayout();
        captureBtn.style.display = 'flex';
        nextPhotoBtn.style.display = 'none';
    });

    // Detect and update orientation
    function updateOrientation() {
        const isLandscape = window.matchMedia('(orientation: landscape)').matches;
        currentOrientation = isLandscape ? 'landscape' : 'portrait';
        updateCameraLayout();
    }

    // Update camera layout based on orientation
    function updateCameraLayout() {
        if (!cameraMode || cameraMode.style.display === 'none') return;
        
        const cameraBottomOverlay = document.getElementById('cameraBottomOverlay');
        const cameraInstructions = document.getElementById('cameraInstructions');
        const cameraControls = document.getElementById('cameraControls');
        
        if (currentOrientation === 'landscape') {
            // Landscape mode - overlay spans entire bottom with controls on the side
            cameraBottomOverlay.style.cssText = `
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 50%, transparent 100%);
                padding: 20px 20px 20px 20px;
                z-index: 10;
                display: flex;
                align-items: center;
                justify-content: space-between;
            `;
            
            cameraInstructions.style.cssText = `
                color: white;
                padding: 0 20px;
                text-align: center;
                flex: 1;
            `;
            
            cameraControls.style.cssText = `
                padding: 0 20px;
                display: flex;
                flex-direction: row;
                align-items: center;
                gap: 20px;
            `;
            
            photoInstruction.style.fontSize = '0.95rem';
        } else {
            // Portrait mode - unified gradient from top to bottom
            cameraBottomOverlay.style.cssText = `
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0.4) 70%, transparent 100%);
                padding-bottom: 30px;
                padding-top: 60px;
                z-index: 10;
            `;
            
            cameraInstructions.style.cssText = `
                color: white;
                padding: 0 20px 20px 20px;
                text-align: center;
            `;
            
            cameraControls.style.cssText = `
                padding: 0 30px;
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 20px;
            `;
            
            photoInstruction.style.fontSize = '1rem';
        }
    }

    // Listen for orientation changes
    window.addEventListener('orientationchange', updateOrientation);
    window.matchMedia('(orientation: landscape)').addEventListener('change', updateOrientation);

    // Start camera mode
    startCameraBtn.addEventListener('click', async function() {
        currentPhotoIndex = 0;
        isCapturingSwatch = false; // Make sure we're not in swatch mode
        
        // Clear previous thumbnails if restarting
        photoThumbnails.innerHTML = '';
        photoProgressContainer.style.display = 'none';
        
        cameraMode.style.display = 'block';
        await startCamera();
        updateOrientation();
        updateCameraUI();
    });

    // Exit camera mode
    exitCameraBtn.addEventListener('click', function() {
        stopCamera();
        cameraMode.style.display = 'none';
        isCapturingSwatch = false; // Reset flag when exiting
    });

    // Start camera
    async function startCamera() {
        try {
            // Request camera with flexible constraints to support orientation
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
            alert('Unable to access camera. Please make sure you have granted camera permissions.');
            cameraMode.style.display = 'none';
        }
    }

    // Stop camera
    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        video.style.display = 'none';
    }

    // Update camera UI
    function updateCameraUI() {
        const currentPhoto = photoSequence[currentPhotoIndex];
        photoTitle.textContent = currentPhoto.title;
        photoCount.textContent = `${currentPhotoIndex + 1} of ${photoSequence.length}`;
        photoInstruction.textContent = currentPhoto.instruction;
        
        captureBtn.style.display = 'flex';
        nextPhotoBtn.style.display = 'none';
        video.style.display = 'block';
        preview.style.display = 'none';
    }

    // Function to compress image to target size
    function compressImage(blob, maxSizeKB = 500) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    // Calculate dimensions to keep under 1920px max
                    let width = img.width;
                    let height = img.height;
                    const maxDimension = 1920;
                    
                    if (width > maxDimension || height > maxDimension) {
                        if (width > height) {
                            height = (height / width) * maxDimension;
                            width = maxDimension;
                        } else {
                            width = (width / height) * maxDimension;
                            height = maxDimension;
                        }
                    }
                    
                    // Create compression canvas
                    const compressCanvas = document.createElement('canvas');
                    compressCanvas.width = width;
                    compressCanvas.height = height;
                    const compressCtx = compressCanvas.getContext('2d');
                    compressCtx.drawImage(img, 0, 0, width, height);
                    
                    // Start with 0.8 quality and reduce if needed
                    let quality = 0.8;
                    
                    function tryCompress() {
                        compressCanvas.toBlob(function(compressedBlob) {
                            const sizeKB = compressedBlob.size / 1024;
                            console.log(`  Compression attempt: ${sizeKB.toFixed(1)}KB at quality ${quality}`);
                            
                            if (sizeKB <= maxSizeKB || quality <= 0.3) {
                                console.log(`  ✅ Final size: ${sizeKB.toFixed(1)}KB`);
                                resolve(compressedBlob);
                            } else {
                                quality -= 0.1;
                                tryCompress();
                            }
                        }, 'image/jpeg', quality);
                    }
                    
                    tryCompress();
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(blob);
        });
    }

    // Capture photo
    captureBtn.addEventListener('click', async function() {
        // Capture the actual video dimensions (not the display size)
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        
        canvas.width = videoWidth;
        canvas.height = videoHeight;
        
        const ctx = canvas.getContext('2d');
        
        // Draw the video frame to canvas
        ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
        
        canvas.toBlob(async function(blob) {
            console.log(`📸 Original capture: ${(blob.size / 1024).toFixed(1)}KB`);
            
            // Compress the image
            const compressedBlob = await compressImage(blob, 500); // 500KB max per photo
            
            // Check if we're capturing swatch photo
            if (isCapturingSwatch) {
                const file = new File([compressedBlob], 'gutterSwatch.jpg', { type: 'image/jpeg' });
                
                // Update the file input
                const dt = new DataTransfer();
                dt.items.add(file);
                gutterSwatchInput.files = dt.files;
                
                // Show preview in the form
                swatchPhotoPreview.src = URL.createObjectURL(compressedBlob);
                swatchPhotoPreviewContainer.style.display = 'block';
                
                // Close camera and reset flag
                stopCamera();
                cameraMode.style.display = 'none';
                isCapturingSwatch = false;
            } else {
                // Normal house photo capture
                const currentPhoto = photoSequence[currentPhotoIndex];
                const file = new File([compressedBlob], `${currentPhoto.id}.jpg`, { type: 'image/jpeg' });
                
                // Update the file input
                const fileInput = document.getElementById(currentPhoto.id);
                const dt = new DataTransfer();
                dt.items.add(file);
                fileInput.files = dt.files;
                
                // Create image URL for thumbnail
                const imageUrl = URL.createObjectURL(compressedBlob);
                
                // Add thumbnail to progress display
                addPhotoThumbnail(currentPhoto.id, currentPhoto.title, imageUrl);
                
                // Show preview
                preview.src = imageUrl;
                video.style.display = 'none';
                preview.style.display = 'block';
                
                // Show next button
                captureBtn.style.display = 'none';
                nextPhotoBtn.style.display = 'block';
                nextPhotoBtn.textContent = currentPhotoIndex < photoSequence.length - 1 ? 'Next Photo →' : 'Finish';
            }
        }, 'image/jpeg', 0.95);
    });

    // Next photo
    nextPhotoBtn.addEventListener('click', function() {
        if (currentPhotoIndex < photoSequence.length - 1) {
            currentPhotoIndex++;
            updateCameraUI();
        } else {
            // Finished all photos
            stopCamera();
            cameraMode.style.display = 'none';
            isCapturingSwatch = false; // Reset flag
            
            // Scroll to gutter swatch section
            const swatchSection = swatchYesBtn.closest('.form-section');
            if (swatchSection) {
                swatchSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
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
        
        // Validate all required fields
        const requiredInputs = form.querySelectorAll('[required]');
        let isValid = true;
        let missingFields = [];
        
        requiredInputs.forEach(input => {
            if (input.type === 'file') {
                // Skip gutterSwatch validation - it's handled separately
                if (input.id === 'gutterSwatch') {
                    return;
                }
                if (!input.files || !input.files[0]) {
                    isValid = false;
                    const container = input.closest('.photo-upload');
                    missingFields.push(container.dataset.photo);
                }
            } else {
                if (!input.value.trim()) {
                    isValid = false;
                    missingFields.push(input.name);
                }
            }
        });
        
        // Special validation for gutter swatch
        if (hasGutterSwatch === null) {
            isValid = false;
            missingFields.push('Gutter Swatch Question (Yes/No)');
        } else if (hasGutterSwatch === true) {
            if (!gutterSwatchInput.files || !gutterSwatchInput.files[0]) {
                isValid = false;
                missingFields.push('Gutter Swatch Photo');
            }
        }
        
        if (!isValid) {
            showError('Please complete all required fields. Missing: ' + missingFields.join(', '));
            return;
        }
        
        // Show loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading-spinner"></span> Submitting...';
        
        const submitStartTime = Date.now();
        console.log('📤 ========== FORM SUBMISSION STARTED ==========');
        console.log('⏰ Timestamp:', new Date().toISOString());
        
        try {
            const formData = new FormData(form);
            
            // Log form data details
            let photoCount = 0;
            let totalSize = 0;
            for (let [key, value] of formData.entries()) {
                if (value instanceof File) {
                    photoCount++;
                    totalSize += value.size;
                    const sizeInMB = (value.size / (1024 * 1024)).toFixed(2);
                    console.log(`  📷 ${key}: ${sizeInMB}MB`);
                }
            }
            console.log(`📊 Total photos: ${photoCount}, Total size: ${(totalSize / (1024 * 1024)).toFixed(2)}MB`);
            
            // Add inspection type
            formData.append('inspectionType', 'self');
            
            let response;
            try {
                console.log('🚀 Starting upload to server...');
                const uploadStartTime = Date.now();
                
                response = await fetch('/submit-request', {
                    method: 'POST',
                    body: formData,
                    // Don't set timeout too short - large uploads need time
                    signal: AbortSignal.timeout(60000) // 60 second timeout
                });
                
                const uploadDuration = Date.now() - uploadStartTime;
                console.log(`✅ Upload complete in ${uploadDuration}ms (${(uploadDuration/1000).toFixed(1)}s)`);
                console.log(`📡 Response status: ${response.status} ${response.statusText}`);
            } catch (fetchError) {
                const uploadDuration = Date.now() - submitStartTime;
                console.error(`❌ Fetch error after ${uploadDuration}ms:`, fetchError);
                console.error('Error name:', fetchError.name);
                console.error('Error message:', fetchError.message);
                
                if (fetchError.name === 'AbortError' || fetchError.name === 'TimeoutError') {
                    throw new Error('Upload is taking too long. Please check your internet connection and try again.');
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
                const totalDuration = Date.now() - submitStartTime;
                console.log(`🎉 SUCCESS! Total time: ${totalDuration}ms (${(totalDuration/1000).toFixed(1)}s)`);
                console.log('📤 ========== SUBMISSION COMPLETE ==========\n');
                
                // Success! Hide form, back link, and show success message
                form.style.display = 'none';
                document.getElementById('backLink').style.display = 'none';
                successMessage.style.display = 'block';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                console.error('❌ Server returned error:', result);
                throw new Error(result.message || 'Submission failed. Please try again.');
            }
            
        } catch (error) {
            const totalDuration = Date.now() - submitStartTime;
            console.error('❌ ========== SUBMISSION FAILED ==========');
            console.error('⏱️  Failed after:', totalDuration + 'ms');
            console.error('🔴 Error:', error);
            console.error('📤 ========== END ERROR ==========\n');
            
            showError(error.message || 'There was an error submitting your request. Please check your internet connection and try again.');
            
            // Reset button
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="btn-text">Submit for Quote</span>';
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

