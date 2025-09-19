// FIXED public/announcements.js - Complete Image Handling Fix
class AnnouncementsManager {
    constructor() {
        this.announcements = [];
        this.currentFilters = {
            priority: 'all',
            target_course: 'all',
            target_year: 'all',
            search: ''
        };
        this.currentEditId = null;
        this.apiUrl = '/api/announcements';
        this.init();
    }

    async init() {
    this.setupEventListeners();
    this.initializeStudentInfo();
    this.initializeStudentModal();
    
    // NEW: Log user role on initialization
    const userRole = this.getUserRole();
    const canManage = this.canManageAnnouncements();
    console.log('🚀 AnnouncementsManager initialized:', {
        userRole: userRole,
        canManageAnnouncements: canManage
    });
    
    await this.loadAnnouncements();
    await this.updateStats();
    console.log('AnnouncementsManager initialized');
}

    getAuthToken() {
        let token = localStorage.getItem('authToken') || 
                   sessionStorage.getItem('authToken') || 
                   localStorage.getItem('token') || 
                   sessionStorage.getItem('token');
        
        if (!token) {
            const cookies = document.cookie.split(';');
            for (let cookie of cookies) {
                const [name, value] = cookie.trim().split('=');
                if (name === 'authToken' || name === 'token') {
                    token = value;
                    break;
                }
            }
        }
        
        console.log('🔐 Auth token found:', !!token);
        return token;
    }

    // ENHANCED: Get current user's role for showing appropriate announcements
getUserRole() {
    // Try multiple ways to get user role
    let role = localStorage.getItem('userRole') || 
               sessionStorage.getItem('userRole') || 
               localStorage.getItem('role') || 
               sessionStorage.getItem('role');
    
    if (!role) {
        // Try to get from page elements
        const userInfo = document.querySelector('[data-user-role]');
        if (userInfo) {
            role = userInfo.dataset.userRole;
        }
        
        // Try to get from profile section
        const roleElement = document.querySelector('.user-role, .profile-role');
        if (roleElement) {
            role = roleElement.textContent.trim();
        }
        
        // Try to get from sidebar or navigation
        const navRoleElement = document.querySelector('.sidebar .user-info, .nav-user-role');
        if (navRoleElement) {
            const roleText = navRoleElement.textContent;
            if (roleText.includes('Administrator')) role = 'admin';
            else if (roleText.includes('Faculty')) role = 'faculty';
            else if (roleText.includes('Registrar')) role = 'registrar';
            else if (roleText.includes('Student')) role = 'student';
        }
    }
    
    console.log('👤 User role detected:', role);
    return role ? role.toLowerCase() : 'student'; // Default to student if role cannot be determined
}

// NEW: Check if user can edit/delete announcements
canManageAnnouncements() {
    const role = this.getUserRole();
    const allowedRoles = ['admin', 'administrator', 'registrar', 'faculty'];
    return allowedRoles.includes(role);
}

    // UPDATED loadAnnouncements method with role-based filtering
async loadAnnouncements() {
    try {
        this.showLoading(true);
        
        // Get user's role for proper filtering
        const userRole = this.getUserRole();
        console.log('👤 Loading announcements for role:', userRole);
        
        const params = new URLSearchParams();
        
        // For students, add course and year filtering
        if (userRole === 'student') {
            const studentCourse = this.getStudentCourse();
            const studentYear = this.getStudentYear();
            
            console.log('🎓 Loading announcements for student:', {
                course: studentCourse,
                year: studentYear
            });
            
            if (studentCourse && studentCourse !== 'All') {
                params.append('target_course', studentCourse);
            }
            if (studentYear && studentYear !== 'All') {
                params.append('target_year', studentYear);
            }
        }
        
        // Add other existing filters
        if (this.currentFilters.priority !== 'all') {
            params.append('priority', this.currentFilters.priority);
        }
        if (this.currentFilters.search) {
            params.append('search', this.currentFilters.search);
        }
        params.append('limit', '50');

        // Get auth token for role verification
        const authToken = this.getAuthToken();
        const headers = { 'Content-Type': 'application/json' };
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(`${this.apiUrl}?${params}`, {
            method: 'GET',
            credentials: 'include',
            headers: headers
        });
        
        const result = await response.json();

        if (result.success) {
            this.announcements = result.data;
            console.log(`📢 Loaded ${this.announcements.length} announcements for ${userRole}`);
            this.renderAnnouncements();
        } else {
            throw new Error(result.message || 'Failed to load announcements');
        }
    } catch (error) {
        console.error('Error loading announcements:', error);
        this.showAlert('Failed to load announcements. Please refresh the page.', 'error');
        this.announcements = [];
        this.renderAnnouncements();
    } finally {
        this.showLoading(false);
    }
}

// IMPROVED helper methods - Add these to your StudentAnnouncementsManager class

// Better method to get student's course
getStudentCourse() {
    // Method 1: Try data attributes
    const studentInfo = document.getElementById('student-info');
    if (studentInfo && studentInfo.dataset.studentCourse) {
        console.log('📚 Found course from data attribute:', studentInfo.dataset.studentCourse);
        return studentInfo.dataset.studentCourse;
    }
    
    // Method 2: Try profile elements
    const courseElement = document.querySelector('.student-course[data-course]');
    if (courseElement && courseElement.dataset.course) {
        console.log('📚 Found course from profile:', courseElement.dataset.course);
        return courseElement.dataset.course;
    }
    
    // Method 3: Parse from text content
    const profileText = document.querySelector('.student-course')?.textContent;
    if (profileText) {
        const courseMatch = profileText.match(/(BSBA|BSCS|BSIT|BSA|BSED|Computer Science|Information Technology|Business Administration)/i);
        if (courseMatch) {
            let course = courseMatch[0].toUpperCase();
            // Normalize course names
            if (course.includes('COMPUTER SCIENCE')) course = 'BSCS';
            if (course.includes('INFORMATION TECHNOLOGY')) course = 'BSIT';
            if (course.includes('BUSINESS ADMINISTRATION')) course = 'BSBA';
            
            console.log('📚 Parsed course from text:', course);
            return course;
        }
    }
    
    console.warn('⚠️ Could not determine student course, defaulting to All');
    return 'All';
}

// Better method to get student's year level
getStudentYear() {
    // Method 1: Try data attributes
    const studentInfo = document.getElementById('student-info');
    if (studentInfo && studentInfo.dataset.studentYear) {
        console.log('📅 Found year from data attribute:', studentInfo.dataset.studentYear);
        return studentInfo.dataset.studentYear;
    }
    
    // Method 2: Try profile elements
    const yearElement = document.querySelector('.student-year[data-year]');
    if (yearElement && yearElement.dataset.year) {
        console.log('📅 Found year from profile:', yearElement.dataset.year);
        return yearElement.dataset.year;
    }
    
    // Method 3: Parse from text content
    const profileText = document.querySelector('.student-course')?.textContent || 
                       document.querySelector('.student-profile')?.textContent;
    if (profileText) {
        const yearMatch = profileText.match(/(\d+)(?:st|nd|rd|th)\s*Year/i);
        if (yearMatch) {
            const yearLevel = yearMatch[1] + 'st_year'; // Normalize format
            console.log('📅 Parsed year from text:', yearLevel);
            return yearLevel;
        }
    }
    
    console.warn('⚠️ Could not determine student year, defaulting to All');
    return 'All';
}

// Add a method to initialize student info on page load
initializeStudentInfo() {
    const course = this.getStudentCourse();
    const year = this.getStudentYear();
    
    console.log('🎓 Student Info Initialized:', {
        course: course,
        year: year,
        willFilter: course !== 'All' || year !== 'All'
    });
    
    // Store in instance for easy access
    this.studentCourse = course;
    this.studentYear = year;
    
    return { course, year };
}

    async updateStats() {
        try {
            const response = await fetch(`${this.apiUrl}/stats/summary`, {
                credentials: 'include'
            });
            const result = await response.json();

            if (result.success) {
                const { total_announcements, urgent_count } = result.data;
                const totalCount = document.getElementById('totalCount');
                const urgentCount = document.getElementById('urgentCount');

                if (totalCount) totalCount.textContent = `${total_announcements} Total`;
                if (urgentCount) urgentCount.textContent = `${urgent_count} Urgent`;
            }
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    setupEventListeners() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.attachEventListeners());
        } else {
            this.attachEventListeners();
            this.setupDocumentUpload();
        }
    }

    attachEventListeners() {
        const addBtnSelectors = [
            '#addAnnouncementBtn',
            '.add-announcement-btn',
            '[data-action="add-announcement"]',
            'button[onclick*="showModal"]'
        ];
        
        let addBtn = null;
        for (const selector of addBtnSelectors) {
            addBtn = document.querySelector(selector);
            if (addBtn) break;
        }

        const modal = document.getElementById('announcementModal');
        const closeBtn = document.getElementById('modalCloseBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        const form = document.getElementById('announcementForm');

        console.log('🔍 Setting up event listeners...');
        console.log('Add button:', addBtn ? 'FOUND' : 'NOT FOUND');
        console.log('Modal:', modal ? 'FOUND' : 'NOT FOUND');

        if (addBtn) {
            addBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🚀 Add button clicked');
                this.showModal();
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideModal();
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideModal();
            });
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal();
                }
            });
        }

        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleFilterChange(e, 'priority'));
        });

        document.querySelectorAll('.course-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleCourseFilterChange(e));
        });

        document.querySelectorAll('.year-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleYearFilterChange(e));
        });

        // Search input
        const searchInput = document.getElementById('announcementSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e));
        }

        // FIXED: Image upload setup
        this.setupImageUpload();
        this.setupDocumentUpload();
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && (modal.style.display === 'flex' || modal.classList.contains('active'))) {
                this.hideModal();
            }
        });

        // Student modal initialization - ADD THIS AT THE END OF attachEventListeners()
const studentModal = document.getElementById('studentAnnouncementModal');
const studentModalClose = document.getElementById('studentModalClose');

if (studentModalClose) {
    studentModalClose.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.hideStudentModal();
    });
    console.log('✅ Student modal close button initialized');
}

if (studentModal) {
    studentModal.addEventListener('click', (e) => {
        if (e.target === studentModal) {
            this.hideStudentModal();
        }
    });
    console.log('✅ Student modal background click initialized');
} else {
    console.error('❌ Student modal not found in DOM');
}

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && studentModal && studentModal.style.display === 'flex') {
        this.hideStudentModal();
    }
});

console.log('🎉 Student modal event listeners setup complete');
    }

    // COMPLETELY FIXED: Image upload handling
    setupImageUpload() {
        const uploadContainer = document.getElementById('imageUploadContainer');
        const imageInput = document.getElementById('imageInput');
        const imagePreview = document.getElementById('imagePreview');
        const removeBtn = document.getElementById('removeImageBtn');

        console.log('🖼️ Setting up image upload:', {
            uploadContainer: !!uploadContainer,
            imageInput: !!imageInput,
            imagePreview: !!imagePreview,
            removeBtn: !!removeBtn
        });

        if (uploadContainer && imageInput) {
            uploadContainer.addEventListener('click', () => {
                console.log('📁 Upload container clicked');
                imageInput.click();
            });

            uploadContainer.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadContainer.style.borderColor = '#3498db';
                uploadContainer.style.backgroundColor = 'rgba(52, 152, 219, 0.1)';
            });

            uploadContainer.addEventListener('dragleave', (e) => {
                e.preventDefault();
                uploadContainer.style.borderColor = '#dee2e6';
                uploadContainer.style.backgroundColor = '#f8f9fa';
            });

            uploadContainer.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadContainer.style.borderColor = '#dee2e6';
                uploadContainer.style.backgroundColor = '#f8f9fa';
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    imageInput.files = files;
                    this.handleImageSelection(files[0]);
                }
            });

            imageInput.addEventListener('change', (e) => {
                console.log('📸 Image input changed:', e.target.files.length);
                if (e.target.files.length > 0) {
                    this.handleImageSelection(e.target.files[0]);
                } else {
                    // FIXED: Handle case when no file is selected
                    this.clearImagePreview();
                }
            });
        }

        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                console.log('🗑️ Remove image button clicked');
                this.removeImage();
            });
        }
    }

    // FIXED: Better image selection handling
    handleImageSelection(file) {
        console.log('🖼️ Processing image selection:', {
            name: file.name,
            type: file.type,
            size: file.size
        });

        if (!file.type.startsWith('image/')) {
            this.showAlert('Please select a valid image file.', 'error');
            this.clearImagePreview();
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            this.showAlert('Image size must be less than 5MB.', 'error');
            this.clearImagePreview();
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            console.log('📸 Image loaded for preview');
            this.showImagePreview(e.target.result);
        };
        
        reader.onerror = () => {
            console.error('❌ Error reading image file');
            this.showAlert('Error reading image file.', 'error');
            this.clearImagePreview();
        };
        
        reader.readAsDataURL(file);
    }

    // FIXED: Proper image preview management
    showImagePreview(imageSrc) {
        const imagePreview = document.getElementById('imagePreview');
        const previewImage = document.getElementById('previewImage');
        const uploadContainer = document.getElementById('imageUploadContainer');
        
        console.log('🖼️ Showing image preview');
        
        if (previewImage && imagePreview && uploadContainer) {
            previewImage.src = imageSrc;
            previewImage.onload = () => {
                console.log('✅ Preview image loaded successfully');
                imagePreview.style.display = 'block';
                uploadContainer.style.display = 'none';
            };
            previewImage.onerror = () => {
                console.error('❌ Error loading preview image');
                this.clearImagePreview();
            };
        }
    }

    // FIXED: Clear image preview properly
    clearImagePreview() {
        const imageInput = document.getElementById('imageInput');
        const imagePreview = document.getElementById('imagePreview');
        const previewImage = document.getElementById('previewImage');
        const uploadContainer = document.getElementById('imageUploadContainer');
        
        console.log('🧹 Clearing image preview');
        
        if (imageInput) imageInput.value = '';
        if (previewImage) {
            previewImage.src = '';
            previewImage.onload = null;
            previewImage.onerror = null;
        }
        if (imagePreview) imagePreview.style.display = 'none';
        if (uploadContainer) uploadContainer.style.display = 'block';
    }

    // FIXED: Remove image function
    removeImage() {
        console.log('🗑️ Removing image');
        this.clearImagePreview();
    }

    showLoading(show) {
        const loadingSpinner = document.getElementById('loadingSpinner');
        const announcementsList = document.getElementById('announcementsList');
        
        if (loadingSpinner) {
            loadingSpinner.style.display = show ? 'block' : 'none';
        }
        if (announcementsList) {
            announcementsList.style.display = show ? 'none' : 'block';
        }
    }



    // UPDATED: Fixed view tracking method
async trackAnnouncementView(announcementId) {
    if (!announcementId) return;
    
    try {
        // Check if we've already viewed this announcement in this session
        const viewedKey = `announcement_viewed_${announcementId}`;
        const alreadyViewed = sessionStorage.getItem(viewedKey);
        
        if (!alreadyViewed) {
            console.log('📊 Tracking view for announcement:', announcementId);
            
            const response = await fetch(`${this.apiUrl}/${announcementId}/view`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                // Mark as viewed in this session
                sessionStorage.setItem(viewedKey, 'true');
                console.log('✅ View tracked successfully for announcement:', announcementId);
                
                // Update the view count in the UI
                this.updateViewCountInUI(announcementId);
            } else {
                console.warn('⚠️ Failed to track view:', response.status);
            }
        } else {
            console.log('👁️ Already viewed in this session:', announcementId);
        }
    } catch (error) {
        console.error('❌ Error tracking view:', error);
    }
}

// NEW: Update view count in UI without reloading
updateViewCountInUI(announcementId) {
    const announcementCard = document.querySelector(`[data-id="${announcementId}"]`);
    if (announcementCard) {
        const viewCountElement = announcementCard.querySelector('.view-count span');
        if (viewCountElement) {
            const currentCount = parseInt(viewCountElement.textContent.split(' ')[0]) || 0;
            viewCountElement.textContent = `${currentCount + 1} views`;
        }
    }
}

// FIXED: Show announcement in modal for students
async showAnnouncementModal(announcementId) {
    try {
        console.log('🔍 Loading announcement for modal:', announcementId);
        
        // Track the view when opening modal
        await this.trackAnnouncementView(announcementId);
        
        // Find announcement in current loaded data
        const announcement = this.announcements.find(a => a.id == announcementId);
        
        if (!announcement) {
            console.error('❌ Announcement not found in current data');
            this.showAlert('Announcement not found.', 'error');
            return;
        }
        
        // Get modal elements
        const modal = document.getElementById('studentAnnouncementModal');
        const title = document.getElementById('studentModalAnnouncementTitle');
        const content = document.getElementById('studentModalContent');
        const badges = document.getElementById('studentModalBadges');
        const meta = document.getElementById('studentModalMeta');
        const imageContainer = document.getElementById('studentModalImageContainer');
        const image = document.getElementById('studentModalImage');
        const documentContainer = document.getElementById('studentModalDocumentContainer');
        const documentInfo = document.getElementById('studentModalDocumentInfo');
        
        if (!modal) {
            console.error('❌ Student modal not found');
            return;
        }
        
        // Set content
        if (title) title.textContent = announcement.title;
        if (content) content.innerHTML = announcement.content.replace(/\n/g, '<br>');
        
        // Set badges
        if (badges) {
            badges.innerHTML = `
                <span class="priority-badge ${announcement.priority}" style="padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-right: 8px;">${announcement.priority.charAt(0).toUpperCase() + announcement.priority.slice(1)}</span>
                ${announcement.target_course !== 'All' ? `<span class="course-badge" style="background: #e3f2fd; color: #1976d2; padding: 6px 14px; border-radius: 20px; font-size: 12px; margin-right: 8px;">${announcement.target_course}</span>` : ''}
                ${announcement.target_year !== 'All' ? `<span class="year-badge" style="background: #f3e5f5; color: #7b1fa2; padding: 6px 14px; border-radius: 20px; font-size: 12px;">${announcement.target_year}</span>` : ''}
            `;
        }
        
        // Set meta info
        if (meta) {
            meta.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; padding: 16px 0; border-top: 1px solid #e0e6ed;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                            <i class="fas fa-user" style="color: #28a745;"></i>
                            <span style="font-weight: 500;">${this.escapeHtml(announcement.posted_by_username || 'Unknown')} 
                                ${announcement.posted_by_role ? `<span style="color: #666;">(${announcement.posted_by_role})</span>` : ''}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-calendar" style="color: #28a745;"></i>
                            <span style="color: #666; font-size: 14px;">${this.formatDateTime(announcement.created_at)}</span>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-eye" style="color: #666;"></i>
                        <span style="color: #666; font-size: 14px;">${(announcement.view_count || 0) + 1} views</span>
                    </div>
                </div>
            `;
        }
        
        // Handle image
        if (announcement.image_url && imageContainer && image) {
            const imageUrl = this.getImageUrl(announcement.image_url);
            console.log('🖼️ Setting modal image:', imageUrl);
            
            image.onload = () => {
                console.log('✅ Modal image loaded successfully');
                imageContainer.style.display = 'block';
            };
            
            image.onerror = () => {
                console.error('❌ Modal image failed to load');
                imageContainer.style.display = 'none';
            };
            
            image.src = imageUrl;
        } else if (imageContainer) {
            imageContainer.style.display = 'none';
        }

        // FIXED: Handle document display in modal
        if (announcement.document_url && announcement.document_name && documentContainer && documentInfo) {
            const documentUrl = `${window.location.origin}${announcement.document_url}`;
            const fileSize = announcement.document_size ? (announcement.document_size / 1024 / 1024).toFixed(2) : 'Unknown';
            const fileIcon = this.getDocumentIcon(this.getFileTypeFromName(announcement.document_name));
            
            documentInfo.innerHTML = `
                <div style="display: flex; align-items: center; gap: 15px; padding: 20px; background: #f8f9fa; border-radius: 12px; border-left: 4px solid #28a745; margin: 20px 0;">
                    <i class="${fileIcon}" style="font-size: 32px; color: #28a745;"></i>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 600; color: #333; margin-bottom: 6px; word-break: break-word; font-size: 16px;">${this.escapeHtml(announcement.document_name)}</div>
                        <div style="font-size: 14px; color: #666;">${fileSize} MB • Document Attachment</div>
                    </div>
                    <a href="${documentUrl}" target="_blank" 
                       style="background: #28a745; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500; display: flex; align-items: center; gap: 8px; transition: all 0.2s;"
                       onmouseover="this.style.backgroundColor='#218838'; this.style.transform='translateY(-1px)'"
                       onmouseout="this.style.backgroundColor='#28a745'; this.style.transform=''">
                        <i class="fas fa-download"></i>
                        Download
                    </a>
                </div>
            `;
            documentContainer.style.display = 'block';
        } else if (documentContainer) {
            documentContainer.style.display = 'none';
        }
        
        // Show modal with proper styling
        modal.style.display = 'flex';
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
        modal.style.zIndex = '99999';
        document.body.style.overflow = 'hidden';
        
        console.log('✅ Modal displayed successfully');
        
    } catch (error) {
        console.error('❌ Error showing announcement modal:', error);
        this.showAlert('Failed to load announcement details.', 'error');
    }
}

// NEW: Hide student modal
hideStudentModal() {
    const modal = document.getElementById('studentAnnouncementModal');
    if (modal) {
        modal.style.display = 'none';
        modal.style.visibility = 'hidden';
        modal.style.opacity = '0';
        document.body.style.overflow = '';
    }
}

    // UPDATED: Render announcements with proper admin controls
renderAnnouncements() {
    const container = document.getElementById('announcements-list') || document.getElementById('announcementsList');
    const noAnnouncementsMsg = document.getElementById('no-announcements') || document.getElementById('noAnnouncementsMessage');
    
    if (!container) return;

    if (this.announcements.length === 0) {
        container.innerHTML = '';
        if (noAnnouncementsMsg) noAnnouncementsMsg.style.display = 'block';
        return;
    }

    if (noAnnouncementsMsg) noAnnouncementsMsg.style.display = 'none';

    // Check if user can manage announcements
    const canManage = this.canManageAnnouncements();
    const userRole = this.getUserRole();
    
    console.log('🎨 Rendering announcements:', {
        count: this.announcements.length,
        canManage: canManage,
        userRole: userRole
    });

    container.innerHTML = this.announcements.map(announcement => {
        console.log('🎨 Rendering announcement:', {
            id: announcement.id,
            title: announcement.title,
            hasImage: !!announcement.image_url,
            hasDocument: !!announcement.document_url,
            canManage: canManage
        });

        // Image handling
        let imageHtml = '';
        if (announcement.image_url) {
            const imageUrl = this.getImageUrl(announcement.image_url);
            imageHtml = `
                <div class="announcement-image-container" style="margin: 15px 0; text-align: center;">
                    <img src="${imageUrl}" 
                         alt="Announcement image" 
                         class="announcement-image" 
                         style="max-width: 50%; height: auto; border-radius: 8px; border: 2px solid #dee2e6;"
                         onload="this.style.border='2px solid #28a745';"
                         onerror="this.style.display='none';">
                </div>
            `;
        }

        // Document handling
        let documentHtml = '';
        if (announcement.document_url && announcement.document_name) {
            const documentUrl = `${window.location.origin}${announcement.document_url}`;
            const fileSize = announcement.document_size ? (announcement.document_size / 1024 / 1024).toFixed(2) : 'Unknown';
            const fileIcon = this.getDocumentIcon(this.getFileTypeFromName(announcement.document_name));
            
            documentHtml = `
                <div class="announcement-document" style="margin: 15px 0; padding: 15px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px; border-left: 4px solid #28a745; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="background: #28a745; color: white; width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(40, 167, 69, 0.3);">
                            <i class="${fileIcon}" style="font-size: 20px;"></i>
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-weight: 600; color: #333; margin-bottom: 4px; word-break: break-word; font-size: 14px;">${this.escapeHtml(announcement.document_name)}</div>
                            <div style="font-size: 12px; color: #666; display: flex; align-items: center; gap: 8px;">
                                <span>${fileSize} MB</span>
                                <span>•</span>
                                <span>Document Attachment</span>
                            </div>
                        </div>
                        <a href="${documentUrl}" target="_blank" class="btn-download" 
                           style="background: #28a745; color: white; padding: 10px 16px; border-radius: 8px; text-decoration: none; font-size: 12px; font-weight: 500; display: flex; align-items: center; gap: 6px; transition: all 0.2s; box-shadow: 0 2px 4px rgba(40, 167, 69, 0.3);"
                           onclick="event.stopPropagation()"
                           onmouseover="this.style.backgroundColor='#218838'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(40, 167, 69, 0.4)'"
                           onmouseout="this.style.backgroundColor='#28a745'; this.style.transform=''; this.style.boxShadow='0 2px 4px rgba(40, 167, 69, 0.3)'">
                            <i class="fas fa-download" style="font-size: 11px;"></i>
                            Download
                        </a>
                    </div>
                </div>
            `;
        }

        // FIXED: Admin controls - only show for admin/registrar/faculty
        let adminControlsHtml = '';
        if (canManage) {
            adminControlsHtml = `
                <div class="announcement-actions" style="position: absolute; top: 15px; right: 15px; display: flex; gap: 8px;">
                    <button class="action-btn edit-btn" 
                            onclick="event.stopPropagation(); announcementsManager.editAnnouncement(${announcement.id})"
                            style="background: #17a2b8; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px; transition: all 0.2s;"
                            onmouseover="this.style.backgroundColor='#138496'"
                            onmouseout="this.style.backgroundColor='#17a2b8'"
                            title="Edit Announcement">
                        <i class="fas fa-edit" style="font-size: 11px;"></i>
                        Edit
                    </button>
                    <button class="action-btn delete-btn" 
                            onclick="event.stopPropagation(); announcementsManager.deleteAnnouncement(${announcement.id})"
                            style="background: #dc3545; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px; transition: all 0.2s;"
                            onmouseover="this.style.backgroundColor='#c82333'"
                            onmouseout="this.style.backgroundColor='#dc3545'"
                            title="Delete Announcement">
                        <i class="fas fa-trash" style="font-size: 11px;"></i>
                        Delete
                    </button>
                </div>
            `;
        }

        // Card click handler - different for students vs admins
        const cardClickHandler = canManage ? '' : `onclick="announcementsManager.showAnnouncementModal(${announcement.id})"`;
        const cardCursor = canManage ? 'default' : 'pointer';

        // Card template with conditional admin controls
        return `
            <div class="announcement-card" data-id="${announcement.id}" 
                 style="position: relative; border: 1px solid #e0e6ed; border-radius: 12px; padding: 20px; margin-bottom: 16px; background: white; cursor: ${cardCursor}; transition: all 0.2s ease;"
                 ${cardClickHandler}
                 onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'; this.style.transform='translateY(-2px)'"
                 onmouseout="this.style.boxShadow=''; this.style.transform=''">
                
                ${adminControlsHtml}
                
                <div class="announcement-header" style="display: flex; justify-content: between; align-items: flex-start; margin-bottom: 12px; ${canManage ? 'padding-right: 140px;' : ''}">
                    <div class="announcement-badges" style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <span class="priority-badge ${announcement.priority}" 
                              style="padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                            ${announcement.priority.charAt(0).toUpperCase() + announcement.priority.slice(1)}
                        </span>
                        ${announcement.target_course !== 'All' ? `<span class="course-badge" style="background: #e3f2fd; color: #1976d2; padding: 4px 12px; border-radius: 16px; font-size: 12px;">${announcement.target_course}</span>` : ''}
                        ${announcement.target_year !== 'All' ? `<span class="year-badge" style="background: #f3e5f5; color: #7b1fa2; padding: 4px 12px; border-radius: 16px; font-size: 12px;">${announcement.target_year}</span>` : ''}
                    </div>
                </div>

                <h3 class="announcement-title" style="margin: 0 0 12px 0; color: #1a1a1a; font-size: 20px; font-weight: 600; line-height: 1.3;">
                    ${this.escapeHtml(announcement.title)}
                </h3>
                
                <div class="announcement-content" style="color: #4a4a4a; line-height: 1.6; margin-bottom: 16px; font-size: 15px;">
                    ${this.escapeHtml(announcement.content)}
                </div>
                
                ${imageHtml}
                ${documentHtml}
                
                <div class="announcement-meta" style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 16px; border-top: 1px solid #f0f0f0; font-size: 13px; color: #666;">
                    <div class="meta-left">
                        <div class="meta-item" style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                            <i class="fas fa-user" style="color: #28a745;"></i>
                            <span>${this.escapeHtml(announcement.posted_by_username || 'Unknown')} 
                                ${announcement.posted_by_role ? `(${announcement.posted_by_role})` : ''}</span>
                        </div>
                        <div class="meta-item" style="display: flex; align-items: center; gap: 6px;">
                            <i class="fas fa-calendar" style="color: #28a745;"></i>
                            <span>${this.formatDateTime(announcement.created_at)}</span>
                        </div>
                    </div>
                    <div class="view-count" style="display: flex; align-items: center; gap: 6px;">
                        <i class="fas fa-eye" style="color: #666;"></i>
                        <span>${announcement.view_count || 0} views</span>
                    </div>
                </div>
                
                ${canManage ? `
                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #f0f0f0;">
                        <button onclick="announcementsManager.showAnnouncementModal(${announcement.id})" 
                                style="background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 8px; transition: all 0.2s;"
                                onmouseover="this.style.backgroundColor='#218838'"
                                onmouseout="this.style.backgroundColor='#28a745'">
                            <i class="fas fa-eye"></i>
                            View Details
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');

    // Add entrance animation
    const cards = container.querySelectorAll('.announcement-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'all 0.3s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 50);
    });
}

    // NEW: Handle image loading errors with retry logic
    handleImageError(imgElement) {
        console.log('🔧 Handling image error for:', imgElement.src);
        
        const originalUrl = imgElement.dataset.originalUrl;
        const announcementId = imgElement.dataset.announcementId;
        const filename = imgElement.src.split('/').pop();
        
        console.log('🔄 Attempting image recovery:', {
            originalUrl,
            announcementId,
            filename,
            currentSrc: imgElement.src
        });
        
        // Try alternative URLs in sequence
        const alternatives = [
            `/uploads/announcements/${filename}`,
            `/api/announcements/image/${filename}`,
            `/api/debug/test-image/${filename}`
        ];
        
        this.tryImageAlternatives(imgElement, alternatives, 0);
    }

    // NEW: Try alternative image URLs
    tryImageAlternatives(imgElement, alternatives, index) {
        if (index >= alternatives.length) {
            console.log('❌ All image alternatives failed');
            return;
        }
        
        const alternativeUrl = `${window.location.origin}${alternatives[index]}`;
        console.log(`🔄 Trying alternative ${index + 1}:`, alternativeUrl);
        
        const testImg = new Image();
        testImg.onload = () => {
            console.log('✅ Alternative URL works:', alternativeUrl);
            imgElement.src = alternativeUrl;
            imgElement.style.display = 'block';
            imgElement.style.border = '2px solid #28a745';
            imgElement.nextElementSibling.style.display = 'none';
        };
        
        testImg.onerror = () => {
            console.log(`❌ Alternative ${index + 1} failed:`, alternativeUrl);
            this.tryImageAlternatives(imgElement, alternatives, index + 1);
        };
        
        testImg.src = alternativeUrl;
    }

    // NEW: Retry image loading button handler
    retryImageLoad(button) {
        const imageContainer = button.closest('.image-wrapper');
        const img = imageContainer.querySelector('.announcement-image');
        const errorDiv = imageContainer.querySelector('.image-error-fallback');
        
        console.log('🔄 Manual retry triggered for image');
        
        // Hide error, show loading state
        errorDiv.style.display = 'none';
        img.style.display = 'block';
        img.style.border = '2px solid #ffc107';
        
        // Force reload
        const originalSrc = img.src;
        img.src = '';
        setTimeout(() => {
            img.src = originalSrc + '?retry=' + Date.now();
        }, 100);
    }

    // COMPLETELY FIXED: Image URL generation
    getImageUrl(imageUrl) {
        if (!imageUrl) {
            console.log('🖼️ No image URL provided');
            return '';
        }
        
        console.log('🖼️ Processing image URL:', imageUrl);
        
        // If it's already a full URL, return as is
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            console.log('🔗 Using full URL:', imageUrl);
            return imageUrl;
        }
        
        // If it starts with /uploads/, it's already correct
        if (imageUrl.startsWith('/uploads/')) {
            const finalUrl = `${window.location.origin}${imageUrl}`;
            console.log('🔗 Using full path with origin:', finalUrl);
            return finalUrl;
        }
        
        // If it starts with uploads/ (without slash), add the slash
        if (imageUrl.startsWith('uploads/')) {
            const finalUrl = `${window.location.origin}/${imageUrl}`;
            console.log('🔗 Added leading slash with origin:', finalUrl);
            return finalUrl;
        }
        
        // If it's just a filename, construct the full path
        const finalUrl = `${window.location.origin}/uploads/announcements/${imageUrl}`;
        console.log('🔗 Generated URL from filename:', finalUrl);
        return finalUrl;
    }

    // NEW: Document upload handling methods (add after setupImageUpload method)
setupDocumentUpload() {
    const uploadContainer = document.getElementById('documentUploadContainer');
    const documentInput = document.getElementById('documentInput');
    const documentPreview = document.getElementById('documentPreview');
    const removeDocBtn = document.getElementById('removeDocumentBtn');

    console.log('📄 Setting up document upload:', {
        uploadContainer: !!uploadContainer,
        documentInput: !!documentInput,
        documentPreview: !!documentPreview,
        removeDocBtn: !!removeDocBtn
    });

    if (uploadContainer && documentInput) {
        uploadContainer.addEventListener('click', () => {
            console.log('📁 Document upload container clicked');
            documentInput.click();
        });

        uploadContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadContainer.style.borderColor = '#28a745';
            uploadContainer.style.backgroundColor = 'rgba(40, 167, 69, 0.1)';
        });

        uploadContainer.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadContainer.style.borderColor = '#dee2e6';
            uploadContainer.style.backgroundColor = '#f8f9fa';
        });

        uploadContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadContainer.style.borderColor = '#dee2e6';
            uploadContainer.style.backgroundColor = '#f8f9fa';
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                documentInput.files = files;
                this.handleDocumentSelection(files[0]);
            }
        });

        documentInput.addEventListener('change', (e) => {
            console.log('📄 Document input changed:', e.target.files.length);
            if (e.target.files.length > 0) {
                this.handleDocumentSelection(e.target.files[0]);
            } else {
                this.clearDocumentPreview();
            }
        });
    }

    if (removeDocBtn) {
        removeDocBtn.addEventListener('click', () => {
            console.log('🗑️ Remove document button clicked');
            this.removeDocument();
        });
    }
}

handleDocumentSelection(file) {
    console.log('📄 Processing document selection:', {
        name: file.name,
        type: file.type,
        size: file.size
    });

    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
        this.showAlert('Please select a valid document file (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT).', 'error');
        this.clearDocumentPreview();
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        this.showAlert('Document size must be less than 10MB.', 'error');
        this.clearDocumentPreview();
        return;
    }

    this.showDocumentPreview(file);
}

showDocumentPreview(file) {
    const documentPreview = document.getElementById('documentPreview');
    const documentInfo = document.getElementById('documentInfo');
    const uploadContainer = document.getElementById('documentUploadContainer');
    
    console.log('📄 Showing document preview');
    
    if (documentPreview && documentInfo && uploadContainer) {
        const fileSize = (file.size / 1024 / 1024).toFixed(2);
        const fileIcon = this.getDocumentIcon(file.type);
        
        documentInfo.innerHTML = `
            <div class="document-details">
                <i class="${fileIcon}"></i>
                <div class="document-text">
                    <div class="document-name">${file.name}</div>
                    <div class="document-size">${fileSize} MB</div>
                </div>
            </div>
        `;
        
        documentPreview.style.display = 'block';
        uploadContainer.style.display = 'none';
    }
}

// Helper method to get file type from filename
getFileTypeFromName(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const typeMap = {
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'txt': 'text/plain'
    };
    
    return typeMap[ext] || 'application/octet-stream';
}

// Helper method to get document icons
getDocumentIcon(mimeType) {
    const iconMap = {
        'application/pdf': 'fas fa-file-pdf',
        'application/msword': 'fas fa-file-word',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'fas fa-file-word',
        'application/vnd.ms-excel': 'fas fa-file-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'fas fa-file-excel',
        'application/vnd.ms-powerpoint': 'fas fa-file-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'fas fa-file-powerpoint',
        'text/plain': 'fas fa-file-alt'
    };
    
    return iconMap[mimeType] || 'fas fa-file';
}


clearDocumentPreview() {
    const documentInput = document.getElementById('documentInput');
    const documentPreview = document.getElementById('documentPreview');
    const uploadContainer = document.getElementById('documentUploadContainer');
    
    console.log('🧹 Clearing document preview');
    
    if (documentInput) documentInput.value = '';
    if (documentPreview) documentPreview.style.display = 'none';
    if (uploadContainer) uploadContainer.style.display = 'block';
}

removeDocument() {
    console.log('🗑️ Removing document');
    this.clearDocumentPreview();
}

    showModal(editMode = false, announcement = null) {
        const modal = document.getElementById('announcementModal');
        const modalTitle = document.getElementById('modalTitle');
        const saveButton = document.getElementById('saveBtnText');
        const form = document.getElementById('announcementForm');

        console.log('showModal called:', { editMode, hasAnnouncement: !!announcement });

        if (!modal) {
            console.error('Modal element not found!');
            return;
        }

        if (!form) {
            console.error('Form element not found!');
            return;
        }

        this.currentEditId = editMode ? announcement.id : null;

        // Update modal title and button text
        if (modalTitle) {
            modalTitle.textContent = editMode ? 'Edit Announcement' : 'Add New Announcement';
        }
        if (saveButton) {
            saveButton.textContent = editMode ? 'Update Announcement' : 'Save Announcement';
        }

        // Reset form and clear image preview
        form.reset();
        this.clearImagePreview();

        // Fill form if editing
        if (editMode && announcement) {
            const titleInput = document.getElementById('announcementTitle');
            const contentInput = document.getElementById('announcementContent');
            const audienceSelect = document.getElementById('targetAudience');
            const courseSelect = document.getElementById('targetCourse');
            const yearSelect = document.getElementById('targetYear');

            if (titleInput) titleInput.value = announcement.title;
            if (contentInput) contentInput.value = announcement.content;
            if (audienceSelect) audienceSelect.value = announcement.target_audience;
            if (courseSelect) courseSelect.value = announcement.target_course;
            if (yearSelect) yearSelect.value = announcement.target_year;

            const priorityRadio = document.querySelector(`input[name="priority"][value="${announcement.priority}"]`);
            if (priorityRadio) priorityRadio.checked = true;

           // COMPLETELY FIXED: Show existing image in edit mode with better loading
if (announcement.image_url) {
    console.log('🖼️ Loading existing image for edit:', announcement.image_url);
    const imageUrl = this.getImageUrl(announcement.image_url);
    console.log('🔗 Final image URL for edit preview:', imageUrl);
    
    // Test if image exists before showing preview
    const testImg = new Image();
    testImg.onload = () => {
        console.log('✅ Edit image loaded successfully, showing preview');
        this.showImagePreview(imageUrl);
    };
    testImg.onerror = () => {
        console.error('❌ Edit image failed to load:', imageUrl);
        // Don't show preview for broken images
    };
    testImg.src = imageUrl;
}
        }

        // Show modal
        modal.style.display = 'flex';
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
        modal.classList.add('active');
        modal.classList.remove('hidden');
        modal.style.zIndex = '99999';
        modal.style.position = 'fixed';
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        // Focus on title input
        setTimeout(() => {
            const titleInput = document.getElementById('announcementTitle');
            if (titleInput) titleInput.focus();
        }, 100);
    }

    hideModal() {
    const modal = document.getElementById('announcementModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
        modal.style.visibility = 'hidden';
        modal.style.opacity = '0';
        document.body.style.overflow = '';
        this.currentEditId = null;
        
        // Clear image preview when closing modal
        this.clearImagePreview();
        
        // ADD THIS LINE:
        this.clearDocumentPreview();
    }
}

// FIXED: Better modal initialization for students
initializeStudentModal() {
    const modal = document.getElementById('studentAnnouncementModal');
    const closeBtn = document.getElementById('studentModalClose');
    
    console.log('🔧 Initializing student modal:', {
        modal: !!modal,
        closeBtn: !!closeBtn
    });
    
    if (closeBtn) {
        // Remove existing listeners to avoid duplicates
        closeBtn.removeEventListener('click', this.hideStudentModal);
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🚪 Modal close button clicked');
            this.hideStudentModal();
        });
    }
    
    if (modal) {
        // Remove existing listeners to avoid duplicates
        modal.removeEventListener('click', this.handleModalBackgroundClick);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                console.log('🚪 Modal background clicked');
                this.hideStudentModal();
            }
        });
    }
    
    // Close with Escape key
    document.removeEventListener('keydown', this.handleEscapeKey);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
            this.hideStudentModal();
        }
    });
}

    // Form submission remains the same as your original code...
    async handleFormSubmit(e) {
        e.preventDefault();
        
        const saveBtn = document.getElementById('saveBtn');
        const saveIcon = document.getElementById('saveIcon');
        const saveBtnText = document.getElementById('saveBtnText');
        
        if (!saveBtn) return;

        try {
            // Disable submit button
            saveBtn.disabled = true;
            if (saveIcon) saveIcon.className = 'fas fa-spinner fa-spin';
            if (saveBtnText) saveBtnText.textContent = this.currentEditId ? 'Updating...' : 'Saving...';

            // Extract form data
            const titleElement = document.getElementById('announcementTitle');
            const contentElement = document.getElementById('announcementContent');
            const audienceElement = document.getElementById('targetAudience');
            const courseElement = document.getElementById('targetCourse');
            const yearElement = document.getElementById('targetYear');
            const priorityElement = document.querySelector('input[name="priority"]:checked');
            const imageInput = document.getElementById('imageInput');

            const title = titleElement?.value?.trim();
            const content = contentElement?.value?.trim();
            const targetAudience = audienceElement?.value || 'All Students';
            const targetCourse = courseElement?.value || 'All';
            const targetYear = yearElement?.value || 'All';
            const priority = priorityElement?.value || 'general';

            console.log('📊 Form data extracted:', {
                title: title ? `"${title}"` : 'EMPTY',
                titleLength: title?.length || 0,
                content: content ? `"${content.substring(0, 50)}..."` : 'EMPTY',
                contentLength: content?.length || 0,
                targetAudience,
                targetCourse,
                targetYear,
                priority,
                hasImage: !!(imageInput?.files?.length)
            });

            // Validation
            if (!title) {
                this.showAlert('Please enter a title for the announcement.', 'error');
                return;
            }

            if (!content) {
                this.showAlert('Please enter content for the announcement.', 'error');
                return;
            }

            if (title.length < 3) {
                this.showAlert('Title must be at least 3 characters long.', 'error');
                return;
            }

            if (content.length < 10) {
                this.showAlert('Content must be at least 10 characters long.', 'error');
                return;
            }

            // Get auth token
            const authToken = this.getAuthToken();
            if (!authToken) {
                this.showAlert('Please log in to continue. Authentication token not found.', 'error');
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 2000);
                return;
            }

            // Prepare request
            const url = this.currentEditId 
                ? `${this.apiUrl}/${this.currentEditId}` 
                : this.apiUrl;

            const hasImage = imageInput && imageInput.files && imageInput.files[0];
const documentInput = document.getElementById('documentInput');
const hasDocument = documentInput && documentInput.files && documentInput.files[0];
let requestOptions;

if (hasImage || hasDocument) {
    // Use FormData for file upload (image, document, or both)
    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    formData.append('target_audience', targetAudience);
    formData.append('target_course', targetCourse);
    formData.append('target_year', targetYear);
    formData.append('priority', priority);
    
    if (hasImage) {
        formData.append('image', imageInput.files[0]);
    }
    
    if (hasDocument) {
        formData.append('document', documentInput.files[0]);
    }
    
    requestOptions = {
        method: this.currentEditId ? 'PUT' : 'POST',
        body: formData,
        credentials: 'include',
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    };
} else {
    // Use JSON for text-only requests
    const requestData = {
        title,
        content,
        target_audience: targetAudience,
        target_course: targetCourse,
        target_year: targetYear,
        priority
    };
    
    requestOptions = {
        method: this.currentEditId ? 'PUT' : 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(requestData),
        credentials: 'include'
    };
}

            console.log('📡 Sending request...', {
                url,
                method: requestOptions.method,
                hasImage,
                hasAuth: !!authToken
            });

            // Make the request
            const response = await fetch(url, requestOptions);
            console.log('📨 Response received:', {
                status: response.status,
                ok: response.ok
            });

            let result;
            try {
                const responseText = await response.text();
                if (responseText.trim() === '') {
                    throw new Error('Empty response from server');
                }
                result = JSON.parse(responseText);
            } catch (jsonError) {
                console.error('JSON parsing failed:', jsonError);
                throw new Error('Server returned invalid response. Please try again.');
            }

            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error(result.message || 'Access denied. Please check your permissions.');
                } else if (response.status === 401) {
                    throw new Error(result.message || 'Authentication failed. Please log in again.');
                } else if (response.status === 400) {
                    throw new Error(result.message || 'Please check that all required fields are filled correctly.');
                } else {
                    throw new Error(result.message || `Server error: ${response.status}`);
                }
            }

            if (result.success) {
                console.log('🎉 Request successful!');
                this.showAlert(
                    this.currentEditId ? 'Announcement updated successfully!' : 'Announcement created successfully!', 
                    'success'
                );
                
                this.hideModal();
                await this.loadAnnouncements();
                await this.updateStats();
            } else {
                throw new Error(result.message || 'Failed to save announcement');
            }

        } catch (error) {
            console.error('❌ Form submission error:', error);
            
            let errorMessage = error.message;
            
            if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
                errorMessage = 'Network error. Please check your internet connection and try again.';
            } else if (errorMessage.includes('403') || errorMessage.includes('Access denied')) {
                errorMessage = 'Access denied. Only Admin, Registrar, and Faculty can post announcements.';
            } else if (errorMessage.includes('401') || errorMessage.includes('Authentication')) {
                errorMessage = 'Your session has expired. Please refresh the page and log in again.';
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 3000);
            }
            
            this.showAlert(`Failed to save announcement: ${errorMessage}`, 'error');
        } finally {
            // Re-enable submit button
            saveBtn.disabled = false;
            if (saveIcon) saveIcon.className = 'fas fa-save';
            if (saveBtnText) {
                saveBtnText.textContent = this.currentEditId ? 'Update Announcement' : 'Save Announcement';
            }
        }
    }

    // Keep all other methods the same (editAnnouncement, deleteAnnouncement, filters, etc.)
    async editAnnouncement(id) {
        try {
            const authToken = this.getAuthToken();
            const headers = { 'Content-Type': 'application/json' };
            
            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            }

            const response = await fetch(`${this.apiUrl}/${id}`, {
                credentials: 'include',
                headers: headers
            });
            const result = await response.json();
            
            if (result.success) {
                this.showModal(true, result.data);
            } else {
                throw new Error(result.message || 'Failed to load announcement');
            }
        } catch (error) {
            console.error('Error loading announcement for edit:', error);
            this.showAlert('Failed to load announcement for editing.', 'error');
        }
    }

    async deleteAnnouncement(id) {
        if (!confirm('Are you sure you want to delete this announcement?')) {
            return;
        }

        try {
            const authToken = this.getAuthToken();
            const headers = {};
            
            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            }

            const response = await fetch(`${this.apiUrl}/${id}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: headers
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert('Announcement deleted successfully!', 'success');
                await this.loadAnnouncements();
                await this.updateStats();
            } else {
                throw new Error(result.message || 'Failed to delete announcement');
            }
        } catch (error) {
            console.error('Error deleting announcement:', error);
            this.showAlert('Failed to delete announcement. Please try again.', 'error');
        }
    }

    // 1. FIRST: Add this debug method to your AnnouncementsManager class
async debugImageLoading() {
    console.log('🔍 Starting image loading debug...');
    
    try {
        // Test 1: Check what announcements we have
        const response = await fetch('/api/announcements', { credentials: 'include' });
        const result = await response.json();
        
        console.log('📋 Loaded announcements:', result.data?.length || 0);
        
        result.data?.forEach(announcement => {
            if (announcement.image_url) {
                console.log('🖼️ Found announcement with image:', {
                    id: announcement.id,
                    title: announcement.title,
                    imageUrl: announcement.image_url,
                    fullUrl: this.getImageUrl(announcement.image_url)
                });
                
                // Test if image loads
                this.testImageLoad(this.getImageUrl(announcement.image_url));
            }
        });
        
        // Test 2: Check debug endpoints
        const debugResponse = await fetch('/debug/image-test');
        const debugResult = await debugResponse.json();
        console.log('🔧 Debug info:', debugResult);
        
    } catch (error) {
        console.error('❌ Debug error:', error);
    }
}

// 2. Add this method to test individual images
async testImageLoad(imageUrl) {
        console.log('🧪 Testing image load:', imageUrl);
        
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            const timeout = setTimeout(() => {
                console.log('⏰ Image load timeout:', imageUrl);
                resolve(false);
            }, 5000);
            
            img.onload = () => {
                clearTimeout(timeout);
                console.log('✅ Image loaded successfully:', imageUrl, {
                    width: img.width,
                    height: img.height,
                    naturalWidth: img.naturalWidth,
                    naturalHeight: img.naturalHeight
                });
                resolve(true);
            };
            
            img.onerror = async (error) => {
                clearTimeout(timeout);
                console.error('❌ Image failed to load:', imageUrl);
                
                // Try alternative URLs
                const alternatives = [
                    imageUrl.replace(window.location.origin, ''),
                    `/api/announcements/image/${imageUrl.split('/').pop()}`,
                    `/api/debug/test-image/${imageUrl.split('/').pop()}`
                ];
                
                console.log('🔄 Trying alternative URLs:', alternatives);
                
                for (const altUrl of alternatives) {
                    try {
                        const response = await fetch(altUrl);
                        if (response.ok) {
                            console.log('✅ Alternative URL works:', altUrl);
                            resolve(altUrl);
                            return;
                        }
                    } catch (e) {
                        console.log('❌ Alternative failed:', altUrl);
                    }
                }
                
                resolve(false);
            };
            
            img.src = imageUrl;
        });
    }



// 5. Call the debug button in your init method (modify your existing init method)
async init() {
    this.setupEventListeners();
    await this.loadAnnouncements();
    await this.updateStats();
    this.addDebugButton(); // Add this line
    console.log('AnnouncementsManager initialized with debugging');
}

    handleFilterChange(e, type) {
        e.preventDefault();
        const value = e.target.dataset.filter;
        
        e.target.parentElement.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');

        this.currentFilters[type] = value;
        this.loadAnnouncements();
    }

    handleCourseFilterChange(e) {
        e.preventDefault();
        const value = e.target.dataset.course;
        
        document.querySelectorAll('.course-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');

        this.currentFilters.target_course = value;
        this.loadAnnouncements();
    }

    handleYearFilterChange(e) {
        e.preventDefault();
        const value = e.target.dataset.year;
        
        document.querySelectorAll('.year-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');

        this.currentFilters.target_year = value;
        this.loadAnnouncements();
    }

    handleSearch(e) {
        this.currentFilters.search = e.target.value.trim();
        
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.loadAnnouncements();
        }, 300);
    }

    showAlert(message, type = 'info') {
        const alert = document.createElement('div');
        alert.className = `announcement-alert announcement-alert-${type}`;
        alert.innerHTML = `
            <div class="announcement-alert-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
                <button class="announcement-alert-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.appendChild(alert);

        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, 5000);

        setTimeout(() => {
            alert.classList.add('show');
        }, 100);
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDateTime(dateString) {
        if (!dateString) return 'Unknown date';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffMinutes = Math.ceil(diffTime / (1000 * 60));
        const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const dateOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        
        const timeOptions = {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        };

        const formattedDate = date.toLocaleDateString('en-US', dateOptions);
        const formattedTime = date.toLocaleTimeString('en-US', timeOptions);

        if (diffMinutes < 60) {
            return `${diffMinutes === 1 ? '1 minute' : diffMinutes + ' minutes'} ago`;
        } else if (diffHours < 24) {
            return `${diffHours === 1 ? '1 hour' : diffHours + ' hours'} ago`;
        } else if (diffDays === 1) {
            return `Yesterday at ${formattedTime}`;
        } else if (diffDays <= 7) {
            return `${diffDays} days ago at ${formattedTime}`;
        } else {
            return `${formattedDate}, ${formattedTime}`;
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing AnnouncementsManager...');
    window.announcementsManager = new AnnouncementsManager();
});
