// Enhanced authentication guard for protected pages
(function() {
    'use strict';
    
    // Prevent multiple initializations
    if (window.authGuardInitialized) {
        console.warn('Auth guard already initialized');
        return;
    }
    window.authGuardInitialized = true;
    
    // Enhanced authentication check with server verification
    async function checkAuth() {
        const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
        const userData = sessionStorage.getItem('userData') || localStorage.getItem('userData');
        const isAuthenticated = sessionStorage.getItem('isAuthenticated') || localStorage.getItem('isAuthenticated');
        
        console.log('🔐 Auth check:', {
            hasToken: !!token,
            hasUserData: !!userData,
            isAuthenticated: isAuthenticated,
            currentPage: window.location.pathname
        });
        
        // If basic auth data is missing, redirect immediately
        if (!token || !userData || isAuthenticated !== 'true') {
            console.log('❌ Basic authentication failed - redirecting to login');
            redirectToLogin('Please log in to access this page.');
            return false;
        }
        
        try {
            const user = JSON.parse(userData);
            console.log('👤 User data found:', user.username, 'Role:', user.role);
            
            // Verify token with server (optional - only for critical operations)
            if (shouldVerifyWithServer()) {
                const isValid = await verifyTokenWithServer(token);
                if (!isValid) {
                    console.log('❌ Server token verification failed');
                    redirectToLogin('Session expired. Please log in again.');
                    return false;
                }
            }
            
            // Store user data globally for easy access
            window.currentUser = user;
            console.log('✅ Authentication successful');
            
            return true;
        } catch (error) {
            console.error('❌ Invalid user data stored:', error);
            clearAuthData();
            redirectToLogin('Authentication error. Please log in again.');
            return false;
        }
    }
    
    // Check if we should verify with server (only for enrollment and sensitive operations)
    function shouldVerifyWithServer() {
        const sensitivePages = [
            '/StudentSide/enrollment.html',
            '/admin/enrollment-requests.html',
            // Add other sensitive pages here
        ];
        
        return sensitivePages.some(page => window.location.pathname.includes(page));
    }
    
    // Verify token with server
    async function verifyTokenWithServer(token) {
        try {
            console.log('🔍 Verifying token with server...');
            
            const response = await fetch('/api/auth/verify-token', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ Token verification successful');
                return result.success;
            } else {
                console.log('❌ Token verification failed:', response.status);
                return false;
            }
        } catch (error) {
            console.error('❌ Token verification error:', error);
            // If server is down, allow client-side auth to continue
            console.log('⚠️ Server verification failed, continuing with client-side auth');
            return true;
        }
    }
    
    // Clear all authentication data
    function clearAuthData() {
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('userData'); 
        sessionStorage.removeItem('isAuthenticated');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('isAuthenticated');
    }
    
    // Redirect to login with message
    function redirectToLogin(message) {
        if (message) {
            alert(message);
        }
        // Use relative path that works from any directory level
        window.location.href = '/login.html';
    }
    
    // Enhanced function to get authentication headers for API requests
    window.getAuthHeaders = function() {
        const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        };
    };
    
    // Enhanced function to get authentication token
    window.getAuthToken = function() {
        return sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
    };
    
    // Global logout function
    window.logout = function() {
        clearAuthData();
        alert('You have been logged out.');
        window.location.href = '/login.html';
    };
    
    // Global function to get current user
    window.getCurrentUser = function() {
        const userData = sessionStorage.getItem('userData') || localStorage.getItem('userData');
        return userData ? JSON.parse(userData) : null;
    };
    
    // Enhanced function to make authenticated API requests
    window.authenticatedFetch = async function(url, options = {}) {
        const token = getAuthToken();
        
        if (!token) {
            console.error('❌ No auth token available for request');
            redirectToLogin('Please log in to continue.');
            throw new Error('No authentication token');
        }
        
        // Add auth headers
        const authHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
        
        // Merge with existing headers
        const finalOptions = {
            ...options,
            headers: {
                ...authHeaders,
                ...options.headers
            }
        };
        
        try {
            const response = await fetch(url, finalOptions);
            
            // Handle authentication errors
            if (response.status === 401) {
                console.error('❌ Request failed: Unauthorized');
                clearAuthData();
                redirectToLogin('Session expired. Please log in again.');
                throw new Error('Authentication failed');
            }
            
            return response;
        } catch (error) {
            console.error('❌ Authenticated fetch error:', error);
            throw error;
        }
    };
    
    // Check auth when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAuth);
    } else {
        // Use setTimeout to ensure this runs after other scripts
        setTimeout(checkAuth, 100);
    }
    
    // Optional: Check auth periodically (every 30 minutes)
    setInterval(function() {
        const token = getAuthToken();
        if (!token) {
            console.log('⏰ Session expired - redirecting to login');
            redirectToLogin('Your session has expired. Please log in again.');
        }
    }, 30 * 60 * 1000); // 30 minutes
    
    // Listen for storage changes (logout in another tab)
    window.addEventListener('storage', function(e) {
        if (e.key === 'authToken' || e.key === 'isAuthenticated') {
            if (!e.newValue) {
                console.log('🔄 Auth data cleared in another tab');
                redirectToLogin('You have been logged out.');
            }
        }
    });
    
    console.log('✅ Enhanced auth guard initialized');
})();