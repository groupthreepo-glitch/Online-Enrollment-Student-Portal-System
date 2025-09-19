// Enhanced profile.js with better error handling and debugging

class ProfileManager {
    constructor() {
        this.currentUser = null;
        this.baseURL = window.location.origin; // Automatically detect base URL
        this.init();
    }

    async init() {
    await this.getCurrentUser();
    this.setupEventListeners();
    
    // ADDED: Fix Student ID field structure
    this.fixStudentIdField();
    // ADD this line to your init() method right after this.clearInvalidStudentId();
    this.fixStudentIdPlaceholder();
    // ADDED: Clear any invalid Student ID values
    this.clearInvalidStudentId();
    // Initialize sidebar if we're not on the profile page
    if (!document.getElementById('profile-form')) {
        await this.initializeSidebar();
    } else {
        // If we're on the profile page, load profile data normally
        await this.loadProfileData();
    }
}

    // Add this method to ProfileManager class
getAuthToken() {
    // Try multiple storage methods to be more flexible
    return sessionStorage.getItem('authToken') || 
           localStorage.getItem('authToken') || 
           'mock-token-for-testing'; // Fallback for development
}

// Update the getCurrentUser method
async getCurrentUser() {
    try {
        // Get user data from sessionStorage to match authCheck.js
        const userData = sessionStorage.getItem('userData');
        if (userData) {
            this.currentUser = JSON.parse(userData);
            console.log('Current user from session:', this.currentUser);
        } else {
            // Fallback to window.currentUser set by authCheck.js
            this.currentUser = window.currentUser || { id: 1, username: 'student' };
            console.log('Using fallback user:', this.currentUser);
        }
    } catch (error) {
        console.error('Error getting current user:', error);
        this.currentUser = { id: 1, username: 'student' };
    }
}

    

    setupEventListeners() {
        // Profile form submission
        const profileForm = document.getElementById('profile-form');
        if (profileForm) {
            profileForm.addEventListener('submit', this.handleFormSubmit.bind(this));
        }

        // Avatar upload in profile form
        const avatarInput = document.getElementById('avatar-file-input');
        if (avatarInput) {
            avatarInput.addEventListener('change', this.handleAvatarUpload.bind(this));
        }

        // Reset button
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', this.resetForm.bind(this));
        }

        // Auto-update display name from first and last name
        const firstNameInput = document.getElementById('firstName');
        const lastNameInput = document.getElementById('lastName');
        const displayNameInput = document.getElementById('displayName');

        if (firstNameInput && lastNameInput && displayNameInput) {
            const updateDisplayName = () => {
                const firstName = firstNameInput.value.trim();
                const lastName = lastNameInput.value.trim();
                if (firstName && lastName && !displayNameInput.value) {
                    displayNameInput.value = `${firstName} ${lastName}`;
                }
            };

            firstNameInput.addEventListener('blur', updateDisplayName);
            lastNameInput.addEventListener('blur', updateDisplayName);
        }
    }

    async loadProfileData() {
    try {
        const token = this.getAuthToken();
        if (!token) {
            console.log('⚠️ No auth token found, user needs to log in');
            window.location.href = '/login.html';
            return;
        }

        console.log('Loading profile data from:', `${this.baseURL}/api/profile/get`);
        
        const response = await fetch(`${this.baseURL}/api/profile/get`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                console.log('⚠️ Authentication failed, redirecting to login');
                localStorage.removeItem('authToken');
                window.location.href = '/login.html';
                return;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        console.log('📊 ENHANCED Profile data response analysis:', {
            success: result.success,
            hasData: !!result.data,
            dataKeys: result.data ? Object.keys(result.data) : [],
            studentIdInData: result.data ? result.data.student_id : 'NO DATA',
            userIdInData: result.data ? result.data.id : 'NO DATA'
        });

        if (result.success) {
            if (result.data) {
                // CRITICAL: Log what we're about to populate
                console.log('🔧 About to populate form with:', result.data);
                
                await this.populateForm(result.data);
                this.updateAvatarDisplay(result.data.avatar_url);
                this.updateSidebarInfo(result.data);
            } else {
                console.log('No profile data found - this is normal for new users');
            }
        } else {
            console.warn('Failed to load profile data:', result.message);
        }
    } catch (error) {
        console.error('Error loading profile data:', error);
        if (error.message.includes('401')) {
            window.location.href = '/login.html';
        }
    }
}


async handleFormSubmit(event) {
    event.preventDefault();
    
    const token = this.getAuthToken();
    if (!token) {
        this.showErrorMessage('Authentication required. Please log in.');
        return;
    }
    
    const saveBtn = document.getElementById('saveBtn');
    const originalText = saveBtn.textContent;
    
    try {
        // Show loading state
        saveBtn.classList.add('loading');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        const formData = this.getFormData();
        
        // Validate required fields
        if (!this.validateForm(formData)) {
            return;
        }

        console.log('Sending profile data:', formData);

        const response = await fetch(`${this.baseURL}/api/profile/save`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('authToken');
                window.location.href = '/login.html';
                return;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Server response:', result);

        if (result.success) {
            this.showSuccessMessage('Profile updated successfully!');
            
            // Update sidebar display if data is available
            if (result.data) {
                this.updateSidebarInfo(result.data);
            }
        } else {
            throw new Error(result.message || 'Failed to save profile');
        }

    } catch (error) {
        console.error('Error saving profile:', error);
        this.showErrorMessage(error.message || 'Failed to save profile. Please try again.');
    } finally {
        // Reset button state
        saveBtn.classList.remove('loading');
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}

async handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const token = this.getAuthToken();
    if (!token) {
        this.showErrorMessage('Authentication required. Please log in.');
        return;
    }

    console.log('🔄 Avatar upload started:', {
        name: file.name,
        size: file.size,
        type: file.type
    });

    if (!this.validateImageFile(file)) {
        return;
    }

    // Show loading state
    const uploadBtn = event.target.closest('.avatar-upload-btn');
    if (uploadBtn) {
        uploadBtn.classList.add('uploading');
    }

    try {
        const formData = new FormData();
        formData.append('avatar', file);

        console.log('📤 Uploading to:', `${this.baseURL}/api/profile/upload-avatar`);

        const response = await fetch(`${this.baseURL}/api/profile/upload-avatar`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        console.log('📨 Upload response:', {
            status: response.status,
            statusText: response.statusText
        });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('authToken');
                window.location.href = '/login.html';
                return;
            }
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (parseError) {
                // Use default error message
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log('✅ Avatar upload successful:', result);

        if (result.success) {
            // Update avatar display with new URL
            this.updateAvatarDisplay(result.avatarUrl);
            this.showSuccessMessage('Avatar updated successfully!');
        } else {
            throw new Error(result.message || 'Failed to upload avatar');
        }

    } catch (error) {
        console.error('❌ Avatar upload error:', error);
        this.showErrorMessage(error.message || 'Failed to upload avatar. Please try again.');
        
        // Reset file input
        event.target.value = '';
    } finally {
        // Remove loading state
        if (uploadBtn) {
            uploadBtn.classList.remove('uploading');
        }
    }
}

    updateAvatarDisplay(avatarUrl) {
    console.log('Updating avatar display with:', avatarUrl);
    
    // Update profile form avatar
    const profileAvatar = document.getElementById('preview-avatar');
    if (profileAvatar) {
        // Store the existing input to preserve event listeners
        const existingInput = profileAvatar.querySelector('#avatar-file-input');
        
        if (avatarUrl) {
            const fullAvatarUrl = avatarUrl.startsWith('http') ? avatarUrl : `${this.baseURL}${avatarUrl}`;
            profileAvatar.style.backgroundImage = `url('${fullAvatarUrl}')`;
            profileAvatar.style.backgroundSize = 'cover';
            profileAvatar.style.backgroundPosition = 'center';
            
            // FIXED: Only update innerHTML if there's no existing input, or recreate properly
            if (!existingInput) {
                profileAvatar.innerHTML = '<div class="avatar-upload-btn"><i class="fas fa-camera"></i><input type="file" id="avatar-file-input" accept="image/*"></div>';
                // Re-attach event listener to new input
                const newInput = profileAvatar.querySelector('#avatar-file-input');
                if (newInput) {
                    newInput.addEventListener('change', this.handleAvatarUpload.bind(this));
                }
            }
        } else {
            profileAvatar.style.backgroundImage = '';
            if (!existingInput) {
                profileAvatar.innerHTML = '<i class="fas fa-user"></i><div class="avatar-upload-btn"><i class="fas fa-camera"></i><input type="file" id="avatar-file-input" accept="image/*"></div>';
                // Re-attach event listener
                const newInput = profileAvatar.querySelector('#avatar-file-input');
                if (newInput) {
                    newInput.addEventListener('change', this.handleAvatarUpload.bind(this));
                }
            }
        }
    }

    // Update sidebar avatar if it exists
    const sidebarAvatar = document.querySelector('.sidebar-user-avatar');
    if (sidebarAvatar) {
        if (avatarUrl) {
            const fullAvatarUrl = avatarUrl.startsWith('http') ? avatarUrl : `${this.baseURL}${avatarUrl}`;
            sidebarAvatar.style.backgroundImage = `url('${fullAvatarUrl}')`;
            sidebarAvatar.style.backgroundSize = 'cover';
            sidebarAvatar.style.backgroundPosition = 'center';
            sidebarAvatar.innerHTML = '';
        } else {
            sidebarAvatar.style.backgroundImage = '';
            sidebarAvatar.innerHTML = '<i class="fas fa-user"></i>';
        }
    }
}

    updateSidebarInfo(profileData) {
    console.log('Updating sidebar with profile data:', profileData);
    
    // Update sidebar user name
    const sidebarUserName = document.querySelector('.sidebar-user-name');
    if (sidebarUserName) {
        if (profileData.display_name) {
            sidebarUserName.textContent = profileData.display_name;
        } else if (profileData.first_name && profileData.last_name) {
            sidebarUserName.textContent = `${profileData.first_name} ${profileData.last_name}`;
        }
    }

    // Update sidebar course info with both major and year level
    const sidebarUserInfo = document.querySelector('.sidebar-user-info');
    if (sidebarUserInfo) {
        let courseInfo = '';
if (profileData.major && profileData.year_level && profileData.student_type) {
    const formattedMajor = this.formatMajor(profileData.major);
    const formattedYear = this.formatYearLevel(profileData.year_level);
    const formattedType = this.formatStudentType(profileData.student_type);
    courseInfo = `${formattedMajor} - ${formattedYear} (${formattedType})`;
} else if (profileData.major && profileData.year_level) {
    const formattedMajor = this.formatMajor(profileData.major);
    const formattedYear = this.formatYearLevel(profileData.year_level);
    courseInfo = `${formattedMajor} - ${formattedYear}`;
} else if (profileData.major) {
    courseInfo = this.formatMajor(profileData.major);
} else {
    courseInfo = 'Course Info';
}
        sidebarUserInfo.textContent = courseInfo;
    }
}

    // Initialize sidebar on page load - ADD THIS METHOD
async initializeSidebar() {
    try {
        console.log('🔄 Initializing sidebar display...');
        
        // Load and display current profile data in sidebar
        await this.loadProfileData();
        
        // Set up user name from session if available
        if (this.currentUser && this.currentUser.username) {
            const sidebarUserName = document.querySelector('.sidebar-user-name');
            if (sidebarUserName && !sidebarUserName.textContent.includes(this.currentUser.username)) {
                sidebarUserName.textContent = this.currentUser.username;
            }
        }
        
        console.log('✅ Sidebar initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing sidebar:', error);
    }
}

    validateImageFile(file) {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        console.log('Validating file:', {
            name: file.name,
            type: file.type,
            size: file.size
        });

        if (!validTypes.includes(file.type)) {
            this.showErrorMessage('Please select a valid image file (JPEG, PNG, GIF, or WebP).');
            return false;
        }

        if (file.size > maxSize) {
            this.showErrorMessage('Image file must be less than 5MB.');
            return false;
        }

        return true;
    }

    getFormData() {
    console.log('🔧 Getting form data - enhanced Student ID handling...');
    
    // Direct DOM queries for reliability
    const firstName = document.getElementById('firstName')?.value?.trim() || '';
    const lastName = document.getElementById('lastName')?.value?.trim() || '';
    const displayName = document.getElementById('displayName')?.value?.trim() || '';
    const email = document.getElementById('email')?.value?.trim() || '';
    const phone = document.getElementById('phone')?.value?.trim() || '';
    const dateOfBirth = document.getElementById('dateOfBirth')?.value?.trim() || null;
    const homeAddress = document.getElementById('homeAddress')?.value?.trim() || '';
    const city = document.getElementById('city')?.value?.trim() || '';
    const postalCode = document.getElementById('postalCode')?.value?.trim() || '';
    const province = document.getElementById('province')?.value?.trim() || '';
    const country = document.getElementById('country')?.value?.trim() || '';
    
    // ENHANCED Student ID handling with N/A support
    const studentIdElement = document.getElementById('studentId');
    let studentId = '';
    
    if (studentIdElement) {
        console.log('🔍 ENHANCED Student ID extraction:', {
            tagName: studentIdElement.tagName,
            value: studentIdElement.value,
            textContent: studentIdElement.textContent,
            innerText: studentIdElement.innerText
        });
        
        // Get the raw value
        studentId = studentIdElement.value?.trim() || '';
        
        // Handle N/A cases - normalize to uppercase for comparison
        const upperStudentId = studentId.toUpperCase();
        if (upperStudentId === 'N/A' || upperStudentId === 'NA') {
            studentId = 'N/A'; // Standardize the format
            console.log('🆔 Freshman N/A Student ID detected and standardized:', studentId);
        }
        
        // Clear invalid values (but keep N/A)
        if (studentId && studentId !== 'N/A' && (studentId === '35' || studentId === '34' || studentId.length < 4)) {
            console.log('⚠️ Invalid student ID detected, clearing:', studentId);
            studentId = '';
        }
    }
    
    const studentType = document.getElementById('studentType')?.value?.trim() || '';
    const major = document.getElementById('major')?.value?.trim() || '';
    const yearLevel = document.getElementById('yearLevel')?.value?.trim() || '';
    
    const formData = {
        firstName,
        lastName,
        displayName,
        email,
        phone,
        dateOfBirth,
        homeAddress,
        city,
        postalCode,
        province,
        country,
        studentId,
        studentType,
        major,
        yearLevel
    };
    
    console.log('📋 ENHANCED form data:', formData);
    console.log('🔍 Student ID specifically:', {
        value: studentId,
        length: studentId.length,
        isValid: studentId.length > 0,
        isNA: studentId === 'N/A',
        source: 'enhanced extraction with N/A support'
    });
    
    return formData;
}

// ADD this new method to force sync the Student ID field value:

forceStudentIdSync() {
    console.log('🔧 Force syncing Student ID field...');
    
    const studentIdElement = document.getElementById('studentId');
    if (!studentIdElement) {
        console.log('❌ Student ID element not found');
        return;
    }
    
    // If textContent has a value but value attribute doesn't, sync them
    const textValue = studentIdElement.textContent?.trim();
    const inputValue = studentIdElement.value?.trim();
    
    console.log('🔍 Student ID sync check:', {
        textContent: textValue,
        inputValue: inputValue,
        needsSync: textValue && !inputValue
    });
    
    if (textValue && !inputValue && textValue !== '35' && textValue !== '34') {
        console.log('🔧 Syncing textContent to value:', textValue);
        studentIdElement.value = textValue;
        studentIdElement.setAttribute('value', textValue);
        
        // Trigger input event to ensure proper handling
        const event = new Event('input', { bubbles: true });
        studentIdElement.dispatchEvent(event);
    }
}



// ADD these helper methods to your ProfileManager class:
getFieldValue(fieldId) {
    const element = document.getElementById(fieldId);
    if (!element) {
        console.log(`❌ Element not found: ${fieldId}`);
        return '';
    }
    
    console.log(`🔍 Getting value for ${fieldId}:`, {
        tagName: element.tagName,
        type: element.type,
        value: element.value,
        textContent: element.textContent?.trim()?.substring(0, 50) + '...'
    });
    
    // SIMPLIFIED: Just get the current value directly
    let value = element.value || '';
    
    // Only clear if it's obviously placeholder text
    if (value && (value.startsWith('Enter') || value.startsWith('Select') || value === 'default')) {
        value = '';
    }
    
    console.log(`✅ Final value for ${fieldId}:`, value);
    return value.trim();
}

// Add this method to fix Student ID field if it's not an input
fixStudentIdField() {
    console.log('🔧 Checking and fixing Student ID field structure...');
    
    const studentIdEl = document.getElementById('studentId');
    if (!studentIdEl) {
        console.log('❌ Student ID element not found');
        return;
    }
    
    console.log('🔍 Current Student ID element:', {
        tagName: studentIdEl.tagName,
        innerHTML: studentIdEl.innerHTML.substring(0, 100),
        value: studentIdEl.value,
        textContent: studentIdEl.textContent?.trim()
    });
    
    // If it's a DIV or has user ID, convert it to proper INPUT
    if (studentIdEl.tagName === 'DIV') {
        console.log('🔧 Converting DIV to INPUT field...');
        
        // Get current value from DIV
        const currentValue = studentIdEl.textContent?.trim() || '';
        
        // Create new input element
        const newInput = document.createElement('input');
        newInput.type = 'text';
        newInput.id = 'studentId';
        newInput.name = 'studentId';
        newInput.className = studentIdEl.className;
        newInput.placeholder = 'Enter Student ID (e.g., 0509-1022-2298)';
        newInput.required = true;
        
        // FIXED: Only set value if it looks like a valid student ID, not user ID
        if (currentValue && 
            currentValue.length >= 10 && 
            currentValue !== '34' && 
            /^\d{4}-\d{4}-\d{4}$/.test(currentValue)) {
            newInput.value = currentValue;
        } else {
            newInput.value = ''; // Clear invalid values including user ID
        }
        
        // Replace DIV with INPUT
        studentIdEl.parentNode.replaceChild(newInput, studentIdEl);
        
        console.log('✅ Student ID field converted to INPUT');
    } else if (studentIdEl.tagName === 'INPUT') {
        // If it's already an input but has user ID value, clear it
        const currentValue = studentIdEl.value?.trim();
        if (currentValue === '34' || // Clear user ID
            currentValue === '' ||
            (currentValue && currentValue.length < 10) ||
            (currentValue && !/^\d{4}-\d{4}-\d{4}$/.test(currentValue))) {
            console.log('🔧 Clearing invalid student ID value (including user ID):', currentValue);
            studentIdEl.value = '';
            studentIdEl.removeAttribute('value');
            studentIdEl.defaultValue = '';
            studentIdEl.placeholder = 'Enter Student ID (e.g., 0509-1022-2298)';
        }
    }
}

// ADD this method to ProfileManager class
fixStudentIdPlaceholder() {
    const studentIdField = document.getElementById('studentId');
    if (studentIdField) {
        // Set proper placeholder for N/A support
        studentIdField.placeholder = 'Enter Student ID (e.g., 0509-1022-2298) or "N/A" for new students';
        
        // Add event listener for N/A formatting
        studentIdField.addEventListener('input', (e) => {
            const value = e.target.value.trim().toUpperCase();
            if (value === 'N/A' || value === 'NA') {
                e.target.value = 'N/A';
                e.target.style.borderColor = '#f39c12';
                e.target.style.backgroundColor = '#fef9e7';
            } else {
                e.target.style.borderColor = '';
                e.target.style.backgroundColor = '';
            }
        });
    }
}

getSelectValue(fieldId) {
    const element = document.getElementById(fieldId);
    if (!element || element.tagName !== 'SELECT') return '';
    
    const selectedOption = element.options[element.selectedIndex];
    return selectedOption?.value || '';
}

getStudentIdValue() {
    console.log('🔍 Getting Student ID value...');
    
    const studentIdEl = document.getElementById('studentId');
    if (!studentIdEl) {
        console.log('❌ Student ID element not found');
        return '';
    }
    
    let studentIdValue = '';
    
    // Get value with multiple fallbacks
    if (studentIdEl.tagName === 'INPUT') {
        studentIdValue = studentIdEl.value;
    } else if (studentIdEl.tagName === 'SELECT') {
        studentIdValue = studentIdEl.value;
    } else {
        // Handle DIV or other elements
        const inputInside = studentIdEl.querySelector('input, select');
        if (inputInside) {
            studentIdValue = inputInside.value;
        } else {
            studentIdValue = studentIdEl.textContent || studentIdEl.innerText || '';
        }
    }
    
    // Clean the value
    studentIdValue = String(studentIdValue || '').trim();
    
    // FIXED: Only reject if it's clearly invalid, don't reject valid student IDs
    if (studentIdValue === 'Enter Student ID (e.g., 0509-1022-2298)' || 
        studentIdValue === 'default' || 
        studentIdValue === '34' || // Remove user ID
        studentIdValue === '') {
        studentIdValue = '';
    }
    
    // REMOVED the overly strict validation that was rejecting valid IDs
    
    console.log('🔍 Final Student ID value:', {
        rawValue: studentIdValue,
        elementType: studentIdEl.tagName,
        isValid: studentIdValue.length > 0,
        length: studentIdValue.length,
        isNotUserId: studentIdValue !== '34'
    });
    
    return studentIdValue;
}

fixStudentIdValueFromContent() {
    console.log('🔧 Attempting to fix Student ID from textContent...');
    
    const studentIdField = document.getElementById('studentId');
    if (!studentIdField) return;
    
    const currentValue = studentIdField.value?.trim() || '';
    const currentText = studentIdField.textContent?.trim() || '';
    
    console.log('🔍 Student ID state:', {
        value: currentValue,
        textContent: currentText,
        valueEmpty: !currentValue,
        hasTextContent: !!currentText
    });
    
    // If value is empty but textContent has valid student ID
    if (!currentValue && currentText && 
        currentText !== '35' && 
        currentText !== '34' && 
        currentText.length >= 4) {
        
        console.log('🔧 Copying textContent to value:', currentText);
        
        // Set value from textContent
        studentIdField.value = currentText;
        studentIdField.setAttribute('value', currentText);
        studentIdField.defaultValue = currentText;
        
        // Clear textContent to avoid confusion
        studentIdField.textContent = '';
        
        // Trigger change event
        const changeEvent = new Event('change', { bubbles: true });
        studentIdField.dispatchEvent(changeEvent);
        
        console.log('✅ Student ID fixed from textContent');
        return currentText;
    }
    
    return currentValue;
}

// ADD this new method to ProfileManager class (after fixStudentIdField method)
clearInvalidStudentId() {
    console.log('🧹 Clearing invalid Student ID values...');
    
    const studentIdField = document.getElementById('studentId');
    if (studentIdField) {
        const currentValue = studentIdField.value?.trim();
        
        // FIXED: Only clear if it's actually invalid - don't clear valid student IDs
        if (currentValue === '34' || 
            currentValue === this.currentUser?.id?.toString() ||
            currentValue === 'Enter Student ID (e.g., 0509-1022-2298)' ||
            currentValue === 'default' ||
            currentValue === '') {
            
            console.log('🧹 Clearing invalid Student ID:', currentValue);
            studentIdField.value = '';
            studentIdField.removeAttribute('value');
            studentIdField.defaultValue = '';
            studentIdField.placeholder = 'Enter your Student ID (e.g., 0509-1022-2298)';
        } else {
            console.log('✅ Student ID appears valid, keeping:', currentValue);
        }
    }
}


// Add this method right before validateForm()
debugFormElements() {
    console.log('🔍 DEBUGGING ALL FORM ELEMENTS:');
    
    const criticalFields = ['firstName', 'lastName', 'displayName', 'email', 'studentId', 'studentType', 'major', 'yearLevel'];
    
    criticalFields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            console.log(`📋 ${fieldId}:`, {
                exists: true,
                tagName: element.tagName,
                type: element.type,
                value: element.value,
                textContent: element.textContent?.trim(),
                innerHTML: element.innerHTML?.substring(0, 100),
                attributes: {
                    name: element.getAttribute('name'),
                    'data-field': element.getAttribute('data-field'),
                    placeholder: element.getAttribute('placeholder')
                }
            });
        } else {
            console.log(`❌ ${fieldId}: NOT FOUND`);
        }
    });
    
    // Also check for alternative selectors
    console.log('🔍 Alternative selectors:');
    const altStudentId = document.querySelector('input[name="studentId"], [data-field="studentId"]');
    if (altStudentId) {
        console.log('📋 Alternative Student ID found:', altStudentId.value);
    }
}

    validateForm(formData) {
    console.log('🔍 VALIDATING FORM DATA:', formData);
    
    const requiredFields = {
        firstName: 'First Name',
        lastName: 'Last Name', 
        displayName: 'Display Name',
        email: 'Email',
        studentId: 'Student ID',
        studentType: 'Student Type',
        major: 'Major',
        yearLevel: 'Year Level'
    };
    
    const missingFields = [];

    Object.entries(requiredFields).forEach(([field, displayName]) => {
        const value = formData[field];
        const isEmpty = !value || value.trim() === '';
        
        console.log(`🔍 ${displayName} (${field}):`, { 
            value: value, 
            isEmpty: isEmpty
        });
        
        if (isEmpty) {
            missingFields.push(displayName);
            // Highlight the field
            const fieldElement = document.getElementById(field);
            if (fieldElement) {
                fieldElement.style.borderColor = '#e74c3c';
                fieldElement.focus();
            }
        } else {
            // Remove error styling
            const fieldElement = document.getElementById(field);
            if (fieldElement) {
                fieldElement.style.borderColor = '';
            }
        }
    });

    if (missingFields.length > 0) {
        console.log('❌ VALIDATION FAILED - Missing fields:', missingFields);
        this.showErrorMessage(`Please fill in all required fields: ${missingFields.join(', ')}`);
        return false;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
        this.showErrorMessage('Please enter a valid email address.');
        const emailField = document.getElementById('email');
        if (emailField) {
            emailField.style.borderColor = '#e74c3c';
            emailField.focus();
        }
        return false;
    }

    // UPDATED: Student ID validation - Allow N/A for freshmen
    const studentIdValue = formData.studentId.trim();
    const upperStudentId = studentIdValue.toUpperCase();
    
    if (upperStudentId === 'N/A' || upperStudentId === 'NA') {
        // Allow N/A for freshmen - show success message
        console.log('✅ N/A Student ID accepted for freshman');
        this.showInfoMessage('N/A accepted - Please contact the Registrar to get your official Student ID assigned.');
        return true;
    } else if (studentIdValue.length < 6) {
        this.showErrorMessage('Student ID must be at least 6 characters long, or enter "N/A" if you\'re a new student.');
        const studentIdField = document.getElementById('studentId');
        if (studentIdField) {
            studentIdField.style.borderColor = '#e74c3c';
            studentIdField.focus();
        }
        return false;
    }

    console.log('✅ VALIDATION PASSED');
    return true;
}


    getFieldDisplayName(field) {
        const displayNames = {
            'firstName': 'First Name',
            'lastName': 'Last Name',
            'displayName': 'Display Name',
            'email': 'Email',
            'studentId': 'Student ID',
            'studentType': 'Student Type',
            'major': 'Major',
            'yearLevel': 'Year Level'
        };
        return displayNames[field] || field;
    }

    

    async populateForm(data) {
    console.log('🔧 FIXED populateForm - Populating form with data:', data);
    
    // CRITICAL: Check what data we're receiving
    console.log('📊 Data structure analysis:', {
        hasStudentId: 'student_id' in data,
        studentIdValue: data.student_id,
        hasId: 'id' in data,
        idValue: data.id,
        allKeys: Object.keys(data)
    });
    
    const fieldMappings = {
        'firstName': 'first_name',
        'lastName': 'last_name', 
        'displayName': 'display_name',
        'email': 'email',
        'phone': 'phone',
        'dateOfBirth': 'date_of_birth',
        'homeAddress': 'home_address',
        'city': 'city',
        'postalCode': 'postal_code',
        'province': 'province',
        'country': 'country',
        'studentId': 'student_id', // Maps to student_id column
        'studentType': 'student_type',
        'major': 'major',
        'yearLevel': 'year_level'
    };

    Object.entries(fieldMappings).forEach(([htmlField, dbField]) => {
        const element = document.getElementById(htmlField);
        if (element && data[dbField] !== undefined && data[dbField] !== null) {
            // SPECIAL HANDLING for Student ID - FIXED LOGIC
            if (htmlField === 'studentId') {
    const studentIdValue = data.student_id;
    console.log(`🔧 CRITICAL - Setting Student ID field:`, {
        dbField: dbField,
        dbValue: data[dbField],
        studentIdFromDB: data.student_id,
        userIdFromDB: data.id,
        finalValue: studentIdValue
    });
    
    // UPDATED: Handle N/A values and valid student IDs
    if (studentIdValue && 
        (String(studentIdValue).toUpperCase() === 'N/A' || // Allow N/A
         (String(studentIdValue).length >= 10 && // Must be at least 10 characters
          String(studentIdValue) !== String(data.id) && // Must NOT be the user ID
          /^\d{4}-\d{4}-\d{4}$/.test(String(studentIdValue))))) { // Must match format XXXX-XXXX-XXXX
        
        element.value = studentIdValue;
        element.setAttribute('value', studentIdValue);
        element.defaultValue = studentIdValue;
        console.log('✅ Student ID field populated:', studentIdValue);
        
        // Add visual indicator for N/A status
        if (String(studentIdValue).toUpperCase() === 'N/A') {
            element.style.borderColor = '#f39c12';
            element.style.backgroundColor = '#fef9e7';
            console.log('🆔 N/A Student ID - Freshman status indicated');
        }
    } else {
        // CRITICAL FIX: Always leave empty if not a valid student ID format
        console.log('⚠️ Invalid student ID detected - clearing field for manual entry:', studentIdValue);
        element.value = '';
        element.removeAttribute('value');
        element.defaultValue = '';
        element.placeholder = 'Enter your Student ID (e.g., 0509-1022-2298) or N/A for new students';
    }
} else {
                // Regular field population
                element.value = data[dbField];
                console.log(`✅ Set ${htmlField} to:`, data[dbField]);
            }
        } else if (htmlField === 'studentId') {
            // If no student_id in data, leave field empty for user to enter
            console.log('⚠️ No valid student_id found in database data - field will be empty');
            if (element) {
                element.value = '';
                element.removeAttribute('value');
                element.defaultValue = '';
                element.placeholder = 'Enter your Student ID (e.g., 0509-1022-2298)';
            }
        }
    });
}




    resetForm() {
        console.log('Resetting form...');
        
        const form = document.getElementById('profile-form');
        if (form) {
            form.reset();
            // Reset avatar display
            this.updateAvatarDisplay(null);
            this.hideMessages();
        }
    }


    // Add this new method to validate student ID format
validateStudentId(studentId) {
    console.log('🔍 Validating Student ID:', studentId);
    
    if (!studentId || studentId.trim() === '') {
        return { valid: false, message: 'Student ID is required' };
    }
    
    const trimmedId = studentId.trim();
    
    // Check that it's not the user ID
    if (trimmedId === '34' || trimmedId.length < 4) {
        return { valid: false, message: 'Please enter your actual Student ID, not user ID' };
    }
    
    // FIXED: More flexible validation - accept various formats as long as it's reasonable
    if (trimmedId.length < 8) {
        return { valid: false, message: 'Student ID must be at least 8 characters long' };
    }
    
    // Accept common Student ID formats: XXXX-XXXX-XXXX, XXXXXXXXXX, XXXX-XXXX, etc.
    const hasValidFormat = /^[\d-]+$/.test(trimmedId) && trimmedId.length >= 8;
    
    if (!hasValidFormat) {
        return { valid: false, message: 'Student ID should contain only numbers and dashes' };
    }
    
    return { valid: true };
}



    // Add this new method to the ProfileManager class
formatStudentType(studentType) {
    const typeMap = {
        'regular': 'Regular',
        'irregular': 'Irregular'
    };
    return typeMap[studentType] || studentType;
}

    formatMajor(major) {
        const majorMap = {
            'computer_science': 'BSCS',
            'information_technology': 'BSIT',
            'information_system': 'BSIS',
            'business_administration': 'BSBA',
        };
        return majorMap[major] || major;
    }

    formatYearLevel(yearLevel) {
    const yearMap = {
        '1st_year': '1st Year',
        '2nd_year': '2nd Year', 
        '3rd_year': '3rd Year',
        '4th_year': '4th Year'
        
    };
    return yearMap[yearLevel] || yearLevel;
}

    showSuccessMessage(message) {
        console.log('Success:', message);
        
        this.hideMessages(); // Hide any existing messages first
        
        let successDiv = document.getElementById('success-message');
        if (!successDiv) {
            // Create success message div if it doesn't exist
            successDiv = document.createElement('div');
            successDiv.id = 'success-message';
            successDiv.className = 'success-message';
            successDiv.innerHTML = '<i class="fas fa-check-circle"></i><span></span>';
            
            const form = document.getElementById('profile-form');
            if (form) {
                form.insertBefore(successDiv, form.firstChild);
            }
        }

        successDiv.style.display = 'flex';
        successDiv.querySelector('span').textContent = message;
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (successDiv) {
                successDiv.style.display = 'none';
            }
        }, 5000);
    }

    showErrorMessage(message) {
        console.error('Error:', message);
        
        this.hideMessages(); // Hide any existing messages first
        
        let errorDiv = document.getElementById('error-message');
        if (!errorDiv) {
            // Create error message div if it doesn't exist
            errorDiv = document.createElement('div');
            errorDiv.id = 'error-message';
            errorDiv.className = 'error-message';
            errorDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i><span></span>';
            
            const form = document.getElementById('profile-form');
            if (form) {
                form.insertBefore(errorDiv, form.firstChild);
            }
        }

        errorDiv.style.display = 'flex';
        errorDiv.querySelector('span').textContent = message;
        
        // Auto-hide after 7 seconds
        setTimeout(() => {
            if (errorDiv) {
                errorDiv.style.display = 'none';
            }
        }, 7000);
    }

    showInfoMessage(message) {
    console.log('Info:', message);
    
    this.hideMessages(); // Hide any existing messages first
    
    let infoDiv = document.getElementById('info-message');
    if (!infoDiv) {
        // Create info message div if it doesn't exist
        infoDiv = document.createElement('div');
        infoDiv.id = 'info-message';
        infoDiv.className = 'info-message';
        infoDiv.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 16px;
            background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
            color: white;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #0984e3;
            font-weight: 500;
        `;
        infoDiv.innerHTML = '<i class="fas fa-info-circle"></i><span></span>';
        
        const form = document.getElementById('profile-form');
        if (form) {
            form.insertBefore(infoDiv, form.firstChild);
        }
    }

    infoDiv.style.display = 'flex';
    infoDiv.querySelector('span').textContent = message;
    
    // Auto-hide after 6 seconds
    setTimeout(() => {
        if (infoDiv) {
            infoDiv.style.display = 'none';
        }
    }, 6000);
}

    hideMessages() {
    const successDiv = document.getElementById('success-message');
    const errorDiv = document.getElementById('error-message');
    const infoDiv = document.getElementById('info-message'); // ADD THIS LINE
    
    if (successDiv) successDiv.style.display = 'none';
    if (errorDiv) errorDiv.style.display = 'none';
    if (infoDiv) infoDiv.style.display = 'none'; // ADD THIS LINE
}




// ADD this method to ProfileManager class - Better session management
updateUserSession(profileData) {
    console.log('🔄 Updating user session with profile data:', profileData);
    
    try {
        // Update sessionStorage userData
        let userData = {};
        const existingUserData = sessionStorage.getItem('userData');
        if (existingUserData) {
            userData = JSON.parse(existingUserData);
        }
        
        // Update with new profile data
        userData.studentId = profileData.studentId || profileData.student_id;
        userData.student_id = profileData.studentId || profileData.student_id;
        userData.studentType = profileData.studentType || profileData.student_type;
        userData.firstName = profileData.firstName || profileData.first_name;
        userData.lastName = profileData.lastName || profileData.last_name;
        userData.displayName = profileData.displayName || profileData.display_name;
        userData.email = profileData.email;
        userData.major = profileData.major;
        userData.yearLevel = profileData.yearLevel || profileData.year_level;
        
        // Save back to sessionStorage
        sessionStorage.setItem('userData', JSON.stringify(userData));
        
        // Update window.currentUser if it exists
        if (window.currentUser) {
            Object.assign(window.currentUser, userData);
        } else {
            window.currentUser = userData;
        }
        
        // Store critical info in localStorage as backup
        if (userData.studentId) {
            localStorage.setItem('student_id', userData.studentId);
        }
        
        console.log('✅ User session updated:', userData);
        
    } catch (error) {
        console.error('❌ Error updating user session:', error);
    }
}

// ADD this method to ProfileManager class - Better student ID handling
async ensureStudentIdInDatabase() {
    try {
        console.log('🔗 Ensuring student ID is properly set in database...');
        
        const token = this.getAuthToken();
        if (!token) return;
        
        // Get current user data
        const userData = sessionStorage.getItem('userData');
        if (userData) {
            const user = JSON.parse(userData);
            
            // Make sure the database has the correct student_id reference
            const response = await fetch(`${this.baseURL}/api/profile/sync-student-id`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: user.id || this.currentUser?.id,
                    studentId: user.student_id || user.id
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ Student ID synchronized:', result);
            }
        }
    } catch (error) {
        console.error('❌ Error syncing student ID:', error);
    }
}

// Add this method to ProfileManager class
debugStudentIdField() {
    console.log('🔍 DEBUGGING STUDENT ID FIELD STATE:');
    
    const studentIdEl = document.getElementById('studentId');
    if (studentIdEl) {
        console.log('Element found:', {
            tagName: studentIdEl.tagName,
            type: studentIdEl.type,
            value: studentIdEl.value,
            valueLength: studentIdEl.value ? studentIdEl.value.length : 0,
            placeholder: studentIdEl.placeholder,
            required: studentIdEl.required,
            className: studentIdEl.className,
            innerHTML: studentIdEl.innerHTML.substring(0, 100)
        });
        
        // Force focus and check if value changes
        const currentValue = studentIdEl.value;
        studentIdEl.focus();
        studentIdEl.blur();
        const valueAfterFocus = studentIdEl.value;
        
        console.log('Value consistency check:', {
            beforeFocus: currentValue,
            afterFocus: valueAfterFocus,
            changed: currentValue !== valueAfterFocus
        });
    } else {
        console.log('❌ Student ID element not found!');
    }
}

// REPLACE the existing handleFormSubmit method with this updated version:
async handleFormSubmit(event) {
    event.preventDefault();
    
    const token = this.getAuthToken();
    if (!token) {
        this.showErrorMessage('Authentication required. Please log in.');
        return;
    }
    
    const saveBtn = document.getElementById('saveBtn');
    const originalText = saveBtn.textContent;
    
    try {
                // Show loading state
        saveBtn.classList.add('loading');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        // CRITICAL FIX: Add debugging and force DOM refresh
        console.log('🔍 Starting form data collection...');
        

// Force a small delay to ensure DOM is fully updated
await new Promise(resolve => setTimeout(resolve, 100));
        // Debug all form elements first
        this.debugFormElements();
        
        // Force a small delay to ensure DOM is fully updated
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Force all form fields to update their value attributes
        const allInputs = document.querySelectorAll('#profile-form input, #profile-form select, #profile-form textarea');
        allInputs.forEach(input => {
            if (input.value) {
                input.setAttribute('value', input.value);
            }
        });
        this.debugStudentIdField();
        const formData = this.getFormData();
        
        console.log('🔍 Form data collected:', formData);
        
        // EMERGENCY FIX: If Student ID is empty, try aggressive extraction
        if (!formData.studentId) {
            console.log('🚨 EMERGENCY: Student ID empty, trying aggressive extraction...');
            
            const studentIdInput = document.querySelector('#studentId');
            if (studentIdInput) {
                // Force sync from textContent if available
                const textValue = studentIdInput.textContent?.trim();
                
                console.log('🔍 Emergency extraction attempt:', {
                    value: studentIdInput.value,
                    textContent: textValue,
                    willUseText: textValue && textValue !== '35' && textValue !== '34' && textValue.length >= 6
                });
                
                // ONLY use textContent if it's a valid student ID format
                if (textValue && textValue !== '35' && textValue !== '34' && textValue.length >= 6) {
                    formData.studentId = textValue;
                    studentIdInput.value = textValue; // Update the field too
                    console.log('🚨 EMERGENCY FIX: Used textContent for Student ID:', textValue);
                } else if (studentIdInput.value?.trim()) {
                    formData.studentId = studentIdInput.value.trim();
                    console.log('🚨 EMERGENCY FIX: Found Student ID in value:', formData.studentId);
                } else {
                    // Prompt user to enter student ID manually
                    console.log('🚨 EMERGENCY: No valid Student ID found, prompting user...');
                    const userStudentId = prompt('Please enter your Student ID (format: XXXX-XXXX-XXXX):');
                    if (userStudentId && userStudentId.trim().length >= 6) {
                        formData.studentId = userStudentId.trim();
                        studentIdInput.value = userStudentId.trim();
                        console.log('🚨 EMERGENCY FIX: User provided Student ID:', formData.studentId);
                    }
                }
            }
        }
        
        console.log('🔍 FINAL form data before validation:', formData);
        
        // Validate required fields with detailed logging
        console.log('🔍 About to validate form data:', formData);
        const isValid = this.validateForm(formData);
        console.log('🔍 Validation result:', isValid);

        if (!isValid) {
            console.log('❌ Form validation failed, stopping submission');
            return; // Stop here if validation fails
        }

        console.log('Sending profile data:', formData);

        const response = await fetch(`${this.baseURL}/api/profile/save`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('authToken');
                window.location.href = '/login.html';
                return;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Server response:', result);

        if (result.success) {
            // Update user session with saved data
            this.updateUserSession(formData);
            
            // Ensure student ID is properly synchronized
            await this.ensureStudentIdInDatabase();
            
            this.showSuccessMessage('Profile updated successfully! You can now proceed with enrollment.');
            
            // Update sidebar display
            this.updateSidebarInfo(result.data || formData);
            
            // Auto-redirect to enrollment if they came from enrollment page
            setTimeout(() => {
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('redirect') === 'enrollment') {
                    console.log('🔄 Redirecting back to enrollment...');
                    window.location.href = '/StudentSide/studentdashboard.html#enrollment';
                }
            }, 2000);
            
        } else {
            throw new Error(result.message || 'Failed to save profile');
        }

    } catch (error) {
        console.error('Error saving profile:', error);
        this.showErrorMessage(error.message || 'Failed to save profile. Please try again.');
    } finally {
        // Reset button state
        saveBtn.classList.remove('loading');
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}


    // Debug method to test API endpoints
    async testAPI() {
        console.log('🧪 Testing Profile API...');
        
        try {
            const response = await fetch(`${this.baseURL}/api/profile/test`);
            const result = await response.json();
            console.log('API Test Result:', result);
            return result;
        } catch (error) {
            console.error('API Test Failed:', error);
            return null;
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing ProfileManager...');
    
    // Add some debug info
    console.log('Profile form found:', !!document.getElementById('profile-form'));
    console.log('Avatar input found:', !!document.getElementById('avatar-file-input'));
    console.log('Save button found:', !!document.getElementById('saveBtn'));
    console.log('Base URL:', window.location.origin);
    
    const profileManager = new ProfileManager();
    
    // Make profileManager available globally for debugging
    window.profileManager = profileManager;
    
    // Test API endpoint on load (for debugging)
    if (window.location.search.includes('debug=true')) {
        setTimeout(() => {
            profileManager.testAPI();
        }, 1000);
    }
});

// Export for potential use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProfileManager;
}
// Global ProfileManager for sidebar updates across all pages
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        // Initialize ProfileManager on all pages for sidebar functionality
        if (!window.profileManager) {
            window.profileManager = new ProfileManager();
        }
    });
}
