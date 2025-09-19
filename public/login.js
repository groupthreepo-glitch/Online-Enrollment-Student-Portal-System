document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 Login.js loaded - DATABASE ROLE AUTHENTICATION MODE");
    
    // DOM elements
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const showRegisterBtn = document.getElementById('showRegisterBtn');
    const showLoginBtn = document.getElementById('showLoginBtn');
    const switchBtn = document.getElementById('switchBtn');
    
    // Password toggle functionality
    const togglePasswordVisibility = (inputId, toggleId) => {
        const input = document.getElementById(inputId);
        const toggle = document.getElementById(toggleId);
        
        if (toggle) {
            toggle.addEventListener('click', () => {
                if (input.type === 'password') {
                    input.type = 'text';
                    toggle.classList.remove('fa-eye');
                    toggle.classList.add('fa-eye-slash');
                } else {
                    input.type = 'password';
                    toggle.classList.remove('fa-eye-slash');
                    toggle.classList.add('fa-eye');
                }
            });
        }
    };
    
    togglePasswordVisibility('loginPassword', 'loginPasswordToggle');
    togglePasswordVisibility('registerPassword', 'registerPasswordToggle');
    togglePasswordVisibility('confirmPassword', 'confirmPasswordToggle');
    
    // Form switching functionality
    if (showRegisterBtn) {
        showRegisterBtn.addEventListener('click', function(e) {
            e.preventDefault();
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
            if (switchBtn) switchBtn.textContent = 'Login Now';
        });
    }
    
    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
            if (switchBtn) switchBtn.textContent = 'Register Now';
        });
    }
    
    if (switchBtn) {
        switchBtn.addEventListener('click', function() {
            if (loginForm.classList.contains('hidden')) {
                loginForm.classList.remove('hidden');
                registerForm.classList.add('hidden');
                this.textContent = 'Register Now';
            } else {
                loginForm.classList.add('hidden');
                registerForm.classList.remove('hidden');
                this.textContent = 'Login Now';
            }
        });
    }
    
    // Utility functions
    function showMessage(message, type = 'error') {
        console.log(`📢 Message: ${message} (${type})`);
        
        const messageId = type === 'error' ? 'errorMessage' : 'successMessage';
        const bgColor = type === 'error' ? '#ef4444' : '#10b981';
        
        let messageDiv = document.getElementById(messageId);
        if (!messageDiv) {
            messageDiv = document.createElement('div');
            messageDiv.id = messageId;
            messageDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${bgColor};
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                z-index: 1000;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                font-family: Arial, sans-serif;
                max-width: 300px;
            `;
            document.body.appendChild(messageDiv);
        }
        
        messageDiv.textContent = message;
        messageDiv.style.display = 'block';
        
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }
    
    function validatePassword(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        if (password.length < minLength) {
            return { valid: false, message: 'Password must be at least 8 characters long' };
        }
        if (!hasUpperCase) {
            return { valid: false, message: 'Password must contain at least one uppercase letter' };
        }
        if (!hasLowerCase) {
            return { valid: false, message: 'Password must contain at least one lowercase letter' };
        }
        if (!hasNumbers) {
            return { valid: false, message: 'Password must contain at least one number' };
        }
        if (!hasSpecialChar) {
            return { valid: false, message: 'Password must contain at least one special character' };
        }
        
        return { valid: true };
    }
    
    function validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Enhanced role detection function - PRIORITIZES DATABASE ROLE
    function detectUserRole(email, userData) {
        console.log("🔍 Detecting user role for email:", email);
        console.log("📦 User data received:", userData);
        
        // PRIORITY 1: Use role from database (userData.role)
        if (userData && userData.role) {
            const dbRole = userData.role.toLowerCase().trim();
            console.log("✅ Database role found:", dbRole);
            
            // Validate the role is one of our expected values
            if (['admin', 'registrar', 'faculty', 'student'].includes(dbRole)) {
                console.log("🎯 Using DATABASE ROLE:", dbRole);
                return dbRole;
            } else {
                console.log("⚠️ Invalid database role, falling back to email detection");
            }
        }
        
        // PRIORITY 2: Detect from email pattern (fallback for legacy accounts)
        const emailLower = email.toLowerCase();
        
        if (emailLower.includes('admin') || emailLower.startsWith('admin@')) {
            console.log("🔧 Role detected from email pattern: admin");
            return 'admin';
        } else if (emailLower.includes('registrar') || emailLower.startsWith('registrar@')) {
            console.log("📝 Role detected from email pattern: registrar");
            return 'registrar';
        } else if (emailLower.includes('faculty') || emailLower.startsWith('faculty@') || emailLower.includes('professor')) {
            console.log("👨‍🏫 Role detected from email pattern: faculty");
            return 'faculty';
        } else {
            console.log("👨‍🎓 Default role assigned: student");
            return 'student';
        }
    }
    
    function setAuthData(token, user) {
        console.log("🔐 Setting auth data...");
        console.log("Token:", token ? "PROVIDED" : "MISSING");
        console.log("User data:", user);
        
        // Clear existing data first
        sessionStorage.clear();
        
        // Store authentication data
        sessionStorage.setItem('authToken', token);
        sessionStorage.setItem('userData', JSON.stringify(user));
        sessionStorage.setItem('isAuthenticated', 'true');
        sessionStorage.setItem('loginTimestamp', Date.now().toString());
        
        // Store the user's role separately for quick access
        if (user && user.role) {
            sessionStorage.setItem('userRole', user.role.toLowerCase());
            console.log("🎭 User role stored:", user.role.toLowerCase());
        }
        
        // Store server health flag
        sessionStorage.setItem('serverHealthy', 'true');
        
        // Verify storage
        console.log("✅ Auth data verification:");
        console.log("- Token stored:", !!sessionStorage.getItem('authToken'));
        console.log("- User data stored:", !!sessionStorage.getItem('userData'));
        console.log("- Auth flag:", sessionStorage.getItem('isAuthenticated'));
        console.log("- User role:", sessionStorage.getItem('userRole'));
    }
    
    function clearAuthData() {
        console.log("🗑️ Clearing auth data");
        sessionStorage.clear();
    }
    
    function redirectToDashboard(userRole, userEmail = '', userData = null) {
        console.log("🚀 Redirecting to dashboard...");
        console.log("📧 User email:", userEmail);
        console.log("🎭 User role:", userRole);
        console.log("👤 User data:", userData);
        
        // Ensure role is lowercase for consistent comparison
        const role = userRole.toLowerCase().trim();
        
        // Dashboard URLs mapping
        const dashboardURLs = {
            'admin': './AdminSide/admindashboard.html',
            'registrar': './RegistrarSide/registrardashboard.html',
            'student': './StudentSide/studentdashboard.html',
            'faculty': './FacultySide/facultydashboard.html'
        };
        
        const dashboardURL = dashboardURLs[role] || dashboardURLs.student;
        console.log("🎯 Dashboard URL:", dashboardURL);
        
        // Add comprehensive flags to prevent auth issues on dashboard
        sessionStorage.setItem('justLoggedIn', 'true');
        sessionStorage.setItem('loginTime', Date.now().toString());
        sessionStorage.setItem('skipInitialServerCheck', 'true');
        sessionStorage.setItem('userRole', role);
        
        // Store additional user info for dashboard use
        if (userData) {
            sessionStorage.setItem('userName', userData.username || userData.name || 'User');
            sessionStorage.setItem('userEmail', userEmail);
            sessionStorage.setItem('userId', userData.id || userData.user_id || '');
            
            // Store first and last name if available
            if (userData.first_name) {
                sessionStorage.setItem('userFirstName', userData.first_name);
            }
            if (userData.last_name) {
                sessionStorage.setItem('userLastName', userData.last_name);
            }
        }
        
        // Log redirection details for debugging
        console.log("📊 REDIRECTION SUMMARY:");
        console.log("- Email:", userEmail);
        console.log("- Detected Role:", role);
        console.log("- Target URL:", dashboardURL);
        console.log("- User Name:", userData?.username || userData?.name || 'Unknown');
        console.log("- User ID:", userData?.id || userData?.user_id || 'Unknown');
        console.log("- First Name:", userData?.first_name || 'Unknown');
        console.log("- Last Name:", userData?.last_name || 'Unknown');
        
        console.log("🏃‍♂️ Executing redirect...");
        
        // Add a small delay to ensure all session storage operations complete
        setTimeout(() => {
            window.location.href = dashboardURL;
        }, 150);
    }
    
    // Enhanced server health check
    async function checkServerHealth() {
        try {
            const response = await fetch('http://localhost:3006/health', {
                method: 'GET',
                timeout: 5000
            });
            return response.ok;
        } catch (error) {
            console.log("⚠️ Server health check failed:", error.message);
            return false;
        }
    }
    
    // ENHANCED REGISTRATION HANDLER WITH BETTER DEBUG INFO
    const registerButton = registerForm ? registerForm.querySelector('.btn') : null;
    if (registerButton) {
        registerButton.addEventListener('click', async function(e) {
            e.preventDefault();
            
            console.log("📝 REGISTRATION ATTEMPT STARTED");
            console.log("🕐 Timestamp:", new Date().toISOString());
            
            const nameValue = document.getElementById('registerName').value.trim();
            const emailValue = document.getElementById('registerEmail').value.trim();
            const passwordValue = document.getElementById('registerPassword').value;
            const confirmValue = document.getElementById('confirmPassword').value;
            const termsChecked = document.getElementById('termsAgreement').checked;
            
            console.log("📋 Form Data:");
            console.log("- Name:", nameValue);
            console.log("- Email:", emailValue);
            console.log("- Password length:", passwordValue.length);
            console.log("- Confirm password length:", confirmValue.length);
            console.log("- Terms checked:", termsChecked);
            
            // Validation
            if (!nameValue || !emailValue || !passwordValue) {
                console.log("❌ Validation failed: Missing required fields");
                showMessage("Please fill in all required fields");
                return;
            }
            
            if (!validateEmail(emailValue)) {
                console.log("❌ Validation failed: Invalid email");
                showMessage("Please enter a valid email address");
                return;
            }
            
            const passwordValidation = validatePassword(passwordValue);
            if (!passwordValidation.valid) {
                console.log("❌ Validation failed: Password requirements");
                showMessage(passwordValidation.message);
                return;
            }
            
            if (passwordValue !== confirmValue) {
                console.log("❌ Validation failed: Password mismatch");
                showMessage("Passwords do not match");
                return;
            }
            
            if (!termsChecked) {
                console.log("❌ Validation failed: Terms not accepted");
                showMessage("Please agree to the Terms and Conditions");
                return;
            }
            
            console.log("✅ All validations passed");
            
            // Check server health first
            console.log("🔍 Checking server health...");
            const serverHealthy = await checkServerHealth();
            console.log("🏥 Server health status:", serverHealthy);
            
            if (!serverHealthy) {
                console.log("❌ Server not available");
                showMessage("Server is currently unavailable. Please try again later.");
                return;
            }
            
            // Show loading state
            const originalText = registerButton.textContent;
            registerButton.textContent = "Creating Account...";
            registerButton.disabled = true;
            
            try {
                console.log("🌐 Sending registration request...");
                console.log("🎯 Endpoint: http://localhost:3006/api/auth/register");
                
                const registrationData = {
                    name: nameValue,
                    email: emailValue,
                    password: passwordValue,
                    confirmPassword: confirmValue
                };
                
                console.log("📦 Registration data being sent:", {
                    name: registrationData.name,
                    email: registrationData.email,
                    passwordLength: registrationData.password.length,
                    confirmPasswordLength: registrationData.confirmPassword.length
                });
                
                const response = await fetch('http://localhost:3006/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(registrationData)
                });
                
                console.log("📡 Server response status:", response.status);
                console.log("📋 Response headers:", Object.fromEntries(response.headers.entries()));
                
                let data;
                try {
                    data = await response.json();
                    console.log("📦 Complete server response:", data);
                } catch (jsonError) {
                    console.error("❌ Failed to parse JSON response:", jsonError);
                    console.log("📄 Raw response text:", await response.text());
                    throw new Error("Server returned invalid JSON response");
                }
                
                if (data.success && response.ok) {
                    console.log("✅ REGISTRATION SUCCESSFUL!");
                    console.log("👤 New user data:", data.user);
                    
                    showMessage("Registration successful! Please log in.", 'success');
                    
                    // Clear form and switch to login
                    document.getElementById('registerName').value = '';
                    document.getElementById('registerEmail').value = '';
                    document.getElementById('registerPassword').value = '';
                    document.getElementById('confirmPassword').value = '';
                    document.getElementById('termsAgreement').checked = false;
                    
                    // Switch to login form
                    loginForm.classList.remove('hidden');
                    registerForm.classList.add('hidden');
                    if (switchBtn) switchBtn.textContent = 'Register Now';
                    
                    // Pre-fill login email
                    document.getElementById('loginEmail').value = emailValue;
                    
                    console.log("🔄 Switched to login form and pre-filled email");
                } else {
                    console.log("❌ REGISTRATION FAILED");
                    console.log("Error message:", data.message);
                    console.log("Response success:", data.success);
                    console.log("HTTP status:", response.status);
                    
                    const errorMessage = data.message || 'Registration failed';
                    showMessage(errorMessage);
                }
                
            } catch (error) {
                console.error('🚨 REGISTRATION ERROR:', error);
                console.error('Error name:', error.name);
                console.error('Error message:', error.message);
                console.error('Error stack:', error.stack);
                
                // Enhanced error handling
                if (error.name === 'TypeError' && error.message.includes('fetch')) {
                    showMessage('Cannot connect to server. Please ensure the server is running on port 3006.');
                } else if (error.name === 'SyntaxError') {
                    showMessage('Server returned invalid response. Please try again.');
                } else if (error.message.includes('JSON')) {
                    showMessage('Server error: Unable to process response. Please try again.');
                } else {
                    showMessage('Registration failed due to network error. Please try again.');
                }
            } finally {
                registerButton.textContent = originalText;
                registerButton.disabled = false;
                console.log("🔄 Registration button restored");
            }
        });
    }
    
    // ENHANCED LOGIN HANDLER FOR DATABASE ROLE AUTHENTICATION
    const loginButton = loginForm ? loginForm.querySelector('.btn') : null;
    if (loginButton) {
        loginButton.addEventListener('click', async function(e) {
            e.preventDefault();
            
            console.log("🔑 DATABASE ROLE LOGIN ATTEMPT STARTED");
            console.log("🕐 Timestamp:", new Date().toISOString());
            
            const emailValue = document.getElementById('loginEmail').value.trim();
            const passwordValue = document.getElementById('loginPassword').value;
            
            console.log("📧 Login email:", emailValue);
            console.log("🔒 Password provided:", passwordValue ? "YES" : "NO");
            
            if (!emailValue || !passwordValue) {
                showMessage("Please enter both email and password");
                return;
            }
            
            if (!validateEmail(emailValue)) {
                showMessage("Please enter a valid email address");
                return;
            }
            
            // Show loading state
            const originalText = loginButton.textContent;
            loginButton.textContent = "Authenticating...";
            loginButton.disabled = true;
            
            try {
                console.log("🌐 Sending login request to server...");
                console.log("🎯 Endpoint: http://localhost:3006/api/auth/login");
                
                const response = await fetch('http://localhost:3006/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        email: emailValue,
                        password: passwordValue
                    })
                });
                
                console.log("📡 Server response status:", response.status);
                console.log("📋 Response headers:", Object.fromEntries(response.headers.entries()));
                
                const data = await response.json();
                console.log("📦 Complete server response:", data);
                
                if (data.success && response.ok) {
                    console.log("✅ LOGIN SUCCESSFUL!");
                    console.log("👤 User data from server:", data.user);
                    console.log("🎫 Auth token provided:", data.token ? "YES" : "NO");
                    
                    // Extract and validate user role from database
                    const databaseRole = detectUserRole(emailValue, data.user);
                    console.log("🎭 Final determined role:", databaseRole);
                    
                    // Ensure user object has the correct role
                    const enhancedUser = {
                        ...data.user,
                        role: databaseRole,
                        email: emailValue
                    };
                    
                    console.log("👨‍💼 Enhanced user object:", enhancedUser);
                    
                    // Store authentication data
                    setAuthData(data.token, enhancedUser);
                    
                    // Create personalized welcome message
                    const userName = enhancedUser.username || enhancedUser.name || enhancedUser.first_name || 'User';
                    const roleDisplay = databaseRole.charAt(0).toUpperCase() + databaseRole.slice(1);
                    
                    console.log("👋 Welcome message for:", userName, "as", roleDisplay);
                    showMessage(`Welcome back, ${userName}! (${roleDisplay})`, 'success');
                    
                    // Log role-specific login
                    console.log("🚀 ROLE-BASED REDIRECT:");
                    console.log("- User:", userName);
                    console.log("- Email:", emailValue);
                    console.log("- Role:", databaseRole);
                    console.log("- Dashboard target:", 
                        databaseRole === 'admin' ? 'Admin Dashboard' :
                        databaseRole === 'registrar' ? 'Registrar Dashboard' :
                        databaseRole === 'faculty' ? 'Faculty Dashboard' :
                        'Student Dashboard'
                    );
                    
                    // Execute role-based redirection
                    redirectToDashboard(databaseRole, emailValue, enhancedUser);
                    
                } else {
                    console.log("❌ LOGIN FAILED");
                    console.log("Error message:", data.message);
                    console.log("Response success:", data.success);
                    console.log("HTTP status:", response.status);
                    
                    const errorMessage = data.message || 'Invalid email or password';
                    showMessage(errorMessage);
                }
                
            } catch (error) {
                console.error('🚨 LOGIN ERROR:', error);
                console.error('Error name:', error.name);
                console.error('Error message:', error.message);
                console.error('Error stack:', error.stack);
                
                // Enhanced error handling
                if (error.name === 'TypeError' && error.message.includes('fetch')) {
                    showMessage('Cannot connect to server. Please ensure the server is running on port 3006.');
                } else if (error.name === 'SyntaxError') {
                    showMessage('Server returned invalid response. Please try again.');
                } else {
                    showMessage('Login failed due to network error. Please try again.');
                }
            } finally {
                loginButton.textContent = originalText;
                loginButton.disabled = false;
                console.log("🔄 Login button restored");
            }
        });
    }
    
    // Global utility functions
    window.logout = function() {
        console.log("🚪 Logout initiated");
        clearAuthData();
        showMessage("You have been logged out successfully.", 'success');
        setTimeout(() => {
            window.location.href = './login.html';
        }, 1000);
    };
    
    window.getCurrentUser = function() {
        const userData = sessionStorage.getItem('userData');
        const user = userData ? JSON.parse(userData) : null;
        console.log("👤 Current user retrieved:", user);
        return user;
    };
    
    window.isAuthenticated = function() {
        const isAuth = sessionStorage.getItem('isAuthenticated') === 'true';
        const hasToken = sessionStorage.getItem('authToken') !== null;
        const hasUser = sessionStorage.getItem('userData') !== null;
        const result = isAuth && hasToken && hasUser;
        
        console.log("🔍 Authentication check:", { 
            isAuth, 
            hasToken, 
            hasUser, 
            result 
        });
        return result;
    };
    
    // Enhanced function to get user role with multiple fallbacks
    window.getUserRole = function() {
        // Try stored role first
        const storedRole = sessionStorage.getItem('userRole');
        if (storedRole) {
            console.log("🎭 Role from storage:", storedRole);
            return storedRole;
        }
        
        // Try user data role
        const userData = sessionStorage.getItem('userData');
        if (userData) {
            const user = JSON.parse(userData);
            if (user.role) {
                console.log("🎭 Role from user data:", user.role);
                return user.role.toLowerCase();
            }
        }
        
        console.log("🎭 Default role: student");
        return 'student';
    };
    
    // Enhanced server error handling
    window.handleServerError = function(error) {
        console.log("🚨 Server error handler:", error);
        
        const justLoggedIn = sessionStorage.getItem('justLoggedIn') === 'true';
        const loginTime = sessionStorage.getItem('loginTime');
        const timeSinceLogin = Date.now() - parseInt(loginTime || '0');
        
        if (justLoggedIn && timeSinceLogin < 10000) {
            console.log("⏭️ Ignoring server error - recent successful login");
            return;
        }
        
        showMessage('Server connection lost. Some features may not work properly.');
    };
    
    console.log("✅ LOGIN.JS LOADED - DATABASE ROLE AUTHENTICATION READY");
    console.log("🎯 Supported roles: admin, registrar, student");
    console.log("📊 Role priority: Database > Email pattern > Default (student)");
});