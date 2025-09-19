// ===== UPDATED auth.js (middleware) - More lenient version =====
// Frontend authentication utility functions

function checkAuth() {
    console.log('Checking authentication...');
    
    // Check both localStorage and sessionStorage
    const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    const userData = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    const loggedIn = localStorage.getItem('loggedIn') || sessionStorage.getItem('loggedIn');
    
    console.log('Auth check results:', {
        hasToken: !!authToken,
        hasUserData: !!userData,
        loggedIn: loggedIn,
        tokenValue: authToken ? authToken.substring(0, 10) + '...' : 'null',
        userDataValue: userData ? 'present' : 'null'
    });
    
    if (!authToken || !userData || loggedIn !== 'true') {
        console.log('Authentication failed - missing data');
        return null; // Don't redirect immediately, let the page handle it
    }
    
    try {
        const user = JSON.parse(userData);
        console.log('User authenticated:', user);
        return user;
    } catch (error) {
        console.error('Error parsing user data:', error);
        return null;
    }
}

// Check if user has required role
function checkRole(requiredRole) {
    const user = checkAuth();
    if (!user) return false;
    
    console.log('Checking role:', { userRole: user.role, requiredRole });
    
    if (user.role !== requiredRole) {
        alert('Access denied. You do not have permission to access this page.');
        // Redirect to appropriate dashboard
        let dashboardURL;
        switch(user.role) {
            case 'admin':
                dashboardURL = '../AdminSide/admindashboard.html';
                break;
            case 'registrar':
                dashboardURL = '../RegistrarSide/registrardashboard.html';
                break;
            case 'student':
            default:
                dashboardURL = '../StudentSide/studentdashboard.html';
                break;
        }
        window.location.href = dashboardURL;
        return false;
    }
    
    return true;
}

// Clear authentication data
function clearAuthData() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('userRole');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    sessionStorage.removeItem('loggedIn');
    sessionStorage.removeItem('userRole');
}

// Logout function
function logout() {
    console.log('Logging out...');
    clearAuthData();
    window.location.href = '/login.html';
}

// API call with authentication
async function authenticatedFetch(url, options = {}) {
    const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    
    if (!authToken) {
        throw new Error('No authentication token found');
    }
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        ...options.headers
    };
    
    try {
        const response = await fetch(url, {
            ...options,
            headers
        });
        
        if (response.status === 401) {
            // Token expired or invalid
            logout();
            throw new Error('Authentication failed');
        }
        
        return response;
    } catch (error) {
        throw error;
    }
}

// Initialize authentication on page load - NON-BLOCKING VERSION
function initAuth() {
    console.log('Initializing authentication...');
    
    const user = checkAuth();
    if (user) {
        console.log('User authenticated successfully');
        
        // Display user info if elements exist
        const userNameElement = document.getElementById('userName');
        const userEmailElement = document.getElementById('userEmail');
        
        if (userNameElement) {
            userNameElement.textContent = user.username || user.name || 'User';
        }
        
        if (userEmailElement) {
            userEmailElement.textContent = user.email || '';
        }
        
        // Add logout button functionality
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.addEventListener('click', logout);
        }
        
        // Hide any login prompts
        const loginPrompts = document.querySelectorAll('.login-prompt, .auth-required');
        loginPrompts.forEach(prompt => {
            prompt.style.display = 'none';
        });
        
        return user;
    } else {
        console.log('User not authenticated');
        
        // Show login prompt instead of redirecting
        showLoginPrompt();
        return null;
    }
}

// Show login prompt instead of immediate redirect
function showLoginPrompt() {
    // Create or show login prompt
    let loginPrompt = document.getElementById('loginPrompt');
    
    if (!loginPrompt) {
        loginPrompt = document.createElement('div');
        loginPrompt.id = 'loginPrompt';
        loginPrompt.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            color: white;
            font-family: Arial, sans-serif;
        `;
        
        loginPrompt.innerHTML = `
            <div style="background: #333; padding: 20px; border-radius: 8px; text-align: center;">
                <h2>Please log in to access this page</h2>
                <p>You need to be logged in to view this content.</p>
                <button onclick="window.location.href='/login.html'" style="
                    background: #007bff;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-right: 10px;
                ">Go to Login</button>
                <button onclick="retryAuth()" style="
                    background: #6c757d;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 4px;
                    cursor: pointer;
                ">Retry</button>
            </div>
        `;
        
        document.body.appendChild(loginPrompt);
    }
    
    loginPrompt.style.display = 'flex';
}

// Retry authentication
function retryAuth() {
    console.log('Retrying authentication...');
    const loginPrompt = document.getElementById('loginPrompt');
    
    const user = checkAuth();
    if (user) {
        console.log('Authentication successful on retry');
        if (loginPrompt) {
            loginPrompt.style.display = 'none';
        }
        
        // Reload the page to show authenticated content
        window.location.reload();
    } else {
        console.log('Authentication still failed');
        alert('Still not authenticated. Please log in first.');
    }
}

// Export functions for use in other files
window.checkAuth = checkAuth;
window.checkRole = checkRole;
window.logout = logout;
window.authenticatedFetch = authenticatedFetch;
window.initAuth = initAuth;
window.clearAuthData = clearAuthData;
window.retryAuth = retryAuth;
window.showLoginPrompt = showLoginPrompt;

// ===== UPDATED login.js - Fix redirect paths =====
// Add this function to your login.js file, replacing the existing redirectToDashboard function

function redirectToDashboard(userRole) {
    let dashboardURL;
    
    // Use absolute paths from root
    switch(userRole) {
        case 'admin':
            dashboardURL = '/AdminSide/admindashboard.html';
            break;
        case 'registrar':
            dashboardURL = '/RegistrarSide/registrardashboard.html';
            break;
        case 'student':
        default:
            dashboardURL = '/StudentSide/studentdashboard.html';
            break;
    }
    
    console.log(`Redirecting to: ${dashboardURL} for role: ${userRole}`);
    
    // Add a small delay to ensure data is saved
    setTimeout(() => {
        window.location.href = dashboardURL;
    }, 100);
}

// ===== Test Authentication Function =====
// Add this to your login.js for testing
function testAuth() {
    console.log('=== AUTH TEST ===');
    console.log('localStorage authToken:', localStorage.getItem('authToken'));
    console.log('localStorage userData:', localStorage.getItem('userData'));
    console.log('localStorage loggedIn:', localStorage.getItem('loggedIn'));
    console.log('sessionStorage authToken:', sessionStorage.getItem('authToken'));
    console.log('sessionStorage userData:', sessionStorage.getItem('userData'));
    console.log('sessionStorage loggedIn:', sessionStorage.getItem('loggedIn'));
    console.log('===============');
}

// Call this in browser console to test: testAuth()
window.testAuth = testAuth;