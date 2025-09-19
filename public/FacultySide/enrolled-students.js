// FacultySide/enrolled-students.js
// DESCRIPTION: Frontend JavaScript for faculty enrolled students management

class FacultyEnrolledStudents {
    constructor() {
    this.students = [];
    this.filteredStudents = [];
    this.currentFilters = {
        search: '',
        program: '',
        yearLevel: ''
    };
    
    // ADD this line to prevent multiple initializations
    this.isInitialized = false;
    
    // Existing code continues...
    this.boundHandleSearch = null;
    this.boundExportHandler = null;
    this.searchTimeout = null;
    
    this.init();
}
    
    async init() {
    console.log('🎓 Initializing Faculty Enrolled Students Module...');
    
    // Ensure we don't initialize multiple times
    if (this.isInitialized) {
        console.log('⚠️ Already initialized, skipping...');
        return;
    }
    
    // Wait for DOM to be ready with multiple checks
    await this.waitForDOM();
    
    // Set initialization flag
    this.isInitialized = true;
    
    // Setup event listeners first
    this.setupEventListeners();
    
    // Load initial data
    await this.loadEnrolledStudents();
    await this.loadStatistics();
    
    // Enable auto-refresh
    this.setupAutoRefresh();
    
    console.log('✅ Faculty Enrolled Students initialized successfully');
}

// ADD this new method to enrolled-students.js (after the init method)
async waitForDOM() {
    return new Promise((resolve) => {
        const checkDOM = () => {
            const searchInput = document.querySelector('#studentSearch');
            const programFilter = document.querySelector('#programFilter');
            const yearFilter = document.querySelector('#yearFilter');
            const exportBtn = document.querySelector('#exportStudents');
            
            if (searchInput && programFilter && yearFilter && exportBtn) {
                console.log('✅ All required DOM elements found');
                resolve();
            } else {
                console.log('⏳ Waiting for DOM elements...', {
                    search: !!searchInput,
                    program: !!programFilter,
                    year: !!yearFilter,
                    export: !!exportBtn
                });
                setTimeout(checkDOM, 500);
            }
        };
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', checkDOM);
        } else {
            checkDOM();
        }
    });
}


    
    // REPLACE the entire setupEventListeners method with this FIXED version
setupEventListeners() {
    console.log('🔧 Setting up event listeners...');
    
    // Wait for DOM elements to be available
    const setupWithRetry = (attempt = 0) => {
        if (attempt > 10) {
            console.error('❌ Failed to setup event listeners after 10 attempts');
            return;
        }
        
        const searchInput = document.querySelector('#studentSearch');
        const programFilter = document.querySelector('#programFilter');
        const yearFilter = document.querySelector('#yearFilter');
        const exportBtn = document.querySelector('#exportStudents');
        
        if (!searchInput || !programFilter || !yearFilter || !exportBtn) {
            console.log(`⏳ Attempt ${attempt + 1}: Missing elements, retrying...`);
            setTimeout(() => setupWithRetry(attempt + 1), 300);
            return;
        }
        
        console.log('✅ All DOM elements found, setting up listeners...');
        
        // Search input - FIXED
        if (this.boundHandleSearch) {
            searchInput.removeEventListener('input', this.boundHandleSearch);
        }
        
        this.boundHandleSearch = (e) => {
            const searchValue = e.target.value.toLowerCase().trim();
            console.log('🔍 Search input changed:', searchValue);
            
            if (this.searchTimeout) {
                clearTimeout(this.searchTimeout);
            }
            
            this.currentFilters.search = searchValue;
            
            this.searchTimeout = setTimeout(() => {
                this.applyFilters();
            }, 300);
        };
        
        searchInput.addEventListener('input', this.boundHandleSearch);
        console.log('✅ Search listener attached');
        
        // Program filter - FIXED
        programFilter.addEventListener('change', (e) => {
            console.log('🎓 Program filter changed:', e.target.value);
            this.currentFilters.program = e.target.value;
            this.applyFilters();
        });
        console.log('✅ Program filter listener attached');
        
        // Year filter - FIXED
        yearFilter.addEventListener('change', (e) => {
            console.log('📅 Year filter changed:', e.target.value);
            this.currentFilters.yearLevel = e.target.value;
            this.applyFilters();
        });
        console.log('✅ Year filter listener attached');
        
        // Export button - FIXED
        if (this.boundExportHandler) {
            exportBtn.removeEventListener('click', this.boundExportHandler);
        }
        
        this.boundExportHandler = (e) => {
            e.preventDefault();
            console.log('📊 Export button clicked');
            this.exportStudentsList();
        };
        
        exportBtn.addEventListener('click', this.boundExportHandler);
        console.log('✅ Export button listener attached');
        
        // Migration button
        const migrateBtn = document.getElementById('migrateApprovedBtn');
        if (migrateBtn) {
            migrateBtn.addEventListener('click', () => this.migrateApprovedRequests());
            console.log('✅ Migration button listener attached');
        }
        // ADD: Cleanup duplicates button listener (in setupEventListeners method)
const cleanupBtn = document.getElementById('cleanupDuplicatesBtn');
if (cleanupBtn) {
    cleanupBtn.addEventListener('click', () => this.cleanupDuplicates());
    console.log('✅ Cleanup button listener attached');
}
        
        // Setup modal and sorting
        this.setupModalEventListeners();
        this.setupSorting();
        
        console.log('✅ All event listeners setup complete');
    };
    
    setupWithRetry();
}
    

    
    // REPLACE the existing loadEnrolledStudents method with enhanced debugging
async loadEnrolledStudents() {
    try {
        console.log('📚 Loading enrolled students...');
        this.showLoading(true);
        
        const response = await fetch('/api/enrollment/enrolled-students');
        console.log('📡 API Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('📊 API Response:', result);
        
        if (result.success) {
            this.students = result.data || [];
            this.filteredStudents = [...this.students];
            console.log('✅ Loaded', this.students.length, 'enrolled students');
            
            // ENHANCED DEBUG - Show sample student data
            if (this.students.length > 0) {
                console.log('📋 Sample student data:', this.students[0]);
                console.log('📋 Student fields:', Object.keys(this.students[0]));
            }
            
            // Force display immediately
            this.displayStudents();
            
            if (result.metadata) {
                this.updateCounts(result.metadata);
                console.log('📊 Updated metadata:', result.metadata);
            }
            
            // Update statistics counters - use full dataset initially
this.updateStatistics({
    totalStudents: this.students.length,
    activeStudents: this.students.filter(s => s.enrollment_status === 'active').length,
    newEnrollees: this.students.filter(s => {
        const enrollDate = new Date(s.enrollment_date);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return enrollDate >= thirtyDaysAgo;
    }).length,
    coursesCount: [...new Set(this.students.map(s => s.program))].length
});

// Apply any existing filters immediately after loading
if (this.currentFilters.search || this.currentFilters.program || this.currentFilters.yearLevel) {
    this.applyFilters();
}
            
        } else {
            console.error('❌ API returned error:', result.message);
            this.showError('Failed to load enrolled students: ' + result.message);
        }
        
    } catch (error) {
        console.error('❌ Error loading enrolled students:', error);
        this.showError('Network error loading enrolled students: ' + error.message);
    } finally {
        this.showLoading(false);
    }
}

// FIXED: Enhanced migration method with auto-refresh and duplicate prevention feedback
async migrateApprovedRequests() {
    try {
        console.log('🔄 Starting enhanced migration with duplicate prevention...');
        
        // Show loading state
        const migrateBtn = document.getElementById('migrateApprovedBtn');
        const resultDiv = document.getElementById('migrationResult');
        
        if (migrateBtn) {
            migrateBtn.disabled = true;
            migrateBtn.innerHTML = '🔄 Processing Migration...';
        }
        
        if (resultDiv) {
            resultDiv.innerHTML = '<div class="alert alert-info">🔄 Migration in progress with duplicate prevention...</div>';
        }
        
        // STEP 1: Execute migration
        const response = await fetch('/api/enrollment/migrate-approved', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Migration completed successfully:', result);
            
            // STEP 2: Show detailed success message with duplicate prevention stats
            if (resultDiv) {
                let statusMessage = `
                    <div class="alert alert-success">
                        ✅ <strong>Migration Completed Successfully!</strong><br><br>
                        📊 <strong>Results Summary:</strong><br>
                        • <strong>${result.migratedCount}</strong> new students enrolled<br>
                        • <strong>${result.notificationsSent}</strong> enrollment notifications sent<br>
                        • <strong>${result.duplicatesPrevented || 0}</strong> duplicate entries prevented<br>
                        • Academic Year: <strong>${result.academicYear}</strong><br>
                `;
                
                if (result.errorCount > 0) {
                    statusMessage += `• ⚠️ <strong>${result.errorCount}</strong> processing errors occurred<br>`;
                }
                
                statusMessage += `
                        <br>🔄 <em>Data automatically refreshed to reflect changes.</em>
                    </div>
                `;
                
                resultDiv.innerHTML = statusMessage;
            }
            
            // STEP 3: Force refresh all data to show updated results
            console.log('🔄 Force refreshing data after migration...');
            
            // Clear existing data first
            this.students = [];
            this.filteredStudents = [];
            
            // Show loading while refreshing
            this.showLoading(true);
            
            // Change the existing timeout from 2000 to 3000 milliseconds for better reliability
setTimeout(async () => {
    try {
        await Promise.all([
            this.loadEnrolledStudents(),
            this.loadStatistics()
        ]);
        
        // Clear and reload to ensure fresh data
        this.students = [];
        this.filteredStudents = [];
        
        // Reload again after clearing
        await this.loadEnrolledStudents();
        
        // Reapply current filters
        this.applyFilters();
        
        console.log('✅ Data refresh completed after migration');
        
        // Show success notification
        this.showSuccessNotification(`Migration completed: ${result.migratedCount} students enrolled, ${result.duplicatesPrevented || 0} duplicates prevented`);
        
    } catch (refreshError) {
        console.error('❌ Error refreshing data after migration:', refreshError);
        this.showError('Migration successful but failed to refresh display. Please refresh the page.');
    }
}, 3000); // Increased from 2000 to 3000ms
            
        } else {
            console.error('❌ Migration failed:', result.message);
            if (resultDiv) {
                resultDiv.innerHTML = `
                    <div class="alert alert-danger">
                        ❌ <strong>Migration Failed</strong><br>
                        ${result.message}<br>
                        <em>Please check the system logs and try again.</em>
                    </div>
                `;
            }
        }
        
    } catch (error) {
        console.error('❌ Error during migration:', error);
        const resultDiv = document.getElementById('migrationResult');
        if (resultDiv) {
            resultDiv.innerHTML = `
                <div class="alert alert-danger">
                    ❌ <strong>Migration Error</strong><br>
                    ${error.message}<br>
                    <em>Please check your connection and try again.</em>
                </div>
            `;
        }
    } finally {
        // Reset button state
        const migrateBtn = document.getElementById('migrateApprovedBtn');
        if (migrateBtn) {
            migrateBtn.disabled = false;
            migrateBtn.innerHTML = '🔄 Migrate Approved Requests';
        }
    }
}

// ADD: Cleanup duplicates method
async cleanupDuplicates() {
    try {
        console.log('🧹 Starting duplicate cleanup...');
        
        const cleanupBtn = document.getElementById('cleanupDuplicatesBtn');
        const resultDiv = document.getElementById('migrationResult');
        
        if (cleanupBtn) {
            cleanupBtn.disabled = true;
            cleanupBtn.innerHTML = '🧹 Cleaning up...';
        }
        
        if (resultDiv) {
            resultDiv.innerHTML = '<div class="alert alert-info">🧹 Removing duplicate student entries...</div>';
        }
        
        const response = await fetch('/api/enrollment/cleanup-duplicates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.success) {
            if (resultDiv) {
                resultDiv.innerHTML = `
                    <div class="alert alert-success">
                        ✅ <strong>Cleanup Completed!</strong><br>
                        • ${result.removedCount} duplicate entries removed<br>
                        • ${result.duplicateGroups || 0} duplicate groups processed<br>
                        <br>🔄 <em>Refreshing student list...</em>
                    </div>
                `;
            }
            
            // Refresh data after cleanup
            setTimeout(async () => {
                await this.forceRefresh();
            }, 1000);
            
        } else {
            if (resultDiv) {
                resultDiv.innerHTML = `
                    <div class="alert alert-danger">
                        ❌ <strong>Cleanup Failed:</strong> ${result.message}
                    </div>
                `;
            }
        }
        
    } catch (error) {
        console.error('❌ Cleanup error:', error);
        const resultDiv = document.getElementById('migrationResult');
        if (resultDiv) {
            resultDiv.innerHTML = `
                <div class="alert alert-danger">
                    ❌ <strong>Cleanup Error:</strong> ${error.message}
                </div>
            `;
        }
    } finally {
        const cleanupBtn = document.getElementById('cleanupDuplicatesBtn');
        if (cleanupBtn) {
            cleanupBtn.disabled = false;
            cleanupBtn.innerHTML = '🧹 Cleanup Duplicates';
        }
    }
}

// NEW: Add success notification helper method
showSuccessNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.innerHTML = `
        <div class="notification-content">
            ✅ ${message}
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #d4edda;
        border: 1px solid #c3e6cb;
        color: #155724;
        padding: 15px;
        border-radius: 8px;
        z-index: 9999;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease-out;
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto-remove after 8 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 8000);
}

// ADD this to your setupEventListeners() method
setupEventListeners() {
    // ... your existing event listeners ...
    
    // ADD THIS: Migration button event listener
    const migrateBtn = document.getElementById('migrateApprovedBtn');
    if (migrateBtn) {
        migrateBtn.addEventListener('click', () => this.migrateApprovedRequests());
    }
}

// ADD this method to the FacultyEnrolledStudents class
async autoRefresh() {
    try {
        console.log('🔄 Auto-refreshing enrolled students data...');
        
        // Store current filters
        const currentFilters = { ...this.currentFilters };
        
        // Reload data
        await this.loadEnrolledStudents();
        await this.loadStatistics();
        
        // Reapply filters
        this.currentFilters = currentFilters;
        this.applyFilters();
        
        console.log('✅ Auto-refresh completed');
        
    } catch (error) {
        console.error('❌ Error during auto-refresh:', error);
    }
}

// FIXED: Setup auto-refresh with error handling
setupAutoRefresh() {
    // Clear any existing interval
    if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
    }
    
    // Set up new interval with error handling
    this.refreshInterval = setInterval(async () => {
        try {
            await this.autoRefresh();
        } catch (error) {
            console.error('❌ Auto-refresh error:', error);
            // Don't stop auto-refresh on error, just log it
        }
    }, 30000); // 30 seconds
    
    console.log('🔄 Auto-refresh enabled (every 30 seconds) with error handling');
}

// ADD this method to FacultySide/enrolled-students.js
destroy() {
    // Clean up auto-refresh interval
    if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
        this.refreshInterval = null;
        console.log('🔄 Auto-refresh disabled');
    }
}

// ADD this method to the FacultyEnrolledStudents class
async forceRefresh() {
    try {
        console.log('🔄 Force refreshing all data...');
        
        // Clear existing data
        this.students = [];
        this.filteredStudents = [];
        
        // Show loading
        this.showLoading(true);
        
        // Reload everything
        await Promise.all([
            this.loadEnrolledStudents(),
            this.loadStatistics()
        ]);
        
        console.log('✅ Force refresh completed');
        
    } catch (error) {
        console.error('❌ Error during force refresh:', error);
        this.showError('Failed to refresh data');
    } finally {
        this.showLoading(false);
    }
}
    
    async loadStatistics() {
        try {
            console.log('📊 Loading faculty statistics...');
            
            const response = await fetch('/api/enrollment/enrolled-students/stats');
            const result = await response.json();
            
            if (result.success) {
                this.updateStatistics(result.stats);
                console.log('✅ Statistics loaded successfully');
            } else {
                console.error('❌ Failed to load statistics:', result.message);
            }
            
        } catch (error) {
            console.error('❌ Error loading statistics:', error);
        }
    }
    
    updateStatistics(stats) {
        // Update the stat cards in the faculty dashboard
        const totalStudentsEl = document.getElementById('totalStudents');
        const activeStudentsEl = document.getElementById('activeStudents');
        const newEnrolleesEl = document.getElementById('newEnrollees');
        const coursesCountEl = document.getElementById('coursesCount');
        
        if (totalStudentsEl) totalStudentsEl.textContent = stats.totalStudents || 0;
        if (activeStudentsEl) activeStudentsEl.textContent = stats.activeStudents || 0;
        if (newEnrolleesEl) newEnrolleesEl.textContent = stats.newEnrollees || 0;
        if (coursesCountEl) coursesCountEl.textContent = stats.coursesCount || 0;
        
        console.log('📊 Statistics updated:', stats);
    }
    
    updateCounts(metadata) {
        // Additional metadata can be used for more detailed statistics
        console.log('📈 Metadata received:', metadata);
    }
    
    // REPLACE the existing displayStudents method with this FIXED version
displayStudents() {
    const container = document.getElementById('facultyStudentsList');
    if (!container) {
        console.error('❌ Students list container not found');
        return;
    }
    
    console.log('📋 Displaying students. Filtered count:', this.filteredStudents.length);
    
    // Handle loading and empty states
    const loadingEl = document.getElementById('loadingState');
    const emptyEl = document.getElementById('emptyState');
    
    if (loadingEl) loadingEl.style.display = 'none';
    
    if (this.filteredStudents.length === 0) {
        console.log('📋 No students to display - showing empty state');
        if (emptyEl) emptyEl.style.display = 'block';
        container.innerHTML = '';
        return;
    }
    
    if (emptyEl) emptyEl.style.display = 'none';
    
    // Generate HTML for all filtered students
    const studentsHTML = this.filteredStudents.map((student, index) => {
        return this.generateStudentCard(student, index + 1);
    }).join('');
    
    // Update container
    container.innerHTML = studentsHTML;
    
    console.log('✅ Successfully displayed', this.filteredStudents.length, 'students in DOM');
    
    // Force browser repaint
    container.style.opacity = '0.99';
    setTimeout(() => {
        container.style.opacity = '';
    }, 10);
}

// ADD this method right after displayStudents() to ensure proper refresh
forceDisplayRefresh() {
    console.log('🔄 Force refreshing display...');
    
    // Get container
    const container = document.getElementById('facultyStudentsList');
    if (!container) {
        console.error('❌ Students container not found for refresh');
        return;
    }
    
    // Clear and rebuild
    container.innerHTML = '';
    
    // Re-display
    this.displayStudents();
    
    console.log('✅ Display force refresh completed');
}

    // ADD this method to FacultyEnrolledStudents class - AFTER the updateStatistics method
updateFilteredStatistics() {
    console.log('📊 Updating statistics based on filtered results...');
    
    const stats = {
        totalStudents: this.filteredStudents.length,
        activeStudents: this.filteredStudents.filter(s => s.enrollment_status === 'active').length,
        newEnrollees: this.filteredStudents.filter(s => {
            const enrollDate = new Date(s.enrollment_date);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return enrollDate >= thirtyDaysAgo;
        }).length,
        coursesCount: [...new Set(this.filteredStudents.map(s => s.program))].length
    };
    
    this.updateStatistics(stats);
    console.log('📊 Filtered statistics updated:', stats);
}
    
    // REPLACE your existing generateStudentCard method with this fixed version
generateStudentCard(student, index) {
    // Parse subjects for display with better error handling
    const subjects = student.subjects_parsed || [];
    const subjectsCount = subjects.length;
    
    // Format enrollment date
    const enrollDate = new Date(student.enrollment_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    
    // Determine status badge
    const statusBadge = this.getStatusBadge(student.enrollment_status);
    
    // Generate proper CSS classes for styling
    const studentTypeClass = this.getStudentTypeClass(student.student_type);
    const programClass = this.getProgramClass(student.program);
    const yearClass = this.getYearClass(student.year_level);
    
    return `
        <div class="faculty-student-row" data-student-id="${student.student_id}" onclick="facultyEnrolledStudents.showStudentDetails(${student.id})">
            <div class="faculty-student-index">${index}</div>
            
            <div class="faculty-student-details">
                <div class="faculty-student-name">${student.student_name}</div>
                <div class="faculty-student-meta">
                    <span class="faculty-student-type ${studentTypeClass}">${(student.student_type || 'regular').toUpperCase()}</span>
                    <span class="faculty-student-subjects">📚 ${subjectsCount} subject${subjectsCount !== 1 ? 's' : ''}</span>
                    <span class="faculty-student-date">📅 ${enrollDate}</span>
                </div>
            </div>
            
            <div class="faculty-student-id">
                <code>${student.student_id}</code>
            </div>
            
            <div class="faculty-student-email">
                <a href="mailto:${student.student_email}" class="faculty-email-link" onclick="event.stopPropagation()">
                    ${student.student_email}
                </a>
            </div>
            
            <div class="faculty-student-program">
                <span class="faculty-program-badge ${programClass}">${student.program}</span>
            </div>
            
            <div class="faculty-student-year">
                <span class="faculty-year-badge ${yearClass}">${student.year_level}</span>
            </div>
            
            <div class="faculty-student-contact">
                ${student.phone !== 'N/A' ? `<span class="faculty-phone">📞 ${student.phone}</span>` : '<span class="faculty-no-contact">No contact</span>'}
            </div>
            
            <div class="faculty-student-status">
                ${statusBadge}
            </div>
        </div>
    `;
}

// ADD: Modal functionality for student details
showStudentDetails(enrolledStudentId) {
    console.log('👤 Opening student details modal for ID:', enrolledStudentId);
    
    // Find the student in our current data
    const student = this.students.find(s => s.id === enrolledStudentId);
    
    if (!student) {
        console.error('❌ Student not found with ID:', enrolledStudentId);
        alert('Student details not found. Please refresh and try again.');
        return;
    }
    
    console.log('👤 Found student data:', student);
    console.log('📚 Student subjects data:', student.subjects);
    console.log('📚 Student subjects_parsed:', student.subjects_parsed);
    
    this.displayStudentInModal(student);
}

displayStudentInModal(student) {
    // Populate modal with student data
    document.getElementById('modalStudentName').textContent = student.student_name;
    document.getElementById('modalStudentId').textContent = `Student ID: ${student.student_id}`;
    document.getElementById('modalStudentEmail').textContent = `Email: ${student.student_email}`;
    document.getElementById('modalStudentProgram').textContent = student.program;
    document.getElementById('modalStudentYear').textContent = student.year_level;
    document.getElementById('modalStudentType').textContent = student.student_type.toUpperCase();
    document.getElementById('modalTotalFees').textContent = `₱${parseFloat(student.total_fees).toFixed(2)}`;
    
    // Set student initials
    const initials = student.student_name.split(' ').map(name => name.charAt(0)).join('');
    document.getElementById('studentInitials').textContent = initials;
    
    // Display subjects
    this.displaySubjectsInModal(student.subjects_parsed || []);
    
    // Show modal
    document.getElementById('studentModalOverlay').style.display = 'flex';
}

// REPLACE displaySubjectsInModal method with this TABLE VERSION
displaySubjectsInModal(subjects) {
    const subjectsTable = document.getElementById('modalSubjectsList');
    
    console.log('📚 Raw subjects data received:', subjects);
    console.log('📚 Subjects type:', typeof subjects);
    
    if (!subjectsTable) {
        console.error('❌ Modal subjects table body not found');
        return;
    }
    
    // ENHANCED SUBJECT PARSING - Handle multiple data formats
    let parsedSubjects = [];
    
    try {
        if (typeof subjects === 'string' && subjects.trim() !== '') {
            const parsed = JSON.parse(subjects);
            console.log('📚 Parsed from string:', parsed);
            
            if (Array.isArray(parsed)) {
                parsedSubjects = parsed;
            } else if (typeof parsed === 'object' && parsed !== null) {
                parsedSubjects = Object.values(parsed);
            }
        } else if (Array.isArray(subjects)) {
            parsedSubjects = subjects;
        } else if (typeof subjects === 'object' && subjects !== null) {
            parsedSubjects = Object.values(subjects);
        }
        
        parsedSubjects = parsedSubjects.filter(subject => 
            subject && 
            (subject.subject_code || subject.code || subject.name || subject.subject_name)
        );
        
        console.log('📚 Final parsed subjects:', parsedSubjects);
        
    } catch (error) {
        console.error('❌ Error parsing subjects:', error);
        parsedSubjects = [];
    }
    
    // Display subjects in TABLE format or show empty state
    if (parsedSubjects.length === 0) {
        subjectsTable.innerHTML = `
            <tr class="no-subjects-row">
                <td colspan="6" class="no-subjects-message">
                    <div class="no-subjects-content">
                        <div class="no-subjects-icon">📚</div>
                        <div class="no-subjects-text">No subjects found for this student</div>
                        <div class="no-subjects-subtitle">Subject data may not be available</div>
                    </div>
                </td>
            </tr>
        `;
        document.getElementById('totalSubjects').textContent = '0';
        document.getElementById('totalUnits').textContent = '0';
        document.getElementById('totalUnits2').textContent = '0';
        return;
    }
    
    // Generate TABLE ROWS for subjects
    const subjectsHTML = parsedSubjects.map((subject, index) => {
        const subjectCode = subject.subject_code || subject.code || subject.subjectCode || `SUBJ-${index + 1}`;
        const subjectName = subject.subject_name || subject.name || subject.title || subject.description || 'No description available';
        const units = parseInt(subject.units || subject.credit_units || subject.credits) || 3;
        const schedule = subject.schedule || subject.time || subject.class_schedule || 'TBA';
        const section = subject.section || subject.class_section || 'A';
        const prerequisite = subject.prerequisite || subject.prereq || subject.prerequisites || '-';
        
        // Format schedule for better display
        let formattedSchedule = schedule;
        if (schedule !== 'TBA' && schedule.includes('-')) {
            const parts = schedule.split('-');
            if (parts.length === 2) {
                formattedSchedule = `${parts[0]}-${parts[1]}`;
            }
        }
        
        return `
            <tr class="subject-row">
                <td class="subject-code-cell">
                    <strong>${subjectCode}</strong>
                </td>
                <td class="subject-description-cell">
                    ${subjectName}
                </td>
                <td class="subject-section-cell">
                    <span class="section-badge">${section}</span>
                </td>
                <td class="subject-units-cell">
                    <span class="units-badge">${units}</span>
                </td>
                <td class="subject-prerequisite-cell">
                    ${prerequisite}
                </td>
                <td class="subject-schedule-cell">
                    <div class="schedule-info">
                        ${formattedSchedule}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    subjectsTable.innerHTML = subjectsHTML;
    
    // Calculate and display totals
    const totalUnits = parsedSubjects.reduce((sum, subject) => {
        const units = parseInt(subject.units || subject.credit_units || subject.credits) || 3;
        return sum + units;
    }, 0);
    
    document.getElementById('totalSubjects').textContent = parsedSubjects.length;
    document.getElementById('totalUnits').textContent = totalUnits;
    document.getElementById('totalUnits2').textContent = totalUnits;
    
    console.log('✅ Table updated with', parsedSubjects.length, 'subjects,', totalUnits, 'total units');
}



// REPLACE the existing setupModalEventListeners method with this FIXED version
setupModalEventListeners() {
    console.log('🔧 Setting up modal event listeners...');
    
    const modal = document.getElementById('studentModalOverlay');
    const closeBtn = document.getElementById('closeStudentModal');
    
    // Close button click handler - FIXED
    if (closeBtn) {
        closeBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🚪 Close button clicked');
            this.closeModal();
        };
    }
    
    // Close modal on overlay click - FIXED
    if (modal) {
        modal.onclick = (e) => {
            if (e.target === modal) {
                console.log('🚪 Overlay clicked, closing modal');
                this.closeModal();
            }
        };
    }
    
    // Close modal on Escape key - ENHANCED
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('studentModalOverlay');
            if (modal && modal.style.display === 'flex') {
                console.log('🚪 Escape key pressed, closing modal');
                this.closeModal();
            }
        }
    });
    
    console.log('✅ Modal event listeners setup complete');
}

// ADD this method to FacultyEnrolledStudents class - MISSING closeModal method
closeModal() {
    console.log('🚪 Closing student details modal...');
    const modal = document.getElementById('studentModalOverlay');
    if (modal) {
        modal.style.display = 'none';
        // Clear modal content to prevent memory leaks
        document.getElementById('modalSubjectsList').innerHTML = '';
    }
}

// ADD: Sorting functionality
setupSorting() {
    this.currentSort = {
        column: 'student_name',
        direction: 'asc'
    };
}

// ENSURE this method exists in your FacultyEnrolledStudents class
sortStudents(column) {
    console.log('📊 Sorting students by:', column);
    
    // Initialize currentSort if it doesn't exist
    if (!this.currentSort) {
        this.currentSort = { column: 'student_name', direction: 'asc' };
    }
    
    // Toggle sort direction if clicking same column
    if (this.currentSort.column === column) {
        this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        this.currentSort.column = column;
        this.currentSort.direction = 'asc';
    }
    
    // Sort the filtered students
    this.filteredStudents.sort((a, b) => {
        let aValue = a[column] || '';
        let bValue = b[column] || '';
        
        // Handle different data types
        if (column === 'program') {
            const programOrder = { 'BSIT': 1, 'BSCS': 2, 'BSIS': 3, 'BSBA': 4 };
            aValue = programOrder[aValue] || 999;
            bValue = programOrder[bValue] || 999;
        } else if (column === 'year_level') {
            const yearOrder = { '1st Year': 1, '2nd Year': 2, '3rd Year': 3, '4th Year': 4 };
            aValue = yearOrder[aValue] || 999;
            bValue = yearOrder[bValue] || 999;
        } else {
            aValue = String(aValue).toLowerCase();
            bValue = String(bValue).toLowerCase();
        }
        
        let comparison = 0;
        if (aValue > bValue) comparison = 1;
        if (aValue < bValue) comparison = -1;
        
        return this.currentSort.direction === 'desc' ? -comparison : comparison;
    });
    
    this.displayStudents();
    this.updateSortIndicators();
}

updateSortIndicators() {
    // Remove all existing sort indicators
    document.querySelectorAll('.sort-indicator').forEach(indicator => {
        indicator.remove();
    });
    
    // Add indicator to current sort column
    const headers = document.querySelectorAll('.faculty-table-header div[data-sort]');
    headers.forEach(header => {
        if (header.dataset.sort === this.currentSort.column) {
            const indicator = document.createElement('span');
            indicator.className = 'sort-indicator';
            indicator.textContent = this.currentSort.direction === 'asc' ? ' ↑' : ' ↓';
            header.appendChild(indicator);
        }
    });
}

// REPLACE the first handleSearch method with this FIXED version
handleSearch(searchValue) {
    console.log('🔍 Search input changed to:', searchValue);
    console.log('🔍 Search type:', typeof searchValue);
    
    // Handle both direct calls and event objects
    let searchTerm = '';
    if (typeof searchValue === 'string') {
        searchTerm = searchValue;
    } else if (searchValue && searchValue.target) {
        searchTerm = searchValue.target.value;
    }
    
    console.log('🔍 Final search term:', searchTerm);
    
    this.currentFilters.search = searchTerm.toLowerCase().trim();
    this.applyFilters();
    
    // Update statistics based on filtered results
    this.updateFilteredStatistics();
}

// ADD these new helper methods to your FacultyEnrolledStudents class
getStudentTypeClass(studentType) {
    const type = studentType.toLowerCase();
    switch(type) {
        case 'regular': return 'regular';
        case 'irregular': return 'irregular';
        default: return 'regular'; // Default fallback
    }
}

getProgramClass(program) {
    const prog = program.toLowerCase();
    switch(prog) {
        case 'bsit': return 'bsit';
        case 'bscs': return 'bscs';
        case 'bsis': return 'bsis';
        case 'bsba': return 'bsba';
        default: return 'default-program'; // Fallback for unknown programs
    }
}

getYearClass(yearLevel) {
    const year = yearLevel.toLowerCase().replace(/\s+/g, '-');
    switch(year) {
        case '1st-year':
        case 'first-year': return 'first-year';
        case '2nd-year':
        case 'second-year': return 'second-year';
        case '3rd-year':
        case 'third-year': return 'third-year';
        case '4th-year':
        case 'fourth-year': return 'fourth-year';
        default: return 'default-year'; // Fallback
    }
}
    
    getStatusBadge(status) {
        const statusConfig = {
            'active': { class: 'faculty-status-active', text: 'Active' },
            'dropped': { class: 'faculty-status-dropped', text: 'Dropped' },
            'graduated': { class: 'faculty-status-graduated', text: 'Graduated' }
        };
        
        const config = statusConfig[status] || statusConfig['active'];
        return `<span class="faculty-status-badge ${config.class}">${config.text}</span>`;
    }
    
    
    
    // REPLACE handleProgramFilter method - FIXED to match backend data format
handleProgramFilter(program) {
    console.log('🎓 Program filter changed to:', program);
    console.log('🎓 Available programs in data:', [...new Set(this.students.map(s => s.program))]);
    
    // Store the filter value exactly as received
    this.currentFilters.program = program;
    this.applyFilters();
    this.forceDisplayRefresh(); // Add this line for extra assurance
    // Update statistics based on filtered results
    this.updateFilteredStatistics();
}

// REPLACE handleYearFilter method - FIXED to match backend data format  
handleYearFilter(yearLevel) {
    console.log('📅 Year level filter changed to:', yearLevel);
    console.log('📅 Available year levels in data:', [...new Set(this.students.map(s => s.year_level))]);
    
    // Store the filter value exactly as received
    this.currentFilters.yearLevel = yearLevel;
    this.applyFilters();
    this.forceDisplayRefresh(); // Add this line for extra assurance
    // Update statistics based on filtered results
    this.updateFilteredStatistics();
}
    
    // REPLACE the applyFilters method with this ENHANCED debugging version
applyFilters() {
    console.log('🔍 === APPLYING FILTERS ===');
    console.log('Current filters:', this.currentFilters);
    console.log('Total students:', this.students.length);
    
    if (!this.students || this.students.length === 0) {
        console.log('⚠️ No students data available');
        this.filteredStudents = [];
        this.displayStudents();
        return;
    }
    
    // Start with all students
    this.filteredStudents = this.students.filter(student => {
        let passesFilter = true;
        
        // Search filter - check multiple fields
        if (this.currentFilters.search && this.currentFilters.search.trim() !== '') {
            const searchTerm = this.currentFilters.search.toLowerCase();
            const searchableFields = [
                student.student_name || '',
                student.student_email || '',
                student.student_id || '',
                student.program || '',
                student.year_level || ''
            ].join(' ').toLowerCase();
            
            if (!searchableFields.includes(searchTerm)) {
                passesFilter = false;
                console.log('❌ Search filter failed for:', student.student_name);
            }
        }
        
        // Program filter - exact match
        if (this.currentFilters.program && this.currentFilters.program.trim() !== '') {
            if (student.program !== this.currentFilters.program) {
                passesFilter = false;
                console.log('❌ Program filter failed for:', student.student_name, 'Expected:', this.currentFilters.program, 'Got:', student.program);
            }
        }
        
        // Year level filter - exact match
        if (this.currentFilters.yearLevel && this.currentFilters.yearLevel.trim() !== '') {
            if (student.year_level !== this.currentFilters.yearLevel) {
                passesFilter = false;
                console.log('❌ Year filter failed for:', student.student_name, 'Expected:', this.currentFilters.yearLevel, 'Got:', student.year_level);
            }
        }
        
        if (passesFilter) {
            console.log('✅ Student passed all filters:', student.student_name);
        }
        
        return passesFilter;
    });
    
    console.log('📊 Filter results:', this.filteredStudents.length, 'of', this.students.length, 'students');
    
    // Update display and statistics
    this.displayStudents();
    this.updateFilteredStatistics();
    
    console.log('🔍 === FILTERS APPLIED ===');
}

// ADD these manual trigger functions for direct HTML onclick events
triggerSearch() {
    const searchInput = document.querySelector('#studentSearch');
    if (searchInput) {
        const searchValue = searchInput.value.toLowerCase().trim();
        this.currentFilters.search = searchValue;
        this.applyFilters();
        console.log('🔍 Manual search triggered:', searchValue);
    }
}

triggerProgramFilter() {
    const programFilter = document.querySelector('#programFilter');
    if (programFilter) {
        this.currentFilters.program = programFilter.value;
        this.applyFilters();
        console.log('🎓 Manual program filter triggered:', programFilter.value);
    }
}

triggerYearFilter() {
    const yearFilter = document.querySelector('#yearFilter');
    if (yearFilter) {
        this.currentFilters.yearLevel = yearFilter.value;
        this.applyFilters();
        console.log('📅 Manual year filter triggered:', yearFilter.value);
    }
}

triggerExport() {
    console.log('📊 Enhanced export triggered');
    this.exportStudentsList();
}
    
    // ADD this FIXED export method - replace the existing exportStudentsList method
exportStudentsList() {
    try {
        console.log('📊 Starting enhanced export process...');
        
        if (!this.filteredStudents || this.filteredStudents.length === 0) {
            alert('No students to export. Please check your filters or ensure students are loaded.');
            return;
        }
        
        // Show export options modal
        this.showExportModal();
        
    } catch (error) {
        console.error('❌ Export error:', error);
        alert('Failed to start export: ' + error.message);
    }
}

// ADD this new method to show export options
showExportModal() {
    const modalHTML = `
        <div class="export-modal-overlay" id="exportModalOverlay">
            <div class="export-modal">
                <div class="export-modal-header">
                    <h3>📊 Export Students Data</h3>
                    <button class="export-modal-close" onclick="this.closest('.export-modal-overlay').remove()">&times;</button>
                </div>
                <div class="export-modal-body">
                    <div class="export-info">
                        <p><strong>${this.filteredStudents.length}</strong> students will be exported based on current filters.</p>
                    </div>
                    
                    <div class="export-options">
                        <h4>Export Format:</h4>
                        <div class="export-format-group">
                            <label class="export-option">
                                <input type="radio" name="exportFormat" value="csv" checked>
                                <span>📄 CSV (Excel Compatible)</span>
                            </label>
                            <label class="export-option">
                                <input type="radio" name="exportFormat" value="json">
                                <span>🔧 JSON (Developer Format)</span>
                            </label>
                        </div>
                        
                        <h4>Include Additional Data:</h4>
                        <div class="export-checkboxes">
                            <label class="export-checkbox">
                                <input type="checkbox" id="includeSubjects" checked>
                                <span>📚 Subject Details</span>
                            </label>
                            <label class="export-checkbox">
                                <input type="checkbox" id="includeStats" checked>
                                <span>📊 Statistics Summary</span>
                            </label>
                            <label class="export-checkbox">
                                <input type="checkbox" id="includeTimestamp" checked>
                                <span>🕒 Export Timestamp</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="export-actions">
                        <button class="export-btn-cancel" onclick="this.closest('.export-modal-overlay').remove()">
                            Cancel
                        </button>
                        <button class="export-btn-confirm" onclick="facultyEnrolledStudents.executeExport()">
                            📊 Export Data
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove any existing export modal
    const existingModal = document.querySelector('.export-modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// ADD this new method to execute the actual export
executeExport() {
    try {
        const modal = document.querySelector('.export-modal-overlay');
        if (!modal) return;
        
        // Get export options
        const format = modal.querySelector('input[name="exportFormat"]:checked').value;
        const includeSubjects = modal.querySelector('#includeSubjects').checked;
        const includeStats = modal.querySelector('#includeStats').checked;
        const includeTimestamp = modal.querySelector('#includeTimestamp').checked;
        
        console.log('📊 Export options:', { format, includeSubjects, includeStats, includeTimestamp });
        
        // Update export button
        const exportBtn = modal.querySelector('.export-btn-confirm');
        exportBtn.disabled = true;
        exportBtn.innerHTML = '⏳ Exporting...';
        
        // Execute export based on format
        if (format === 'csv') {
            this.exportAsCSV(includeSubjects, includeStats, includeTimestamp);
        } else if (format === 'json') {
            this.exportAsJSON(includeSubjects, includeStats, includeTimestamp);
        }
        
        // Close modal after short delay
        setTimeout(() => {
            modal.remove();
        }, 1000);
        
    } catch (error) {
        console.error('❌ Export execution error:', error);
        alert('Export failed: ' + error.message);
    }
}

// ADD this enhanced CSV export method
exportAsCSV(includeSubjects, includeStats, includeTimestamp) {
    try {
        console.log('📄 Exporting as CSV...');
        
        // Prepare enhanced export data
        const exportData = this.filteredStudents.map((student, index) => {
            const baseData = {
                '#': index + 1,
                'Student ID': student.student_id || '',
                'Full Name': student.student_name || '',
                'Email Address': student.student_email || '',
                'Program': student.program || '',
                'Year Level': student.year_level || '',
                'Student Type': (student.student_type || 'regular').toUpperCase(),
                'Enrollment Status': (student.enrollment_status || 'active').toUpperCase(),
                'Contact Number': student.phone && student.phone !== 'N/A' ? student.phone : '',
                'Address': student.address && student.address !== 'N/A' ? student.address : '',
                'Enrollment Date': student.enrollment_date ? new Date(student.enrollment_date).toLocaleDateString('en-US') : '',
                'Total Fees': parseFloat(student.total_fees || 0).toFixed(2),
                'Academic Year': student.academic_year || '2025-2026',
                'Semester': student.semester || 'First Semester'
            };
            
            // Add subjects data if requested
            if (includeSubjects) {
                try {
                    const subjects = student.subjects_parsed || [];
                    const subjectsCount = Array.isArray(subjects) ? subjects.length : 0;
                    const totalUnits = Array.isArray(subjects) ? 
                        subjects.reduce((sum, sub) => sum + (parseInt(sub.units || sub.credit_units || 3)), 0) : 0;
                    
                    baseData['Subjects Count'] = subjectsCount;
                    baseData['Total Units'] = totalUnits;
                    
                    // Add subject codes as comma-separated list
                    if (Array.isArray(subjects) && subjects.length > 0) {
                        const subjectCodes = subjects.map(sub => 
                            sub.subject_code || sub.code || 'N/A'
                        ).join(', ');
                        baseData['Subject Codes'] = subjectCodes;
                    }
                } catch (e) {
                    console.warn('Warning: Could not parse subjects for student:', student.student_name);
                    baseData['Subjects Count'] = 0;
                    baseData['Total Units'] = 0;
                }
            }
            
            return baseData;
        });
        
        let csvContent = '';
        
        // Add timestamp header if requested
        if (includeTimestamp) {
            const exportTime = new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
                dateStyle: 'full',
                timeStyle: 'medium'
            });
            csvContent += `"Export Generated: ${exportTime}"\n`;
            csvContent += `"Total Students Exported: ${exportData.length}"\n`;
            csvContent += `"Filters Applied: ${this.getActiveFiltersDescription()}"\n\n`;
        }
        
        // Add statistics summary if requested
        if (includeStats) {
            const stats = this.calculateExportStats();
            csvContent += '"=== SUMMARY STATISTICS ==="\n';
            csvContent += `"Total Students: ${stats.total}"\n`;
            csvContent += `"Active Students: ${stats.active}"\n`;
            csvContent += `"Programs: ${stats.programs.join(', ')}"\n`;
            csvContent += `"Year Levels: ${stats.yearLevels.join(', ')}"\n\n`;
        }
        
        // Add main data
        csvContent += '"=== STUDENT DATA ==="\n';
        const headers = Object.keys(exportData[0]);
        csvContent += headers.map(h => `"${h}"`).join(',') + '\n';
        csvContent += exportData.map(row => 
            headers.map(header => `"${String(row[header] || '').replace(/"/g, '""')}"`).join(',')
        ).join('\n');
        
        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `faculty_students_export_${timestamp}.csv`;
        
        this.downloadFile(blob, filename);
        
        console.log('✅ CSV export completed:', filename);
        alert(`Successfully exported ${exportData.length} students to ${filename}`);
        
    } catch (error) {
        console.error('❌ CSV export error:', error);
        alert('CSV export failed: ' + error.message);
    }
}

// ADD this JSON export method
exportAsJSON(includeSubjects, includeStats, includeTimestamp) {
    try {
        console.log('🔧 Exporting as JSON...');
        
        const exportData = {
            metadata: {
                exportedAt: new Date().toISOString(),
                exportedBy: 'Faculty',
                totalRecords: this.filteredStudents.length,
                filtersApplied: this.currentFilters
            },
            students: this.filteredStudents.map((student, index) => {
                const studentData = {
                    index: index + 1,
                    studentId: student.student_id,
                    name: student.student_name,
                    email: student.student_email,
                    program: student.program,
                    yearLevel: student.year_level,
                    studentType: student.student_type,
                    enrollmentStatus: student.enrollment_status,
                    contact: student.phone,
                    address: student.address,
                    enrollmentDate: student.enrollment_date,
                    totalFees: parseFloat(student.total_fees || 0),
                    academicYear: student.academic_year,
                    semester: student.semester
                };
                
                // Add subjects if requested
                if (includeSubjects) {
                    try {
                        studentData.subjects = student.subjects_parsed || [];
                    } catch (e) {
                        studentData.subjects = [];
                    }
                }
                
                return studentData;
            })
        };
        
        // Add statistics if requested
        if (includeStats) {
            exportData.statistics = this.calculateExportStats();
        }
        
        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `faculty_students_export_${timestamp}.json`;
        
        this.downloadFile(blob, filename);
        
        console.log('✅ JSON export completed:', filename);
        alert(`Successfully exported ${exportData.students.length} students to ${filename}`);
        
    } catch (error) {
        console.error('❌ JSON export error:', error);
        alert('JSON export failed: ' + error.message);
    }
}

// ADD this helper method for download
downloadFile(blob, filename) {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ADD this helper method for statistics
calculateExportStats() {
    const stats = {
        total: this.filteredStudents.length,
        active: this.filteredStudents.filter(s => s.enrollment_status === 'active').length,
        programs: [...new Set(this.filteredStudents.map(s => s.program))],
        yearLevels: [...new Set(this.filteredStudents.map(s => s.year_level))],
        studentTypes: [...new Set(this.filteredStudents.map(s => s.student_type))],
        totalFees: this.filteredStudents.reduce((sum, s) => sum + parseFloat(s.total_fees || 0), 0)
    };
    
    return stats;
}

// ADD this helper method for filter description
getActiveFiltersDescription() {
    const filters = [];
    if (this.currentFilters.search) filters.push(`Search: "${this.currentFilters.search}"`);
    if (this.currentFilters.program) filters.push(`Program: ${this.currentFilters.program}`);
    if (this.currentFilters.yearLevel) filters.push(`Year: ${this.currentFilters.yearLevel}`);
    return filters.length > 0 ? filters.join(', ') : 'No filters applied';
}
    
    convertToCSV(data) {
        if (data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
        ].join('\n');
        
        return csvContent;
    }
    
    showLoading(show) {
        const loadingEl = document.getElementById('loadingState');
        if (loadingEl) {
            loadingEl.style.display = show ? 'block' : 'none';
        }
    }
    
    showError(message) {
        console.error('❌ Error:', message);
        // You can implement a toast notification here
        alert(`Error: ${message}`);
    }
    
    // Method to refresh data
    async refresh() {
        console.log('🔄 Refreshing enrolled students data...');
        await this.loadEnrolledStudents();
        await this.loadStatistics();
    }
}



// REPLACE the existing initialization code with this enhanced version
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM Content Loaded - Faculty Enrolled Students');
    
    // Clear any existing instance
    if (window.facultyEnrolledStudents) {
        if (window.facultyEnrolledStudents.destroy) {
            window.facultyEnrolledStudents.destroy();
        }
        window.facultyEnrolledStudents = null;
    }
    
    // Initialize with delay to ensure DOM is fully ready
    setTimeout(() => {
        console.log('🚀 Creating new FacultyEnrolledStudents instance...');
        window.facultyEnrolledStudents = new FacultyEnrolledStudents();
    }, 1000);
});

// Additional failsafe for already loaded pages
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('🚀 DOM already ready, initializing...');
    setTimeout(() => {
        if (!window.facultyEnrolledStudents) {
            window.facultyEnrolledStudents = new FacultyEnrolledStudents();
        }
    }, 500);
}
// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FacultyEnrolledStudents;
}