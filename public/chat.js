// Academic Chat System - Enhanced with Avatar Support, Message Read Status & Improved Contact Sorting
// Fixed avatar integration and improved functionality

class AcademicChat {
    constructor() {
        this.currentUser = null;
        this.currentChat = null;
        this.contacts = [];
        this.messages = [];
        this.messagePollingInterval = null;
        this.authToken = this.getAuthToken();
        this.init();
    }

    // Get authentication token from localStorage or session
    getAuthToken() {
        return localStorage.getItem('authToken') || 
               localStorage.getItem('token') || 
               sessionStorage.getItem('authToken') ||
               sessionStorage.getItem('token') ||
               this.getCookieValue('authToken');
    }

    // Helper to get cookie value
    getCookieValue(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    // Get request headers with authentication
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        
        return headers;
    }

    async init() {
        try {
            await this.getCurrentUser();
            await this.loadContacts();
            this.setupEventListeners();
            this.startMessagePolling();
        } catch (error) {
            console.error('Failed to initialize chat:', error);
            this.showError('Failed to initialize chat system. Please check your authentication.');
        }
    }

    // Get current user information with avatar
    async getCurrentUser() {
        try {
            // First try to get from session storage (dashboard integration)
            const sessionUser = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
            if (sessionUser) {
                this.currentUser = JSON.parse(sessionUser);
                
                // Load user avatar if available
                if (window.getUserAvatar && this.currentUser.id) {
                    const avatar = window.getUserAvatar(this.currentUser.id);
                    if (avatar) {
                        this.currentUser.avatar = avatar;
                    }
                }
                return;
            }

            // Fallback to API call
            const response = await fetch('/api/messages/user/current', {
                headers: this.getHeaders()
            });
            const data = await response.json();
            
            if (data.success) {
                this.currentUser = data.user;
                
                // Load user avatar
                if (window.getUserAvatar && this.currentUser.id) {
                    const avatar = window.getUserAvatar(this.currentUser.id);
                    if (avatar) {
                        this.currentUser.avatar = avatar;
                    }
                }
            } else {
                throw new Error(data.message || 'Failed to get user info');
            }
        } catch (error) {
            console.error('Error getting current user:', error);
            throw error;
        }
    }

    // Load all contacts based on user role
    async loadContacts() {
        try {
            const response = await fetch('/api/messages/users', {
                headers: this.getHeaders()
            });
            const data = await response.json();
            
            if (data.success) {
                this.contacts = data.contacts || data.users;
                
                // Load avatars for all contacts
                this.contacts.forEach(contact => {
                    if (window.getUserAvatar && contact.id) {
                        const avatar = window.getUserAvatar(contact.id);
                        if (avatar) {
                            contact.avatar = avatar;
                        }
                    }
                });
                
                this.renderContacts();
            } else {
                throw new Error(data.message || 'Failed to load contacts');
            }
        } catch (error) {
            console.error('Error loading contacts:', error);
            this.showError('Failed to load contacts');
        }
    }

    // Enhanced render contacts with avatar support and proper sorting
    renderContacts(filteredContacts = null) {
        const contactsList = document.getElementById('contactsList');
        let contacts = filteredContacts || this.contacts;

        if (contacts.length === 0) {
            contactsList.innerHTML = `
                <div class="no-contacts">
                    <i class="fas fa-users"></i>
                    <p>No contacts found</p>
                </div>
            `;
            return;
        }

        // Sort contacts: newest message first, then by unread count, then alphabetically
        contacts = contacts.sort((a, b) => {
            // First priority: unread messages
            if (a.unread_count !== b.unread_count) {
                return b.unread_count - a.unread_count;
            }
            
            // Second priority: most recent message time
            if (a.last_message_time && b.last_message_time) {
                return new Date(b.last_message_time) - new Date(a.last_message_time);
            }
            
            // If one has a message and the other doesn't
            if (a.last_message_time && !b.last_message_time) return -1;
            if (!a.last_message_time && b.last_message_time) return 1;
            
            // Third priority: alphabetical by first name
            return a.first_name.localeCompare(b.first_name);
        });

        contactsList.innerHTML = contacts.map(contact => {
            const avatarContent = contact.avatar 
                ? `<img src="${contact.avatar}" alt="${contact.first_name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`
                : this.getInitials(contact.first_name, contact.last_name);
                
            return `
                <div class="contact-item" data-user-id="${contact.id}" onclick="chat.openChat(${contact.id})">
                    <div class="contact-avatar">
                        ${avatarContent}
                        <div class="online-indicator ${contact.is_online ? 'online' : 'offline'}"></div>
                    </div>
                    <div class="contact-info">
                        <div class="contact-name">${contact.first_name} ${contact.last_name}</div>
                        <div class="contact-role">${this.formatRole(contact.role)}</div>
                        <div class="last-message">${contact.last_message || 'No messages yet'}</div>
                    </div>
                    <div class="contact-meta">
                        <div class="last-message-time">${contact.last_message_time ? this.formatTime(contact.last_message_time) : ''}</div>
                        ${contact.unread_count > 0 ? `<div class="unread-badge">${contact.unread_count}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Enhanced update chat header with avatar
    updateChatHeader(contact) {
        const chatHeader = document.getElementById('chatHeader');
        const chatAvatar = document.getElementById('chatAvatar');
        const chatUserName = document.getElementById('chatUserName');
        const chatUserRole = document.getElementById('chatUserRole');

        if (chatAvatar) {
            if (contact.avatar) {
                chatAvatar.innerHTML = `<img src="${contact.avatar}" alt="${contact.first_name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            } else {
                chatAvatar.textContent = this.getInitials(contact.first_name, contact.last_name);
            }
        }
        
        if (chatUserName) chatUserName.textContent = `${contact.first_name} ${contact.last_name}`;
        if (chatUserRole) chatUserRole.textContent = this.formatRole(contact.role);
        
        if (chatHeader) chatHeader.style.display = 'flex';
    }

    // Enhanced render messages with avatar support, file attachments AND improved read status
    renderMessage(message) {
        const isOwn = message.sender_id == this.currentUser.id;
        const messageClass = isOwn ? 'message message-own' : 'message message-received';
        
        // Get avatar for message sender
        let avatarContent = '';
        if (!isOwn && this.currentChat) {
            if (this.currentChat.avatar) {
                avatarContent = `<img src="${this.currentChat.avatar}" alt="Avatar" class="message-avatar" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; margin-right: 8px;">`;
            } else {
                avatarContent = `<div class="message-avatar-initials" style="width: 24px; height: 24px; border-radius: 50%; background: #007bff; color: white; display: flex; align-items: center; justify-content: center; font-size: 10px; margin-right: 8px;">${this.getInitials(this.currentChat.first_name, this.currentChat.last_name)}</div>`;
            }
        }
        
        // Handle file attachments
        let attachmentHtml = '';
        if (message.file_name && message.file_path) {
            const fileIcon = this.getFileIcon(message.file_type);
            const fileSize = this.formatFileSize(message.file_size);
            const fileName = message.file_path.split('/').pop();
            
            attachmentHtml = `
                <div class="message-attachment">
                    <div class="attachment-info">
                        <i class="${fileIcon}"></i>
                        <div class="attachment-details">
                            <div class="attachment-name">${this.escapeHtml(message.file_name)}</div>
                            <div class="attachment-size">${fileSize}</div>
                        </div>
                    </div>
                    <button class="attachment-download" onclick="chat.downloadFile('${fileName}', '${this.escapeHtml(message.file_name)}')" title="Download file">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            `;
        }
        
        return `
            <div class="${messageClass}" data-message-id="${message.id}">
                ${!isOwn ? avatarContent : ''}
                <div class="message-bubble">
                    ${message.content ? `<div class="message-text">${this.escapeHtml(message.content)}</div>` : ''}
                    ${attachmentHtml}
                    <div class="message-meta">
                        <span class="message-time">${this.formatMessageTime(message.created_at)}</span>
                        ${isOwn ? `<span class="message-status">${this.getMessageStatus(message)}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    // Enhanced message status with proper read indicators
    getMessageStatus(message) {
        if (message.is_read == 1 || message.is_read === true) {
            return '<i class="fas fa-check-double read" style="color: #4CAF50;" title="Read"></i>';
        } else {
            return '<i class="fas fa-check" style="color: #9E9E9E;" title="Delivered"></i>';
        }
    }

    async openChat(userId) {
        try {
            const contact = this.contacts.find(c => c.id == userId);
            if (!contact) return;

            this.currentChat = contact;
            
            // Update chat header
            this.updateChatHeader(contact);
            
            // Load chat history
            await this.loadChatHistory(userId);
            
            // Show chat interface
            this.showChatInterface();
            
            // Mark messages as read
            await this.markMessagesAsRead(userId);
            
            // Update contact list to remove unread badge
            contact.unread_count = 0;
            this.renderContacts();
            
        } catch (error) {
            console.error('Error opening chat:', error);
            this.showError('Failed to open chat');
        }
    }

    // Load chat history between current user and selected contact
    async loadChatHistory(userId) {
        try {
            const response = await fetch(`/api/messages/messages?user_id=${userId}`, {
                headers: this.getHeaders()
            });
            const data = await response.json();
            
            if (data.success) {
                this.messages = data.messages;
                this.renderMessages();
            } else {
                throw new Error(data.message || 'Failed to load messages');
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
            this.showError('Failed to load chat history');
        }
    }

    // Render messages in chat window
    renderMessages() {
        const chatMessages = document.getElementById('chatMessages');
        
        if (!chatMessages) return;
        
        if (this.messages.length === 0) {
            chatMessages.innerHTML = `
                <div class="no-messages">
                    <i class="fas fa-comments"></i>
                    <h3>No messages yet</h3>
                    <p>Start the conversation by sending a message</p>
                </div>
            `;
            return;
        }

        const groupedMessages = this.groupMessagesByDate(this.messages);
        
        chatMessages.innerHTML = Object.entries(groupedMessages).map(([date, messages]) => `
            <div class="message-date-group">
                <div class="date-separator">
                    <span class="date-label">${this.formatDate(date)}</span>
                </div>
                <div class="messages-container">
                    ${messages.map(message => this.renderMessage(message)).join('')}
                </div>
            </div>
        `).join('');

        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // New method for formatting message time
    formatMessageTime(timestamp) {
        if (!timestamp) return '';
        
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
    }

    // UPDATED Send message method - preserves existing functionality + adds file support
    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const content = messageInput?.value?.trim();

        if (!content || !this.currentChat) return;

        await this.sendMessageWithAttachment(content, null);
    }

    // NEW: Send message with attachment
    async sendMessageWithAttachment(content = null, file = null) {
        if (!this.currentChat) return;
        if (!content && !file) return;

        try {
            const messageInput = document.getElementById('messageInput');
            if (messageInput) messageInput.disabled = true;

            const formData = new FormData();
            formData.append('receiver_id', this.currentChat.id);
            
            if (content) {
                formData.append('content', content);
            }
            
            if (file) {
                formData.append('attachment', file);
            }

            const response = await fetch('/api/messages/messages', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                if (messageInput) {
                    messageInput.value = '';
                    messageInput.style.height = 'auto';
                }
                
                this.messages.push(data.message);
                this.renderMessages();
                await this.loadContacts(); // Refresh contacts to update last message
                
            } else {
                throw new Error(data.message || 'Failed to send message');
            }
        } catch (error) {
            console.error('Error sending message with attachment:', error);
            this.showError('Failed to send message with attachment');
        } finally {
            const messageInput = document.getElementById('messageInput');
            if (messageInput) {
                messageInput.disabled = false;
                messageInput.focus();
            }
        }
    }

    // NEW: Handle file attachment
    async handleFileAttachment() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.style.display = 'none';
        
        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            // Check file size (10MB limit)
            if (file.size > 10 * 1024 * 1024) {
                this.showError('File size must be less than 10MB');
                return;
            }
            
            await this.sendMessageWithAttachment(null, file);
        };
        
        document.body.appendChild(fileInput);
        fileInput.click();
        document.body.removeChild(fileInput);
    }

    // NEW: Handle authenticated file download
    async downloadFile(fileName, originalFileName) {
        const button = event.target.closest('.attachment-download');
        
        try {
            // Add loading state
            button.classList.add('loading');
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            button.disabled = true;
            
            const response = await fetch(`/api/messages/download/${fileName}`, {
                headers: this.getHeaders()
            });
            
            if (!response.ok) {
                throw new Error('Failed to download file');
            }
            
            // Create blob and download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = originalFileName || fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            // Success feedback
            button.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                button.innerHTML = '<i class="fas fa-download"></i>';
            }, 1000);
            
        } catch (error) {
            console.error('Error downloading file:', error);
            this.showError('Failed to download file');
            
            // Error feedback
            button.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
            setTimeout(() => {
                button.innerHTML = '<i class="fas fa-download"></i>';
            }, 2000);
            
        } finally {
            // Remove loading state
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    // Enhanced mark messages as read with proper API call
    async markMessagesAsRead(userId) {
        try {
            const response = await fetch('/api/messages/messages/read', {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    sender_id: userId
                })
            });
            
            const data = await response.json();
            if (data.success) {
                // Update local messages to reflect read status
                this.messages.forEach(message => {
                    if (message.sender_id == userId) {
                        message.is_read = 1;
                    }
                });
            }
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    }

    // Search contacts
    async searchContacts(query) {
        try {
            if (!query.trim()) {
                await this.loadContacts();
                return;
            }

            const response = await fetch(`/api/messages/users?search=${encodeURIComponent(query)}`, {
                headers: this.getHeaders()
            });
            const data = await response.json();
            
            if (data.success) {
                const searchResults = data.contacts || data.users;
                // Load avatars for search results
                searchResults.forEach(contact => {
                    if (window.getUserAvatar && contact.id) {
                        const avatar = window.getUserAvatar(contact.id);
                        if (avatar) {
                            contact.avatar = avatar;
                        }
                    }
                });
                this.renderContacts(searchResults);
            } else {
                this.clientSideSearch(query);
            }
        } catch (error) {
            console.error('Error searching contacts:', error);
            this.clientSideSearch(query);
        }
    }

    // Client-side search fallback
    clientSideSearch(query) {
        if (!query.trim()) {
            this.renderContacts();
            return;
        }

        const filtered = this.contacts.filter(contact => {
            const fullName = `${contact.first_name} ${contact.last_name}`.toLowerCase();
            const email = contact.email.toLowerCase();
            const role = contact.role.toLowerCase();
            
            return fullName.includes(query.toLowerCase()) || 
                   email.includes(query.toLowerCase()) ||
                   role.includes(query.toLowerCase());
        });

        this.renderContacts(filtered);
    }

    // Filter contacts by role
    async filterByRole(role) {
        try {
            document.querySelectorAll('.role-tag').forEach(btn => {
                btn.classList.remove('active');
            });
            
            const clickedBtn = event?.target;
            if (clickedBtn) clickedBtn.classList.add('active');

            const searchInput = document.getElementById('searchInput');
            const searchQuery = searchInput?.value?.trim() || '';

            let apiUrl = '/api/messages/users?';
            const params = new URLSearchParams();
            
            if (role !== 'all') {
                params.append('role', role);
            }
            
            if (searchQuery) {
                params.append('search', searchQuery);
            }

            apiUrl += params.toString();

            const response = await fetch(apiUrl, {
                headers: this.getHeaders()
            });
            const data = await response.json();
            
            if (data.success) {
                const filteredResults = data.contacts || data.users;
                // Load avatars for filtered results
                filteredResults.forEach(contact => {
                    if (window.getUserAvatar && contact.id) {
                        const avatar = window.getUserAvatar(contact.id);
                        if (avatar) {
                            contact.avatar = avatar;
                        }
                    }
                });
                this.renderContacts(filteredResults);
            } else {
                throw new Error(data.message || 'Failed to filter contacts');
            }
        } catch (error) {
            console.error('Error filtering contacts:', error);
            this.clientSideFilterByRole(role);
        }
    }

    // Client-side filtering fallback
    clientSideFilterByRole(role) {
        document.querySelectorAll('.role-tag').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const clickedBtn = event?.target;
        if (clickedBtn) clickedBtn.classList.add('active');

        if (role === 'all') {
            this.renderContacts();
            return;
        }

        const filtered = this.contacts.filter(contact => contact.role === role);
        this.renderContacts(filtered);
    }

    // Show chat interface
    showChatInterface() {
        const chatHeader = document.getElementById('chatHeader');
        const chatMessages = document.getElementById('chatMessages');
        const chatInputContainer = document.getElementById('chatInputContainer');
        
        if (chatHeader) chatHeader.style.display = 'flex';
        if (chatMessages) chatMessages.style.display = 'flex';
        if (chatInputContainer) chatInputContainer.style.display = 'flex';
        
        const emptyChat = document.querySelector('.empty-chat');
        if (emptyChat) {
            emptyChat.style.display = 'none';
        }
    }

    // UPDATED Setup event listeners - preserves existing + adds file attachment
    setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchContacts(e.target.value);
                }, 300);
            });
        }

        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            messageInput.addEventListener('input', () => {
                this.autoResizeTextarea(messageInput);
            });
        }

        // NEW: Add file attachment event listener
        const attachButton = document.querySelector('.input-action-btn[title="Attach File"], button[onclick*="attachFile"]');
        if (attachButton) {
            // Remove any existing onclick attribute
            attachButton.removeAttribute('onclick');
            
            attachButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleFileAttachment();
            });
        }

        if (window.innerWidth <= 768) {
            this.setupMobileListeners();
        }
    }

    // Auto-resize textarea
    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    // Setup mobile-specific listeners
    setupMobileListeners() {
        window.showContactsList = () => {
            const contactsPanel = document.querySelector('.contacts-panel');
            const chatPanel = document.querySelector('.chat-panel');
            if (contactsPanel) contactsPanel.style.display = 'block';
            if (chatPanel) chatPanel.style.display = 'none';
        };

        const originalOpenChat = this.openChat.bind(this);
        this.openChat = async (userId) => {
            await originalOpenChat(userId);
            const contactsPanel = document.querySelector('.contacts-panel');
            const chatPanel = document.querySelector('.chat-panel');
            if (contactsPanel) contactsPanel.style.display = 'none';
            if (chatPanel) chatPanel.style.display = 'flex';
        };
    }

    // Enhanced message polling with read status updates
    startMessagePolling() {
        this.messagePollingInterval = setInterval(async () => {
            if (this.currentChat) {
                await this.checkForNewMessages();
                await this.checkForReadStatusUpdates(); // Check for read status changes
            }
            await this.updateContactsList();
        }, 3000);
    }

    // Check for new messages in current chat
    async checkForNewMessages() {
        if (!this.currentChat) return;

        try {
            const lastMessageId = this.messages.length > 0 ? 
                Math.max(...this.messages.map(m => m.id)) : 0;

            const response = await fetch(`/api/messages/messages/new?user_id=${this.currentChat.id}&last_message_id=${lastMessageId}`, {
                headers: this.getHeaders()
            });
            const data = await response.json();

            if (data.success && data.messages.length > 0) {
                this.messages.push(...data.messages);
                this.renderMessages();
                await this.markMessagesAsRead(this.currentChat.id);
            }
        } catch (error) {
            console.error('Error checking for new messages:', error);
        }
    }

    // NEW: Check for read status updates on sent messages
    async checkForReadStatusUpdates() {
        if (!this.currentChat) return;

        try {
            const sentMessageIds = this.messages
                .filter(m => m.sender_id == this.currentUser.id && m.is_read != 1)
                .map(m => m.id);

            if (sentMessageIds.length === 0) return;

            const response = await fetch(`/api/messages/messages/read-status?user_id=${this.currentChat.id}&message_ids=${sentMessageIds.join(',')}`, {
                headers: this.getHeaders()
            });
            const data = await response.json();

            if (data.success && data.readMessages.length > 0) {
                // Update local message read status
                data.readMessages.forEach(readMessageId => {
                    const message = this.messages.find(m => m.id == readMessageId);
                    if (message) {
                        message.is_read = 1;
                    }
                });
                
                // Re-render messages to show updated read status
                this.renderMessages();
            }
        } catch (error) {
            console.error('Error checking for read status updates:', error);
        }
    }

    // Enhanced update contacts list with latest message info and improved sorting
    async updateContactsList() {
        try {
            const response = await fetch('/api/messages/contacts/update', {
                headers: this.getHeaders()
            });
            const data = await response.json();

            if (data.success) {
                this.contacts = data.contacts;
                
                // Load avatars for updated contacts
                this.contacts.forEach(contact => {
                    if (window.getUserAvatar && contact.id) {
                        const avatar = window.getUserAvatar(contact.id);
                        if (avatar) {
                            contact.avatar = avatar;
                        }
                    }
                });
                
                // Always re-render contacts to maintain proper sorting
                this.renderContacts();
            }
        } catch (error) {
            console.error('Error updating contacts:', error);
        }
    }

    // NEW: File utility functions
    getFileIcon(fileType) {
        if (!fileType) return 'fas fa-file';
        
        if (fileType.startsWith('image/')) {
            return 'fas fa-image';
        } else if (fileType.includes('pdf')) {
            return 'fas fa-file-pdf';
        } else if (fileType.includes('word') || fileType.includes('document')) {
            return 'fas fa-file-word';
        } else if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
            return 'fas fa-file-excel';
        } else if (fileType.includes('zip') || fileType.includes('rar')) {
            return 'fas fa-file-archive';
        } else if (fileType.includes('text')) {
            return 'fas fa-file-alt';
        } else {
            return 'fas fa-file';
        }
    }

    formatFileSize(bytes) {
        if (!bytes) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Existing utility functions
    getInitials(firstName, lastName) {
        if (!firstName || !lastName) return '??';
        return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
    }

    formatRole(role) {
        const roleMap = {
            'student': 'Student',
            'faculty': 'Faculty',
            'admin': 'Administrator',
            'registrar': 'Registrar'
        };
        return roleMap[role] || (role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Unknown');
    }

    formatTime(timestamp) {
        if (!timestamp) return '';
        
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) {
            return 'Just now';
        } else if (diff < 3600000) {
            return `${Math.floor(diff / 60000)}m ago`;
        } else if (diff < 86400000) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diff < 604800000) {
            return date.toLocaleDateString([], { weekday: 'short' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    }

    formatDate(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString([], { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        }
    }

    groupMessagesByDate(messages) {
        return messages.reduce((groups, message) => {
            const date = new Date(message.created_at).toDateString();
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(message);
            return groups;
        }, {});
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(message) {
        let errorDiv = document.getElementById('chatError');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'chatError';
            errorDiv.className = 'chat-error';
            document.body.appendChild(errorDiv);
        }
        
        errorDiv.innerHTML = `
            <div class="error-content">
                <i class="fas fa-exclamation-triangle"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.style.display='none'">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        errorDiv.style.display = 'block';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }

    // Clean up when page unloads
    destroy() {
        if (this.messagePollingInterval) {
            clearInterval(this.messagePollingInterval);
        }
    }
}

// Global functions for HTML onclick events
let chat;

window.filterByRole = function(role) {
    if (chat) {
        chat.filterByRole(role);
    }
};

window.sendMessage = function() {
    if (chat) {
        chat.sendMessage();
    }
};

window.showContactsList = function() {
    const contactsPanel = document.querySelector('.contacts-panel');
    const chatPanel = document.querySelector('.chat-panel');
    if (contactsPanel) contactsPanel.style.display = 'block';
    if (chatPanel) chatPanel.style.display = 'none';
};

// Initialize chat when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    chat = new AcademicChat();
});

// Clean up on page unload
window.addEventListener('beforeunload', function() {
    if (chat) {
        chat.destroy();
    }
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AcademicChat;
}
