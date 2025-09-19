// FIXED Universal Socket Handler for All Dashboard Types
class UniversalSocketHandler {
    constructor() {
        this.socket = null;
        this.currentUser = null;
        this.isConnected = false;
        this.isAuthenticated = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.isInitializing = false;
        this.updatingBadge = false;
        this.bellInitialized = false;
        this.badgeUpdateTimeout = null;
        this.initTimeout = null;
    }

    // Add this method to the UniversalSocketHandler class
getDashboardType() {
    const currentPath = window.location.pathname.toLowerCase();
    
    if (currentPath.includes('admin')) return 'admin';
    if (currentPath.includes('registrar')) return 'registrar';  
    if (currentPath.includes('faculty')) return 'faculty';
    if (currentPath.includes('student')) return 'student';
    
    // Enhanced fallback detection for student dashboard
    if (document.querySelector('.nav-item[data-content="messages"]') || 
        document.querySelector('[data-content="messages"]')) return 'student';
    if (document.querySelector('.nav-item[data-section]')) return 'admin'; // or registrar/faculty
    
    // Check for student-specific elements
    if (document.querySelector('#messages') && 
        document.querySelector('#announcements') && 
        document.querySelector('#grades')) return 'student';
    
    return 'unknown';
}

    async init() {
        try {
            console.log('🚀 Initializing universal socket connection...');
            
            // Prevent multiple initialization attempts
            if (this.isInitializing) {
                console.log('⚠️ Already initializing, skipping...');
                return;
            }
            this.isInitializing = true;
            
            // Clear any existing timeout
            if (this.initTimeout) {
                clearTimeout(this.initTimeout);
            }
            
            // Get current user info with error handling
            await this.getCurrentUser();
            
            if (!this.currentUser) {
                console.log('❌ No user found, retrying in 3 seconds...');
                this.isInitializing = false;
                this.initTimeout = setTimeout(() => this.init(), 3000);
                return;
            }

            // Only create socket if not already connected
            if (!this.socket || !this.socket.connected) {
                // Disconnect existing socket if any
                if (this.socket) {
                    this.socket.disconnect();
                }
                
                // Initialize socket connection
                this.socket = io({
                    transports: ['websocket', 'polling'],
                    timeout: 10000,
                    reconnection: true,
                    reconnectionDelay: 2000,
                    reconnectionAttempts: 5,
                    forceNew: true // Force new connection
                });
                // FIXED: Initialize badge update immediately after authentication
this.socket.on('authenticated', (data) => {
    console.log('🔐 Socket authenticated for user:', data.userId);
    this.isAuthenticated = true;
    // Update badge immediately after authentication
    setTimeout(() => {
        this.updateNotificationBadge();
    }, 1000);
});
                this.setupEventListeners();
            }
            
            this.isInitializing = false;
            
        } catch (error) {
            console.error('❌ Socket initialization error:', error);
            this.isInitializing = false;
            this.scheduleReconnect();
        }
        
        // Initialize notification bell click handler ONCE
        if (!this.bellInitialized) {
            setTimeout(() => {
                this.initializeNotificationBell();
                this.bellInitialized = true;
            }, 2000);
        }
    }

    // FIXED: Enhanced getCurrentUser with better token handling
async getCurrentUser() {
    try {
        // FIXED: Check multiple token sources with proper priority
        let token = localStorage.getItem('token') || 
                   localStorage.getItem('authToken') ||
                   sessionStorage.getItem('token') ||
                   sessionStorage.getItem('authToken');
        
        if (!token) {
            console.log('⚠️ No authentication token found');
            // Try to get from cookies as fallback
            const cookies = document.cookie.split(';');
            for (let cookie of cookies) {
                const [name, value] = cookie.trim().split('=');
                if (name === 'token' || name === 'authToken') {
                    token = value;
                    break;
                }
            }
        }
        
        if (!token) {
            console.log('⚠️ No token found in any storage');
            return null;
        }
        
        console.log('🔑 Found token, fetching current user...');
        
        const response = await fetch('/api/messages/user/current', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
                this.currentUser = data.user;
                console.log('✅ Current user loaded for socket:', {
                    id: this.currentUser.id,
                    email: this.currentUser.email,
                    role: this.currentUser.role
                });
                
                // Store user data for faster future access
                localStorage.setItem('user', JSON.stringify(this.currentUser));
                
                return this.currentUser;
            } else {
                console.error('❌ Invalid user data response:', data);
                return null;
            }
        } else {
            console.error('❌ Failed to get current user:', response.status, response.statusText);
            if (response.status === 401 || response.status === 403) {
                this.clearTokens();
            }
            return null;
        }
    } catch (error) {
        console.error('❌ Error getting current user:', error);
        return null;
    }
}

    clearTokens() {
        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('user');
    }

    setupEventListeners() {
        if (!this.socket) return;

        // Remove existing listeners to prevent duplicates
        this.socket.off('connect');
        this.socket.off('disconnect');
        this.socket.off('connect_error');
        this.socket.off('authenticated');
        this.socket.off('newNotification');
        this.socket.off('updateNotificationCount');

        this.socket.on('connect', () => {
            console.log('✅ Connected to server with socket ID:', this.socket.id);
            this.isConnected = true;
            this.reconnectAttempts = 0;
            
            // Only authenticate once when connected
            if (!this.isAuthenticated && this.currentUser) {
                this.authenticateUser();
            }
        });

        this.socket.on('disconnect', (reason) => {
            console.log('⚠️ Disconnected from server:', reason);
            this.isConnected = false;
            this.isAuthenticated = false;
            
            // Don't auto-reconnect immediately to prevent spam
            if (reason === 'io server disconnect') {
                setTimeout(() => {
                    if (!this.isConnected) {
                        this.socket.connect();
                    }
                }, 3000);
            }
        });

        this.socket.on('connect_error', (error) => {
            console.error('❌ Connection error:', error);
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.scheduleReconnect();
            }
        });

        this.socket.on('authenticated', (data) => {
            console.log('🔐 Socket authenticated for user:', data.userId);
            this.isAuthenticated = true;
            // Update badge after authentication
            setTimeout(() => this.updateNotificationBadge(), 1500);
        });

        this.socket.on('newNotification', (notificationData) => {
            console.log('📢 New notification received:', notificationData);
            this.handleNewNotification(notificationData);
        });

        // FIXED: Better handling of badge count updates from server
this.socket.on('updateNotificationCount', (data) => {
    console.log('📊 Notification count update received from server:', data);
    
    // Prevent simultaneous badge updates
    if (this.updatingBadge) {
        console.log('⚠️ Badge update in progress, ignoring duplicate...');
        return;
    }
    
    // Update badge immediately with server data
    const badge = this.findNotificationBadge();
    if (badge && data && typeof data.total !== 'undefined') {
        const totalCount = parseInt(data.total) || 0;
        const displayCount = totalCount > 99 ? '99+' : totalCount.toString();
        
        // Always update badge with server data
        badge.textContent = displayCount;
        badge.style.display = totalCount > 0 ? 'flex' : 'none';
        
        if (totalCount > 0) {
            badge.style.animation = 'pulse 0.6s ease-in-out';
            setTimeout(() => {
                badge.style.animation = '';
            }, 600);
        }
        
        console.log('✅ Badge updated from server data to:', displayCount);
    } else {
        console.log('⚠️ Invalid badge update data:', data);
    }
});
    }

    authenticateUser() {
        if (this.socket && this.socket.connected && this.currentUser && !this.isAuthenticated) {
            console.log('🔐 Authenticating user:', this.currentUser.id, this.currentUser.email);
            this.socket.emit('authenticate', {
                userId: this.currentUser.id,
                email: this.currentUser.email
            });
        } else if (this.isAuthenticated) {
            console.log('✅ User already authenticated');
        } else {
            console.log('❌ Cannot authenticate - missing socket or user data');
        }
    }

    // REPLACE the existing handleNewNotification function in socket-handler.js
handleNewNotification(notificationData) {
    console.log('📢 Processing new notification:', notificationData);
    
    // Ensure we have proper notification data structure
    if (!notificationData || !notificationData.title) {
        console.error('❌ Invalid notification data received:', notificationData);
        return;
    }
    
    // Show toast notification
    this.showToastNotification(notificationData);
    
    // Show browser notification
    this.showBrowserNotification(notificationData);
    
    // Update badge for message, announcement, and enrollment notifications
    if (['message', 'announcement', 'enrollment'].includes(notificationData.type)) {
        setTimeout(() => {
            this.updateNotificationBadge();
        }, 500);
    }
    
    // Reload notifications if dropdown is open
    const dropdown = this.findNotificationDropdown();
    if (dropdown && (dropdown.style.display === 'block' || dropdown.classList.contains('show'))) {
        console.log('🔄 Dropdown is open, reloading notifications...');
        setTimeout(() => this.loadNotifications(), 1000);
    }
}

    // Universal notification dropdown finder with enhanced student detection
findNotificationDropdown() {
    // Try multiple selectors in order of priority
    let dropdown = document.getElementById('notificationDropdown');
    if (dropdown) return dropdown;
    
    dropdown = document.querySelector('.notification-dropdown');
    if (dropdown) return dropdown;
    
    dropdown = document.querySelector('[data-dropdown="notifications"]');
    if (dropdown) return dropdown;
    
    // Student dashboard specific selectors
    dropdown = document.querySelector('.notifications-dropdown');
    if (dropdown) return dropdown;
    
    dropdown = document.querySelector('.dropdown-menu');
    if (dropdown) return dropdown;
    
    return null;
}

    // Universal notification bell finder with enhanced student detection
findNotificationBell() {
    // Try multiple selectors in order of priority
    let bell = document.getElementById('notificationBell');
    if (bell) return bell;
    
    bell = document.querySelector('.notification-bell');
    if (bell) return bell;
    
    bell = document.querySelector('[data-bell="notifications"]');
    if (bell) return bell;
    
    // Student dashboard specific selectors
    bell = document.querySelector('.bell-icon');
    if (bell) return bell;
    
    bell = document.querySelector('.fa-bell');
    if (bell && bell.closest('button, a')) return bell.closest('button, a');
    
    return null;
}

    // Universal notification badge finder
    findNotificationBadge() {
        return document.getElementById('notificationBadge') || 
               document.querySelector('.notification-badge') ||
               document.querySelector('[data-badge="notifications"]');
    }

    // FIXED: Enhanced toast notification with better styling and interaction
showToastNotification(notification) {
    console.log('🍞 Showing toast notification:', notification.title);
    
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            pointer-events: none;
        `;
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = `toast-notification ${notification.type || 'message'}`;
    
    // UPDATED: New color scheme for toast notifications
    const getToastColor = (type) => {
        switch(type) {
            case 'message': return '#6366f1'; // Indigo
            case 'announcement': return '#f59e0b'; // Amber  
            case 'enrollment': return '#10b981'; // Emerald
            case 'grades': return '#ef4444'; // Red
            default: return '#6b7280'; // Gray
        }
    };
    
    toast.style.cssText = `
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        margin-bottom: 12px;
        padding: 0;
        border-left: 5px solid ${getToastColor(notification.type)};
        animation: slideInRight 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        max-width: 380px;
        min-width: 300px;
        pointer-events: auto;
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    `;
    
    // FIXED: Better message truncation and sender name display
    const displayMessage = notification.message && notification.message.length > 80 ? 
        notification.message.substring(0, 80) + '...' : (notification.message || 'New notification');
    
    const senderName = notification.senderName || notification.sender_name || 
                      (notification.data && notification.data.senderName) || 'System';
    
    toast.innerHTML = `
        <div class="toast-header" style="padding: 16px 20px 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f0f0f0;">
            <div style="display: flex; align-items: center;">
                <div style="width: 8px; height: 8px; background-color: ${getToastColor(notification.type)}; border-radius: 50%; margin-right: 8px;"></div>
                <strong style="color: #333; font-size: 15px; font-weight: 600;">${notification.title}</strong>
            </div>
            <button class="toast-close" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #999; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px;" onmouseover="this.style.backgroundColor='#f0f0f0'" onmouseout="this.style.backgroundColor='transparent'">&times;</button>
        </div>
        <div class="toast-body" style="padding: 12px 20px 16px; font-size: 14px; color: #666; line-height: 1.5;">
            ${displayMessage}
            ${notification.type === 'message' && senderName !== 'System' ? `<div style="margin-top: 8px; font-size: 12px; color: #999;">From: ${senderName}</div>` : ''}
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Add hover effects
    toast.addEventListener('mouseenter', () => {
        toast.style.transform = 'translateY(-2px) scale(1.02)';
        toast.style.boxShadow = '0 12px 32px rgba(0,0,0,0.2)';
    });
    
    toast.addEventListener('mouseleave', () => {
        toast.style.transform = 'translateY(0) scale(1)';
        toast.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
    });
    
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeToast(toast);
    });
    
    // Auto-remove after 8 seconds
    const autoRemoveTimer = setTimeout(() => {
        if (toast.parentElement) {
            this.removeToast(toast);
        }
    }, 8000);
    
    // FIND this section in the toast click handler and REPLACE it
toast.addEventListener('click', () => {
    clearTimeout(autoRemoveTimer);
    this.removeToast(toast);
    
    if (notification.type === 'message') {
        const senderId = notification.senderId || notification.sender_id ||
                       (notification.data && notification.data.senderId) ||
                       notification.conversationWith;
        
        if (senderId) {
            this.navigateToMessages(senderId);
        } else {
            this.navigateToMessages();
        }
    } else if (notification.type === 'announcement') {
        this.navigateToAnnouncements();
    } else if (notification.type === 'enrollment') {
        this.navigateToEnrollment();
    } else if (notification.type === 'grades') {
        // NEW: Navigate to grades section
        this.navigateToGrades();
    } else {
        this.navigateToDashboard();
    }
});
}

    removeToast(toast) {
        toast.style.animation = 'slideOutRight 0.4s cubic-bezier(0.55, 0.055, 0.675, 0.19)';
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 400);
    }

    // FIXED: Enhanced navigation to messages with conversation support
navigateToMessages(conversationUserId = null) {
    console.log('🔗 Navigating to messages with conversation:', conversationUserId);
    
    // IMPROVED: Better detection for different dashboard types
    const messagesNavSelectors = [
        // Student dashboard - uses data-content
        '.nav-item[data-content="messages"]',
        // Admin/Registrar/Faculty dashboards - uses data-section  
        '.nav-item[data-section="messages"]',
        // Fallback selectors
        '[data-section="messages"]',
        '[data-page="messages"]',
        '.nav-messages',
        'a[href*="message"]',
        'a[href="/messages"]',
        'a[href="/messages.html"]',
        'nav a[href*="message"]'
    ];
    
    let messagesNav = null;
    
    // Try each selector until we find one
    for (const selector of messagesNavSelectors) {
        messagesNav = document.querySelector(selector);
        if (messagesNav) {
            console.log('🎯 Found messages navigation with selector:', selector);
            break;
        }
    }
    
    if (messagesNav) {
        console.log('🎯 Found messages navigation, clicking...');
        messagesNav.click();
        
        // Wait for messages page to load, then try to open specific conversation
        if (conversationUserId && conversationUserId !== 'null') {
            setTimeout(() => {
                this.selectConversation(conversationUserId);
            }, 1000);
        }
    } else {
        console.log('❌ No messages navigation found, trying URL fallback');
        // Fallback - try direct URL navigation based on current path
        const currentPath = window.location.pathname;
        let targetUrl = '/messages.html';
        
        // Determine correct messages URL based on current dashboard
        if (currentPath.includes('AdminSide')) {
            targetUrl = '/AdminSide/messages.html';
        } else if (currentPath.includes('RegistrarSide')) {
            targetUrl = '/RegistrarSide/messages.html';
        } else if (currentPath.includes('FacultySide')) {
            targetUrl = '/FacultySide/messages.html';
        } else if (currentPath.includes('StudentSide')) {
            // For student dashboard, we don't navigate to separate page, just activate section
            const messagesSection = document.getElementById('messages') || document.querySelector('[data-content="messages"]');
            if (messagesSection) {
                // Activate messages section
                document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
                document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
                
                const messagesNavItem = document.querySelector('.nav-item[data-content="messages"]');
                const messagesContentSection = document.getElementById('messages');
                
                if (messagesNavItem) messagesNavItem.classList.add('active');
                if (messagesContentSection) messagesContentSection.classList.add('active');
                
                console.log('✅ Activated messages section for student dashboard');
                return;
            }
        }
        
        if (conversationUserId && conversationUserId !== 'null') {
            targetUrl += `?conversation=${conversationUserId}`;
        }
        
        console.log('🔗 Fallback navigation to:', targetUrl);
        window.location.href = targetUrl;
    }
}

// NEW: Enhanced navigation to announcements with dashboard support
navigateToAnnouncements() {
    console.log('📢 Navigating to announcements');
    
    // IMPROVED: Better detection for different dashboard types
    const announcementsNavSelectors = [
        // Student dashboard - uses data-content
        '.nav-item[data-content="announcements"]',
        // Admin/Registrar/Faculty dashboards - uses data-section  
        '.nav-item[data-section="announcements"]',
        // Fallback selectors
        '[data-section="announcements"]',
        '[data-page="announcements"]',
        '.nav-announcements',
        'a[href*="announcement"]',
        'a[href="/announcements"]',
        'a[href="/announcements.html"]',
        'nav a[href*="announcement"]'
    ];
    
    let announcementsNav = null;
    
    // Try each selector until we find one
    for (const selector of announcementsNavSelectors) {
        announcementsNav = document.querySelector(selector);
        if (announcementsNav) {
            console.log('🎯 Found announcements navigation with selector:', selector);
            break;
        }
    }
    
    if (announcementsNav) {
        console.log('🎯 Found announcements navigation, clicking...');
        announcementsNav.click();
    } else {
        console.log('❌ No announcements navigation found, trying URL fallback');
        // Fallback - try direct URL navigation based on current path
        const currentPath = window.location.pathname;
        let targetUrl = '/announcements.html';
        
        // Determine correct announcements URL based on current dashboard
        if (currentPath.includes('AdminSide')) {
            targetUrl = '/AdminSide/announcements.html';
        } else if (currentPath.includes('RegistrarSide')) {
            targetUrl = '/RegistrarSide/announcements.html';
        } else if (currentPath.includes('FacultySide')) {
            targetUrl = '/FacultySide/announcements.html';
        } else if (currentPath.includes('StudentSide')) {
            // For student dashboard, we don't navigate to separate page, just activate section
            const announcementsSection = document.getElementById('announcements') || 
                                       document.querySelector('[data-content="announcements"]');
            if (announcementsSection) {
                // Activate announcements section
                document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
                document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
                
                const announcementsNavItem = document.querySelector('.nav-item[data-content="announcements"]');
                const announcementsContentSection = document.getElementById('announcements');
                
                if (announcementsNavItem) announcementsNavItem.classList.add('active');
                if (announcementsContentSection) announcementsContentSection.classList.add('active');
                
                console.log('✅ Activated announcements section for student dashboard');
                return;
            }
        }
        
        console.log('🔗 Fallback navigation to:', targetUrl);
        window.location.href = targetUrl;
    }
}

// ADD this new method to the UniversalSocketHandler class in socket-handler.js
navigateToEnrollment() {
    console.log('🎓 Navigating to enrollment');
    
    // Try to find enrollment navigation elements
    const enrollmentNavSelectors = [
        '.nav-item[data-content="enroll"]',
        '.nav-item[data-content="enrollment"]', 
        '.nav-item[data-section="enrollment"]',
        '[data-section="enrollment"]',
        '.nav-enrollment',
        'a[href*="enroll"]'
    ];
    
    let enrollmentNav = null;
    
    for (const selector of enrollmentNavSelectors) {
        enrollmentNav = document.querySelector(selector);
        if (enrollmentNav) {
            console.log('🎯 Found enrollment navigation with selector:', selector);
            break;
        }
    }
    
    if (enrollmentNav) {
        console.log('🎯 Found enrollment navigation, clicking...');
        enrollmentNav.click();
    } else {
        // For student dashboard, just go to dashboard as enrollment info is usually there
        console.log('📍 No specific enrollment nav found, going to dashboard');
        const dashboardNav = document.querySelector('.nav-item[data-content="dashboard"]') || 
                           document.querySelector('[data-section="dashboard"]');
        if (dashboardNav) {
            dashboardNav.click();
        }
    }
    
}

// ADD this new method after navigateToMessages function
navigateToGrades() {
    console.log('📊 Navigating to grades');
    
    const gradesNavSelectors = [
        // Student dashboard - uses data-content
        '.nav-item[data-content="grades"]',
        // Admin/Registrar/Faculty dashboards - uses data-section  
        '.nav-item[data-section="grades"]',
        // Fallback selectors
        '[data-section="grades"]',
        '[data-page="grades"]',
        '.nav-grades',
        'a[href*="grade"]',
        'a[href="/grades"]',
        'a[href="/grades.html"]'
    ];
    
    let gradesNav = null;
    
    for (const selector of gradesNavSelectors) {
        gradesNav = document.querySelector(selector);
        if (gradesNav) {
            console.log('🎯 Found grades navigation with selector:', selector);
            break;
        }
    }
    
    if (gradesNav) {
        console.log('🎯 Found grades navigation, clicking...');
        gradesNav.click();
    } else {
        console.log('❌ No grades navigation found, trying URL fallback');
        const currentPath = window.location.pathname;
        let targetUrl = '/grades.html';
        
        if (currentPath.includes('AdminSide')) {
            targetUrl = '/AdminSide/grades.html';
        } else if (currentPath.includes('RegistrarSide')) {
            targetUrl = '/RegistrarSide/grades.html';
        } else if (currentPath.includes('FacultySide')) {
            targetUrl = '/FacultySide/grades.html';
        } else if (currentPath.includes('StudentSide')) {
            // For student dashboard, activate grades section
            const gradesSection = document.getElementById('grades') || 
                                document.querySelector('[data-content="grades"]');
            if (gradesSection) {
                document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
                document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
                
                const gradesNavItem = document.querySelector('.nav-item[data-content="grades"]');
                const gradesContentSection = document.getElementById('grades');
                
                if (gradesNavItem) gradesNavItem.classList.add('active');
                if (gradesContentSection) gradesContentSection.classList.add('active');
                
                console.log('✅ Activated grades section for student dashboard');
                return;
            }
        }
        
        console.log('🔗 Fallback navigation to:', targetUrl);
        window.location.href = targetUrl;
    }
}

// ENHANCED: Better navigation to dashboard for enrollment notifications
navigateToDashboard() {
    console.log('📍 Navigating to dashboard for enrollment notification');
    
    const dashboardNavSelectors = [
        '.nav-item[data-content="dashboard"]',
        '.nav-item[data-section="dashboard"]', 
        '[data-section="dashboard"]',
        '.nav-dashboard',
        'a[href*="dashboard"]'
    ];
    
    let dashboardNav = null;
    
    for (const selector of dashboardNavSelectors) {
        dashboardNav = document.querySelector(selector);
        if (dashboardNav) {
            console.log('🎯 Found dashboard navigation with selector:', selector);
            break;
        }
    }
    
    if (dashboardNav) {
        console.log('🎯 Found dashboard navigation, clicking...');
        dashboardNav.click();
    } else {
        console.log('📍 No dashboard nav found, reloading current page');
        window.location.reload();
    }
}

// FIXED: New method to select conversation
selectConversation(userId) {
    console.log('🎯 Attempting to select conversation with user:', userId);
    
    // Try multiple approaches to find and select the conversation
    const conversationSelectors = [
        `[data-user-id="${userId}"]`,
        `[data-conversation-id="${userId}"]`,
        `.contact-item[data-user-id="${userId}"]`,
        `.conversation-item[data-user-id="${userId}"]`
    ];
    
    let conversationElement = null;
    
    for (const selector of conversationSelectors) {
        conversationElement = document.querySelector(selector);
        if (conversationElement) {
            console.log('🎯 Found conversation element with selector:', selector);
            break;
        }
    }
    
    if (conversationElement) {
        conversationElement.click();
        return true;
    }
    
    // Alternative: Try to find by text content or other attributes
    const allContactItems = document.querySelectorAll('.contact-item, .conversation-item, [class*="contact"], [class*="conversation"]');
    for (const item of allContactItems) {
        const itemUserId = item.getAttribute('data-user-id') || 
                          item.getAttribute('data-conversation-id') ||
                          item.querySelector('[data-user-id]')?.getAttribute('data-user-id');
        
        if (itemUserId == userId) {
            console.log('🎯 Found conversation by attribute search');
            item.click();
            return true;
        }
    }
    
    // Global function fallbacks
    if (typeof window.loadConversation === 'function') {
        console.log('🎯 Using global loadConversation function');
        window.loadConversation(userId);
        return true;
    } else if (typeof window.selectContact === 'function') {
        console.log('🎯 Using global selectContact function');
        window.selectContact(userId);
        return true;
    }
    
    console.log('❌ Could not find conversation element for user:', userId);
    return false;
}

    // FIXED: Enhanced browser notification with better formatting
    showBrowserNotification(notification) {
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                const browserNotification = new Notification(notification.title, {
                    body: notification.message + (notification.senderName ? `\nFrom: ${notification.senderName}` : ''),
                    icon: '/Images/gardner logo.png',
                    tag: `notification-${notification.id}`,
                    requireInteraction: false,
                    badge: '/Images/gardner logo.png'
                });
                
                // Auto-close after 6 seconds
                setTimeout(() => {
                    browserNotification.close();
                }, 6000);
                
                // Handle click
browserNotification.onclick = () => {
    window.focus();
    if (notification.type === 'message') {
        this.navigateToMessages(notification.senderId || notification.conversationWith);
    } else if (notification.type === 'announcement') {
        this.navigateToAnnouncements();
    }
    browserNotification.close();
};
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        this.showBrowserNotification(notification);
                    }
                });
            }
        }
    }

    // FIXED: Optimized badge update with better error handling and immediate display
async updateNotificationBadge() {
    // Prevent multiple simultaneous badge updates
    if (this.updatingBadge) {
        console.log('⚠️ Badge update already in progress, skipping...');
        return;
    }
    this.updatingBadge = true;
    
    try {
        const token = localStorage.getItem('token') || 
                     localStorage.getItem('authToken') ||
                     sessionStorage.getItem('token') ||
                     sessionStorage.getItem('authToken');
        
        if (!token) {
            console.log('⚠️ No token for badge update');
            this.updatingBadge = false;
            return;
        }
        
        const response = await fetch('/api/messages/notifications/counts', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('📊 Badge data received:', data);
            
            // Update main notification badge
            const badge = this.findNotificationBadge();
            if (badge) {
                const totalCount = data.total || 0;
                const displayCount = totalCount > 99 ? '99+' : totalCount.toString();
                
                // Always update the badge, even if count is the same (for real-time updates)
                badge.textContent = displayCount;
                badge.style.display = totalCount > 0 ? 'flex' : 'none';
                
                // Add animation for new updates
                if (totalCount > 0) {
                    badge.style.animation = 'pulse 0.6s ease-in-out';
                    setTimeout(() => {
                        badge.style.animation = '';
                    }, 600);
                }
                
                console.log('✅ Badge updated to:', displayCount);
            } else {
                console.log('⚠️ Badge element not found');
            }
            
            // Update message badges specifically
            const messageBadges = document.querySelectorAll('.message-badge, [data-badge="messages"]');
            messageBadges.forEach(messageBadge => {
                const messageCount = data.counts?.message || 0;
                const displayMessageCount = messageCount > 99 ? '99+' : messageCount.toString();
                
                messageBadge.textContent = displayMessageCount;
                messageBadge.style.display = messageCount > 0 ? 'inline' : 'none';
            });
            
        } else {
            console.error('❌ Failed to fetch notification counts:', response.status);
        }
    } catch (error) {
        console.error('❌ Error updating notification badge:', error);
    } finally {
        this.updatingBadge = false;
    }
}

    // FIXED: Enhanced notification loading with better error handling
async loadNotifications() {
    try {
        const token = localStorage.getItem('token') || 
                     localStorage.getItem('authToken') ||
                     sessionStorage.getItem('token') ||
                     sessionStorage.getItem('authToken');
        
        if (!token) {
            console.log('⚠️ No token for loading notifications');
            return;
        }

        console.log('📥 Loading notifications...');
        const response = await fetch('/api/notifications?limit=20&offset=0', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('📋 Notifications loaded:', data);
            
            if (data.notifications && data.notifications.length > 0) {
                this.displayNotifications(data.notifications);
            } else {
                // Show empty state
                const notificationList = document.getElementById('notificationList') ||
                                       document.querySelector('.notification-list');
                if (notificationList) {
                    notificationList.innerHTML = `
                        <div class="no-notifications" style="padding: 30px; text-align: center; color: #666;">
                            <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;">🔔</div>
                            <p style="margin: 0; font-size: 16px; font-weight: 500;">No notifications yet</p>
                            <p style="margin: 4px 0 0 0; font-size: 14px; color: #999;">You'll see new messages and updates here</p>
                        </div>
                    `;
                }
            }
        } else {
            console.error('❌ Failed to load notifications:', response.status);
            const errorData = await response.text();
            console.error('Error response:', errorData);
        }
    } catch (error) {
        console.error('❌ Error loading notifications:', error);
    }
}

    // UPDATED: Enhanced notification display with NEW ICONS and COLORS for all 4 notification types
displayNotifications(notifications) {
    const notificationList = document.getElementById('notificationList') ||
                           document.querySelector('.notification-list');
    
    if (!notificationList) {
        console.log('⚠️ Notification list element not found');
        return;
    }

    if (notifications.length === 0) {
        notificationList.innerHTML = `
            <div class="no-notifications" style="padding: 30px; text-align: center; color: #666;">
                <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;">🔔</div>
                <p style="margin: 0; font-size: 16px; font-weight: 500;">No new notifications</p>
                <p style="margin: 4px 0 0 0; font-size: 14px; color: #999;">You're all caught up!</p>
            </div>
        `;
        return;
    }

    console.log('📋 Displaying notifications:', notifications.length);

    const notificationsHtml = notifications.map(notification => {
    const timeAgo = this.getTimeAgo(new Date(notification.created_at));
    const isUnread = !notification.read_at && !notification.is_read;
    
    // FIXED: Better data parsing and sender ID extraction
    let notificationData = {};
    let senderId = null;
    
    try {
        notificationData = typeof notification.data === 'string' ? 
            JSON.parse(notification.data) : (notification.data || {});
        
        // Extract sender ID from multiple sources
        senderId = notification.senderId || 
                  notification.sender_id ||
                  notificationData.senderId ||
                  notificationData.sender_id ||
                  notification.conversationWith;
                  
    } catch (e) {
        console.warn('Error parsing notification data:', e);
    }
    
    // UPDATED: New icon and color mapping for 4 notification types
    const getNotificationIcon = (type) => {
        switch(type) {
            case 'message': return 'fa-comments'; // Changed from fa-envelope to fa-comments
            case 'announcement': return 'fa-bullhorn'; // Changed from fa-bell to fa-bullhorn
            case 'enrollment': return 'fa-user-plus'; // Changed from fa-bell to fa-user-plus
            case 'grades': return 'fa-chart-line'; // Changed from fa-bell to fa-chart-line
            default: return 'fa-info-circle'; // Default fallback
        }
    };
    
    const getNotificationColor = (type) => {
        switch(type) {
            case 'message': return '#6366f1'; // Indigo - modern purple-blue
            case 'announcement': return '#f59e0b'; // Amber - warm orange-yellow
            case 'enrollment': return '#10b981'; // Emerald - fresh green
            case 'grades': return '#ef4444'; // Red - attention-grabbing red
            default: return '#6b7280'; // Gray - neutral fallback
        }
    };
    
    const iconClass = getNotificationIcon(notification.type);
    const iconColor = getNotificationColor(notification.type);
    
    return `
        <div class="notification-item ${isUnread ? 'unread' : ''}" 
             data-id="${notification.id}" 
             data-conversation-with="${senderId || ''}"
             data-type="${notification.type}"
             style="padding: 16px; border-bottom: 1px solid #f0f0f0; cursor: pointer; transition: all 0.3s ease; ${isUnread ? 'background: linear-gradient(90deg, #f8f9ff 0%, #ffffff 100%);' : 'background: white;'} position: relative;"
             onmouseover="this.style.backgroundColor='#f8f9fa'; this.style.transform='translateX(4px)'"
             onmouseout="this.style.backgroundColor='${isUnread ? '#f8f9ff' : 'white'}'; this.style.transform='translateX(0)'">
            <div style="display: flex; align-items: flex-start;">
                <div style="margin-right: 16px; color: ${iconColor}; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; background-color: ${iconColor}15; border-radius: 50%; flex-shrink: 0;">
                    <i class="fas ${iconClass}" style="font-size: 12px;"></i>
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: ${isUnread ? '600' : '500'}; margin-bottom: 6px; font-size: 15px; color: ${isUnread ? '#1a1a1a' : '#333'}; line-height: 1.4;">${notification.title}</div>
                    <div style="color: #666; font-size: 14px; margin-bottom: 8px; line-height: 1.4; word-wrap: break-word;">${notification.message}</div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="color: #999; font-size: 12px;">${timeAgo}</div>
                        ${notification.type === 'message' ? '<div style="color: #6366f1; font-size: 12px; font-weight: 500;">Message</div>' : ''}
                        ${notification.type === 'announcement' ? '<div style="color: #f59e0b; font-size: 12px; font-weight: 500;">Announcement</div>' : ''}
                        ${notification.type === 'enrollment' ? '<div style="color: #10b981; font-size: 12px; font-weight: 500;">Enrollment</div>' : ''}
                        ${notification.type === 'grades' ? '<div style="color: #ef4444; font-size: 12px; font-weight: 500;">Grades</div>' : ''}
                    </div>
                </div>
                ${isUnread ? `<div style="width: 10px; height: 10px; background: linear-gradient(135deg, ${iconColor}, ${iconColor}cc); border-radius: 50%; margin-left: 12px; margin-top: 8px; flex-shrink: 0; box-shadow: 0 0 0 2px white;"></div>` : ''}
            </div>
            ${isUnread ? `<div style="position: absolute; left: 0; top: 0; width: 3px; height: 100%; background: linear-gradient(180deg, ${iconColor}, ${iconColor}cc); border-radius: 0 2px 2px 0;"></div>` : ''}
        </div>
    `;
}).join('');

    notificationList.innerHTML = notificationsHtml;

    // UPDATED: Add click handlers with enhanced functionality for announcements
notificationList.querySelectorAll('.notification-item').forEach(item => {
    item.addEventListener('click', () => {
        const notificationId = item.dataset.id;
        const notificationType = item.dataset.type;
        const conversationWith = item.dataset.conversationWith;
        const isUnread = item.classList.contains('unread');
        
        console.log('🔗 Notification clicked:', { 
            notificationId, 
            notificationType, 
            conversationWith, 
            isUnread 
        });
        
        // Mark as read with visual feedback
        if (isUnread) {
            this.markNotificationAsRead(notificationId);
            item.classList.remove('unread');
            
            // Smooth transition to read state
            item.style.transition = 'all 0.5s ease';
            item.style.background = 'white';
            
            // Update badge after marking as read
            setTimeout(() => this.updateNotificationBadge(), 500);
        }
        
        // Handle different notification types
        if (notificationType === 'message') {
            // Navigate to messages
            if (conversationWith && conversationWith !== '' && conversationWith !== 'null') {
                console.log('🎯 Navigating to conversation with user:', conversationWith);
                this.navigateToMessages(conversationWith);
            } else {
                this.navigateToMessages();
            }
        } else if (notificationType === 'announcement') {
            // Navigate to announcements
            console.log('📢 Navigating to announcements page');
            this.navigateToAnnouncements();
        } else if (notificationType === 'enrollment') {
            // Navigate to enrollment
            console.log('🎓 Navigating to enrollment page');
            this.navigateToEnrollment();
        } else if (notificationType === 'grades') {
            // Navigate to grades
            console.log('📊 Navigating to grades page');
            this.navigateToGrades();
        }
        
        // Close dropdown after click
        const dropdown = this.findNotificationDropdown();
        if (dropdown) {
            dropdown.style.opacity = '0';
            dropdown.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                dropdown.style.display = 'none';
            }, 200);
        }
    });
});
}



    // FIXED: Enhanced notification bell initialization with better event handling
initializeNotificationBell() {
    const notificationBell = this.findNotificationBell();
    const notificationDropdown = this.findNotificationDropdown();
    
    if (!notificationBell || !notificationDropdown) {
        console.log('Notification bell or dropdown not found, retrying...', {
            bell: !!notificationBell,
            dropdown: !!notificationDropdown
        });
        
        // Enhanced retry logic with longer delay for student dashboard
        setTimeout(() => {
            if (!this.bellInitialized) {
                this.initializeNotificationBell();
            }
        }, 5000); // Increased delay for student dashboard
        return;
    }
    
    // Ensure dropdown has proper styling for student dashboard
    if (this.getDashboardType() === 'student') {
        notificationDropdown.style.maxHeight = '400px';
        notificationDropdown.style.overflowY = 'auto';
        notificationDropdown.style.width = '380px';
        notificationDropdown.style.position = 'absolute';
        notificationDropdown.style.zIndex = '9999';
        notificationDropdown.style.backgroundColor = 'white';
        notificationDropdown.style.border = '1px solid #e0e0e0';
        notificationDropdown.style.borderRadius = '8px';
        notificationDropdown.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        
        // Ensure notification list inside has proper scrolling
        const notificationList = notificationDropdown.querySelector('.notification-list') || 
                               notificationDropdown.querySelector('#notificationList');
        if (notificationList) {
            notificationList.style.maxHeight = '350px';
            notificationList.style.overflowY = 'auto';
        }
    }
    
    // Remove existing listeners to prevent duplicates
    const newBell = notificationBell.cloneNode(true);
    notificationBell.parentNode.replaceChild(newBell, notificationBell);

    
    // Add enhanced click handler to the new bell
        newBell.addEventListener('click', (e) => {
        e.stopPropagation();
        
        const isVisible = notificationDropdown.style.display === 'block';
        
        if (isVisible) {
            // Hide dropdown with animation
            notificationDropdown.style.opacity = '0';
            notificationDropdown.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                notificationDropdown.style.display = 'none';
            }, 200);
        } else {
            // Show dropdown with animation
            notificationDropdown.style.display = 'block';
            notificationDropdown.style.opacity = '0';
            notificationDropdown.style.transform = 'translateY(-10px)';
            notificationDropdown.style.transition = 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            
            // For student dashboard, ensure proper positioning
            if (this.getDashboardType() === 'student') {
                const rect = newBell.getBoundingClientRect();
                notificationDropdown.style.top = (rect.bottom + 5) + 'px';
                notificationDropdown.style.right = (window.innerWidth - rect.right) + 'px';
            }
            
            // Trigger animation
            requestAnimationFrame(() => {
                notificationDropdown.style.opacity = '1';
                notificationDropdown.style.transform = 'translateY(0)';
            });
            
            this.loadNotifications();
        }
    });

    
    // FIXED: Initialize Clear All button
    const clearAllBtn = document.getElementById('clearAllBtn') ||
                       notificationDropdown.querySelector('.clear-all');
    
    if (clearAllBtn) {
        // Remove existing listeners
        const newClearAllBtn = clearAllBtn.cloneNode(true);
        clearAllBtn.parentNode.replaceChild(newClearAllBtn, clearAllBtn);
        
        newClearAllBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Add loading state
            newClearAllBtn.textContent = 'Clearing...';
            newClearAllBtn.style.opacity = '0.6';
            
            this.clearAllNotifications().then(() => {
                newClearAllBtn.textContent = 'Clear All';
                newClearAllBtn.style.opacity = '1';
            }).catch(() => {
                newClearAllBtn.textContent = 'Clear All';
                newClearAllBtn.style.opacity = '1';
            });
        });
    }
    
    // Close dropdown when clicking outside with improved detection
    document.addEventListener('click', (e) => {
        if (!newBell.contains(e.target) && !notificationDropdown.contains(e.target)) {
            if (notificationDropdown.style.display === 'block') {
                notificationDropdown.style.opacity = '0';
                notificationDropdown.style.transform = 'translateY(-10px)';
                setTimeout(() => {
                    notificationDropdown.style.display = 'none';
                }, 200);
            }
        }
    });
    
    console.log('✅ Notification bell initialized successfully with enhanced features');
}

    // Mark all notifications as read
    async markAllNotificationsAsRead() {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('authToken');
            if (!token) return;

            await fetch('/api/notifications/read-all', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            this.updateNotificationBadge();
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    }

    // FIXED: Clear all notifications functionality
async clearAllNotifications() {
    try {
        const token = localStorage.getItem('token') || 
                     localStorage.getItem('authToken') ||
                     sessionStorage.getItem('token') ||
                     sessionStorage.getItem('authToken');
        
        if (!token) {
            console.log('⚠️ No token for clearing notifications');
            return;
        }

        const response = await fetch('/api/notifications/read-all', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            console.log('✅ All notifications cleared');
            
            // Update badge immediately
            const badge = this.findNotificationBadge();
            if (badge) {
                badge.textContent = '0';
                badge.style.display = 'none';
            }
            
            // Reload notifications list
            setTimeout(() => this.loadNotifications(), 500);
            
            // Show success toast
            this.showToastNotification({
                type: 'system',
                title: 'Notifications Cleared',
                message: 'All notifications have been marked as read',
                senderName: 'System'
            });
            
        } else {
            console.error('❌ Failed to clear notifications:', response.status);
        }
    } catch (error) {
        console.error('❌ Error clearing notifications:', error);
    }
}

    async markNotificationAsRead(notificationId) {
        try {
            const token = localStorage.getItem('token') || 
                         localStorage.getItem('authToken') ||
                         sessionStorage.getItem('token') ||
                         sessionStorage.getItem('authToken');
            if (!token) return;

            await fetch(`/api/notifications/${notificationId}/read`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`✅ Notification ${notificationId} marked as read`);
        } catch (error) {
            console.error('❌ Error marking notification as read:', error);
        }
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        return `${Math.floor(diffInSeconds / 604800)}w ago`;
    }

    scheduleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
            console.log(`⏰ Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
            setTimeout(() => this.init(), delay);
        } else {
            console.log('❌ Max reconnection attempts reached');
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
            this.isAuthenticated = false;
        }
        
        if (this.initTimeout) {
            clearTimeout(this.initTimeout);
        }
        
        if (this.badgeUpdateTimeout) {
            clearTimeout(this.badgeUpdateTimeout);
        }
    }
}

// Global socket handler instance
window.universalSocketHandler = new UniversalSocketHandler();

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add required CSS with enhanced animations
    if (!document.getElementById('socket-toast-styles')) {
        const toastStyles = document.createElement('style');
        toastStyles.id = 'socket-toast-styles';
        toastStyles.textContent = `
            @keyframes slideInRight {
                from { 
                    transform: translateX(100%); 
                    opacity: 0; 
                }
                to { 
                    transform: translateX(0); 
                    opacity: 1; 
                }
            }
            @keyframes slideOutRight {
                from { 
                    transform: translateX(0); 
                    opacity: 1; 
                }
                to { 
                    transform: translateX(100%); 
                    opacity: 0; 
                }
            }
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
            .toast-notification {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .notification-item:hover {
                background-color: #f8f9fa !important;
                transform: translateX(4px);
            }
            .notification-dropdown {
                transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            }
        `;
        document.head.appendChild(toastStyles);
    }
    
    // Initialize socket with delay to ensure other scripts load first
    setTimeout(() => {
        window.universalSocketHandler.init();
    }, 2000);
});

// Handle page visibility changes for better connection management
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.universalSocketHandler && !window.universalSocketHandler.isConnected) {
        console.log('🔄 Page became visible, reinitializing socket...');
        window.universalSocketHandler.init();
    }
});

// Handle beforeunload to cleanup
window.addEventListener('beforeunload', () => {
    if (window.universalSocketHandler) {
        window.universalSocketHandler.disconnect();
    }
});
