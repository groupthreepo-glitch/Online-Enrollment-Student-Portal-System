// StudentSide/js/schedule.js - Frontend JavaScript for Schedule Management (List View Only)

class ScheduleManager {
    constructor() {
        this.currentStudent = null;
        this.enrolledData = null;
        this.scheduleData = [];
        this.init();
    }

    init() {
        console.log('🗓️ Initializing Schedule Manager...');
        this.loadStudentSchedule();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.querySelector('[onclick="refreshSchedule()"]');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshSchedule());
        }

        // Print button
        const printBtn = document.querySelector('[onclick="printSchedule()"]');
        if (printBtn) {
            printBtn.addEventListener('click', () => this.printSchedule());
        }
    }

    // Add this method to the ScheduleManager class
storeStudentId(actualStudentId) {
    console.log('💾 Storing actual student ID:', actualStudentId);
    sessionStorage.setItem('profileStudentId', actualStudentId);
    localStorage.setItem('profileStudentId', actualStudentId);
}

// Enhanced method to get current student ID with better logging
getCurrentStudentId() {
    // PRIORITY: Use the verified student_id if available
    const actualStudentId = sessionStorage.getItem('actualStudentId') || localStorage.getItem('actualStudentId');
    const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');
    const studentId = sessionStorage.getItem('studentId') || localStorage.getItem('studentId');
    
    console.log('🔍 Available ID sources:', {
        actualStudentId: actualStudentId,
        userId: userId,
        studentId: studentId,
        currentUser: sessionStorage.getItem('currentUser') || 'unknown'
    });
    
    // Return the most reliable ID
    const finalId = actualStudentId || studentId || userId;
    console.log('🎯 Using student ID:', finalId);
    
    return finalId;
}

// CRITICAL: Enhanced method to get the correct student_id
async getCorrectStudentId() {
    const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');
    console.log('🔍 Getting correct student ID for user:', userId);
    
    if (!userId) {
        throw new Error('User ID not found. Please log in again.');
    }
    
    try {
        // Always fetch fresh student info to get the correct student_id
        const response = await fetch(`/api/enrollment/student-info/${userId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (data.success && data.student?.studentId) {
            const correctStudentId = data.student.studentId;
            console.log('✅ Retrieved correct student_id:', correctStudentId, 'for user:', userId);
            
            // Store the correct student_id for future use
            sessionStorage.setItem('actualStudentId', correctStudentId);
            localStorage.setItem('actualStudentId', correctStudentId);
            
            return correctStudentId;
        } else {
            console.error('❌ Failed to get student_id from profile:', data);
            throw new Error('Could not retrieve student ID from profile');
        }
    } catch (error) {
        console.error('❌ Error fetching student info:', error);
        throw error;
    }
}

// Update the loadStudentSchedule method to first get the actual student ID
async loadStudentSchedule() {
    try {
        this.showLoading(true);
        
        // CRITICAL FIX: Always get the correct student_id first
        console.log('🔄 Step 1: Getting correct student ID...');
        const correctStudentId = await this.getCorrectStudentId();
        
        console.log('📚 Step 2: Loading schedule for verified student_id:', correctStudentId);

        // Query enrolled_students with the verified student_id
        const response = await fetch(`/api/enrollment/enrolled-students/student/${correctStudentId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();
        console.log('📊 Enrollment response:', {
            success: data.success,
            hasData: data.data && data.data.length > 0,
            studentIdUsed: correctStudentId
        });

        if (!data.success || !data.data || data.data.length === 0) {
            console.warn('⚠️ No enrollment data found for student_id:', correctStudentId);
            this.showEmptyState();
            return;
        }

        const enrolledStudent = data.data[0];
        
        // CRITICAL VALIDATION: Verify we got the correct student's data
        if (enrolledStudent.student_id !== correctStudentId) {
            console.error('❌ CRITICAL: Data mismatch detected!');
            console.error('Expected student_id:', correctStudentId);
            console.error('Received student_id:', enrolledStudent.student_id);
            console.error('Student name in response:', enrolledStudent.student_name);
            
            throw new Error(`Data mismatch: Expected ${correctStudentId}, got ${enrolledStudent.student_id}`);
        }
        
        console.log('✅ VERIFIED: Correct student data received:', {
            studentId: enrolledStudent.student_id,
            studentName: enrolledStudent.student_name,
            program: enrolledStudent.program
        });
        
        this.enrolledData = enrolledStudent;
        this.processEnrollmentData(enrolledStudent);
        
    } catch (error) {
        console.error('❌ Error loading student schedule:', error);
        this.showError(error.message);
    } finally {
        this.showLoading(false);
    }
}

// ENHANCED DEBUG - Replace the existing debugReceivedData method
debugReceivedData(enrollment) {
    console.log('🐛 FRONTEND: ENHANCED DEBUGGING received enrollment data:');
    console.log('📋 Student ID:', enrollment.student_id);
    console.log('📋 Student Name:', enrollment.student_name);
    
    if (enrollment.subjects_parsed && enrollment.subjects_parsed.length > 0) {
        console.log('📚 FRONTEND: DETAILED SUBJECT VERIFICATION:');
        enrollment.subjects_parsed.forEach((subject, index) => {
            const hasValidInstructor = subject.instructor && 
                                     subject.instructor !== 'TBA' && 
                                     subject.instructor.trim() !== '';
            const hasValidRoom = subject.room && 
                               subject.room !== 'TBA' && 
                               subject.room.trim() !== '';
            
            console.log(`   📖 Subject ${index + 1}: ${subject.subject_code || subject.code}`);
            console.log(`      👨‍🏫 Instructor: "${subject.instructor}" ${hasValidInstructor ? '✅ VALID' : '❌ INVALID'}`);
            console.log(`      🏢 Room: "${subject.room}" ${hasValidRoom ? '✅ VALID' : '❌ INVALID'}`);
            console.log(`      ⏰ Schedule: ${subject.schedule}`);
            
            if (!hasValidInstructor && !hasValidRoom) {
                console.log(`      🚨 PROBLEM: Subject ${subject.subject_code} has NO valid instructor OR room data!`);
            }
        });
    } else {
        console.log('❌ FRONTEND: No subjects_parsed found in enrollment data!');
    }
}

// MODIFY processEnrollmentData method (around line 150) - ADD the debug call:
processEnrollmentData(enrollment) {
    console.log('🔄 FIXED: Processing enrollment data:', enrollment);

    // ADD DEBUG CALL HERE
    this.debugReceivedData(enrollment);
    
    // Update academic info display
    this.updateAcademicInfo(enrollment);

    // ENHANCED SUBJECT PROCESSING - Use subjects_parsed directly from backend
    let subjects = [];
    try {
        if (enrollment.subjects_parsed && Array.isArray(enrollment.subjects_parsed)) {
            subjects = enrollment.subjects_parsed;
            console.log('✅ Using PRE-ENRICHED subjects_parsed from backend:', subjects.length, 'items');
            
            // CRITICAL: Log first subject to verify enrichment worked
            if (subjects.length > 0) {
                console.log('🔍 FIRST ENRICHED SUBJECT from backend:', {
                    code: subjects[0].subject_code || subjects[0].code,
                    instructor: subjects[0].instructor,
                    room: subjects[0].room,
                    hasInstructor: !!(subjects[0].instructor && subjects[0].instructor !== 'TBA'),
                    hasRoom: !!(subjects[0].room && subjects[0].room !== 'TBA')
                });
            }
        } else if (enrollment.subjects) {
            // Fallback to old parsing method
            console.warn('⚠️ FALLBACK: Using raw subjects JSON (enrichment may be missing)');
            subjects = JSON.parse(enrollment.subjects);
        } else {
            console.warn('⚠️ No subjects data found in enrollment object');
        }
    } catch (error) {
        console.error('❌ Error processing subjects:', error);
    }

    if (subjects.length === 0) {
        console.warn('⚠️ No subjects found, showing empty state');
        this.showEmptyState();
        return;
    }

    console.log('📚 FINAL subjects with instructor/room data:', subjects);
    this.scheduleData = this.processSubjectSchedules(subjects);
    this.renderSchedule();
}


    updateAcademicInfo(enrollment) {
        console.log('📋 Updating academic info display...');

        // Show academic info card
        const academicInfo = document.getElementById('academicInfo');
        if (academicInfo) {
            academicInfo.style.display = 'block';
        }

        // Update individual fields
        this.updateElement('studentIdDisplay', enrollment.student_id);
        this.updateElement('programDisplay', enrollment.program);
        this.updateElement('yearLevelDisplay', enrollment.year_level);
        this.updateElement('semesterDisplay', enrollment.semester);
        this.updateElement('academicYearDisplay', enrollment.academic_year || '2024-2025');

        // Calculate total units
        const totalUnits = this.calculateTotalUnits(enrollment.subjects_parsed || []);
        this.updateElement('totalUnitsDisplay', totalUnits);
    }

    // REPLACE the processSubjectSchedules method in ScheduleManager class
processSubjectSchedules(subjects) {
    console.log('⏰ FIXED: Processing subject schedules with enhanced data...');
    console.log('📚 Input subjects for processing:', subjects);
    
    return subjects.map((subject, index) => {
        console.log(`🔍 Processing subject ${index + 1}:`, {
            code: subject.code || subject.subject_code,
            instructor: subject.instructor,
            room: subject.room,
            schedule: subject.schedule
        });
        
        const processedSubject = {
            subject_code: subject.code || subject.subject_code || 'N/A',
            subject_name: subject.description || subject.subject_name || subject.name || 'Unknown Subject',
            units: parseInt(subject.units) || 3,
            section: subject.section || 'A',
            
            // REPLACE the existing instructor processing logic with this:
instructor: (() => {
    const inst = subject.instructor;
    console.log('FRONTEND: Processing instructor for', subject.code || subject.subject_code, ':', {
        raw: inst,
        type: typeof inst,
        isValidString: inst && typeof inst === 'string' && inst.trim() !== '',
        isTBA: inst === 'TBA' || inst === 'NULL' || inst === 'null'
    });
    
    // Check if instructor is valid and not TBA/NULL
    if (inst && typeof inst === 'string' && inst.trim() !== '' && 
        !['TBA', 'NULL', 'null', ''].includes(inst.trim())) {
        return inst.trim();
    }
    return 'TBA';
})(),

// REPLACE the existing room processing logic with this:
room: (() => {
    const rm = subject.room;
    console.log('FRONTEND: Processing room for', subject.code || subject.subject_code, ':', {
        raw: rm,
        type: typeof rm,
        isValidString: rm && typeof rm === 'string' && rm.trim() !== '',
        isTBA: rm === 'TBA' || rm === 'NULL' || rm === 'null'
    });
    
    // Check if room is valid and not TBA/NULL
    if (rm && typeof rm === 'string' && rm.trim() !== '' && 
        !['TBA', 'NULL', 'null', ''].includes(rm.trim())) {
        return rm.trim();
    }
    return 'TBA';
})(),

            
            prerequisite: subject.prereq || subject.prerequisite || 'None',
            schedule: this.parseSchedule(subject.schedule || (subject.day + ' ' + subject.time) || 'TBA'),
            originalScheduleString: subject.schedule || (subject.day + ' ' + subject.time) || 'TBA',
            time: subject.time || 'TBA',
            day: subject.day || 'TBA'
        };
        
        console.log('✅ PROCESSED subject:', processedSubject.subject_code);
        console.log('   - Final Instructor:', processedSubject.instructor);
        console.log('   - Final Room:', processedSubject.room);
        
        return processedSubject;
    });
}


    parseSchedule(scheduleString) {
    console.log('🔍 Parsing schedule string:', scheduleString);

    if (!scheduleString || scheduleString === 'TBA' || scheduleString === 'N/A') {
        return {
            days: [],
            startTime: 'TBA',
            endTime: 'TBA',
            displayTime: 'TBA'
        };
    }

    try {
        // NEW: Handle "DAY TIME" format from your database (e.g., "MONDAY 8:00am-9:00am")
        const dayTimeRegex = /^([A-Z]+)\s+(\d{1,2}:\d{2}[ap]m)-(\d{1,2}:\d{2}[ap]m)$/i;
        const dayTimeMatch = scheduleString.match(dayTimeRegex);
        
        if (dayTimeMatch) {
            const [, dayName, startTime, endTime] = dayTimeMatch;
            const days = [dayName.toLowerCase()];
            
            return {
                days: days,
                startTime: this.convertTo24Hour(startTime),
                endTime: this.convertTo24Hour(endTime),
                displayTime: `${startTime} - ${endTime}`,
                dayCode: dayName.charAt(0)
            };
        }

        // Keep existing regex patterns for other formats...
        const regex = /([MTWRFS]+)\s+(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})\s*(AM|PM)/i;
        const match = scheduleString.match(regex);

        if (match) {
            const [, dayCode, startHour, startMin, endHour, endMin, period] = match;
            
            const days = this.parseDayCodes(dayCode);
            const startTime = this.formatTime(startHour, startMin, period);
            const endTime = this.formatTime(endHour, endMin, period);
            
            return {
                days: days,
                startTime: startTime,
                endTime: endTime,
                displayTime: `${this.convertFrom24Hour(startTime)} - ${this.convertFrom24Hour(endTime)}`,
                dayCode: dayCode
            };
        }
    } catch (error) {
        console.error('❌ Error parsing schedule:', error);
    }

    // Fallback for unparseable schedules
    return {
        days: [],
        startTime: scheduleString,
        endTime: '',
        displayTime: scheduleString
    };
}
// ADD these helper functions after parseSchedule:
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

convertFrom24Hour(time24) {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${period}`;
}

    parseDayCodes(dayCode) {
    // Handle full day names from database
    if (typeof dayCode === 'string' && dayCode.length > 3) {
        const fullDayMap = {
            'MONDAY': 'monday',
            'TUESDAY': 'tuesday',
            'WEDNESDAY': 'wednesday',
            'THURSDAY': 'thursday',
            'FRIDAY': 'friday',
            'SATURDAY': 'saturday',
            'SUNDAY': 'sunday'
        };
        
        const fullDay = fullDayMap[dayCode.toUpperCase()];
        if (fullDay) return [fullDay];
    }

    // Existing code for abbreviated day codes...
    const dayMap = {
        'M': 'monday',
        'T': 'tuesday', 
        'W': 'wednesday',
        'R': 'thursday',
        'F': 'friday',
        'S': 'saturday'
    };

    const days = [];
    
    if (dayCode.includes('Th') || dayCode.includes('TH')) {
        days.push('thursday');
        dayCode = dayCode.replace(/Th|TH/g, '');
    }

    for (let char of dayCode) {
        if (dayMap[char]) {
            days.push(dayMap[char]);
        }
    }

    return [...new Set(days)];
}

    formatTime(hour, minute, period) {
        hour = parseInt(hour);
        if (period.toUpperCase() === 'PM' && hour !== 12) {
            hour += 12;
        } else if (period.toUpperCase() === 'AM' && hour === 12) {
            hour = 0;
        }
        
        return `${hour.toString().padStart(2, '0')}:${minute}`;
    }

    renderSchedule() {
        console.log('🎨 Rendering schedule with', this.scheduleData.length, 'subjects');
        
        // Show schedule container
        const container = document.getElementById('scheduleContainer');
        if (container) {
            container.style.display = 'block';
        }

        // Render list view only
        this.renderListView();

        // Update schedule status
        this.updateScheduleStatus('success');
    }

    renderListView() {
        console.log('📋 Rendering list view...');

        const tableBody = document.getElementById('subjectsTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        this.scheduleData.forEach(subject => {
            const row = document.createElement('tr');
            row.onclick = () => this.showSubjectDetails(subject);
            row.style.cursor = 'pointer';

            row.innerHTML = `
                <td><strong>${subject.subject_code}</strong></td>
                <td>${subject.subject_name}</td>
                <td class="text-center">${subject.units}</td>
                <td class="text-center">${subject.section}</td>
                <td>${subject.schedule.displayTime}</td>
                <td>${subject.instructor}</td>
                <td>${subject.room}</td>
                <td>${subject.prerequisite}</td>
            `;

            tableBody.appendChild(row);
        });

        // Update summary information
        this.updateScheduleSummary();
    }

    updateScheduleSummary() {
        const totalSubjects = this.scheduleData.length;
        const totalUnits = this.scheduleData.reduce((sum, subject) => sum + subject.units, 0);
        const labSubjects = this.scheduleData.filter(s => 
            s.subject_name.toLowerCase().includes('lab') || 
            s.subject_code.toLowerCase().includes('lab')
        ).length;
        const lectureSubjects = totalSubjects - labSubjects;

        // Update summary elements
        this.updateElement('subjectCount', totalSubjects);
        this.updateElement('totalSubjects', totalSubjects);
        this.updateElement('summaryTotalUnits', totalUnits);
        this.updateElement('labSubjects', labSubjects);
        this.updateElement('lectureSubjects', lectureSubjects);

        // Calculate total hours (estimate: 3 hours per unit)
        const totalHours = totalUnits * 3;
        this.updateElement('totalHours', totalHours);
    }

    showSubjectDetails(subject) {
        console.log('📖 Showing details for:', subject.subject_code);

        // Populate modal with subject details
        this.updateElement('modalSubjectTitle', `${subject.subject_code} - ${subject.subject_name}`);
        this.updateElement('modalSubjectCode', subject.subject_code);
        this.updateElement('modalSubjectName', subject.subject_name);
        this.updateElement('modalUnits', subject.units);
        this.updateElement('modalSection', subject.section);
        this.updateElement('modalInstructor', subject.instructor);
        this.updateElement('modalRoom', subject.room);
        this.updateElement('modalSchedule', subject.originalScheduleString);
        this.updateElement('modalPrerequisites', subject.prerequisite);

        // Show modal
        const modal = document.getElementById('classDetailsModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    closeSubjectDetailsModal() {
        const modal = document.getElementById('classDetailsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    refreshSchedule() {
        console.log('🔄 Refreshing schedule...');
        this.loadStudentSchedule();
    }

    printSchedule() {
        console.log('🖨️ Printing schedule...');
        
        // Create printable version
        const printContent = this.generatePrintableSchedule();
        
        // Open print dialog
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
    }

    generatePrintableSchedule() {
        const student = this.enrolledData;
        const subjects = this.scheduleData;

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Class Schedule - ${student.student_name}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .info-table { width: 100%; margin-bottom: 20px; border-collapse: collapse; }
                    .info-table td { padding: 8px; border: 1px solid #ddd; }
                    .schedule-table { width: 100%; border-collapse: collapse; }
                    .schedule-table th, .schedule-table td { 
                        padding: 10px; border: 1px solid #ddd; text-align: left; 
                    }
                    .schedule-table th { background-color: #f5f5f5; }
                    @media print {
                        body { margin: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>CLASS SCHEDULE</h1>
                    <h2>Academic Year ${student.academic_year || '2024-2025'}</h2>
                </div>
                
                <table class="info-table">
                    <tr>
                        <td><strong>Student ID:</strong></td>
                        <td>${student.student_id}</td>
                        <td><strong>Program:</strong></td>
                        <td>${student.program}</td>
                    </tr>
                    <tr>
                        <td><strong>Year Level:</strong></td>
                        <td>${student.year_level}</td>
                        <td><strong>Semester:</strong></td>
                        <td>${student.semester}</td>
                    </tr>
                </table>

                <table class="schedule-table">
                    <thead>
                        <tr>
                            <th>Subject Code</th>
                            <th>Subject Name</th>
                            <th>Units</th>
                            <th>Section</th>
                            <th>Schedule</th>
                            <th>Room</th>
                            <th>Instructor</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${subjects.map(subject => `
                            <tr>
                                <td>${subject.subject_code}</td>
                                <td>${subject.subject_name}</td>
                                <td>${subject.units}</td>
                                <td>${subject.section}</td>
                                <td>${subject.originalScheduleString}</td>
                                <td>${subject.room}</td>
                                <td>${subject.instructor}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div style="margin-top: 20px;">
                    <strong>Total Subjects: ${subjects.length}</strong><br>
                    <strong>Total Units: ${subjects.reduce((sum, s) => sum + s.units, 0)}</strong>
                </div>
            </body>
            </html>
        `;
    }

    goToEnrollment() {
        window.location.href = '#enroll';
        // Or trigger enrollment section if using SPA
        if (typeof showSection === 'function') {
            showSection('enroll');
        }
    }

    showLoading(show) {
        const loadingElement = document.getElementById('scheduleLoading');
        const statusElement = document.getElementById('scheduleStatus');
        
        if (show) {
            if (loadingElement) loadingElement.style.display = 'block';
            if (statusElement) {
                statusElement.innerHTML = `
                    <div class="status-card">
                        <div class="status-icon">
                            <i class="fas fa-spinner fa-spin"></i>
                        </div>
                        <div class="status-content">
                            <h4>Loading Schedule...</h4>
                            <p>Fetching your enrolled subjects and class schedule</p>
                        </div>
                    </div>
                `;
            }
        } else {
            if (loadingElement) loadingElement.style.display = 'none';
        }
    }

    showEmptyState() {
        console.log('📭 Showing empty state');
        
        const emptyState = document.getElementById('emptySchedule');
        const container = document.getElementById('scheduleContainer');
        const academicInfo = document.getElementById('academicInfo');
        
        if (emptyState) emptyState.style.display = 'block';
        if (container) container.style.display = 'none';
        if (academicInfo) academicInfo.style.display = 'none';

        this.updateScheduleStatus('empty');
    }

    showError(message) {
        console.error('❌ Showing error:', message);
        
        const statusElement = document.getElementById('scheduleStatus');
        if (statusElement) {
            statusElement.innerHTML = `
                <div class="status-card error">
                    <div class="status-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="status-content">
                        <h4>Error Loading Schedule</h4>
                        <p>${message}</p>
                        <button class="btn btn-sm btn-primary" onclick="scheduleManager.refreshSchedule()">
                            Try Again
                        </button>
                    </div>
                </div>
            `;
        }
    }

    updateScheduleStatus(status) {
        const statusElement = document.getElementById('scheduleStatus');
        if (!statusElement) return;

        switch (status) {
            case 'success':
                statusElement.innerHTML = `
                    <div class="status-card success">
                        <div class="status-icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div class="status-content">
                            <h4>Schedule Loaded Successfully</h4>
                            <p>Your current enrollment and class schedule</p>
                        </div>
                    </div>
                `;
                break;
            case 'empty':
                statusElement.innerHTML = `
                    <div class="status-card warning">
                        <div class="status-icon">
                            <i class="fas fa-info-circle"></i>
                        </div>
                        <div class="status-content">
                            <h4>No Schedule Available</h4>
                            <p>You don't have any enrolled subjects yet</p>
                        </div>
                    </div>
                `;
                break;
        }
    }

    calculateTotalUnits(subjects) {
        if (!subjects || !Array.isArray(subjects)) return 0;
        return subjects.reduce((total, subject) => {
            const units = parseInt(subject.units) || 3; // Default 3 units
            return total + units;
        }, 0);
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }
}


// Global functions for HTML onclick handlers
function refreshSchedule() {
    if (window.scheduleManager) {
        window.scheduleManager.refreshSchedule();
    }
}

function printSchedule() {
    if (window.scheduleManager) {
        window.scheduleManager.printSchedule();
    }
}

function closeClassDetailsModal() {
    if (window.scheduleManager) {
        window.scheduleManager.closeSubjectDetailsModal();
    }
}

function goToEnrollment() {
    if (window.scheduleManager) {
        window.scheduleManager.goToEnrollment();
    }
}



// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM loaded, initializing Schedule Manager...');
    window.scheduleManager = new ScheduleManager();
});

// Initialize if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        if (!window.scheduleManager) {
            window.scheduleManager = new ScheduleManager();
        }
    });
} else {
    if (!window.scheduleManager) {
        window.scheduleManager = new ScheduleManager();
    }
}