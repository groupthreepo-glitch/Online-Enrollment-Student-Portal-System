// Registrar Dashboard Script - Clean and Simplified
document.addEventListener('DOMContentLoaded', function() {
    console.log("🎯 Registrar Dashboard loaded - checking authentication...");

    if (!checkAuthentication()) return;

    // Initialize dashboard functionality
    initializeDashboard();
    loadUserProfile();
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

    console.log("🔍 Auth status (Registrar):", { isAuthenticated, hasToken, hasUser, oldAuth, hasUserName });

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

    if (!role || role.toLowerCase() !== 'registrar') {
        console.log("⚠️ Wrong role:", role, "Redirecting to correct dashboard...");
        redirectToCorrectDashboard(role);
        return false;
    }

    return true;
}

function redirectToCorrectDashboard(role) {
    const dashboardPaths = {
        'admin': '../AdminSide/admindashboard.html',
        'professor': '../ProfessorSide/professordashboard.html',
        'student': '../StudentSide/studentdashboard.html'
    };

    const redirectPath = dashboardPaths[role?.toLowerCase()] || '../login.html';
    window.location.href = redirectPath;
}

// ===== USER PROFILE FUNCTIONS =====
function loadUserProfile() {
    const userName = sessionStorage.getItem('userName') || 'Dr. Registrar User';
    const userEmail = sessionStorage.getItem('userEmail') || 'registrar@university.edu';
    
    // Update UI elements
    const userNameElement = document.getElementById('userName');
    const welcomeMessage = document.querySelector('.welcome-message');
    
    if (userNameElement) {
        userNameElement.textContent = userName;
    }
    
    if (welcomeMessage) {
        welcomeMessage.textContent = `Welcome, ${userName.split(' ')[0]}`;
    }
    
    console.log('User Profile Loaded:', {
        name: userName,
        email: userEmail,
        role: sessionStorage.getItem('userRole')
    });
}

// ===== DASHBOARD INITIALIZATION =====
function initializeDashboard() {
    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    // Sidebar toggle functionality
    sidebarToggle.addEventListener('click', function() {
        sidebar.classList.toggle('collapsed');
    });
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
            localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
        });
        
        // Restore sidebar state
        if (localStorage.getItem('sidebarCollapsed') === 'true') {
            sidebar.classList.add('collapsed');
        }
    }
    
    // Navigation handling
    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = document.querySelectorAll('.content-section');
    
    // REPLACE the navigation handling section in initializeDashboard function
navItems.forEach(item => {
    item.addEventListener('click', function() {
        const sectionName = this.getAttribute('data-section');
        
        // Remove active class from all nav items
        navItems.forEach(nav => nav.classList.remove('active'));
        this.classList.add('active');
        
        // Hide all content sections
        contentSections.forEach(section => section.classList.remove('active'));
        
        // Show selected content section
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.classList.add('active');
            
            // Load section-specific content with delay
            setTimeout(() => {
                if (sectionName === 'students') {
                    loadStudentsContent();
                } else if (sectionName === 'enrollment') {
                    // Initialize enrollment requests when section becomes active
                    initializeEnrollmentSection();
                }
            }, 100);
        }
        
        // Save active section
        localStorage.setItem('activeSection', sectionName);
    });
});
    
    // ALSO UPDATE the restore active section part
const savedSection = localStorage.getItem('activeSection') || 'dashboard';
const savedNavItem = document.querySelector(`[data-section="${savedSection}"]`);
const savedContentSection = document.getElementById(savedSection);

if (savedNavItem && savedContentSection) {
    navItems.forEach(nav => nav.classList.remove('active'));
    contentSections.forEach(section => section.classList.remove('active'));
    
    savedNavItem.classList.add('active');
    savedContentSection.classList.add('active');
    
    // Initialize content for restored section
    setTimeout(() => {
        if (savedSection === 'students') {
            loadStudentsContent();
        } else if (savedSection === 'enrollment') {
            initializeEnrollmentSection();
        }
    }, 200);
}
}

// ===== CONTENT LOADING FUNCTIONS =====
function loadStudentsContent() {
    console.log('Loading students content...');
    // The students manager will handle this automatically when the section is active
}

// ===== EVENT LISTENERS SETUP =====
function setupEventListeners() {
    // Dark mode toggle
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
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
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    
    
    // Search functionality
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            handleSearch(this.value);
        });
    }
}

// ADD this function after the setupEventListeners function
function initializeEnrollmentSection() {
    console.log('🎯 Initializing enrollment section...');
    
    // Check if enrollment functions exist
    if (typeof initializeEnrollmentRequests === 'function') {
        // Wait a bit more to ensure DOM is ready
        setTimeout(() => {
            initializeEnrollmentRequests();
        }, 300);
    } else {
        console.warn('⚠️ Enrollment functions not loaded yet, retrying...');
        // Retry after a longer delay
        setTimeout(() => {
            if (typeof initializeEnrollmentRequests === 'function') {
                initializeEnrollmentRequests();
            }
        }, 1000);
    }
}

// ===== UTILITY FUNCTIONS =====
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        sessionStorage.clear();
        localStorage.removeItem('activeSection');
        window.location.href = '../login.html';
    }
}



function handleSearch(query) {
    if (query.length > 2) {
        console.log('Searching for:', query);
        // Implement search functionality as needed
    }
}

// ===== KEYBOARD SHORTCUTS =====
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
        const searchInput = document.querySelector('.search-input');
        if (searchInput) searchInput.focus();
    }
    
    // Escape to collapse sidebar
    if (e.key === 'Escape') {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.add('collapsed');
    }
    
});

console.log('✅ Registrar Dashboard initialized successfully!');