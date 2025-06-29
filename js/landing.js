// Landing Page JavaScript for TaskFlow
class LandingPage {
    constructor() {
        this.form = document.getElementById('registrationForm');
        this.userNameInput = document.getElementById('userName');
        this.dateOfBirthInput = document.getElementById('dateOfBirth');
        this.errorAlert = document.getElementById('errorAlert');
        this.errorMessage = document.getElementById('errorMessage');
        
        this.init();
    }

    init() {
        // Check if user is already registered
        this.checkExistingUser();
        
        // Set max date to today
        this.setMaxDate();
        
        // Add event listeners
        this.addEventListeners();
        
        console.log('Landing page initialized');
    }

    checkExistingUser() {
        try {
            const userData = localStorage.getItem('taskflow_user');
            if (userData) {
                const user = JSON.parse(userData);
                if (user.name && user.dateOfBirth && this.isValidAge(user.dateOfBirth)) {
                    console.log('Existing valid user found, redirecting...');
                    window.location.href = 'app.html';
                    return;
                }
            }
        } catch (error) {
            console.error('Error checking existing user:', error);
            // Clear corrupted data
            localStorage.removeItem('taskflow_user');
        }
    }

    setMaxDate() {
        // Set max date to today
        const today = new Date().toISOString().split('T')[0];
        this.dateOfBirthInput.max = today;
    }

    addEventListeners() {
        this.form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        // Real-time validation
        this.userNameInput.addEventListener('input', () => this.validateName());
        this.dateOfBirthInput.addEventListener('change', () => this.validateAge());
        
        // Clear error on input
        this.userNameInput.addEventListener('input', () => this.hideError());
        this.dateOfBirthInput.addEventListener('change', () => this.hideError());
    }

    handleFormSubmit(e) {
        e.preventDefault();
        
        const name = this.userNameInput.value.trim();
        const dateOfBirth = this.dateOfBirthInput.value;
        
        // Validate form
        if (this.validateForm(name, dateOfBirth)) {
            this.saveUserAndRedirect(name, dateOfBirth);
        }
    }

    validateForm(name, dateOfBirth) {
        let isValid = true;
        
        // Validate name
        if (!this.validateName(name)) {
            isValid = false;
        }
        
        // Validate age
        if (!this.validateAge(dateOfBirth)) {
            isValid = false;
        }
        
        return isValid;
    }

    validateName(name = null) {
        const nameValue = name || this.userNameInput.value.trim();
        
        if (!nameValue) {
            this.showFieldError(this.userNameInput, 'Please enter your full name');
            return false;
        }
        
        if (nameValue.length < 2) {
            this.showFieldError(this.userNameInput, 'Name must be at least 2 characters long');
            return false;
        }
        
        if (!/^[a-zA-Z\s]+$/.test(nameValue)) {
            this.showFieldError(this.userNameInput, 'Name can only contain letters and spaces');
            return false;
        }
        
        this.clearFieldError(this.userNameInput);
        return true;
    }

    validateAge(dateOfBirth = null) {
        const dobValue = dateOfBirth || this.dateOfBirthInput.value;
        
        if (!dobValue) {
            this.showFieldError(this.dateOfBirthInput, 'Please select your date of birth');
            return false;
        }
        
        if (!this.isValidAge(dobValue)) {
            this.showError('You must be over 10 years old to use TaskFlow');
            this.showFieldError(this.dateOfBirthInput, 'Age requirement not met');
            return false;
        }
        
        this.clearFieldError(this.dateOfBirthInput);
        return true;
    }

    isValidAge(dateOfBirth) {
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        
        // Check if date is valid
        if (isNaN(birthDate.getTime())) {
            return false;
        }
        
        // Check if date is not in the future
        if (birthDate >= today) {
            return false;
        }
        
        // Calculate age
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        return age > 10;
    }

    showFieldError(field, message) {
        field.classList.add('is-invalid');
        const feedback = field.nextElementSibling;
        if (feedback && feedback.classList.contains('invalid-feedback')) {
            feedback.textContent = message;
        }
    }

    clearFieldError(field) {
        field.classList.remove('is-invalid');
        const feedback = field.nextElementSibling;
        if (feedback && feedback.classList.contains('invalid-feedback')) {
            feedback.textContent = '';
        }
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorAlert.classList.remove('d-none');
        this.errorAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    hideError() {
        this.errorAlert.classList.add('d-none');
    }

    saveUserAndRedirect(name, dateOfBirth) {
        try {
            const userData = {
                name: name,
                dateOfBirth: dateOfBirth,
                registeredAt: new Date().toISOString()
            };
            
            localStorage.setItem('taskflow_user', JSON.stringify(userData));
            console.log('User data saved successfully');
            
            // Show success feedback
            const submitBtn = this.form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-check me-2"></i>Welcome to TaskFlow!';
            submitBtn.disabled = true;
            
            // Redirect after a short delay
            setTimeout(() => {
                window.location.href = 'app.html';
            }, 1000);
            
        } catch (error) {
            console.error('Error saving user data:', error);
            this.showError('An error occurred while saving your information. Please try again.');
            
            // Reset button
            const submitBtn = this.form.querySelector('button[type="submit"]');
            submitBtn.innerHTML = '<i class="fas fa-arrow-right me-2"></i>Get Started';
            submitBtn.disabled = false;
        }
    }
}

// Initialize landing page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LandingPage();
});