// REPLACE the entire enrollment JavaScript with this corrected version:

// Global variables
let currentStudent = null;
let availablePrograms = [];
let curriculumCache = {};
let isIrregularStudent = false;
let uploadedFiles = [];


// ADD this function at the top of enrollment.js (after the global variables)
// FIXED: Simplified storage functions to avoid browser compatibility issues
function setUserData(key, value) {
    try {
        // Store in memory as primary method (works in all environments)
        if (typeof window !== 'undefined') {
            if (!window.userDataCache) window.userDataCache = {};
            window.userDataCache[key] = value;
        }
        
        // Try browser storage as secondary
        try {
            sessionStorage.setItem(key, value);
        } catch (storageError) {
            console.warn('⚠️ Storage not available, using memory only');
        }
        
        console.log('✅ User data stored:', key);
    } catch (error) {
        console.warn('⚠️ Storage error:', error);
    }
}

function getUserData(key) {
    try {
        // Check memory cache first
        if (typeof window !== 'undefined' && window.userDataCache && window.userDataCache[key]) {
            return window.userDataCache[key];
        }
        
        // Try browser storage
        try {
            const value = sessionStorage.getItem(key);
            if (value) return value;
        } catch (storageError) {
            console.warn('⚠️ Storage not available');
        }
        
        return null;
    } catch (error) {
        console.warn('⚠️ Retrieval error:', error);
        return null;
    }
}




// Initialize on page load - FIXED VERSION
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    initializeFileUpload();
    // FIXED: Load student info first, which will then load programs
    loadStudentInfo();
    updateStatusTracker(1);
});

// ENHANCED: Modal-style profile completion notice
function showProfileCompletionNotice() {
    // Remove any existing notice first
    const existingNotice = document.querySelector('.profile-completion-modal');
    if (existingNotice) {
        existingNotice.remove();
    }
    
    // Hide enrollment form
    const enrollmentForm = document.getElementById('enrollmentForm');
    if (enrollmentForm) {
        enrollmentForm.style.display = 'none';
    }
    
    // Create modal backdrop
    const modalBackdrop = document.createElement('div');
    modalBackdrop.className = 'profile-completion-modal';
    modalBackdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: modalFadeIn 0.3s ease-out;
        backdrop-filter: blur(5px);
    `;
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'profile-completion-content';
    modalContent.style.cssText = `
        background: white;
        border-radius: 20px;
        padding: 40px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: modalSlideUp 0.4s ease-out;
        position: relative;
    `;
    
    modalContent.innerHTML = `
        <button class="modal-close-btn" style="
            position: absolute;
            top: 15px;
            right: 20px;
            background: none;
            border: none;
            font-size: 24px;
            color: #6c757d;
            cursor: pointer;
            padding: 5px;
            border-radius: 50%;
            width: 35px;
            height: 35px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
        " onmouseover="this.style.background='#f8f9fa'; this.style.color='#343a40';" onmouseout="this.style.background='none'; this.style.color='#6c757d';">
            <i class="fas fa-times"></i>
        </button>
        
        <div style="font-size: 80px; margin-bottom: 25px;">
            <i class="fas fa-user-graduate" style="color: #fd7e14;"></i>
        </div>
        
        <h2 style="margin: 0 0 15px 0; color: #343a40; font-size: 28px; font-weight: 700;">
            Complete Your Student Profile
        </h2>
        
        <p style="margin: 0 0 25px 0; font-size: 16px; line-height: 1.6; color: #6c757d;">
            To proceed with enrollment, please complete your profile with all the required information.
        </p>
        
        <div style="
            background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
            border: 2px solid #fd7e14;
            padding: 20px;
            border-radius: 15px;
            margin: 25px 0;
            text-align: left;
        ">
            <h4 style="margin: 0 0 15px 0; color: #fd7e14; display: flex; align-items: center;">
                <i class="fas fa-clipboard-list" style="margin-right: 10px;"></i>
                Required Information:
            </h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; color: #856404; font-size: 14px;">
                <div><i class="fas fa-check-circle" style="color: #28a745; margin-right: 8px;"></i>First & Last Name</div>
                <div><i class="fas fa-check-circle" style="color: #28a745; margin-right: 8px;"></i>Student ID Number</div>
                <div><i class="fas fa-check-circle" style="color: #28a745; margin-right: 8px;"></i>Email Address</div>
                <div><i class="fas fa-check-circle" style="color: #28a745; margin-right: 8px;"></i>Phone Number</div>
                <div><i class="fas fa-check-circle" style="color: #28a745; margin-right: 8px;"></i>Academic Program</div>
                <div><i class="fas fa-check-circle" style="color: #28a745; margin-right: 8px;"></i>Year Level</div>
            </div>
        </div>
        
        <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap; margin-top: 30px;">
            <button id="goToProfileBtn" class="btn btn-primary" style="
                display: inline-flex;
                align-items: center;
                padding: 18px 35px;
                background: linear-gradient(135deg, #fd7e14 0%, #e17055 100%);
                color: white;
                border: none;
                border-radius: 12px;
                font-weight: 700;
                font-size: 16px;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 6px 20px rgba(253, 126, 20, 0.4);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(253, 126, 20, 0.5)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 6px 20px rgba(253, 126, 20, 0.4)';">
                <i class="fas fa-user-edit" style="margin-right: 12px; font-size: 18px;"></i>
                Go to Profile
            </button>
            
            <button id="refreshPageBtn" class="btn btn-secondary" style="
                display: inline-flex;
                align-items: center;
                padding: 18px 30px;
                background: linear-gradient(135deg, #6c757d 0%, #545b62 100%);
                color: white;
                border: none;
                border-radius: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 16px;
                box-shadow: 0 4px 15px rgba(108, 117, 125, 0.3);
            " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(108, 117, 125, 0.4)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(108, 117, 125, 0.3)';">
                <i class="fas fa-sync-alt" style="margin-right: 10px;"></i>
                Refresh Page
            </button>
        </div>
        
        <div style="margin-top: 25px; font-size: 14px; color: #6c757d; display: flex; align-items: center; justify-content: center;">
            <i class="fas fa-shield-alt" style="margin-right: 8px; color: #28a745;"></i>
            Your information will be securely saved in our system
        </div>
    `;
    
    modalBackdrop.appendChild(modalContent);
    document.body.appendChild(modalBackdrop);
    
    // Add modal animations CSS if not already present
    if (!document.querySelector('#modal-animations')) {
        const animations = document.createElement('style');
        animations.id = 'modal-animations';
        animations.textContent = `
            @keyframes modalFadeIn {
                from {
                    opacity: 0;
                }
                to {
                    opacity: 1;
                }
            }
            
            @keyframes modalSlideUp {
                from {
                    opacity: 0;
                    transform: translateY(50px) scale(0.9);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
            
            .profile-completion-content::-webkit-scrollbar {
                width: 8px;
            }
            
            .profile-completion-content::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 10px;
            }
            
            .profile-completion-content::-webkit-scrollbar-thumb {
                background: #fd7e14;
                border-radius: 10px;
            }
            
            .profile-completion-content::-webkit-scrollbar-thumb:hover {
                background: #e17055;
            }
        `;
        document.head.appendChild(animations);
    }
    
    // Event listeners for modal interactions
    const closeBtn = modalContent.querySelector('.modal-close-btn');
    const goToProfileBtn = modalContent.querySelector('#goToProfileBtn');
    const refreshPageBtn = modalContent.querySelector('#refreshPageBtn');
    
    // Close modal function
    const closeModal = () => {
        modalBackdrop.style.animation = 'modalFadeIn 0.3s ease-out reverse';
        modalContent.style.animation = 'modalSlideUp 0.3s ease-out reverse';
        setTimeout(() => {
            if (modalBackdrop.parentElement) {
                modalBackdrop.remove();
            }
        }, 300);
    };
    
    // Event listeners
    closeBtn.addEventListener('click', closeModal);
    
    // Close when clicking backdrop
    modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) {
            closeModal();
        }
    });
    
    // REPLACE the goToProfileBtn event listener in showProfileCompletionNotice function

goToProfileBtn.addEventListener('click', () => {
    closeModal();
    
    // Method 1: Try direct navigation to profile section
    const profileLink = document.querySelector('a[href="#profile"], .sidebar a[href*="profile"], #profile-link');
    if (profileLink) {
        profileLink.click();
        return;
    }
    
    // Method 2: Try to find and click profile navigation in sidebar
    const sidebarLinks = document.querySelectorAll('.sidebar a, nav a, .navigation a');
    for (const link of sidebarLinks) {
        const linkText = link.textContent.toLowerCase();
        const linkHref = link.getAttribute('href') || '';
        
        if (linkText.includes('profile') || linkHref.includes('profile')) {
            link.click();
            return;
        }
    }
    
    // Method 3: Try to navigate via hash change
    try {
        window.location.hash = '#profile';
        // Trigger a custom event to notify the dashboard
        window.dispatchEvent(new CustomEvent('navigate-to-profile'));
    } catch (error) {
        console.error('❌ Navigation error:', error);
        showNotification('Please navigate to the Profile section manually to complete your information.', 'info');
    }
});
    
    // Refresh page
    refreshPageBtn.addEventListener('click', () => {
        location.reload();
    });
    
    // Handle escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Focus management for accessibility
    setTimeout(() => {
        goToProfileBtn.focus();
    }, 400);
}

// ADD this debugging function to enrollment.js (after global variables)
function debugProfileStatus() {
    console.log('=== PROFILE DEBUG INFO ===');
    console.log('📋 Session userData:', sessionStorage.getItem('userData'));
    console.log('📋 localStorage student_id:', localStorage.getItem('student_id'));
    console.log('📋 window.currentUser:', window.currentUser);
    
    const urlParams = new URLSearchParams(window.location.search);
    console.log('📋 URL student_id:', urlParams.get('student_id'));
    console.log('=========================');
}

// CALL this function in loadStudentInfo (add at the beginning)
async function loadStudentInfo() {
    debugProfileStatus(); // ADD THIS LINE
    
    try {
        console.log('🔍 Starting student info load process...');
        // ... rest of existing code
    } catch (error) {
        console.error('❌ Error loading student info:', error);
        showProfileCompletionNotice();
    }
}

// FIXED: Better student ID detection that works with your database structure
async function loadStudentInfo() {
    try {
        console.log('🔍 Starting student info load process...');
        
        let studentId = null;
        let currentUserData = null;
        
        // 1. Get current user data from multiple sources
        try {
            const userData = getUserData('userData');
            if (userData) {
                currentUserData = JSON.parse(userData);
                console.log('📋 Session userData:', currentUserData);
            }
        } catch (e) {
            console.warn('⚠️ Error parsing userData:', e);
        }
        
        // 2. FIXED: Try to find student_id from student_info table that matches user ID
        const sources = [
            // URL parameter (highest priority)
            () => {
                const urlParams = new URLSearchParams(window.location.search);
                const id = urlParams.get('student_id');
                console.log('📍 URL student_id:', id);
                return id;
            },
            
            // FIXED: Use the user ID to find corresponding student_id
            () => {
                if (currentUserData && currentUserData.id) {
                    console.log('🆔 Using current user ID to find student record:', currentUserData.id);
                    return currentUserData.id;
                }
                return null;
            },
            
            // FIXED: Check if student_id is already stored in session
            () => {
                if (currentUserData && currentUserData.student_id) {
                    console.log('🎓 Found student_id in session:', currentUserData.student_id);
                    return currentUserData.student_id;
                }
                return null;
            },
            
            // localStorage backup (fallback)
            () => {
                const id = getUserData('student_id');
                console.log('💾 Storage student_id:', id);
                return id;
            }
        ];
        
        // Try each source until we find a valid ID
        for (const getIdFromSource of sources) {
            const id = getIdFromSource();
            if (id && id !== 'null' && id !== 'undefined' && id.toString().trim() !== '') {
                studentId = id.toString().trim();
                break;
            }
        }
        
        console.log('🔍 Final student ID found:', studentId);
        
        // If no student ID found, show profile completion notice
        if (!studentId || studentId === 'null' || studentId === 'undefined') {
            console.warn('❌ No valid student ID found after all attempts');
            showProfileCompletionNotice();
            return;
        }
        
        console.log('👤 Loading student info for ID:', studentId);
        
        // FIXED: Call the enrollment API with the correct ID
        try {
            const response = await fetch(`/api/enrollment/student-info/${studentId}`);
            console.log('📡 Enrollment API response status:', response.status);
            
            // Rest of your existing code remains the same...
            if (response.status === 500) {
                console.error('❌ Server error occurred');
                try {
                    const errorResult = await response.json();
                    console.error('❌ Server error details:', errorResult);
                    
                    if (errorResult.debug && errorResult.debug.errorCode === 'ER_NO_SUCH_TABLE') {
                        showNotification('Database table not found. Please contact support.', 'error');
                    } else if (errorResult.debug && errorResult.debug.errorCode === 'ER_BAD_FIELD_ERROR') {
                        showNotification('Database field error. Please contact support.', 'error');
                    } else {
                        showNotification('Server error occurred. Please try refreshing the page or contact support.', 'error');
                    }
                } catch (parseError) {
                    showNotification('Server error occurred. Please try refreshing the page.', 'error');
                }
                return;
            }
            
            if (!response.ok) {
                if (response.status === 400) {
                    try {
                        const errorResult = await response.json();
                        if (errorResult.requiresProfile) {
                            console.warn('⚠️ Profile incomplete:', errorResult.message);
                            console.log('Missing fields:', errorResult.missingFields);
                            showProfileCompletionNotice();
                            return;
                        } else {
                            console.error('❌ Bad request:', errorResult.message);
                            showNotification(errorResult.message || 'Invalid request. Please check your information.', 'error');
                            return;
                        }
                    } catch (parseError) {
                        console.error('❌ Error parsing 400 response:', parseError);
                        showProfileCompletionNotice();
                        return;
                    }
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('📦 Final API response:', result);
            
            if (result.success && result.student) {
                currentStudent = result.student;
                console.log('✅ Student loaded:', currentStudent);
                
                // Store student ID for future use
                setUserData('student_id', currentStudent.studentId);
                
                // Show enrollment form
                const enrollmentForm = document.getElementById('enrollmentForm');
                if (enrollmentForm) {
                    enrollmentForm.style.display = 'block';
                }
                
                // Hide any profile completion notices
                const profileNotice = document.querySelector('.profile-completion-modal');
                if (profileNotice) {
                    profileNotice.remove();
                }
                
                // Load programs and continue with enrollment flow
                await loadPrograms();
                
                // Pre-select program and year
                setTimeout(() => {
                    if (currentStudent.program) {
                        const programRadio = document.querySelector(`input[name="program"][value="${currentStudent.program}"]`);
                        if (programRadio) {
                            programRadio.checked = true;
                            updateCardSelection('program');
                        }
                    }
                    
                    if (currentStudent.yearLevel) {
                        const yearRadio = document.querySelector(`input[name="yearLevel"][value="${currentStudent.yearLevel}"]`);
                        if (yearRadio) {
                            yearRadio.checked = true;
                            updateCardSelection('yearLevel');
                        }
                    }
                }, 100);
                
                updateStatusTracker(2);
            } else if (result.requiresProfile) {
                console.warn('❌ Profile incomplete:', result.message);
                showProfileCompletionNotice();
            } else {
                console.warn('❌ Failed to load student information');
                showNotification('Failed to load student information. Please try refreshing.', 'error');
            }
            
        } catch (error) {
            console.error('❌ Error calling student-info API:', error);
            
            if (error.message.includes('401')) {
                showProfileCompletionNotice();
            } else if (error.message.includes('500')) {
                showNotification('Server error occurred. Please contact support if this persists.', 'error');
            } else if (error.message.includes('Failed to fetch')) {
                showNotification('Network connection error. Please check your internet connection.', 'error');
            } else {
                showNotification('An unexpected error occurred. Please try refreshing the page.', 'error');
            }
        }
        
    } catch (error) {
        console.error('❌ Error loading student info:', error);
        showNotification('An error occurred. Please try refreshing the page.', 'error');
    }
}

// HELPER FUNCTIONS: Add these new functions
function mapMajorToProgram(major) {
    const programMap = {
        'information_technology': 'BSIT',
        'computer_science': 'BSCS', 
        'information_system': 'BSIS',
        'business_administration': 'BSBA',
    };
    return programMap[major] || 'BSIT';
}

function mapYearLevel(yearLevel) {
    const yearMap = {
        '1st_year': '1st Year',
        '2nd_year': '2nd Year',
        '3rd_year': '3rd Year', 
        '4th_year': '4th Year'
    };
    return yearMap[yearLevel] || '1st Year';
}

// Load available programs from database - FIXED API ENDPOINT
async function loadPrograms() {
    try {
        console.log('🎓 Loading programs...');
        // FIXED: Use the correct API endpoint
        const response = await fetch('/api/programs');
        
        if (!response.ok) {
            console.error('❌ Programs API response not OK:', response.status);
            return;
        }
        
        const result = await response.json();
        console.log('🎓 Programs API response:', result);
        
        if (result.success) {
            availablePrograms = result.data;
            console.log('✅ Programs loaded:', availablePrograms);
        } else {
            console.error('❌ Failed to load programs:', result.message);
        }
    } catch (error) {
        console.error('❌ Error loading programs:', error);
    }
}

// Get curriculum data from API - FIXED VERSION WITH BETTER ERROR HANDLING
async function getCurriculumData(program, year, term) {
    try {
        const cacheKey = `${program}-${year}-${term}`;
        
        // Check cache first
        if (curriculumCache[cacheKey]) {
            return curriculumCache[cacheKey];
        }
        
        // Find the program in our loaded programs list
        const selectedProgram = availablePrograms.find(p => p.program_name === program);
        if (!selectedProgram) {
            console.error('❌ Program not found:', program);
            console.log('📋 Available programs:', availablePrograms.map(p => p.program_name));
            return [];
        }
        
        console.log('📚 Found program:', selectedProgram.program_name, 'ID:', selectedProgram.id);
        
        // Query the database using the program ID
        const apiUrl = `/api/enrollment/curriculum?program_id=${selectedProgram.id}&year_level=${encodeURIComponent(year)}&semester=${encodeURIComponent(term)}`;
        console.log('🔗 API URL:', apiUrl);
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            console.error('❌ API response not OK:', response.status, response.statusText);
            return [];
        }
        
        const result = await response.json();
        console.log('📦 API response:', result);
        
        if (result.success && result.data && result.data.length > 0) {
            // Transform database format to frontend format
            const subjects = result.data.map(subject => ({
                code: subject.subject_code,
                description: subject.subject_name,
                section: subject.section || 'A',
                units: parseInt(subject.units) || 3,
                prereq: subject.prerequisite || '-',
                day: subject.schedule ? extractDay(subject.schedule) : 'TBA',
                time: subject.schedule ? extractTime(subject.schedule) : 'TBA'
            }));
            
            console.log('✅ Transformed subjects:', subjects);
            
            // Cache the result
            curriculumCache[cacheKey] = subjects;
            return subjects;
        } else {
            console.log('⚠️ No curriculum data found:', result.message);
            if (result.debug) {
                console.log('🔍 Debug info:', result.debug);
            }
            return [];
        }
    } catch (error) {
        console.error('❌ Error loading curriculum:', error);
        return [];
    }
}

// Helper functions to extract day and time from schedule
function extractDay(schedule) {
    if (!schedule || schedule === 'NULL') return 'TBA';
    const dayPattern = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|MWF|TTH|MW|TH)/i;
    const match = schedule.match(dayPattern);
    return match ? match[1].toUpperCase() : 'TBA';
}

// Helper function to extract time from schedule - FIXED to preserve AM/PM
function extractTime(schedule) {
    if (!schedule || schedule === 'NULL' || schedule === null) return 'TBA';
    
    console.log('🔍 Extracting time from schedule:', schedule);
    
    // Pattern to match time with AM/PM context
    // Matches: "1:00 - 2:00pm", "8:00 - 9:00am", "10:00am - 11:30am", etc.
    const timeWithAmPmPattern = /(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})(am|pm)/i;
    const singleTimeWithAmPmPattern = /(\d{1,2}:\d{2})(am|pm)/i;
    
    // Try to match time range with AM/PM
    let match = schedule.match(timeWithAmPmPattern);
    if (match) {
        const startTime = match[1];
        const endTime = match[2];
        const period = match[3].toLowerCase(); // am or pm
        
        // Apply the AM/PM to both start and end times
        const timeRange = `${startTime}${period}-${endTime}${period}`;
        console.log('✅ Extracted time range with AM/PM:', timeRange);
        return timeRange;
    }
    
    // Try to match single time with AM/PM
    match = schedule.match(singleTimeWithAmPmPattern);
    if (match) {
        const time = match[1] + match[2];
        console.log('✅ Extracted single time with AM/PM:', time);
        return time;
    }
    
    // Fallback: try to extract times without AM/PM (24-hour format)
    const timePattern = /(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/;
    match = schedule.match(timePattern);
    if (match) {
        const timeRange = `${match[1]}-${match[2]}`;
        console.log('✅ Extracted time range (24-hour):', timeRange);
        return timeRange;
    }
    
    console.log('⚠️ No time pattern found, returning TBA');
    return 'TBA';
}

// ENHANCED: Update curriculum preview with proper fee calculation
async function updateCurriculumPreview() {
    const program = document.querySelector('input[name="program"]:checked');
    const year = document.querySelector('input[name="yearLevel"]:checked');
    const term = document.querySelector('input[name="academicTerm"]:checked');

    if (program && year && term) {
        // Show loading state
        const preview = document.getElementById('curriculumPreview');
        const tableBody = document.getElementById('previewTableBody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 30px;"><div class="loading"></div> Loading curriculum...</td></tr>';
        }
        
        const subjects = await getCurriculumData(program.value, year.value, term.value);
        
        if (isIrregularStudent) {
            // Populate subject adjustment first
            await populateSubjectAdjustment(subjects);
            
            // Get initially selected subjects (all subjects are checked by default)
            const selectedSubjects = await getSelectedSubjects();
            populatePreviewTable(selectedSubjects);
            
            // FIXED: Update fee display for irregular students based on selected subjects
            await displayCustomFeeBreakdown(selectedSubjects);
        } else {
            populatePreviewTable(subjects);
            // FIXED: Display standard fee breakdown for regular students with proper student type
            await displayTuitionFeeBreakdown(subjects);
        }
        
        if (preview) {
            preview.classList.add('show');
        }
    } else {
        const preview = document.getElementById('curriculumPreview');
        const subjectAdjustment = document.getElementById('subjectAdjustment');
        if (preview) preview.classList.remove('show');
        if (subjectAdjustment) subjectAdjustment.classList.remove('show');
    }
}

// FIXED: Toggle student type with proper fee recalculation
function toggleStudentType() {
    const toggle = document.getElementById('studentTypeToggle');
    const regularLabel = document.getElementById('regularLabel');
    const irregularLabel = document.getElementById('irregularLabel');
    const subjectAdjustment = document.getElementById('subjectAdjustment');

    if (!toggle) return;

    isIrregularStudent = !isIrregularStudent;
    
    if (isIrregularStudent) {
        toggle.classList.add('active');
        if (regularLabel) regularLabel.classList.remove('active');
        if (irregularLabel) irregularLabel.classList.add('active');
        if (subjectAdjustment) subjectAdjustment.classList.add('show');
    } else {
        toggle.classList.remove('active');
        if (regularLabel) regularLabel.classList.add('active');
        if (irregularLabel) irregularLabel.classList.remove('active');
        if (subjectAdjustment) subjectAdjustment.classList.remove('show');
    }

    // FIXED: Properly recalculate fees when student type changes
    console.log('💰 Student type changed to:', isIrregularStudent ? 'irregular' : 'regular');
    updateCurriculumPreview(); // This will trigger fee recalculation
}

// REPLACE the remaining updateFeesCalculation function with this fixed version
async function updateFeesCalculation() {
    const program = document.querySelector('input[name="program"]:checked');
    const year = document.querySelector('input[name="yearLevel"]:checked');
    const term = document.querySelector('input[name="academicTerm"]:checked');
    
    // FIXED: Add null checks to prevent errors
    if (program && year && term) {
        console.log('💰 Updating fees calculation for student type change...');
        await updateCurriculumPreview(); // This will recalculate fees based on current student type
    } else {
        console.log('⚠️ Missing program/year/term selection for fee calculation');
    }
}





// REPLACE the existing displayCustomFeeBreakdown function in enrollment.js
async function displayCustomFeeBreakdown(selectedSubjects) {
    if (!selectedSubjects || selectedSubjects.length === 0) {
        console.log('⚠️ No selected subjects for fee calculation');
        
        // Display zero fees
        const zeroFees = {
            tuition: 0,
            laboratory: 0,
            miscellaneous: 0,
            enrollment: 0,
            irregularity: 0,
            total: 0,
            totalUnits: 0,
            perUnitRate: 450.00,
            studentType: 'irregular',
            breakdown: [
                { item: 'Tuition Fee', amount: 0, details: '0 units × ₱450.00 (Irregular Rate)' },
                { item: 'Laboratory Fee', amount: 0, details: 'No lab subjects selected' },
                { item: 'Miscellaneous Fee', amount: 0, details: 'No subjects selected' },
                { item: 'Enrollment Fee', amount: 0, details: 'No enrollment processed' },
                { item: 'Irregularity Fee', amount: 0, details: 'No irregular enrollment' }
            ]
        };
        
        updateFeeDisplay(zeroFees);
        return;
    }
    
    // FIXED: Calculate actual units from selected subjects
    const totalUnits = selectedSubjects.reduce((sum, subject) => sum + (parseInt(subject.units) || 0), 0);
    const IRREGULAR_RATE = 450.00;
    
    console.log('💰 Calculating IRREGULAR fees for', totalUnits, 'units at ₱' + IRREGULAR_RATE + ' per unit');
    
    // FIXED: Calculate fees based on ACTUAL selected units
    const tuitionFee = Math.round(IRREGULAR_RATE * totalUnits * 100) / 100;
    const labFee = totalUnits > 0 ? 500 : 0;
    const miscFee = totalUnits > 0 ? 500 : 0;
    const enrollmentFee = totalUnits > 0 ? 350 : 0;
    const irregularityFee = totalUnits > 0 ? 300 : 0;
    const total = tuitionFee + labFee + miscFee + enrollmentFee + irregularityFee;
    
    const customFees = {
        tuition: tuitionFee,
        laboratory: labFee,
        miscellaneous: miscFee,
        enrollment: enrollmentFee,
        irregularity: irregularityFee,
        total: total,
        totalUnits: totalUnits,
        perUnitRate: IRREGULAR_RATE,
        studentType: 'irregular',
        breakdown: [
            { item: 'Tuition Fee', amount: tuitionFee, details: `${totalUnits} units × ₱${IRREGULAR_RATE.toFixed(2)} (Irregular Rate)` },
            { item: 'Laboratory Fee', amount: labFee, details: totalUnits > 0 ? 'Lab equipment and materials' : 'No subjects selected' },
            { item: 'Miscellaneous Fee', amount: miscFee, details: totalUnits > 0 ? 'ID, library, and additional services' : 'No subjects selected' },
            { item: 'Enrollment Fee', amount: enrollmentFee, details: totalUnits > 0 ? 'Registration processing fee (Higher for irregular)' : 'No subjects selected' },
            { item: 'Irregularity Fee', amount: irregularityFee, details: totalUnits > 0 ? 'Additional fee for non-standard enrollment' : 'No irregular enrollment' }
        ]
    };
    
    console.log('💰 Irregular student fees calculated:', customFees);
    updateFeeDisplay(customFees);
}

// REPLACE the existing populateSubjectAdjustment function with this fixed version
async function populateSubjectAdjustment(subjects) {
    const subjectList = document.getElementById('subjectList');
    const subjectAdjustment = document.getElementById('subjectAdjustment');
    
    if (!subjectList) {
        console.error('❌ subjectList element not found');
        return;
    }
    
    // Show the adjustment section
    if (subjectAdjustment) {
        subjectAdjustment.classList.add('show');
    }
    
    subjectList.innerHTML = '';

    if (subjects.length === 0) {
        subjectList.innerHTML = '<p style="text-align: center; color: #856404; font-style: italic; padding: 20px;">No subjects available for this selection</p>';
        return;
    }

    subjects.forEach((subject, index) => {
        const subjectItem = document.createElement('div');
        subjectItem.className = 'subject-item';
        subjectItem.style.cssText = `
            display: flex;
            align-items: center;
            padding: 12px;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            margin-bottom: 8px;
            background: white;
            transition: all 0.2s ease;
        `;
        
        subjectItem.innerHTML = `
            <input type="checkbox" 
                   class="subject-checkbox" 
                   id="subject_${index}" 
                   data-subject-index="${index}"
                   checked 
                   style="margin-right: 12px; transform: scale(1.2);">
            <div class="subject-info" style="flex: 1;">
                <div class="subject-code" style="font-weight: 600; color: #3498db; font-size: 14px;">${subject.code}</div>
                <div class="subject-name" style="color: #333; margin-top: 2px;">${subject.description}</div>
            </div>
            <div class="subject-units" style="background: #e3f2fd; padding: 4px 8px; border-radius: 4px; font-weight: 500; color: #1976d2;">${subject.units} units</div>
        `;
        
        // FIXED: Add event listener for checkbox changes with proper async handling
        const checkbox = subjectItem.querySelector('.subject-checkbox');
        checkbox.addEventListener('change', async function() {
            console.log('📝 Subject checkbox changed:', subject.code, 'checked:', this.checked);
            
            // Get selected subjects and update preview
            const selectedSubjects = await getSelectedSubjects();
            populatePreviewTable(selectedSubjects);
            
            // Update fee display for irregular students
            await displayCustomFeeBreakdown(selectedSubjects);
        });
        
        subjectList.appendChild(subjectItem);
        
        // Add hover effect
        subjectItem.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#f8f9fa';
            this.style.borderColor = '#3498db';
        });
        
        subjectItem.addEventListener('mouseleave', function() {
            this.style.backgroundColor = 'white';
            this.style.borderColor = '#dee2e6';
        });
    });
    
    console.log('✅ Populated subject adjustment with', subjects.length, 'subjects');
}

// Get selected subjects for irregular students
async function getSelectedSubjects() {
    const program = document.querySelector('input[name="program"]:checked');
    const year = document.querySelector('input[name="yearLevel"]:checked');
    const term = document.querySelector('input[name="academicTerm"]:checked');

    if (!program || !year || !term) {
        console.log('❌ Missing program/year/term selection');
        return [];
    }

    const allSubjects = await getCurriculumData(program.value, year.value, term.value);
    const selectedSubjects = [];

    const checkboxes = document.querySelectorAll('.subject-checkbox');
    console.log('🔍 Found checkboxes:', checkboxes.length);
    
    checkboxes.forEach((checkbox) => {
        const index = parseInt(checkbox.getAttribute('data-subject-index'));
        console.log('📝 Checkbox', index, 'checked:', checkbox.checked);
        
        if (checkbox.checked && allSubjects[index]) {
            selectedSubjects.push(allSubjects[index]);
            console.log('✅ Added subject:', allSubjects[index].code);
        }
    });

    console.log('📋 Selected subjects:', selectedSubjects.length);
    return selectedSubjects;
}

// Populate preview table with subjects
function populatePreviewTable(subjects) {
    const tableBody = document.getElementById('previewTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';

    if (subjects.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="7" style="text-align: center; color: #6c757d; font-style: italic; padding: 30px;">No subjects selected</td>`;
        tableBody.appendChild(row);
        
        const totalUnitsEl = document.getElementById('totalUnitsPreview');
        const totalSubjectsEl = document.getElementById('totalSubjectsPreview');
        if (totalUnitsEl) totalUnitsEl.textContent = '0';
        if (totalSubjectsEl) totalSubjectsEl.textContent = '0';
        return;
    }

    let totalUnits = 0;
    subjects.forEach(subject => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="font-weight: 600; color: #3498db;">${subject.code}</td>
            <td style="text-align: left;">${subject.description}</td>
            <td style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); font-weight: 500;">${subject.section}</td>
            <td style="font-weight: 700; color: #28a745; background: rgba(40, 167, 69, 0.1);">${subject.units}</td>
            <td style="color: #6c757d; font-style: ${subject.prereq === '-' ? 'italic' : 'normal'};">${subject.prereq}</td>
            <td style="color: #fd7e14; font-weight: 500;">${subject.day}</td>
            <td style="color: #3498db; font-weight: 500;">${formatTime(subject.time)}</td>
        `;
        tableBody.appendChild(row);
        totalUnits += subject.units;
    });

    const totalUnitsEl = document.getElementById('totalUnitsPreview');
    const totalSubjectsEl = document.getElementById('totalSubjectsPreview');
    if (totalUnitsEl) totalUnitsEl.textContent = totalUnits;
    if (totalSubjectsEl) totalSubjectsEl.textContent = subjects.length;
}

// Format time display - FIXED to handle both 12-hour and 24-hour formats
function formatTime(time) {
    console.log('🕐 formatTime input:', time);
    
    if (!time || time === '-' || time === 'TBA') {
        console.log('🕐 formatTime output: TBA (invalid input)');
        return 'TBA';
    }
    
    // Handle time ranges (e.g., "1:00pm-2:00pm" or "14:00-15:00")
    const timeRange = time.split('-');
    if (timeRange.length === 2) {
        const [start, end] = timeRange;
        const formattedStart = formatSingleTime(start.trim());
        const formattedEnd = formatSingleTime(end.trim());
        const result = `${formattedStart} - ${formattedEnd}`;
        console.log('🕐 formatTime output (range):', result);
        return result;
    }
    
    // Handle single time
    const result = formatSingleTime(time);
    console.log('🕐 formatTime output (single):', result);
    return result;
    
    function formatSingleTime(timeStr) {
        console.log('🕐 formatSingleTime input:', timeStr);
        
        if (!timeStr || timeStr.trim() === '') return 'TBA';
        
        // Check if time already has AM/PM (12-hour format)
        const ampmPattern = /(\d{1,2}):(\d{2})(am|pm)/i;
        const ampmMatch = timeStr.match(ampmPattern);
        
        if (ampmMatch) {
            // Already in 12-hour format, just format it nicely
            const hours = parseInt(ampmMatch[1]);
            const minutes = ampmMatch[2];
            const period = ampmMatch[3].toUpperCase();
            
            console.log('🕐 formatSingleTime: already 12-hour format -', hours, minutes, period);
            return `${hours}:${minutes} ${period}`;
        }
        
        // Assume 24-hour format, convert to 12-hour
        const timeParts = timeStr.trim().split(':');
        if (timeParts.length !== 2) {
            console.log('🕐 formatSingleTime: Invalid format, returning as-is');
            return timeStr;
        }
        
        const hours = parseInt(timeParts[0]);
        const minutes = timeParts[1];
        
        console.log('🕐 formatSingleTime: converting 24-hour format -', hours, minutes);
        
        // Validate hours and minutes
        if (isNaN(hours) || hours < 0 || hours > 23) {
            console.log('🕐 formatSingleTime: Invalid hours, returning as-is');
            return timeStr;
        }
        
        // Convert 24-hour to 12-hour format
        let displayHour;
        let ampm;
        
        if (hours === 0) {
            displayHour = 12;
            ampm = 'AM';
        } else if (hours < 12) {
            displayHour = hours;
            ampm = 'AM';
        } else if (hours === 12) {
            displayHour = 12;
            ampm = 'PM';
        } else {
            displayHour = hours - 12;
            ampm = 'PM';
        }
        
        const result = `${displayHour}:${minutes} ${ampm}`;
        console.log('🕐 formatSingleTime: converted', timeStr, 'to', result);
        return result;
    }
}

// Initialize event listeners
function initializeEventListeners() {
    // Student type toggle
    const studentTypeToggle = document.getElementById('studentTypeToggle');
    if (studentTypeToggle) {
        studentTypeToggle.addEventListener('click', toggleStudentType);
    }

    // ADD THIS: Student type dropdown change handler
    const studentTypeSelect = document.getElementById('studentType');
    if (studentTypeSelect) {
        studentTypeSelect.addEventListener('change', function() {
            console.log('📝 Student type changed via dropdown to:', this.value);
            isIrregularStudent = (this.value === 'irregular');
            updateCurriculumPreview(); // Recalculate fees
        });
    }
    
    // Form field changes
    document.querySelectorAll('input[name="program"], input[name="yearLevel"], input[name="academicTerm"]').forEach(input => {
        input.addEventListener('change', function() {
            updateCardSelection(this.name);
            updateCurriculumPreview();
            updateStatusTracker(2);
        });
    });

    // Card click handlers
    document.querySelectorAll('.selection-card, .year-card, .term-card').forEach(card => {
        card.addEventListener('click', function() {
            const input = this.querySelector('input[type="radio"]');
            if (input && !input.checked) {
                input.checked = true;
                updateCardSelection(input.name);
                updateCurriculumPreview();
                updateStatusTracker(2);
            }
        });
    });

    // Form submission
    const enrollmentForm = document.getElementById('enrollmentForm');
    if (enrollmentForm) {
        enrollmentForm.addEventListener('submit', handleFormSubmit);
    }
}

// Initialize file upload functionality
function initializeFileUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('paymentProof');

    if (!uploadArea || !fileInput) return;

    // Drag and drop events
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files);
        handleFileUpload(files);
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        handleFileUpload(files);
    });
}

// Handle file upload
function handleFileUpload(files) {
    if (files.length === 0) return;

    const file = files[0];
    const maxSize = 5 * 1024 * 1024; // 5MB

    // Validate file
    if (!file.type.match(/image\/(jpeg|jpg|png)|application\/pdf/)) {
        showNotification('Please upload only JPG, PNG, or PDF files.', 'error');
        return;
    }

    if (file.size > maxSize) {
        showNotification('File size must be less than 5MB.', 'error');
        return;
    }

    // Display uploaded file
    const fileNameEl = document.getElementById('fileName');
    const fileSizeEl = document.getElementById('fileSize');
    const uploadedFileEl = document.getElementById('uploadedFile');
    
    if (fileNameEl) fileNameEl.textContent = file.name;
    if (fileSizeEl) fileSizeEl.textContent = formatFileSize(file.size);
    if (uploadedFileEl) uploadedFileEl.classList.add('show');

    uploadedFiles = [file];
    updateStatusTracker(3);
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Remove uploaded file
function removeFile() {
    const uploadedFileEl = document.getElementById('uploadedFile');
    const paymentProofEl = document.getElementById('paymentProof');
    
    if (uploadedFileEl) uploadedFileEl.classList.remove('show');
    if (paymentProofEl) paymentProofEl.value = '';
    
    uploadedFiles = [];
    updateStatusTracker(2);
}

// Toggle student type (regular/irregular)
function toggleStudentType() {
    const toggle = document.getElementById('studentTypeToggle');
    const regularLabel = document.getElementById('regularLabel');
    const irregularLabel = document.getElementById('irregularLabel');
    const subjectAdjustment = document.getElementById('subjectAdjustment');

    if (!toggle) return;

    isIrregularStudent = !isIrregularStudent;
    
    if (isIrregularStudent) {
        toggle.classList.add('active');
        if (regularLabel) regularLabel.classList.remove('active');
        if (irregularLabel) irregularLabel.classList.add('active');
        if (subjectAdjustment) subjectAdjustment.classList.add('show');
    } else {
        toggle.classList.remove('active');
        if (regularLabel) regularLabel.classList.add('active');
        if (irregularLabel) irregularLabel.classList.remove('active');
        if (subjectAdjustment) subjectAdjustment.classList.remove('show');
    }

    // FIXED: Recalculate fees when student type changes
    console.log('💰 Student type changed to:', isIrregularStudent ? 'irregular' : 'regular');
    updateFeesCalculation(); // ADD this line
}

// Update status tracker
function updateStatusTracker(step) {
    const steps = document.querySelectorAll('.status-step');
    const progressFill = document.querySelector('.status-progress-fill');
    
    if (!steps.length) return;
    
    steps.forEach((stepEl, index) => {
        stepEl.classList.remove('active', 'completed', 'pending');
        if (index < step - 1) {
            stepEl.classList.add('completed');
        } else if (index === step - 1) {
            stepEl.classList.add('active');
        } else {
            stepEl.classList.add('pending');
        }
    });

    if (progressFill) {
        const progressWidth = ((step - 1) / (steps.length - 1)) * 100;
        progressFill.style.width = progressWidth + '%';
    }
}

// Update card selection visual state
function updateCardSelection(name) {
    const cards = document.querySelectorAll(`input[name="${name}"]`);
    cards.forEach(card => {
        const cardElement = card.closest('.selection-card, .year-card, .term-card');
        if (cardElement) {
            if (card.checked) {
                cardElement.classList.add('selected');
            } else {
                cardElement.classList.remove('selected');
            }
        }
    });
}

// Handle form submission
// REPLACE the handleFormSubmit function in enrollment.js - find this part and update it
async function handleFormSubmit(event) {
    event.preventDefault();
    
    const program = document.querySelector('input[name="program"]:checked');
    const year = document.querySelector('input[name="yearLevel"]:checked');
    const term = document.querySelector('input[name="academicTerm"]:checked');

    // Validation
    if (!program || !year || !term) {
        showNotification('Please select all required fields before submitting.', 'error');
        return;
    }

    if (uploadedFiles.length === 0) {
        showNotification('Please upload your payment receipt before submitting.', 'warning');
        return;
    }

    if (!currentStudent) {
        showNotification('Student information not loaded. Please refresh the page.', 'error');
        return;
    }

    // Show loading state
    const submitBtn = document.getElementById('submitBtn');
    if (!submitBtn) return;
    
    const originalContent = submitBtn.innerHTML;
    submitBtn.innerHTML = '<div class="loading"></div> Processing...';
    submitBtn.disabled = true;

    try {
        // Get selected subjects for enrollment
        const subjects = isIrregularStudent ? await getSelectedSubjects() : await getCurriculumData(program.value, year.value, term.value);
        const totalUnits = subjects.reduce((sum, subject) => sum + (parseInt(subject.units) || 0), 0);
        
        // FIXED: Calculate correct fees based on student type and actual units
        let totalFees = 0;
        
        if (isIrregularStudent) {
            // Calculate fees for irregular students based on selected subjects
            const IRREGULAR_RATE = 450.00;
            const tuitionFee = IRREGULAR_RATE * totalUnits;
            const fixedFees = 500 + 500 + 350 + 300; // lab + misc + enrollment + irregularity
            totalFees = tuitionFee + fixedFees;
            console.log('💰 Irregular student total fees:', totalFees, 'for', totalUnits, 'units');
        } else {
            // Calculate fees for regular students using API
            const feesResponse = await fetch(`/api/enrollment/tuition-fees?program=${program.value}&yearLevel=${encodeURIComponent(year.value)}&term=${encodeURIComponent(term.value)}&studentType=regular`);
            const feesResult = await feesResponse.json();
            
            if (feesResult.success) {
                totalFees = feesResult.fees.total;
            }
        }

        console.log('💰 Final total fees for submission:', totalFees);

        // Prepare form data for submission
        const formData = new FormData();
        formData.append('studentId', currentStudent.id);
        formData.append('studentType', isIrregularStudent ? 'irregular' : 'regular');
        formData.append('program', program.value);
        formData.append('yearLevel', year.value);
        formData.append('term', term.value);
        formData.append('totalFees', totalFees);
        formData.append('subjects', JSON.stringify(subjects));
        formData.append('paymentReceipt', uploadedFiles[0]);

        // Submit enrollment
        const response = await fetch('/api/enrollment/submit', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            // Show success message
            const successMessage = document.getElementById('successMessage');
            if (successMessage) {
                successMessage.classList.add('show');
                successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                setTimeout(() => {
                    successMessage.classList.remove('show');
                }, 5000);
            }
            
            updateStatusTracker(3);
            showNotification('Enrollment submitted successfully!', 'success');
        } else {
            showNotification(result.message || 'Failed to submit enrollment', 'error');
        }
    } catch (error) {
        console.error('Error submitting enrollment:', error);
        showNotification('Error submitting enrollment. Please try again.', 'error');
    } finally {
        // Reset button
        submitBtn.innerHTML = originalContent;
        submitBtn.disabled = false;
    }
}

// ENHANCED: Display tuition fee breakdown with actual units calculation
async function displayTuitionFeeBreakdown(subjects = null) {
    const program = document.querySelector('input[name="program"]:checked');
    const year = document.querySelector('input[name="yearLevel"]:checked');
    const term = document.querySelector('input[name="academicTerm"]:checked');

    if (!program || !year || !term) return;

    try {
        console.log('💰 Fetching tuition fee breakdown...');
        
        // ENHANCED: Calculate actual units from subjects if available
        let actualUnits = 0;
        if (subjects && subjects.length > 0) {
            actualUnits = subjects.reduce((sum, subject) => sum + (parseInt(subject.units) || 0), 0);
            console.log('💰 Calculated units from subjects:', actualUnits);
        }
        
        // FIXED: Include student type and actual units in the API call
        const studentType = isIrregularStudent ? 'irregular' : 'regular';
        const params = new URLSearchParams({
            program: program.value,
            yearLevel: year.value,
            term: term.value,
            studentType: studentType,
            // ENHANCED: Send actual units if calculated
            ...(actualUnits > 0 && { actualUnits: actualUnits.toString() })
        });
        
        console.log('💰 Request params:', { studentType, isIrregularStudent, actualUnits });
        
        const response = await fetch(`/api/enrollment/tuition-fees?${params}`);
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Fee breakdown received:', result.fees);
            updateFeeDisplay(result.fees);
        }
    } catch (error) {
        console.error('❌ Error fetching tuition fees:', error);
    }
}

// ENHANCED: Update fee display to properly show irregular vs regular fees
function updateFeeDisplay(fees) {
    // Update fee summary in curriculum preview
    let feeDisplay = document.getElementById('fee-display');
    
    // Create fee display if it doesn't exist
    if (!feeDisplay) {
        const curriculumPreview = document.getElementById('curriculumPreview');
        if (!curriculumPreview) return;
        
        feeDisplay = document.createElement('div');
        feeDisplay.id = 'fee-display';
        feeDisplay.className = 'fee-display-section';
        feeDisplay.style.cssText = `
            background: linear-gradient(135deg, ${fees.studentType === 'irregular' ? '#e74c3c 0%, #c0392b 100%' : '#3498db 0%, #2980b9 100%'});
            color: white;
            padding: 20px;
            border-radius: 12px;
            margin-top: 20px;
            box-shadow: 0 4px 15px rgba(${fees.studentType === 'irregular' ? '231, 76, 60' : '102, 126, 234'}, 0.3);
        `;
        
        curriculumPreview.appendChild(feeDisplay);
    } else {
        // Update background color based on student type
        feeDisplay.style.background = fees.studentType === 'irregular' ? 
            'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)' : 
            'linear-gradient(135deg, #3498db 0%, #2980b9 100%)';
        feeDisplay.style.boxShadow = fees.studentType === 'irregular' ? 
            '0 4px 15px rgba(231, 76, 60, 0.3)' : 
            '0 4px 15px rgba(102, 126, 234, 0.3)';
    }
    
    // ENHANCED: Show student type indicator
    const studentTypeIndicator = fees.studentType === 'irregular' ? 
        '<span style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 15px; font-size: 0.85em; margin-left: 10px;">IRREGULAR STUDENT</span>' :
        '<span style="background: rgba(255,255,255,0.15); padding: 4px 12px; border-radius: 15px; font-size: 0.85em; margin-left: 10px;">REGULAR STUDENT</span>';
    
    // Populate fee display
    feeDisplay.innerHTML = `
        <div class="fee-header" style="display: flex; align-items: center; margin-bottom: 15px;">
            <i class="fas fa-calculator" style="font-size: 24px; margin-right: 10px;"></i>
            <h3 style="margin: 0; font-weight: 600;">Tuition Fee Breakdown</h3>
            ${studentTypeIndicator}
        </div>
        
        <div class="fee-breakdown" style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            ${fees.breakdown.map(item => `
                <div class="fee-item" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 5px 0;">
                    <div class="fee-item-info">
                        <span class="fee-name" style="font-weight: 500;">${item.item}</span>
                        <small class="fee-details" style="display: block; opacity: 0.8; font-size: 0.85em;">${item.details}</small>
                    </div>
                    <span class="fee-amount" style="font-weight: 600; font-size: 1.1em;">₱${item.amount.toLocaleString()}</span>
                </div>
            `).join('')}
        </div>
        
        <div class="fee-total" style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: rgba(255,255,255,0.15); border-radius: 8px; font-size: 1.2em; font-weight: 700;">
            <span>TOTAL ENROLLMENT FEE</span>
            <span style="color: #f1c40f;">₱${fees.total.toLocaleString()}</span>
        </div>
        
        <div class="fee-note" style="margin-top: 10px; font-size: 0.85em; opacity: 0.9; text-align: center;">
            <i class="fas fa-info-circle" style="margin-right: 5px;"></i>
            Rate: ₱${fees.perUnitRate.toFixed(2)} per unit ${fees.studentType === 'irregular' ? '(Irregular Rate)' : '(Regular Rate)'} • ${fees.totalUnits} units enrolled
        </div>
    `;
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'error' ? '#f8d7da' : type === 'warning' ? '#fff3cd' : type === 'success' ? '#d4edda' : '#d1ecf1'};
        border: 1px solid ${type === 'error' ? '#f5c6cb' : type === 'warning' ? '#ffeaa7' : type === 'success' ? '#c3e6cb' : '#bee5eb'};
        border-radius: 8px;
        color: ${type === 'error' ? '#721c24' : type === 'warning' ? '#856404' : type === 'success' ? '#155724' : '#0c5460'};
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideInRight 0.3s ease-out;
    `;

    const icon = type === 'error' ? 'fas fa-exclamation-circle' : 
                type === 'warning' ? 'fas fa-exclamation-triangle' : 
                type === 'success' ? 'fas fa-check-circle' :
                'fas fa-info-circle';

    notification.innerHTML = `
        <i class="${icon}" style="margin-right: 8px;"></i>
        ${message}
        <button onclick="this.parentElement.remove()" style="float: right; background: none; border: none; font-size: 16px; cursor: pointer; margin-left: 10px;">&times;</button>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Add CSS for notification animation
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    .loading {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid #f3f3f3;
        border-top: 2px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(notificationStyles);

// Reset form function
function resetForm() {
    // Reset form inputs
    const enrollmentForm = document.getElementById('enrollmentForm');
    if (enrollmentForm) {
        enrollmentForm.reset();
    }
    
    // Reset visual selections
    document.querySelectorAll('.selection-card, .year-card, .term-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Reset student type to regular
    isIrregularStudent = false;
    const studentTypeToggle = document.getElementById('studentTypeToggle');
    const regularLabel = document.getElementById('regularLabel');
    const irregularLabel = document.getElementById('irregularLabel');
    
    if (studentTypeToggle) studentTypeToggle.classList.remove('active');
    if (regularLabel) regularLabel.classList.add('active');
    if (irregularLabel) irregularLabel.classList.remove('active');
    
    // Hide sections
    const curriculumPreview = document.getElementById('curriculumPreview');
    const subjectAdjustment = document.getElementById('subjectAdjustment');
    const successMessage = document.getElementById('successMessage');
    
    if (curriculumPreview) curriculumPreview.classList.remove('show');
    if (subjectAdjustment) subjectAdjustment.classList.remove('show');
    if (successMessage) successMessage.classList.remove('show');
    
    // Reset file upload
    removeFile();
    
    // Reset status tracker
    updateStatusTracker(1);
}

// Add keyboard navigation
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const openModals = document.querySelectorAll('.success-message.show');
        openModals.forEach(modal => modal.classList.remove('show'));
    }
});

// Add accessibility improvements
document.addEventListener('DOMContentLoaded', function() {
    // Add accessibility attributes to cards
    document.querySelectorAll('.selection-card, .year-card, .term-card').forEach(card => {
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        
        card.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });
});