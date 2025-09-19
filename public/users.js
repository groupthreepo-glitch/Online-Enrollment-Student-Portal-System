// users.js - Enhanced User Management Frontend Logic

class UserManager {
    constructor() {
        this.users = [];
        this.filteredUsers = [];
        this.currentFilter = 'all';
        this.currentSearch = '';
        this.token = null;
        this.pendingDeleteUser = null;
        this.init();
    }

    init() {
        if (!this.checkAuth()) {
            return; // Stop initialization if auth fails
        }
        this.setupEventListeners();
        this.loadUsers();
    }

    checkAuth() {
        // Check authentication using sessionStorage (consistent with your main auth system)
        const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
        const authToken = sessionStorage.getItem('authToken');
        const userData = sessionStorage.getItem('userData');
        
        if (!isAuthenticated || !authToken || !userData) {
            console.log("❌ UserManager: Not authenticated, redirecting to login...");
            window.location.href = '/login.html';
            return false;
        }

        // Check if user is admin (since this is user management)
        try {
            const user = JSON.parse(userData);
            if (user.role !== 'admin') {
                console.log("❌ UserManager: Access denied - not an admin");
                alert('Access denied. User management requires admin privileges.');
                window.location.href = '/login.html';
                return false;
            }
        } catch (error) {
            console.error("❌ UserManager: Error parsing user data:", error);
            window.location.href = '/login.html';
            return false;
        }

        // Set token for API requests
        this.token = authToken;
        return true;
    }

    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentSearch = e.target.value;
                this.filterAndDisplayUsers();
            });
        }

        // Filter buttons
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remove active class from all buttons
                filterButtons.forEach(b => b.classList.remove('active'));
                // Add active class to clicked button
                e.target.classList.add('active');
                
                this.currentFilter = e.target.dataset.role;
                this.filterAndDisplayUsers();
            });
        });

        // Add user button
        const addUserBtn = document.getElementById('addUserBtn');
        if (addUserBtn) {
            addUserBtn.addEventListener('click', () => {
                this.openAddUserModal();
            });
        }

        // Add user form
        const addUserForm = document.getElementById('addUserForm');
        if (addUserForm) {
            addUserForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddUser();
            });
        }

        // Modal close on background click
        const addUserModal = document.getElementById('addUserModal');
        if (addUserModal) {
            addUserModal.addEventListener('click', (e) => {
                if (e.target.id === 'addUserModal') {
                    this.closeAddUserModal();
                }
            });
        }

        const deleteModal = document.getElementById('deleteConfirmModal');
        if (deleteModal) {
            deleteModal.addEventListener('click', (e) => {
                if (e.target.id === 'deleteConfirmModal') {
                    this.closeDeleteModal();
                }
            });
        }

        // Confirm delete button
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', () => {
                this.confirmDeleteUser();
            });
        }

        // Enhanced form validation
        this.setupFormValidation();
    }

    setupFormValidation() {
        const form = document.getElementById('addUserForm');
        if (!form) return;

        const inputs = form.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });
    }

    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';

        switch (field.name) {
            case 'firstName':
            case 'lastName':
                if (!value) {
                    isValid = false;
                    errorMessage = 'This field is required';
                } else if (value.length < 2) {
                    isValid = false;
                    errorMessage = 'Must be at least 2 characters';
                }
                break;
            
            case 'username':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Username is required';
                } else if (value.length < 3) {
                    isValid = false;
                    errorMessage = 'Username must be at least 3 characters';
                } else if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
                    isValid = false;
                    errorMessage = 'Username can only contain letters, numbers, hyphens, and underscores';
                }
                break;
            
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!value) {
                    isValid = false;
                    errorMessage = 'Email is required';
                } else if (!emailRegex.test(value)) {
                    isValid = false;
                    errorMessage = 'Please enter a valid email address';
                }
                break;
            
            case 'password':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Password is required';
                } else if (value.length < 6) {
                    isValid = false;
                    errorMessage = 'Password must be at least 6 characters';
                }
                break;
            
            case 'role':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Please select a role';
                }
                break;
        }

        if (!isValid) {
            this.showFieldError(field, errorMessage);
        } else {
            this.clearFieldError(field);
        }

        return isValid;
    }

    showFieldError(field, message) {
        this.clearFieldError(field);
        
        field.style.borderColor = '#e74c3c';
        field.style.backgroundColor = '#fdf2f2';
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.style.cssText = `
            color: #e74c3c;
            font-size: 0.85rem;
            margin-top: 5px;
            display: flex;
            align-items: center;
            gap: 5px;
        `;
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i>${message}`;
        
        field.parentElement.appendChild(errorDiv);
    }

    clearFieldError(field) {
        field.style.borderColor = '#e1e8ed';
        field.style.backgroundColor = '#f8f9fa';
        
        const existingError = field.parentElement.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
    }

    async loadUsers() {
        try {
            this.showLoading(true);
            
            const response = await fetch('/api/users/all', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle authentication errors
                if (response.status === 401) {
                    console.log("🔒 UserManager: Authentication expired");
                    sessionStorage.clear();
                    window.location.href = '/login.html';
                    return;
                }
                throw new Error(data.message || 'Failed to load users');
            }

            if (data.success) {
                this.users = data.users;
                this.updateStats(data.counts);
                this.filterAndDisplayUsers();
            } else {
                throw new Error(data.message || 'Failed to load users');
            }

        } catch (error) {
            console.error('Error loading users:', error);
            this.showError('Failed to load users: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    updateStats(counts) {
        const studentCount = document.getElementById('studentCount');
        const facultyCount = document.getElementById('facultyCount');
        const registrarCount = document.getElementById('registrarCount');
        const adminCount = document.getElementById('adminCount');
        const totalCount = document.getElementById('totalCount');

        if (studentCount) studentCount.textContent = counts.student || 0;
        if (facultyCount) facultyCount.textContent = counts.faculty || 0;
        if (registrarCount) registrarCount.textContent = counts.registrar || 0;
        if (adminCount) adminCount.textContent = counts.admin || 0;
        
        if (totalCount) {
            const total = (counts.student || 0) + (counts.faculty || 0) + 
                         (counts.admin || 0) + (counts.registrar || 0);
            totalCount.textContent = total;
        }
    }

    filterAndDisplayUsers() {
        this.filteredUsers = this.users.filter(user => {
            // Role filter
            const matchesRole = this.currentFilter === 'all' || user.role === this.currentFilter;
            
            // Search filter
            const searchTerm = this.currentSearch.toLowerCase();
            const matchesSearch = !searchTerm || 
                user.first_name.toLowerCase().includes(searchTerm) ||
                user.last_name.toLowerCase().includes(searchTerm) ||
                user.email.toLowerCase().includes(searchTerm) ||
                user.username.toLowerCase().includes(searchTerm);

            return matchesRole && matchesSearch;
        });

        this.displayUsers();
    }

    displayUsers() {
        const tableBody = document.getElementById('usersTableBody');
        const tableContainer = document.getElementById('usersTableContainer');
        const noUsersMessage = document.getElementById('noUsersMessage');

        if (!tableBody) {
            console.log("⚠️ UserManager: Users table elements not found on this page");
            return;
        }

        if (this.filteredUsers.length === 0) {
            if (tableContainer) tableContainer.style.display = 'none';
            if (noUsersMessage) noUsersMessage.style.display = 'block';
            return;
        }

        if (tableContainer) tableContainer.style.display = 'block';
        if (noUsersMessage) noUsersMessage.style.display = 'none';

        tableBody.innerHTML = this.filteredUsers.map(user => `
            <tr>
                <td>
                    <strong>${this.escapeHtml(user.first_name)} ${this.escapeHtml(user.last_name)}</strong>
                </td>
                <td>${this.escapeHtml(user.username)}</td>
                <td>${this.escapeHtml(user.email)}</td>
                <td>
                    <span class="role-badge role-${user.role}">
                        ${this.getRoleIcon(user.role)} ${this.capitalizeFirst(user.role)}
                    </span>
                </td>
                <td>${this.formatDate(user.created_at)}</td>
                <td>${user.last_login ? this.formatDate(user.last_login) : 'Never'}</td>
                <td>
                    <button class="action-btn delete-btn" onclick="userManager.openDeleteModal(${user.id}, '${this.escapeHtml(user.username)}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `).join('');
    }

    getRoleIcon(role) {
        const icons = {
            student: '<i class="fas fa-graduation-cap"></i>',
            faculty: '<i class="fas fa-chalkboard-teacher"></i>',
            registrar: '<i class="fas fa-clipboard-list"></i>',
            admin: '<i class="fas fa-user-shield"></i>'
        };
        return icons[role] || '<i class="fas fa-user"></i>';
    }

    async handleAddUser() {
        try {
            const form = document.getElementById('addUserForm');
            if (!form) return;

            // Clear previous errors
            form.querySelectorAll('.field-error').forEach(error => error.remove());
            form.querySelectorAll('input, select').forEach(field => this.clearFieldError(field));

            const formData = new FormData(form);
            
            const userData = {
                first_name: formData.get('firstName').trim(),
                last_name: formData.get('lastName').trim(),
                username: formData.get('username').trim(),
                email: formData.get('email').trim(),
                password: formData.get('password'),
                role: formData.get('role')
            };

            // Client-side validation
            let isValid = true;
            const fields = form.querySelectorAll('input, select');
            fields.forEach(field => {
                if (!this.validateField(field)) {
                    isValid = false;
                }
            });

            if (!isValid) {
                this.showError('Please fix the errors above');
                return;
            }

            // Show loading state
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalHTML = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding User...';
            submitBtn.disabled = true;

            const response = await fetch('/api/users/add', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    console.log("🔒 UserManager: Authentication expired during add user");
                    sessionStorage.clear();
                    window.location.href = '/login.html';
                    return;
                }
                throw new Error(data.message || 'Failed to add user');
            }

            if (data.success) {
                this.showSuccess('User added successfully!');
                this.closeAddUserModal();
                form.reset();
                await this.loadUsers(); // Reload users to get updated data
            } else {
                throw new Error(data.message || 'Failed to add user');
            }

        } catch (error) {
            console.error('Error adding user:', error);
            this.showError('Failed to add user: ' + error.message);
        } finally {
            // Reset button state
            const submitBtn = document.getElementById('addUserForm')?.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-plus"></i> Add User';
                submitBtn.disabled = false;
            }
        }
    }

    openDeleteModal(userId, username) {
        this.pendingDeleteUser = { id: userId, username: username };
        
        const modal = document.getElementById('deleteConfirmModal');
        const userNameElement = document.getElementById('deleteUserName');
        
        if (modal && userNameElement) {
            userNameElement.textContent = username;
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }

    closeDeleteModal() {
        const modal = document.getElementById('deleteConfirmModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
        this.pendingDeleteUser = null;
    }

    async confirmDeleteUser() {
        if (!this.pendingDeleteUser) return;

        const { id: userId, username } = this.pendingDeleteUser;

        try {
            // Show loading state
            const deleteBtn = document.getElementById('confirmDeleteBtn');
            const originalHTML = deleteBtn.innerHTML;
            deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
            deleteBtn.disabled = true;

            const response = await fetch(`/api/users/delete/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    console.log("🔒 UserManager: Authentication expired during delete");
                    sessionStorage.clear();
                    window.location.href = '/login.html';
                    return;
                }
                throw new Error(data.message || 'Failed to delete user');
            }

            if (data.success) {
                this.showSuccess(`User "${username}" deleted successfully!`);
                this.closeDeleteModal();
                await this.loadUsers(); // Reload users to get updated data
            } else {
                throw new Error(data.message || 'Failed to delete user');
            }

        } catch (error) {
            console.error('Error deleting user:', error);
            this.showError('Failed to delete user: ' + error.message);
        } finally {
            // Reset button state
            const deleteBtn = document.getElementById('confirmDeleteBtn');
            if (deleteBtn) {
                deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete User';
                deleteBtn.disabled = false;
            }
        }
    }

    // Legacy method for backward compatibility
    async deleteUser(userId, username) {
        this.openDeleteModal(userId, username);
    }

    openAddUserModal() {
        const modal = document.getElementById('addUserModal');
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            
            // Focus on first input
            setTimeout(() => {
                const firstInput = modal.querySelector('input');
                if (firstInput) firstInput.focus();
            }, 100);
        }
    }

    closeAddUserModal() {
        const modal = document.getElementById('addUserModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
        const form = document.getElementById('addUserForm');
        if (form) {
            form.reset();
            // Clear all field errors
            form.querySelectorAll('.field-error').forEach(error => error.remove());
            form.querySelectorAll('input, select').forEach(field => this.clearFieldError(field));
        }
    }

    showLoading(show) {
        const loadingIndicator = document.getElementById('loadingIndicator');
        const tableContainer = document.getElementById('usersTableContainer');
        const noUsersMessage = document.getElementById('noUsersMessage');

        if (show) {
            if (loadingIndicator) loadingIndicator.style.display = 'block';
            if (tableContainer) tableContainer.style.display = 'none';
            if (noUsersMessage) noUsersMessage.style.display = 'none';
        } else {
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        }
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(n => n.remove());

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 12px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(10px);
            animation: slideInRight 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            border-left: 4px solid rgba(255, 255, 255, 0.3);
        `;

        // Set background color based on type
        const colors = {
            success: 'linear-gradient(135deg, #27ae60, #2ecc71)',
            error: 'linear-gradient(135deg, #e74c3c, #ec7063)',
            info: 'linear-gradient(135deg, #3498db, #5dade2)',
            warning: 'linear-gradient(135deg, #f39c12, #f7dc6f)'
        };
        notification.style.background = colors[type] || colors.info;

        const icons = {
            success: 'check-circle',
            error: 'exclamation-triangle',
            info: 'info-circle',
            warning: 'exclamation-circle'
        };

        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <i class="fas fa-${icons[type]}" style="font-size: 1.2rem;"></i>
                <span style="flex: 1;">${this.escapeHtml(message)}</span>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: rgba(255, 255, 255, 0.2); border: none; color: white; 
                               margin-left: 10px; cursor: pointer; font-size: 1.1rem; width: 24px; 
                               height: 24px; border-radius: 50%; display: flex; align-items: center; 
                               justify-content: center; transition: background 0.3s ease;">
                    ×
                </button>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOutRight 0.3s ease forwards';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Global functions for HTML onclick handlers
function closeAddUserModal() {
    if (window.userManager) {
        window.userManager.closeAddUserModal();
    }
}

function closeDeleteModal() {
    if (window.userManager) {
        window.userManager.closeDeleteModal();
    }
}

// Add enhanced CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%) scale(0.8);
            opacity: 0;
        }
        to {
            transform: translateX(0) scale(1);
            opacity: 1;
        }
    }

    @keyframes slideOutRight {
        from {
            transform: translateX(0) scale(1);
            opacity: 1;
        }
        to {
            transform: translateX(100%) scale(0.8);
            opacity: 0;
        }
    }

    /* Enhanced role badges */
    .role-badge {
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 0.85rem;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        text-transform: capitalize;
    }

    .role-badge.role-student {
        background: linear-gradient(135deg, #27ae60, #2ecc71);
        color: white;
    }

    .role-badge.role-faculty {
        background: linear-gradient(135deg, #f39c12, #f7dc6f);
        color: #2c3e50;
    }

    .role-badge.role-registrar {
        background: linear-gradient(135deg, #9b59b6, #bb8fce);
        color: white;
    }

    .role-badge.role-admin {
        background: linear-gradient(135deg, #e74c3c, #ec7063);
        color: white;
    }

    /* Enhanced action buttons */
    .action-btn {
        padding: 8px 15px;
        border: none;
        border-radius: 6px;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        display: inline-flex;
        align-items: center;
        gap: 6px;
    }

    .delete-btn {
        background: linear-gradient(135deg, #e74c3c, #ec7063);
        color: white;
    }

    .delete-btn:hover {
        background: linear-gradient(135deg, #c0392b, #e74c3c);
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(231, 76, 60, 0.3);
    }

    /* Loading animation for buttons */
    .fa-spin {
        animation: fa-spin 1s infinite linear;
    }

    @keyframes fa-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// Initialize the user manager when DOM is loaded
let userManager;
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on a page that has user management elements
    const usersSection = document.getElementById('users');
    const usersTableBody = document.getElementById('usersTableBody');
    
    if (usersSection || usersTableBody) {
        console.log("📊 Initializing Enhanced UserManager...");
        userManager = new UserManager();
        window.userManager = userManager; // Make it globally accessible
    } else {
        console.log("📊 UserManager not needed on this page");
    }
});

// Handle page visibility change to refresh data
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && userManager) {
        userManager.loadUsers();
    }
});

// Enhanced keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (!userManager) return;
    
    // Escape key to close modals
    if (e.key === 'Escape') {
        userManager.closeAddUserModal();
        userManager.closeDeleteModal();
    }
    
    // Ctrl/Cmd + N to add new user
    if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !e.target.matches('input, textarea, select')) {
        e.preventDefault();
        userManager.openAddUserModal();
    }
});