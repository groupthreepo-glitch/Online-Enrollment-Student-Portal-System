// Faculty Dashboard Integration Script
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in and has appropriate role
    checkAuthentication();
    
    // Initialize dashboard functionality
    initializeDashboard();
    
    // Load user profile information
    loadUserProfile();
    
    // Setup event listeners
    setupEventListeners();
});


// ===== AUTHENTICATION FUNCTIONS =====
function checkAuthentication() {
    const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
    const hasToken = sessionStorage.getItem('authToken') !== null;
    const hasUser = sessionStorage.getItem('userData') !== null;
    
    // Fallback to old authentication method
    const oldAuth = sessionStorage.getItem('loggedIn') === 'true';
    const hasUserName = sessionStorage.getItem('userName') !== null;

    console.log("🔍 Auth status (Faculty):", { isAuthenticated, hasToken, hasUser, oldAuth, hasUserName });

    if ((!isAuthenticated || !hasToken || !hasUser) && (!oldAuth || !hasUserName)) {
        console.log("❌ Not authenticated, redirecting to login...");
        window.location.href = '../login.html';
        return false;
    }

    // Check role
    let role = '';
    if (hasUser) {
        try {
            const userData = JSON.parse(sessionStorage.getItem('userData'));
            role = userData.role || '';
        } catch (e) {
            console.error("Error parsing userData:", e);
        }
    } else {
        role = sessionStorage.getItem('userRole') || '';
    }

    if (!role || role.toLowerCase() !== 'faculty') {
        console.log("⚠️ Wrong role:", role, "Redirecting to correct dashboard...");
        redirectToCorrectDashboard(role);
        return false;
    }

    return true;
}
// Redirect to correct dashboard based on user role
function redirectToCorrectDashboard(role) {
    const dashboardPaths = {
        'admin': '../AdminSide/admindashboard.html',
        'professor': '../ProfessorSide/professordashboard.html',
        'student': '../StudentSide/studentdashboard.html'
    };
    
    const redirectPath = dashboardPaths[role.toLowerCase()];
    if (redirectPath) {
        window.location.href = redirectPath;
    } else {
        window.location.href = '../login.html';
    }
}

// Load user profile information from session storage
function loadUserProfile() {
    const userName = sessionStorage.getItem('userName') || 'Dr. Faculty User';
    const userEmail = sessionStorage.getItem('userEmail') || 'faculty@university.edu';
    const userAvatar = sessionStorage.getItem('userAvatar');
    const loginDate = sessionStorage.getItem('loginDate');
    
    // Update user name in sidebar and header
    const userNameElement = document.getElementById('userName');
    const welcomeMessage = document.querySelector('.welcome-message');
    
    if (userNameElement) {
        userNameElement.textContent = userName;
    }
    
    if (welcomeMessage) {
        welcomeMessage.textContent = `Welcome, ${userName.split(' ')[0]}`;
    }
    
    // Update avatar if custom photo was uploaded
    const avatarContainer = document.getElementById('avatarContainer');
    if (avatarContainer && userAvatar) {
        avatarContainer.innerHTML = `<img src="${userAvatar}" alt="Profile" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
    }
    
    // Log login information for debugging
    console.log('User Profile Loaded:', {
        name: userName,
        email: userEmail,
        role: sessionStorage.getItem('userRole'),
        loginTime: loginDate
    });
    
    // Update dashboard statistics based on user
    updateDashboardStats();
}

// Update dashboard statistics (simulate real data)
function updateDashboardStats() {
    const userName = sessionStorage.getItem('userName') || 'Faculty User';
    const userEmail = sessionStorage.getItem('userEmail') || '';
    
    // Generate some personalized stats based on user info
    const stats = generateUserStats(userName, userEmail);
    
    // Update dashboard cards with personalized information
    updateDashboardCards(stats);
}

// Generate user-specific statistics
function generateUserStats(userName, userEmail) {
    // Create semi-realistic data based on user info
    const nameHash = userName.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
    }, 0);
    
    // Use hash to generate consistent but varied stats
    const activeCourses = Math.abs(nameHash % 6) + 2; // 2-7 courses
    const pendingGrades = Math.abs(nameHash % 20) + 5; // 5-24 grades
    const totalStudents = Math.abs(nameHash % 100) + 50; // 50-149 students
    const upcomingClasses = Math.abs(nameHash % 8) + 1; // 1-8 classes
    
    return {
        activeCourses,
        pendingGrades,
        totalStudents,
        upcomingClasses,
        userName,
        userEmail
    };
}



// Initialize dashboard functionality
function initializeDashboard() {
    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
            
            // Save sidebar state
            const isCollapsed = sidebar.classList.contains('collapsed');
            localStorage.setItem('sidebarCollapsed', isCollapsed);
        });
        
        // Restore sidebar state
        const savedState = localStorage.getItem('sidebarCollapsed');
        if (savedState === 'true') {
            sidebar.classList.add('collapsed');
        }
    }
    
    // Navigation handling - FIXED to prevent conflicts with enrolled-students.js
const navItems = document.querySelectorAll('.nav-item');
const contentSections = document.querySelectorAll('.content-section');

navItems.forEach(item => {
    item.addEventListener('click', function() {
        const targetSection = this.getAttribute('data-section');
        
        // Remove active class from all nav items and content sections
        navItems.forEach(nav => nav.classList.remove('active'));
        contentSections.forEach(section => section.classList.remove('active'));
        
        // Add active class to clicked nav item and corresponding content section
        this.classList.add('active');
        const targetContent = document.getElementById(targetSection);
        if (targetContent) {
            targetContent.classList.add('active');
            
            // SPECIAL HANDLING for students section - Initialize enrolled students module
            if (targetSection === 'students') {
                console.log('🎓 Loading students section...');
                setTimeout(() => {
                    if (!window.facultyEnrolledStudents) {
                        console.log('🔄 Initializing Faculty Enrolled Students...');
                        window.facultyEnrolledStudents = new FacultyEnrolledStudents();
                    } else {
                        // Force refresh to ensure data is loaded
                        window.facultyEnrolledStudents.loadEnrolledStudents();
                    }
                }, 200);
            }
        }
        
        // Save active section
        localStorage.setItem('activeSection', targetSection);
    });
});
    
    // Restore active section
    const savedSection = localStorage.getItem('activeSection');
    if (savedSection) {
        const savedNavItem = document.querySelector(`[data-section="${savedSection}"]`);
        const savedContentSection = document.getElementById(savedSection);
        
        if (savedNavItem && savedContentSection) {
            // Remove active from all
            navItems.forEach(nav => nav.classList.remove('active'));
            contentSections.forEach(section => section.classList.remove('active'));
            
            // Activate saved section
            savedNavItem.classList.add('active');
            savedContentSection.classList.add('active');
        }
    }
}

// Load section-specific content
function loadSectionContent(sectionName) {
    const userName = sessionStorage.getItem('userName') || 'Faculty User';
    const userRole = sessionStorage.getItem('userRole') || 'faculty';
    
    const sectionElement = document.getElementById(sectionName);
    if (!sectionElement) return;
    
    // Add personalized content based on section
    switch(sectionName) {
        case 'profile':
            loadProfileContent(sectionElement);
            break;
        case 'messages':
            loadMessagesContent(sectionElement);
            break;
        case 'grading':
            loadGradingContent(sectionElement);
            break;
        
            
    }
}


// Load grading content
function loadGradingContent(section) {
    const pendingGrades = sessionStorage.getItem('pendingGrades') || '12';
    
    const gradingHTML = `
        <h2>Grading Center</h2>
        <div class="grading-container" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <p>You have ${pendingGrades} assignments pending review.</p>
            <div class="grading-queue" style="margin-top: 20px;">
                <div class="grade-item" style="border: 1px solid #ddd; padding: 15px; margin-bottom: 10px; border-radius: 5px;">
                    <strong>Assignment:</strong> Midterm Exam - Computer Science 101
                    <br><span style="color: #e74c3c;">Due: Today</span>
                </div>
                <div class="grade-item" style="border: 1px solid #ddd; padding: 15px; margin-bottom: 10px; border-radius: 5px;">
                    <strong>Assignment:</strong> Research Paper - Advanced Algorithms
                    <br><span style="color: #f39c12;">Due: Tomorrow</span>
                </div>
            </div>
        </div>
    `;
    
    section.innerHTML = gradingHTML;
}




// Setup additional event listeners
function setupEventListeners() {
    // Dark mode toggle
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        // Restore dark mode state
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
            darkModeToggle.checked = true;
        }
        
        darkModeToggle.addEventListener('change', function() {
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('darkMode', this.checked);
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            handleLogout();
        });
    }
    
    // Notification icon
    const notificationIcon = document.getElementById('notificationIcon');
    if (notificationIcon) {
        notificationIcon.addEventListener('click', function() {
            showNotifications();
        });
    }
    
    // Avatar change functionality
    const avatarContainer = document.getElementById('avatarContainer');
    if (avatarContainer) {
        avatarContainer.addEventListener('click', function() {
            changeProfilePhoto();
        });
    }
    
    // Search functionality
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            handleSearch(this.value);
        });
    }
}

// Handle logout
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear session storage
        sessionStorage.clear();
        
        // Clear relevant local storage items but keep preferences
        localStorage.removeItem('activeSection');
        
        // Redirect to login page
        window.location.href = '../login.html'; // Adjust path as needed
    }
}

// Show notifications
function showNotifications() {
    const userName = sessionStorage.getItem('userName') || 'Faculty User';
    
    alert(`Notifications for ${userName}:\n\n` +
          '• New student message received\n' +
          '• Grade submission deadline approaching\n' +
          '• Department meeting scheduled');
}

// Change profile photo
function changeProfilePhoto() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const avatarContainer = document.getElementById('avatarContainer');
                avatarContainer.innerHTML = `<img src="${e.target.result}" alt="Profile" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
                
                // Save to session storage
                sessionStorage.setItem('userAvatar', e.target.result);
            };
            reader.readAsDataURL(file);
        }
    };
    
    input.click();
}

// Handle search
function handleSearch(query) {
    if (query.length > 2) {
        console.log('Searching for:', query);
        // Implement search functionality here
    }
}

// Edit profile function
function editProfile() {
    alert('Profile editing functionality would be implemented here');
}



// Utility function to format dates
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Auto-refresh dashboard data periodically
setInterval(function() {
    const isLoggedIn = sessionStorage.getItem('loggedIn');
    if (isLoggedIn === 'true') {
        // Refresh user stats or check for new notifications
        console.log('Dashboard auto-refresh');
    }
}, 300000); // Refresh every 5 minutes

// Faculty Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    
    

    // DOM Elements
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = document.querySelectorAll('.content-section');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const logoutBtn = document.getElementById('logoutBtn');
    const notificationIcon = document.getElementById('notificationIcon');
    const searchInput = document.querySelector('.search-input');
    const addAnnouncementBtn = document.getElementById('addAnnouncementBtn');
    const announcementsList = document.getElementById('announcementsList');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const announcementSearchInput = document.getElementById('searchInput');

    // Sidebar toggle functionality
    sidebarToggle.addEventListener('click', function() {
        sidebar.classList.toggle('collapsed');
    });

    // Navigation functionality
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const targetSection = this.getAttribute('data-section');
            
            // Remove active class from all nav items and content sections
            navItems.forEach(nav => nav.classList.remove('active'));
            contentSections.forEach(section => section.classList.remove('active'));
            
            // Add active class to clicked nav item and corresponding content section
            this.classList.add('active');
            const targetContent = document.getElementById(targetSection);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });

    // Dark mode toggle
    darkModeToggle.addEventListener('change', function() {
        document.body.classList.toggle('dark-mode', this.checked);
        
        // Store preference in localStorage
        localStorage.setItem('darkMode', this.checked);
    });

    // Load dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true') {
        darkModeToggle.checked = true;
        document.body.classList.add('dark-mode');
    }

    // Logout functionality
    logoutBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to logout?')) {
            // Simulate logout
            alert('Logged out successfully!');
            // In a real application, you would redirect to login page
            // window.location.href = '/login';
        }
    });

    

    // Announcements functionality
    
    

    

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Alt + 1-7 for quick navigation
        if (e.altKey && e.key >= '1' && e.key <= '7') {
            e.preventDefault();
            const navItems = document.querySelectorAll('.nav-item');
            const index = parseInt(e.key) - 1;
            if (navItems[index]) {
                navItems[index].click();
            }
        }
        
        // Ctrl + / for search focus
        if (e.ctrlKey && e.key === '/') {
            e.preventDefault();
            searchInput.focus();
        }
        
        // Escape to collapse sidebar
        if (e.key === 'Escape') {
            sidebar.classList.add('collapsed');
        }
    });

    // Welcome message animation
    const welcomeMessage = document.querySelector('.welcome-message');
    if (welcomeMessage) {
        setTimeout(() => {
            welcomeMessage.style.opacity = '0.8';
        }, 1000);
    }

    console.log('Faculty Dashboard initialized successfully!');
});

// ADD this at the end of facultydashboard.js - Ensure enrolled students loads properly
document.addEventListener('DOMContentLoaded', function() {
    // ... existing facultydashboard.js initialization ...
    
    // ENSURE enrolled students module loads after dashboard
    setTimeout(() => {
        if (window.facultyEnrolledStudents) {
            console.log('✅ Faculty enrolled students module found and active');
        } else {
            console.log('⚠️ Faculty enrolled students module not found, initializing...');
            // Force initialize if not loaded
            if (typeof FacultyEnrolledStudents !== 'undefined') {
                window.facultyEnrolledStudents = new FacultyEnrolledStudents();
            }
        }
    }, 500);
});

// ADDITIONAL SAFEGUARD - Check when students section becomes active
const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const target = mutation.target;
            if (target.id === 'students' && target.classList.contains('active')) {
                setTimeout(() => {
                    if (!window.facultyEnrolledStudents && typeof FacultyEnrolledStudents !== 'undefined') {
                        console.log('🎓 Section observer: Initializing Faculty Enrolled Students...');
                        window.facultyEnrolledStudents = new FacultyEnrolledStudents();
                    }
                }, 300);
            }
        }
    });
});

// Observe the students section for class changes
const studentsSection = document.getElementById('students');
if (studentsSection) {
    observer.observe(studentsSection, { attributes: true });
}