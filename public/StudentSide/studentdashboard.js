function toggleDarkMode() {
            const body = document.body;
            const modeIcon = document.getElementById('mode-icon');
            
            body.classList.toggle('dark-mode');
            
            if (body.classList.contains('dark-mode')) {
                modeIcon.className = 'fas fa-sun';
            } else {
                modeIcon.className = 'fas fa-moon';
            }
        }

        // Add interactive features
        document.addEventListener('DOMContentLoaded', function() {
            // Add click handlers for grade cells to show more details
            const gradeCells = document.querySelectorAll('.grade');
            gradeCells.forEach(cell => {
                cell.addEventListener('click', function() {
                    const grade = this.textContent;
                    const row = this.closest('tr');
                    const subject = row.querySelector('.subject-title').textContent;
                    
                    alert(`${subject}\nGrade: ${grade}\nClick the GPA cards for detailed analytics.`);
                });
            });

            // Add animation to GPA cards
            const gpaCards = document.querySelectorAll('.gpa-card');
            gpaCards.forEach((card, index) => {
                card.style.animationDelay = `${index * 0.1}s`;
                card.style.animation = 'fadeInUp 0.6s ease forwards';
            });
        });

        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(style);


    function showSection(sectionId) {
    console.log(`🔄 Switching to section: ${sectionId}`);
    
    // Hide all content sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Show the selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Special handling for schedule section
        if (sectionId === 'schedule' && window.scheduleManager) {
            setTimeout(() => {
                window.scheduleManager.loadSchedule();
            }, 100);
        }
        
        // Special handling for grades section
        if (sectionId === 'grades' && window.gradesManager) {
            setTimeout(() => {
                window.gradesManager.loadGrades();
            }, 100);
        }
        
        console.log(`✅ Successfully switched to ${sectionId} section`);
    } else {
        console.error(`❌ Section ${sectionId} not found`);
    }
}


        

        

        // Dark mode toggle
        function toggleDarkMode() {
            document.body.classList.toggle('dark-mode');
            const icon = document.querySelector('.dark-mode-toggle i');
            
            if (document.body.classList.contains('dark-mode')) {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            } else {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            }
        }

        // Initialize form
        document.addEventListener('DOMContentLoaded', function() {
            resetForm();
        });


        

function checkAuthentication() {
        const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
        const hasToken = sessionStorage.getItem('authToken') !== null;
        const hasUser = sessionStorage.getItem('userData') !== null;
        
        // Fallback to old authentication method for backward compatibility
        const oldAuth = sessionStorage.getItem('loggedIn') === 'true';
        const hasUserName = sessionStorage.getItem('userName') !== null;
        
        console.log("🔍 Auth status:", { isAuthenticated, hasToken, hasUser, oldAuth, hasUserName });
        
        if ((!isAuthenticated || !hasToken || !hasUser) && (!oldAuth || !hasUserName)) {
            console.log("❌ Not authenticated, redirecting to login...");
            window.location.href = '../login.html';
            return false;
        }
        
        return true;
    }
    
    // Get current user data
    function getCurrentUser() {
        try {
            const userData = sessionStorage.getItem('userData');
            if (userData) {
                return JSON.parse(userData);
            }
            
            // Fallback to old user data format
            const userName = sessionStorage.getItem('userName');
            const userEmail = sessionStorage.getItem('userEmail');
            const userRole = sessionStorage.getItem('userRole');
            
            if (userName) {
                return {
                    username: userName,
                    name: userName,
                    email: userEmail,
                    role: userRole || 'Student'
                };
            }
            
            return null;
        } catch (error) {
            console.error("Error parsing user data:", error);
            return null;
        }
    }
    
    // Enhanced server request with error handling
    async function makeServerRequest(url, options = {}) {
        const token = sessionStorage.getItem('authToken');
        
        // Add auth header if token exists
        const defaultHeaders = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
        
        const requestOptions = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            }
        };
        
        try {
            const response = await fetch(url, requestOptions);
            
            // Handle authentication errors
            if (response.status === 401) {
                console.log("🔒 Authentication expired, redirecting to login...");
                sessionStorage.clear();
                window.location.href = '../login.html';
                return null;
            }
            
            return response;
        } catch (error) {
            console.error("🚨 Server request failed:", error);
            
            // Check if we just logged in - if so, don't show error
            const justLoggedIn = sessionStorage.getItem('justLoggedIn') === 'true';
            const skipServerCheck = sessionStorage.getItem('skipInitialServerCheck') === 'true';
            
            if (justLoggedIn || skipServerCheck) {
                console.log("⏭️ Skipping server error - just logged in");
                // Clear the flags after first use
                sessionStorage.removeItem('justLoggedIn');
                sessionStorage.removeItem('skipInitialServerCheck');
                return null;
            }
            
            // Show error for genuine server issues
            showServerError();
            return null;
        }
    }
    
    // Show server error modal/message
    function showServerError() {
        // Check if error modal already exists
        if (document.getElementById('serverErrorModal')) {
            return;
        }
        
        const errorModal = document.createElement('div');
        errorModal.id = 'serverErrorModal';
        errorModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        errorModal.innerHTML = `
            <div style="
                background: white;
                padding: 30px;
                border-radius: 10px;
                text-align: center;
                max-width: 400px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            ">
                <h3 style="color: #ef4444; margin-bottom: 15px;">Server Connection Error</h3>
                <p style="margin-bottom: 20px; color: #666;">
                    Cannot connect to server. Please check if the server is running on port 3006.
                </p>
                <button id="dismissError" style="
                    background: #3b82f6;
                    color: white;
                    padding: 10px 20px;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    margin-right: 10px;
                ">OK</button>
                <button id="retryConnection" style="
                    background: #10b981;
                    color: white;
                    padding: 10px 20px;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                ">Retry</button>
            </div>
        `;
        
        document.body.appendChild(errorModal);
        
        // Add event listeners
        document.getElementById('dismissError').addEventListener('click', () => {
            errorModal.remove();
        });
        
        document.getElementById('retryConnection').addEventListener('click', () => {
            errorModal.remove();
            // Retry loading dashboard data
            setTimeout(() => {
                window.location.reload();
            }, 500);
        });
    }
    
    // Load dashboard data with fallback
    async function loadDashboardData() {
        console.log("📊 Loading dashboard data...");
        
        // Try to load announcements
        try {
            const response = await makeServerRequest('http://localhost:3006/api/announcements');
            if (response && response.ok) {
                const data = await response.json();
                console.log("📢 Announcements loaded:", data);
                // Update announcements UI here
            }
        } catch (error) {
            console.log("⚠️ Failed to load announcements, using offline mode");
            // Show offline message or cached data
        }
        
        // Try to load other data...
        // Add similar blocks for grades, schedules, etc.
        
        console.log("📊 Dashboard data loading complete");
    }

// REPLACE THE ENTIRE DashboardScheduleCalendar class in studentdashboard.js
// This goes from line ~400 to ~650 in your studentdashboard.js file

class DashboardScheduleCalendar {
    constructor() {
        this.currentDate = new Date();
        this.todaySchedule = [];
        this.classSchedule = {};
        this.enrolledData = null;
        this.init();
    }

    init() {
        console.log('🗓️ Initializing Enhanced Dashboard Schedule & Calendar...');
        this.generateCalendar();
        this.loadTodaySchedule();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const prevBtn = document.getElementById('prevMonth');
        const nextBtn = document.getElementById('nextMonth');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousMonth());
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextMonth());
        }
    }

    // ENHANCED METHOD - Uses same logic as schedule.js
    async getCorrectStudentId() {
        const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');
        console.log('🔍 Dashboard: Getting correct student ID for user:', userId);
        
        if (!userId) {
            throw new Error('User ID not found. Please log in again.');
        }
        
        try {
            const response = await fetch(`/api/enrollment/student-info/${userId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const data = await response.json();
            
            if (data.success && data.student?.studentId) {
                const correctStudentId = data.student.studentId;
                console.log('✅ Dashboard: Retrieved correct student_id:', correctStudentId);
                
                sessionStorage.setItem('actualStudentId', correctStudentId);
                localStorage.setItem('actualStudentId', correctStudentId);
                
                return correctStudentId;
            } else {
                throw new Error('Could not retrieve student ID from profile');
            }
        } catch (error) {
            console.error('❌ Dashboard: Error fetching student info:', error);
            throw error;
        }
    }

    // ENHANCED METHOD - Same data fetching as schedule.js
    async loadTodaySchedule() {
        console.log('📅 Loading today\'s schedule...');
        const contentEl = document.getElementById('dashboardScheduleContent');
        
        try {
            this.showScheduleLoading(true);
            
            // Get correct student ID first
            const correctStudentId = await this.getCorrectStudentId();
            console.log('📚 Dashboard: Loading schedule for verified student_id:', correctStudentId);

            // Query enrolled_students with the verified student_id
            const response = await fetch(`/api/enrollment/enrolled-students/student/${correctStudentId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();
            console.log('📊 Dashboard: Enrollment response:', {
                success: data.success,
                hasData: data.data && data.data.length > 0,
                studentIdUsed: correctStudentId
            });

            if (!data.success || !data.data || data.data.length === 0) {
                console.warn('⚠️ Dashboard: No enrollment data found');
                this.showNoSchedule();
                return;
            }

            const enrolledStudent = data.data[0];
            
            // Verify correct student data
            if (enrolledStudent.student_id !== correctStudentId) {
                console.error('❌ Dashboard: Data mismatch detected!');
                throw new Error(`Data mismatch: Expected ${correctStudentId}, got ${enrolledStudent.student_id}`);
            }
            
            console.log('✅ Dashboard: Verified correct student data received');
            this.enrolledData = enrolledStudent;
            this.processScheduleData(enrolledStudent);
            
        } catch (error) {
            console.error('❌ Dashboard: Error loading schedule:', error);
            this.showScheduleError(error.message);
        } finally {
            this.showScheduleLoading(false);
        }
    }

    // ENHANCED METHOD - Uses subjects_parsed like schedule.js
    processScheduleData(enrollment) {
        console.log('🔄 Dashboard: Processing schedule data...');
        
        // Use enriched subjects_parsed from backend (same as schedule.js)
        let subjects = [];
        try {
            if (enrollment.subjects_parsed && Array.isArray(enrollment.subjects_parsed)) {
                subjects = enrollment.subjects_parsed;
                console.log('✅ Dashboard: Using PRE-ENRICHED subjects_parsed:', subjects.length, 'items');
            } else if (enrollment.subjects) {
                console.warn('⚠️ Dashboard: FALLBACK to raw subjects JSON');
                subjects = JSON.parse(enrollment.subjects);
            } else {
                console.warn('⚠️ Dashboard: No subjects data found');
            }
        } catch (error) {
            console.error('❌ Dashboard: Error processing subjects:', error);
        }

        if (subjects.length === 0) {
            this.showNoSchedule();
            return;
        }

        const today = new Date();
        const todayName = today.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
        
        // Filter subjects for today using 3-letter day codes to avoid conflicts
const todayClasses = subjects.filter(subject => {
    if (!subject.schedule) return false;
    
    const scheduleStr = subject.schedule.toString().toUpperCase();
    console.log('🔍 Dashboard: Checking if subject', subject.code || subject.subject_code, 'matches', todayName);
    console.log('   Schedule string:', scheduleStr);
    
    // Convert today's name to 3-letter code
    const today3Letter = todayName.substring(0, 3); // MON, TUE, WED, THU, FRI, SAT, SUN
    
    // Check for exact full day name OR 3-letter abbreviation
    const matches = scheduleStr.includes(todayName) || scheduleStr.includes(today3Letter);
    
    console.log('   Today 3-letter code:', today3Letter);
    console.log('   Matches today?', matches);
    
    return matches;
});

        console.log(`📚 Dashboard: Found ${todayClasses.length} classes for ${todayName}`);
        this.displayTodaySchedule(todayClasses);
        this.updateCalendarWithSchedule(subjects);
    }

    // ADD this enhanced displayTodaySchedule method to replace the existing one
// REPLACE the displayTodaySchedule method in the DashboardScheduleCalendar class (around line 150 in studentdashboard.js)

displayTodaySchedule(classes) {
    const contentEl = document.getElementById('dashboardScheduleContent');
    
    if (classes.length === 0) {
        contentEl.innerHTML = `
            <div class="no-classes enhanced-empty-state">
                <div class="empty-animation">
                    <i class="fas fa-calendar-check"></i>
                    <div class="floating-elements">
                        <span class="float-1">📚</span>
                        <span class="float-2">☕</span>
                        <span class="float-3">🎉</span>
                    </div>
                </div>
                <h4>No Classes Today</h4>
                <p>Perfect time to relax, study, or catch up on assignments!</p>
                <div class="quick-actions">
                    <button class="action-btn" type="button" onclick="viewFullScheduleFromModal()">
                        <i class="fas fa-calendar-alt"></i>
                        <span>Full Schedule</span>
                    </button>
                    <button class="quick-action-btn" onclick="showMyGrades()" title="Check Grades">
                        <i class="fas fa-graduation-cap"></i>
                        <span>My Grades</span>
                    </button>
                </div>
            </div>
        `;
        return;
    }

    // Sort classes by time using enhanced sorting
    const sortedClasses = classes.sort((a, b) => {
        const timeA = this.extractTime(a.schedule);
        const timeB = this.extractTime(b.schedule);
        return timeA.localeCompare(timeB);
    });

    // Add entrance animation delay counter
    let animationDelay = 0;

    const scheduleHTML = sortedClasses.map((subject, index) => {
        const time = this.formatScheduleTime(subject.schedule);
        const isCurrentClass = this.isCurrentClass(subject.schedule);
        const isNextClass = this.isNextClass(subject.schedule, index, sortedClasses);
        
        // Enhanced status indicators
        let statusIndicators = '';
        let cardClass = 'schedule-item';
        let timeColorClass = 'schedule-time';
        
        if (isCurrentClass) {
            cardClass += ' current-class-item';
            timeColorClass += ' current-class';
            statusIndicators = '<span class="live-indicator">● LIVE NOW</span>';
        } else if (isNextClass) {
            timeColorClass += ' next-class';
            statusIndicators = '<span class="next-indicator">⏰ UP NEXT</span>';
        }

        // Calculate time until class starts/ends
        const timeInfo = this.getClassTimeInfo(subject.schedule);
        
        // Enhanced card with more information
        animationDelay += 0.1;
        
        return `
            <div class="${cardClass}" 
                 onclick="showSubjectDetails('${subject.code || subject.subject_code}')" 
                 style="animation-delay: ${animationDelay}s"
                 data-subject-code="${subject.code || subject.subject_code}">
                <div class="${timeColorClass}">
                    <div class="time-main">${time}</div>
                    ${timeInfo ? `<div class="time-info">${timeInfo}</div>` : ''}
                </div>
                <div class="schedule-details">
                    <div class="schedule-subject">
                        <div class="subject-header">
                            <strong>${subject.code || subject.subject_code}</strong>
                            ${statusIndicators}
                        </div>
                        <div class="subject-units">${subject.units || 3} units</div>
                    </div>
                    <div class="schedule-info">
                        ${subject.description || subject.subject_name || 'Unknown Subject'}
                    </div>
                    <div class="schedule-meta">
                        <span class="instructor-info" title="Instructor">
                            <i class="fas fa-user-tie"></i> 
                            ${subject.instructor && subject.instructor !== 'TBA' ? subject.instructor : 'TBA'}
                        </span>
                        <span class="room-info" title="Room/Venue">
                            <i class="fas fa-door-open"></i> 
                            ${subject.room && subject.room !== 'TBA' ? subject.room : 'TBA'}
                        </span>
                    </div>
                    <div class="progress-indicator">
                        <div class="progress-bar ${isCurrentClass ? 'active' : ''} ${isNextClass ? 'upcoming' : ''}"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Add the HTML with stagger animation
    contentEl.innerHTML = `
        <div class="schedule-container enhanced-schedule">
            ${scheduleHTML}
        </div>
        <div class="schedule-footer">
            <div class="schedule-stats">
                <span class="stat-item">
                    <i class="fas fa-clock"></i>
                    <strong>${classes.length}</strong> classes today
                </span>
                <span class="stat-item">
                    <i class="fas fa-graduation-cap"></i>
                    <strong>${classes.reduce((sum, c) => sum + (parseInt(c.units) || 3), 0)}</strong> total units
                </span>
            </div>
            <button class="view-full-btn" onclick="showFullSchedule()" title="View complete schedule">
                <i class="fas fa-expand-arrows-alt"></i>
                <span>View Full Schedule</span>
            </button>
        </div>
    `;

    // Add entrance animations
    const scheduleItems = contentEl.querySelectorAll('.schedule-item');
    scheduleItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            item.style.transition = 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            item.style.opacity = '1';
            item.style.transform = 'translateY(0)';
        }, index * 100);
    });

    // Initialize progress bars for current classes
    this.initializeProgressBars();
}

// ADD this new method to calculate time information
getClassTimeInfo(scheduleStr) {
    const now = new Date();
    const timeRange = this.extractTimeRange(scheduleStr);
    if (!timeRange) return null;

    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    if (currentTime >= timeRange.start && currentTime <= timeRange.end) {
        // Class is ongoing - show time remaining
        const endHour = Math.floor(timeRange.end / 100);
        const endMin = timeRange.end % 100;
        const endTime = new Date();
        endTime.setHours(endHour, endMin, 0, 0);
        
        const remaining = Math.round((endTime - now) / (1000 * 60));
        if (remaining > 0) {
            return `${remaining} min left`;
        }
        return 'Ending soon';
    } else if (timeRange.start > currentTime) {
        // Class is upcoming - show time until start
        const startHour = Math.floor(timeRange.start / 100);
        const startMin = timeRange.start % 100;
        const startTime = new Date();
        startTime.setHours(startHour, startMin, 0, 0);
        
        const until = Math.round((startTime - now) / (1000 * 60));
        if (until > 0 && until <= 120) { // Show only if within 2 hours
            const hours = Math.floor(until / 60);
            const minutes = until % 60;
            if (hours > 0) {
                return `in ${hours}h ${minutes}m`;
            }
            return `in ${minutes} min`;
        }
    }
    
    return null;
}

// Method to initialize progress bars
initializeProgressBars() {
    const currentClasses = document.querySelectorAll('.schedule-item.current-class-item');
    
    currentClasses.forEach(item => {
        const subjectCode = item.dataset.subjectCode;
        const subject = this.scheduleData?.find(s => s.subject_code === subjectCode);
        
        if (subject) {
            const progressBar = item.querySelector('.progress-bar.active');
            if (progressBar) {
                const progress = this.calculateClassProgress(subject.schedule);
                progressBar.style.width = `${progress}%`;
                
                // Animate progress bar
                setTimeout(() => {
                    progressBar.style.transition = 'width 1s ease-out';
                }, 500);
            }
        }
    });
}

// Method to calculate class progress
calculateClassProgress(scheduleStr) {
    const now = new Date();
    const timeRange = this.extractTimeRange(scheduleStr);
    if (!timeRange) return 0;

    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    if (currentTime < timeRange.start) return 0;
    if (currentTime > timeRange.end) return 100;
    
    const totalDuration = timeRange.end - timeRange.start;
    const elapsed = currentTime - timeRange.start;
    
    return Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
}


// ADD this enhanced refresh method with loading animation
refresh() {
    console.log('🔄 Refreshing dashboard schedule with enhanced animations...');
    
    const contentEl = document.getElementById('dashboardScheduleContent');
    if (contentEl) {
        // Add loading animation
        contentEl.innerHTML = `
            <div class="loading-schedule enhanced-loading">
                <div class="loading-animation">
                    <div class="loading-spinner-modern"></div>
                    <div class="loading-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
                <h4>Refreshing Schedule...</h4>
                <p>Getting your latest class information</p>
            </div>
        `;
    }
    
    // Refresh data
    setTimeout(() => {
        this.loadTodaySchedule();
    }, 800);
}

    // NEW METHOD - Check if class is currently ongoing
    isCurrentClass(scheduleStr) {
        const now = new Date();
        const currentTime = now.getHours() * 100 + now.getMinutes();
        
        const timeRange = this.extractTimeRange(scheduleStr);
        if (!timeRange) return false;
        
        return currentTime >= timeRange.start && currentTime <= timeRange.end;
    }

    // NEW METHOD - Check if this is the next class
    isNextClass(scheduleStr, currentIndex, allClasses) {
        const now = new Date();
        const currentTime = now.getHours() * 100 + now.getMinutes();
        
        const timeRange = this.extractTimeRange(scheduleStr);
        if (!timeRange) return false;
        
        // Check if this class is after current time
        if (timeRange.start <= currentTime) return false;
        
        // Check if this is the earliest class after current time
        for (let i = 0; i < currentIndex; i++) {
            const earlierTimeRange = this.extractTimeRange(allClasses[i].schedule);
            if (earlierTimeRange && earlierTimeRange.start > currentTime) {
                return false;
            }
        }
        
        return true;
    }

    // NEW METHOD - Extract time range for comparison
    extractTimeRange(scheduleStr) {
        if (!scheduleStr) return null;
        
        const timeMatch = scheduleStr.match(/(\d{1,2}):(\d{2})([ap]m)-(\d{1,2}):(\d{2})([ap]m)/i);
        if (!timeMatch) return null;
        
        const [, startHour, startMin, startPeriod, endHour, endMin, endPeriod] = timeMatch;
        
        const convertToMinutes = (hour, min, period) => {
            let h = parseInt(hour);
            if (period.toLowerCase() === 'pm' && h !== 12) h += 12;
            if (period.toLowerCase() === 'am' && h === 12) h = 0;
            return h * 100 + parseInt(min);
        };
        
        return {
            start: convertToMinutes(startHour, startMin, startPeriod),
            end: convertToMinutes(endHour, endMin, endPeriod)
        };
    }

    showScheduleLoading(show) {
        const contentEl = document.getElementById('dashboardScheduleContent');
        if (show) {
            contentEl.innerHTML = `
                <div class="loading-schedule">
                    <div class="loading-spinner"></div>
                    <h4>Loading Today's Schedule...</h4>
                    <p>Fetching your classes for today</p>
                </div>
            `;
        }
    }

    showScheduleError(message) {
        const contentEl = document.getElementById('dashboardScheduleContent');
        contentEl.innerHTML = `
            <div class="no-classes error">
                <i class="fas fa-exclamation-triangle" style="color: #ff6b6b;"></i>
                <h4>Error Loading Schedule</h4>
                <p>${message}</p>
                <button class="view-all-btn" onclick="dashboardScheduleCalendar.loadTodaySchedule()" style="background: #3498db; border: none; padding: 8px 16px; border-radius: 20px; color: white; cursor: pointer; margin-top: 10px;">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        `;
    }

    showNoSchedule() {
        const contentEl = document.getElementById('dashboardScheduleContent');
        contentEl.innerHTML = `
            <div class="no-classes">
                <i class="fas fa-calendar-plus"></i>
                <h4>No Schedule Available</h4>
                <p>Enroll in courses to see your schedule</p>
                <button class="view-all-btn" onclick="showSection('enroll')" style="margin-top: 15px; background: #3498db; border: none; padding: 8px 16px; border-radius: 20px; color: white; cursor: pointer;">
                    <i class="fas fa-plus"></i> Enroll Now
                </button>
            </div>
        `;
    }

    extractTime(scheduleStr) {
        if (!scheduleStr) return '00:00';
        
        // Handle "DAY TIME" format from database
        const dayTimeMatch = scheduleStr.match(/[A-Z]+\s+(\d{1,2}:\d{2}[ap]m)/i);
        if (dayTimeMatch) {
            return this.convertTo24Hour(dayTimeMatch[1]);
        }
        
        const timeMatch = scheduleStr.match(/(\d{1,2}):(\d{2})[ap]m/i);
        if (timeMatch) {
            return this.convertTo24Hour(timeMatch[0]);
        }
        return '00:00';
    }

    convertTo24Hour(timeStr) {
        const match = timeStr.match(/(\d{1,2}):(\d{2})([ap]m)/i);
        if (!match) return timeStr;
        
        let [, hours, minutes, period] = match;
        hours = parseInt(hours);
        
        if (period.toLowerCase() === 'pm' && hours !== 12) {
            hours += 12;
        } else if (period.toLowerCase() === 'am' && hours === 12) {
            hours = 0;
        }
        
        return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }

    formatScheduleTime(scheduleStr) {
        if (!scheduleStr) return 'TBA';
        
        // Handle "DAY TIME-TIME" format
        const dayTimeMatch = scheduleStr.match(/[A-Z]+\s+(\d{1,2}:\d{2}[ap]m)-(\d{1,2}:\d{2}[ap]m)/i);
        if (dayTimeMatch) {
            return `${dayTimeMatch[1]} - ${dayTimeMatch[2]}`;
        }
        
        // Handle direct time range
        const timeRange = scheduleStr.match(/(\d{1,2}:\d{2}[ap]m)-(\d{1,2}:\d{2}[ap]m)/i);
        if (timeRange) {
            return `${timeRange[1]} - ${timeRange[2]}`;
        }
        
        const singleTime = scheduleStr.match(/(\d{1,2}:\d{2}[ap]m)/i);
        if (singleTime) {
            return singleTime[1];
        }
        
        return 'TBA';
    }

    // ADD this enhanced calendar rendering method to the DashboardScheduleCalendar class
// REPLACE the existing generateCalendar method (around line 300 in studentdashboard.js)

generateCalendar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    // Update header with enhanced animation
    const monthYearEl = document.getElementById('currentMonthYear');
    if (monthYearEl) {
        const monthName = new Date(year, month).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
        });
        
        // Add fade effect when changing months
        monthYearEl.style.opacity = '0';
        setTimeout(() => {
            monthYearEl.textContent = monthName;
            monthYearEl.style.opacity = '1';
        }, 150);
    }

    const gridEl = document.getElementById('calendarGrid');
    if (!gridEl) return;

    // Clear with fade effect
    gridEl.style.opacity = '0.5';
    setTimeout(() => {
        gridEl.innerHTML = '';

        // Add enhanced day headers
        const dayHeaders = [
            { short: 'Sun', full: 'Sunday' },
            { short: 'Mon', full: 'Monday' },
            { short: 'Tue', full: 'Tuesday' },
            { short: 'Wed', full: 'Wednesday' },
            { short: 'Thu', full: 'Thursday' },
            { short: 'Fri', full: 'Friday' },
            { short: 'Sat', full: 'Saturday' }
        ];

        dayHeaders.forEach((day, index) => {
            const headerCell = document.createElement('div');
            headerCell.className = 'calendar-header-cell';
            headerCell.innerHTML = `<span title="${day.full}">${day.short}</span>`;
            headerCell.style.animationDelay = `${index * 0.1}s`;
            gridEl.appendChild(headerCell);
        });

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();
        const today = new Date();

        // Previous month days with stagger animation
        for (let i = firstDay - 1; i >= 0; i--) {
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day other-month';
            dayEl.innerHTML = `<span>${daysInPrevMonth - i}</span>`;
            dayEl.style.animationDelay = `${(firstDay - 1 - i) * 0.05}s`;
            dayEl.style.animation = 'fadeInScale 0.3s ease forwards';
            gridEl.appendChild(dayEl);
        }

        // Current month days with enhanced features
        for (let day = 1; day <= daysInMonth; day++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            dayEl.innerHTML = `<span>${day}</span>`;

            const dayOfWeek = new Date(year, month, day).getDay();
            const cellDate = new Date(year, month, day);
            
            // Enhanced today marking
            if (year === today.getFullYear() && 
                month === today.getMonth() && 
                day === today.getDate()) {
                dayEl.classList.add('today');
                dayEl.title = 'Today';
            }

            // Enhanced class marking with tooltip
            if (this.hasClassOnDay(dayOfWeek)) {
                dayEl.classList.add('has-class');
                const classCount = this.classSchedule[dayOfWeek]?.length || 0;
                const classNames = this.classSchedule[dayOfWeek]?.map(c => c.code || c.subject_code).join(', ') || '';
                dayEl.title = `${classCount} class${classCount > 1 ? 'es' : ''}: ${classNames}`;
                
                // Add visual indicator for multiple classes
                if (classCount > 1) {
                    dayEl.style.setProperty('--class-count', `"${classCount}"`);
                    dayEl.classList.add('multiple-classes');
                }
            }

            // Enhanced weekend styling
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                dayEl.classList.add('weekend');
            }

            // Add hover effects and click handler
            dayEl.addEventListener('click', () => this.showEnhancedDayDetails(year, month, day));
            dayEl.addEventListener('mouseenter', () => this.previewDayClasses(dayEl, dayOfWeek));
            
            // Stagger animation
            dayEl.style.animationDelay = `${(firstDay + day - 1) * 0.02}s`;
            dayEl.style.animation = 'fadeInScale 0.4s ease forwards';

            gridEl.appendChild(dayEl);
        }

        // Next month days with animation
        const totalCells = gridEl.children.length - 7;
        const remainingCells = 42 - totalCells;
        for (let day = 1; day <= remainingCells; day++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day other-month';
            dayEl.innerHTML = `<span>${day}</span>`;
            dayEl.style.animationDelay = `${(totalCells + day - 1) * 0.02}s`;
            dayEl.style.animation = 'fadeInScale 0.3s ease forwards';
            gridEl.appendChild(dayEl);
        }

        // Restore opacity with smooth transition
        gridEl.style.opacity = '1';
    }, 200);
}

// ADD THIS NEW METHOD FOR ENHANCED DAY PREVIEW
previewDayClasses(dayEl, dayOfWeek) {
    const classes = this.classSchedule[dayOfWeek] || [];
    if (classes.length === 0) return;

    // Create floating preview tooltip
    let preview = document.querySelector('.day-preview-tooltip');
    if (!preview) {
        preview = document.createElement('div');
        preview.className = 'day-preview-tooltip';
        document.body.appendChild(preview);
    }

    const classInfo = classes.map(c => {
        const time = this.formatScheduleTime(c.schedule);
        return `<div class="preview-class">
            <strong>${c.code || c.subject_code}</strong>
            <span>${time}</span>
        </div>`;
    }).join('');

    preview.innerHTML = `
        <div class="preview-content">
            <h4>${classes.length} Class${classes.length > 1 ? 'es' : ''}</h4>
            ${classInfo}
        </div>
    `;

    // Position tooltip
    const rect = dayEl.getBoundingClientRect();
    preview.style.left = `${rect.left + rect.width / 2}px`;
    preview.style.top = `${rect.top - 10}px`;
    preview.style.opacity = '1';
    preview.style.visibility = 'visible';

    // Hide tooltip when mouse leaves
    dayEl.addEventListener('mouseleave', () => {
        preview.style.opacity = '0';
        preview.style.visibility = 'hidden';
    });
}

// REPLACE THE EXISTING showEnhancedDayDetails METHOD
showEnhancedDayDetails(year, month, day) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    const classes = this.classSchedule[dayOfWeek] || [];
    
    // Remove existing modal if present
    const existingModal = document.getElementById('dayDetailsModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create new modal
    const modal = document.createElement('div');
    modal.id = 'dayDetailsModal';
    modal.className = 'enhanced-day-modal';
    
    const dateStr = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    if (classes.length === 0) {
        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-calendar-day"></i> ${dateStr}</h3>
                    <button class="close-btn" type="button">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="no-classes-modal">
                        <i class="fas fa-coffee"></i>
                        <h4>No Classes Scheduled</h4>
                        <p>Perfect day to relax or catch up on studies!</p>
                        <div style="margin-top: 20px;">
                            <button class="action-btn" type="button" onclick="showFullSchedule()">
                                <i class="fas fa-calendar-alt"></i> View Full Schedule
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else {
        const classCards = classes.map((subject, index) => {
            const time = this.formatScheduleTime(subject.schedule);
            const isCurrentClass = this.isCurrentClass(subject.schedule);
            const isNextClass = this.isNextClass(subject.schedule, index, classes);
            
            return `
                <div class="class-card ${isCurrentClass ? 'current' : ''} ${isNextClass ? 'next' : ''}">
                    <div class="class-time">
                        <span>${time}</span>
                        ${isCurrentClass ? '<span class="live-badge" style="background: #27ae60; color: white; padding: 2px 6px; border-radius: 10px; font-size: 9px; margin-left: 8px;">● LIVE</span>' : ''}
                        ${isNextClass ? '<span class="next-badge" style="background: #f39c12; color: white; padding: 2px 6px; border-radius: 10px; font-size: 9px; margin-left: 8px;">⏰ NEXT</span>' : ''}
                    </div>
                    <div class="class-info">
                        <div class="class-title">${subject.code || subject.subject_code}</div>
                        <div class="class-info">${subject.description || subject.subject_name || 'Unknown Subject'}</div>
                        <div class="class-meta">
                            <span><i class="fas fa-user-tie"></i> ${subject.instructor || 'TBA'}</span>
                            <span><i class="fas fa-door-open"></i> ${subject.room || 'TBA'}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-calendar-day"></i> ${dateStr}</h3>
                    <button class="close-btn" type="button">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="classes-summary">
                        <span class="class-count">${classes.length} Class${classes.length > 1 ? 'es' : ''}</span>
                    </div>
                    <div class="classes-list">
                        ${classCards}
                    </div>
                    <div class="modal-actions" style="margin-top: 20px; text-align: center;">
                        <button class="action-btn" type="button" onclick="showFullSchedule()">
                            <i class="fas fa-calendar-alt"></i> View Full Schedule
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Append to body
    document.body.appendChild(modal);
    
    // Setup event handlers
    const closeBtn = modal.querySelector('.close-btn');
    const backdrop = modal.querySelector('.modal-backdrop');
    const actionBtn = modal.querySelector('.action-btn');
    
    const closeModal = () => {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300);
    };
    
    // Event listeners
    closeBtn.addEventListener('click', closeModal);
    backdrop.addEventListener('click', closeModal);
    if (actionBtn) {
        actionBtn.addEventListener('click', closeModal);
    }
    
    // Escape key handler
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Show modal with animation
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// ADD ENHANCED MONTH NAVIGATION WITH ANIMATIONS
previousMonth() {
    const prevBtn = document.getElementById('prevMonth');
    if (prevBtn) {
        prevBtn.style.transform = 'scale(0.9) rotate(-180deg)';
        setTimeout(() => {
            prevBtn.style.transform = 'scale(1) rotate(0deg)';
        }, 150);
    }
    
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.generateCalendar();
}

nextMonth() {
    const nextBtn = document.getElementById('nextMonth');
    if (nextBtn) {
        nextBtn.style.transform = 'scale(0.9) rotate(180deg)';
        setTimeout(() => {
            nextBtn.style.transform = 'scale(1) rotate(0deg)';
        }, 150);
    }
    
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.generateCalendar();
}


    hasClassOnDay(dayOfWeek) {
        if (!this.classSchedule || Object.keys(this.classSchedule).length === 0) {
            return false;
        }
        return this.classSchedule[dayOfWeek] && this.classSchedule[dayOfWeek].length > 0;
    }

    updateCalendarWithSchedule(subjects) {
        this.classSchedule = {};
        
        subjects.forEach(subject => {
            if (subject.schedule) {
                const scheduleStr = subject.schedule.toString().toUpperCase();
                const dayMap = {
                    'SUNDAY': 0, 'MONDAY': 1, 'TUESDAY': 2, 'WEDNESDAY': 3,
                    'THURSDAY': 4, 'FRIDAY': 5, 'SATURDAY': 6
                };
                
                Object.entries(dayMap).forEach(([dayName, dayNum]) => {
    console.log('📅 Calendar: Checking', subject.code || subject.subject_code, 'for', dayName);
    console.log('   Schedule string:', scheduleStr);
    
    // Use 3-letter day codes for consistent matching
    const day3Letter = dayName.substring(0, 3); // MON, TUE, WED, THU, FRI, SAT, SUN
    
    // Check for exact full day name OR 3-letter abbreviation
    const dayMatches = scheduleStr.includes(dayName) || scheduleStr.includes(day3Letter);
    
    console.log('   Day 3-letter code:', day3Letter);
    console.log('   Matches', dayName + '?', dayMatches);
    
    if (dayMatches) {
        if (!this.classSchedule[dayNum]) {
            this.classSchedule[dayNum] = [];
        }
        this.classSchedule[dayNum].push(subject);
        console.log('✅ Added', subject.code || subject.subject_code, 'to', dayName);
    }
});
            }
        });

        console.log('📅 Updated calendar with class schedule:', this.classSchedule);
        this.generateCalendar();
    }

    showDayDetails(year, month, day) {
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay();
        const classes = this.classSchedule[dayOfWeek] || [];
        
        if (classes.length === 0) {
            alert(`No classes scheduled for ${date.toLocaleDateString()}`);
            return;
        }

        const classNames = classes.map(c => `• ${c.code || c.subject_code} - ${c.description || c.subject_name}`).join('\n');
        alert(`Classes on ${date.toLocaleDateString()}:\n\n${classNames}\n\nClick "View Full Schedule" to see detailed times.`);
    }

    previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.generateCalendar();
    }

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.generateCalendar();
    }

    // Public method to refresh dashboard
    refresh() {
        console.log('🔄 Refreshing dashboard schedule...');
        this.loadTodaySchedule();
    }
}

// Function to handle Full Schedule button click
function showFullSchedule() {
    console.log('🗓️ Redirecting to Full Schedule...');
    showSection('schedule');
    
    // Add visual feedback - highlight the schedule nav item
    const scheduleNavItem = document.querySelector('.nav-item[data-content="schedule"]');
    if (scheduleNavItem) {
        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to schedule nav item
        scheduleNavItem.classList.add('active');
        
        // Optional: Add a brief highlight effect
        scheduleNavItem.style.background = '#2980b9';
        setTimeout(() => {
            scheduleNavItem.style.background = '';
        }, 300);
    }
}

// Function to handle My Grades button click
function showMyGrades() {
    console.log('📊 Redirecting to Grades...');
    showSection('grades');
    
    // Add visual feedback - highlight the grades nav item
    const gradesNavItem = document.querySelector('.nav-item[data-content="grades"]');
    if (gradesNavItem) {
        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to grades nav item
        gradesNavItem.classList.add('active');
        
        // Optional: Add a brief highlight effect
        gradesNavItem.style.background = '#27ae60';
        setTimeout(() => {
            gradesNavItem.style.background = '';
        }, 300);
    }
}
// Function to handle View Full Schedule button in modal
function viewFullScheduleFromModal() {
    console.log('🗓️ Redirecting to Full Schedule from modal...');
    
    // Close any open modals first
    const modal = document.getElementById('dayDetailsModal');
    if (modal) {
        modal.remove();
    }
    
    // Then redirect to schedule
    showFullSchedule();
}


// Enhanced global functions
function showFullCalendar() {
    showSection('schedule');
}

function showSubjectDetails(subjectCode) {
    console.log('📖 Show details for:', subjectCode);
    // If schedule manager exists, use its modal
    if (window.scheduleManager && window.scheduleManager.scheduleData) {
        const subject = window.scheduleManager.scheduleData.find(s => s.subject_code === subjectCode);
        if (subject) {
            window.scheduleManager.showSubjectDetails(subject);
            return;
        }
    }
    
    // Fallback alert
    alert(`Subject: ${subjectCode}\nClick "View Full Schedule" to see detailed information.`);
}



// Initialize when DOM is loaded - ENHANCED
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing Enhanced Dashboard Schedule & Calendar...');
    window.dashboardScheduleCalendar = new DashboardScheduleCalendar();
    
    // Auto-refresh every 5 minutes
    setInterval(() => {
        if (window.dashboardScheduleCalendar) {
            console.log('⏰ Auto-refreshing dashboard schedule...');
            window.dashboardScheduleCalendar.refresh();
        }
    }, 5 * 60 * 1000);
    
    // ADD THIS NEW CODE HERE - Make navigation functions globally available
    window.showFullSchedule = showFullSchedule;
    window.showMyGrades = showMyGrades;
    window.viewFullScheduleFromModal = viewFullScheduleFromModal;
    window.showSection = showSection;
    console.log('✅ Dashboard navigation functions initialized');
});

// Initialize if already loaded
if (document.readyState !== 'loading') {
    if (!window.dashboardScheduleCalendar) {
        window.dashboardScheduleCalendar = new DashboardScheduleCalendar();
    }
}