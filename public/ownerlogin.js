// Owner Login JavaScript

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const loginBox = document.getElementById('loginBox');
const resetBox = document.getElementById('resetBox');
const changePasswordBox = document.getElementById('changePasswordBox');
const dashboard = document.getElementById('dashboard');

const loginForm = document.getElementById('loginForm');
const resetForm = document.getElementById('resetForm');
const changePasswordForm = document.getElementById('changePasswordForm');

const showResetFormBtn = document.getElementById('showResetForm');
const backToLoginBtn = document.getElementById('backToLogin');
const backToLoginFromChangeBtn = document.getElementById('backToLoginFromChange');
const logoutBtn = document.getElementById('logoutBtn');
const changePasswordLink = document.getElementById('changePasswordLink');

const alertContainer = document.getElementById('alertContainer');
const resetAlertContainer = document.getElementById('resetAlertContainer');
const changeAlertContainer = document.getElementById('changeAlertContainer');

// Check if user is already logged in
window.addEventListener('DOMContentLoaded', () => {
    const token = sessionStorage.getItem('ownerToken');
    const userEmail = sessionStorage.getItem('ownerEmail');
    
    if (token && userEmail) {
        showDashboard(userEmail);
    }

    // Check for password reset token in URL
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('token');
    
    if (resetToken) {
        showChangePasswordForm(resetToken);
    }
});

// Show/Hide Forms
showResetFormBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loginBox.classList.remove('active');
    loginBox.style.display = 'none';
    resetBox.classList.add('active');
    resetBox.style.display = 'block';
    clearAlert(alertContainer);
});

backToLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    resetBox.classList.remove('active');
    resetBox.style.display = 'none';
    loginBox.classList.add('active');
    loginBox.style.display = 'block';
    clearAlert(resetAlertContainer);
});

backToLoginFromChangeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    changePasswordBox.classList.remove('active');
    changePasswordBox.style.display = 'none';
    loginBox.classList.add('active');
    loginBox.style.display = 'block';
    clearAlert(changeAlertContainer);
    // Remove token from URL
    window.history.replaceState({}, document.title, window.location.pathname);
});

// Login Form Submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');
    
    clearAlert(alertContainer);
    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in...';
    
    try {
        const response = await fetch('/api/owner-login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Store session
            sessionStorage.setItem('ownerToken', data.token);
            sessionStorage.setItem('ownerEmail', email);
            
            // Go directly to dashboard (no password reset notification)
            showDashboard(email);
        } else {
            showAlert(alertContainer, 'error', data.message || 'Invalid email or password');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert(alertContainer, 'error', 'Connection error. Please try again.');
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In';
    }
});

// Password Reset Request Form
resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('resetEmail').value;
    const resetBtn = document.getElementById('resetBtn');
    
    clearAlert(resetAlertContainer);
    resetBtn.disabled = true;
    resetBtn.textContent = 'Sending...';
    
    try {
        const response = await fetch('/api/owner-password-reset-request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(resetAlertContainer, 'success', 'Password reset link sent! Check your email.');
            resetForm.reset();
        } else {
            showAlert(resetAlertContainer, 'error', data.message || 'Error sending reset link');
        }
    } catch (error) {
        console.error('Reset request error:', error);
        showAlert(resetAlertContainer, 'error', 'Connection error. Please try again.');
    } finally {
        resetBtn.disabled = false;
        resetBtn.textContent = 'Send Reset Link';
    }
});

// Change Password Form
changePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const token = document.getElementById('resetToken').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    
    clearAlert(changeAlertContainer);
    
    // Validate passwords match
    if (newPassword !== confirmPassword) {
        showAlert(changeAlertContainer, 'error', 'Passwords do not match');
        return;
    }
    
    // Validate password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
        showAlert(changeAlertContainer, 'error', passwordValidation.message);
        return;
    }
    
    changePasswordBtn.disabled = true;
    changePasswordBtn.textContent = 'Updating...';
    
    try {
        const response = await fetch('/api/owner-password-change', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token, newPassword })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(changeAlertContainer, 'success', 'Password updated successfully! Redirecting to login...');
            changePasswordForm.reset();
            
            setTimeout(() => {
                changePasswordBox.classList.remove('active');
                changePasswordBox.style.display = 'none';
                loginBox.classList.add('active');
                loginBox.style.display = 'block';
                window.history.replaceState({}, document.title, window.location.pathname);
            }, 2000);
        } else {
            showAlert(changeAlertContainer, 'error', data.message || 'Error updating password');
        }
    } catch (error) {
        console.error('Password change error:', error);
        showAlert(changeAlertContainer, 'error', 'Connection error. Please try again.');
    } finally {
        changePasswordBtn.disabled = false;
        changePasswordBtn.textContent = 'Update Password';
    }
});

// Logout
logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('ownerToken');
    sessionStorage.removeItem('ownerEmail');
    
    dashboard.classList.remove('active');
    loginScreen.style.display = 'flex';
    
    loginForm.reset();
    clearAlert(alertContainer);
});

// Change Password from Dashboard
changePasswordLink.addEventListener('click', async (e) => {
    e.preventDefault();
    
    const email = sessionStorage.getItem('ownerEmail');
    if (!email) return;
    
    try {
        const response = await fetch('/api/owner-password-reset-request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Password reset link sent to your email!');
        } else {
            alert('Error sending reset link. Please try again.');
        }
    } catch (error) {
        console.error('Reset request error:', error);
        alert('Connection error. Please try again.');
    }
});

// Helper Functions
function showDashboard(email) {
    loginScreen.style.display = 'none';
    dashboard.classList.add('active');
    
    // Personalize welcome message
    const name = email.split('@')[0];
    const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
    document.getElementById('welcomeMessage').textContent = `Welcome back, ${capitalizedName}!`;
}

function showChangePasswordForm(token) {
    loginBox.style.display = 'none';
    resetBox.style.display = 'none';
    changePasswordBox.classList.add('active');
    changePasswordBox.style.display = 'block';
    document.getElementById('resetToken').value = token;
}

function showAlert(container, type, message) {
    const alertClass = type === 'success' ? 'alert-success' : 'alert-error';
    container.innerHTML = `
        <div class="alert ${alertClass}">
            ${message}
        </div>
    `;
}

function clearAlert(container) {
    container.innerHTML = '';
}

function validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (password.length < minLength) {
        return { valid: false, message: 'Password must be at least 8 characters long' };
    }
    if (!hasUpperCase) {
        return { valid: false, message: 'Password must include at least one uppercase letter' };
    }
    if (!hasLowerCase) {
        return { valid: false, message: 'Password must include at least one lowercase letter' };
    }
    if (!hasNumber) {
        return { valid: false, message: 'Password must include at least one number' };
    }
    if (!hasSpecialChar) {
        return { valid: false, message: 'Password must include at least one special character (!@#$%^&*)' };
    }
    
    return { valid: true };
}

