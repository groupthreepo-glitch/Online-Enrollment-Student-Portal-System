// student-grades.js - Frontend JavaScript for Student Grades Display

// Global variables
let currentStudentId = null;
let studentData = null;
let enrolledSubjects = [];
let studentGrades = [];
let allSemesters = [];
let currentSemester = null;

// Initialize grades module when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('📚 Student Grades module initializing...');
    initializeGradesModule();
});

// REPLACE the entire initializeGradesModule function:
async function initializeGradesModule() {
    try {
        // Get student ID from session/localStorage or URL
        let inputStudentId = getCurrentStudentId();
        
        if (!inputStudentId) {
            showError('Student ID not found. Please log in again.');
            return;
        }
        
        console.log('👤 Input student ID:', inputStudentId);
        
        // Resolve to actual student ID if needed
        currentStudentId = await resolveStudentId(inputStudentId);
        
        console.log('👤 Resolved student ID:', currentStudentId);
        
        // Load student data and grades
        await loadStudentData();
        await loadStudentGrades();
        
    } catch (error) {
        console.error('❌ Error initializing grades module:', error);
        showError('Failed to initialize grades system. Please refresh the page.');
    }
}

// REPLACE the getCurrentStudentId function in student-grades.js
function getCurrentStudentId() {
    // Try URL parameters first
    const urlParams = new URLSearchParams(window.location.search);
    let studentId = urlParams.get('studentId');
    
    // Try session storage
    if (!studentId) {
        studentId = sessionStorage.getItem('studentId');
    }
    
    // Try local storage
    if (!studentId) {
        studentId = localStorage.getItem('studentId');
    }
    
    // CRITICAL FIX: Try global user object with better logic
    if (!studentId && typeof window.currentUser !== 'undefined') {
        console.log('👤 Current user object:', window.currentUser);
        
        // First try to get the student_id from user profile
        if (window.currentUser.student_id) {
            studentId = window.currentUser.student_id;
            console.log('✅ Using student_id from user:', studentId);
        } else if (window.currentUser.id) {
            // Use user ID - the API will resolve it to student_id
            studentId = window.currentUser.id;
            console.log('✅ Using user ID (will resolve to student_id):', studentId);
        }
    }
    
    // Try meta tag
    if (!studentId) {
        const metaStudentId = document.querySelector('meta[name="student-id"]');
        if (metaStudentId) {
            studentId = metaStudentId.getAttribute('content');
        }
    }
    
    console.log('🔍 Student ID resolution result:', studentId);
    
    return studentId;
}

// NEW FUNCTION: Resolve actual student ID from user ID if needed
async function resolveStudentId(inputId) {
    try {
        // If it looks like a student ID (contains dashes), use it directly
        if (inputId && inputId.toString().includes('-')) {
            return inputId;
        }
        
        // Otherwise, it's likely a user ID - fetch the actual student_id
        const response = await fetch(`/api/enrollment/student-info/${inputId}`);
        const data = await response.json();
        
        if (data.success && data.student && data.student.studentId) {
            console.log('✅ Resolved user ID', inputId, 'to student ID:', data.student.studentId);
            return data.student.studentId;
        }
        
        return inputId; // Fallback to original ID
    } catch (error) {
        console.error('❌ Error resolving student ID:', error);
        return inputId;
    }
}

// REPLACE the loadStudentData function with this enhanced version
async function loadStudentData() {
    try {
        console.log('📋 Loading student data for student ID:', currentStudentId);
        
        // FIXED: Try the enrolled students endpoint first (more reliable)
        let response = await fetch(`/api/enrollment/enrolled-students/student/${currentStudentId}`);
        let data = await response.json();
        
        if (data.success && data.data && data.data.length > 0) {
            // Use data from enrolled students table
            const enrolledStudent = data.data[0];
            studentData = {
                name: enrolledStudent.student_name || 'Unknown Student',
                studentId: enrolledStudent.student_id,
                id: enrolledStudent.student_id,
                program: enrolledStudent.program,
                yearLevel: enrolledStudent.year_level,
                semester: enrolledStudent.semester,
                email: enrolledStudent.student_email || 'N/A',
                phone: enrolledStudent.phone || 'N/A',
                address: enrolledStudent.address || 'N/A'
            };
            
            console.log('✅ Student data loaded from enrolled_students:', studentData);
            updateStudentInfo(studentData);
            return;
        }
        
        // FALLBACK: Try the original student-info endpoint
        console.log('🔄 Trying fallback student-info endpoint...');
        response = await fetch(`/api/enrollment/student-info/${currentStudentId}`);
        data = await response.json();
        
        if (data.success && data.student) {
            studentData = data.student;
            updateStudentInfo(studentData);
            console.log('✅ Student data loaded from student_info:', studentData);
        } else {
            throw new Error(data.message || 'Failed to load student data from both endpoints');
        }
        
    } catch (error) {
        console.error('❌ Error loading student data:', error);
        
        // CRITICAL FIX: Don't fail completely - use basic info
        if (currentStudentId) {
            studentData = {
                name: 'Student',
                studentId: currentStudentId,
                id: currentStudentId,
                program: 'Unknown Program',
                yearLevel: 'Unknown Year',
                semester: 'Current Semester'
            };
            updateStudentInfo(studentData);
            console.log('⚠️ Using fallback student data');
        } else {
            showError('Failed to load student information: ' + error.message);
        }
    }
}

// REPLACE the loadStudentGrades function with this enhanced version
async function loadStudentGrades() {
    try {
        console.log('📊 Loading student grades and subjects...');
        showLoading(true);
        
        // STEP 1: Get enrolled student data using the CORRECT endpoint
        const enrolledResponse = await fetch(`/api/enrollment/enrolled-students/student/${currentStudentId}`);
        const enrolledData = await enrolledResponse.json();
        
        console.log('📋 Enrolled data response:', enrolledData);
        
        if (enrolledData.success && enrolledData.data && enrolledData.data.length > 0) {
            const enrolledStudent = enrolledData.data[0];
            
            // CRITICAL FIX: Use subjects_parsed directly (it's already enriched from backend)
            enrolledSubjects = [];
            if (enrolledStudent.subjects_parsed && Array.isArray(enrolledStudent.subjects_parsed)) {
                console.log('✅ Using PRE-ENRICHED subjects_parsed from backend');
                
                // Map the enriched data to consistent format for grades display
                enrolledSubjects = enrolledStudent.subjects_parsed.map(subject => ({
                    subject_code: subject.subject_code || subject.code || 'UNKNOWN',
                    subject_name: subject.subject_name || subject.description || subject.name || 'Unknown Subject',
                    units: parseInt(subject.units) || 3,
                    section: subject.section || 'A',
                    
                    // CRITICAL: Use the enriched instructor/room data from backend
                    instructor: subject.instructor && 
                               subject.instructor !== 'TBA' && 
                               !subject.instructor.includes('TBA - No Data') 
                               ? subject.instructor 
                               : 'TBA',
                    
                    room: subject.room && 
                          subject.room !== 'TBA' && 
                          !subject.room.includes('TBA - No Data') 
                          ? subject.room 
                          : 'TBA',
                    
                    schedule: (subject.day && subject.time) ? `${subject.day} ${subject.time}` : 'TBA',
                    prerequisite: subject.prerequisite || 'None',
                    semester: enrolledStudent.semester || 'Current Semester'
                }));
                
                console.log('✅ ENRICHED subjects loaded with instructor/room data:', enrolledSubjects.length);
                
            } else if (enrolledStudent.subjects) {
                // FALLBACK: Parse raw subjects JSON (less preferred)
                console.warn('⚠️ FALLBACK: Parsing raw subjects (enrichment may be missing)');
                try {
                    const parsedSubjects = JSON.parse(enrolledStudent.subjects);
                    enrolledSubjects = Array.isArray(parsedSubjects) ? parsedSubjects : Object.values(parsedSubjects);
                    
                    // Map to consistent format
                    enrolledSubjects = enrolledSubjects.map(subject => ({
                        subject_code: subject.code || subject.subject_code || 'UNKNOWN',
                        subject_name: subject.description || subject.subject_name || subject.name || 'Unknown Subject',
                        units: parseInt(subject.units) || 3,
                        section: subject.section || 'A',
                        instructor: subject.instructor || 'TBA',
                        room: subject.room || 'TBA',
                        schedule: (subject.day && subject.time) ? `${subject.day} ${subject.time}` : 'TBA',
                        prerequisite: subject.prereq || subject.prerequisite || 'None',
                        semester: enrolledStudent.semester || 'Current Semester'
                    }));
                } catch (parseError) {
                    console.error('❌ Error parsing subjects:', parseError);
                    enrolledSubjects = [];
                }
            }
            
            console.log('📚 Current enrolled subjects loaded:', enrolledSubjects.length);
            
            // STEP 2: Get ALL grades from database (not just current semester) - FIXED!
            const gradesResponse = await fetch(`/api/enrollment/grades/student/${currentStudentId}`);
            const gradesData = await gradesResponse.json();
            
            console.log('📊 ALL Grades data response:', gradesData);
            
            if (gradesData.success) {
                studentGrades = gradesData.data || [];
                console.log('📊 ALL Student grades loaded:', studentGrades.length);
                
                // ENHANCED: Load historical subjects from previous semesters
                await loadHistoricalSubjects();
            } else {
                console.warn('⚠️ No grades data returned:', gradesData.message);
                studentGrades = [];
            }
            
            // STEP 3: Process and display the data
            processSemesterData();
            displayGrades();
            
        } else {
            console.log('⚠️ No enrolled subjects found:', enrolledData);
            
            // FALLBACK: Still try to load historical grades even if no current enrollment
            const gradesResponse = await fetch(`/api/enrollment/grades/student/${currentStudentId}`);
            const gradesData = await gradesResponse.json();
            
            if (gradesData.success && gradesData.data && gradesData.data.length > 0) {
                studentGrades = gradesData.data;
                enrolledSubjects = []; // No current subjects
                await loadHistoricalSubjects();
                processSemesterData();
                displayGrades();
                console.log('✅ Loaded historical grades without current enrollment');
            } else {
                showNoGrades('You are not currently enrolled in any subjects and have no grade history.');
            }
        }
        
    } catch (error) {
        console.error('❌ Error loading grades:', error);
        showError('Failed to load grades data: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// NEW FUNCTION: Load historical subjects from previous enrollments
async function loadHistoricalSubjects() {
    try {
        console.log('📚 Loading historical subjects from all enrollments...');
        
        // Get all historical enrollments for this student
        const response = await fetch(`/api/enrollment/student-history/${currentStudentId}`);
        const data = await response.json();
        
        if (data.success && data.data && data.data.length > 0) {
            console.log('📋 Found', data.data.length, 'historical enrollment records');
            
            // Process each historical enrollment
            data.data.forEach(enrollment => {
                try {
                    if (enrollment.subjects && enrollment.semester) {
                        let historicalSubjects = [];
                        
                        if (enrollment.subjects_parsed && Array.isArray(enrollment.subjects_parsed)) {
                            historicalSubjects = enrollment.subjects_parsed;
                        } else {
                            const parsedSubjects = JSON.parse(enrollment.subjects);
                            historicalSubjects = Array.isArray(parsedSubjects) ? parsedSubjects : Object.values(parsedSubjects);
                        }
                        
                        // Add historical subjects to enrolledSubjects array
                        historicalSubjects.forEach(subject => {
                            const mappedSubject = {
                                subject_code: subject.code || subject.subject_code || 'UNKNOWN',
                                subject_name: subject.description || subject.subject_name || subject.name || 'Unknown Subject',
                                units: parseInt(subject.units) || 3,
                                section: subject.section || 'A',
                                instructor: subject.instructor || 'TBA',
                                room: subject.room || 'TBA',
                                schedule: (subject.day && subject.time) ? `${subject.day} ${subject.time}` : 'TBA',
                                prerequisite: subject.prereq || subject.prerequisite || 'None',
                                semester: enrollment.semester, // Use the historical semester
                                isHistorical: true
                            };
                            
                            // Only add if not already present (avoid duplicates)
                            if (!enrolledSubjects.find(s => s.subject_code === mappedSubject.subject_code && s.semester === mappedSubject.semester)) {
                                enrolledSubjects.push(mappedSubject);
                            }
                        });
                    }
                } catch (parseError) {
                    console.error('❌ Error parsing historical subjects:', parseError);
                }
            });
            
            console.log('✅ Total subjects (current + historical):', enrolledSubjects.length);
        }
        
    } catch (error) {
        console.error('❌ Error loading historical subjects:', error);
        // Don't fail completely - just continue without historical data
    }
}

// ADD this function to properly set up the refresh button
function setupRefreshButton() {
    const refreshButton = document.getElementById('refreshGrades');
    if (refreshButton) {
        // Remove any existing event listeners
        refreshButton.onclick = null;
        
        // Add the correct function
        refreshButton.onclick = function() {
            console.log('🔄 Refresh button clicked');
            refreshGrades();
        };
        
        console.log('✅ Refresh button properly configured');
    } else {
        console.warn('⚠️ Refresh button not found in DOM');
    }
}

// CALL this function after DOM is loaded - ADD to initializeGradesModule
async function initializeGradesModule() {
    try {
        // Get student ID from session/localStorage or URL
        let inputStudentId = getCurrentStudentId();
        
        if (!inputStudentId) {
            showError('Student ID not found. Please log in again.');
            return;
        }
        
        console.log('👤 Input student ID:', inputStudentId);
        
        // Resolve to actual student ID if needed
        currentStudentId = await resolveStudentId(inputStudentId);
        
        console.log('👤 Resolved student ID:', currentStudentId);
        
        // Load student data and grades
        await loadStudentData();
        await loadStudentGrades();
        
        // CRITICAL FIX: Setup the refresh button properly
        setupRefreshButton();
        
    } catch (error) {
        console.error('❌ Error initializing grades module:', error);
        showError('Failed to initialize grades system. Please refresh the page.');
    }
}

// Process semester data and create tabs
function processSemesterData() {
    console.log('📅 Processing semester data...');
    console.log('📚 Enrolled subjects:', enrolledSubjects.length);
    console.log('📊 Student grades:', studentGrades.length);
    
    // Get unique semesters from enrolled subjects and grades
    const enrolledSemesters = enrolledSubjects.map(s => s.semester || 'Current Semester').filter(s => s);
    const gradesSemesters = studentGrades.map(g => g.semester).filter(s => s);
    
    allSemesters = [...new Set([...enrolledSemesters, ...gradesSemesters])];
    
    // If no semesters found, use default
    if (allSemesters.length === 0) {
        allSemesters = ['Current Semester'];
    }
    
    // Set current semester
    currentSemester = allSemesters[0];
    
    console.log('📅 Available semesters:', allSemesters);
    console.log('📅 Current semester:', currentSemester);
    
    // Create semester tabs
    createSemesterTabs();
}


// Create semester tabs
function createSemesterTabs() {
    const tabsContainer = document.getElementById('semesterTabs');
    if (!tabsContainer) return;
    
    tabsContainer.innerHTML = '';
    
    allSemesters.forEach(semester => {
        const tab = document.createElement('div');
        tab.className = `semester-tab ${semester === currentSemester ? 'active' : ''}`;
        tab.textContent = semester;
        tab.onclick = () => switchSemester(semester);
        tabsContainer.appendChild(tab);
    });
}

// Switch between semesters
function switchSemester(semester) {
    currentSemester = semester;
    
    // Update active tab
    document.querySelectorAll('.semester-tab').forEach(tab => {
        tab.classList.toggle('active', tab.textContent === semester);
    });
    
    // Update semester title
    const titleElement = document.getElementById('semesterTitle');
    if (titleElement) {
        titleElement.textContent = `${semester} Grades`;
    }
    
    // Refresh grades display
    displayGrades();
}

// Main function to display grades
function displayGrades() {
    try {
        console.log('🎨 Displaying grades for semester:', currentSemester);
        
        // Get subjects for current semester
        const semesterSubjects = enrolledSubjects.filter(subject => 
            (subject.semester || 'Current') === currentSemester
        );
        
        // Get grades for current semester
        const semesterGrades = studentGrades.filter(grade => 
            grade.semester === currentSemester
        );
        
        console.log('📚 Semester subjects:', semesterSubjects.length);
        console.log('📊 Semester grades:', semesterGrades.length);
        
        if (semesterSubjects.length === 0) {
            showNoGrades(`No subjects found for ${currentSemester}`);
            return;
        }
        
        // Merge subjects with their grades
        const subjectsWithGrades = mergeSubjectsWithGrades(semesterSubjects, semesterGrades);
        
        // Create and display grades table
        createGradesTable(subjectsWithGrades);
        
        // Update GPA and statistics
        updateGPADisplay(semesterGrades);
        debugStatistics(); // Add debug info
        updateStatistics(subjectsWithGrades);
        
    } catch (error) {
        console.error('❌ Error displaying grades:', error);
        showError('Failed to display grades');
    }
}

// REPLACE the mergeSubjectsWithGrades function in student-grades.js
function mergeSubjectsWithGrades(subjects, grades) {
    return subjects.map(subject => {
        // Find matching grade record using subject_code
        const gradeRecord = grades.find(grade => 
            grade.subject_code === subject.subject_code
        );
        
        console.log('🔍 Matching subject:', subject.subject_code, 'with grade:', gradeRecord ? 'FOUND' : 'NOT FOUND');
        
        return {
            subject_code: subject.subject_code || 'UNKNOWN',
            subject_name: subject.subject_name || 'Unknown Subject',
            units: parseInt(subject.units) || 3,
            instructor: subject.instructor || 'TBA',
            schedule: subject.schedule || 'TBA',
            section: subject.section || 'A',
            prerequisite: subject.prerequisite || 'None',
            semester: subject.semester || 'Current Semester',
            // Grade information from database
            hasGrades: !!gradeRecord,
            prelim_grade: gradeRecord?.prelim_grade || null,
            midterm_grade: gradeRecord?.midterm_grade || null,
            final_grade: gradeRecord?.final_grade || null,
            total_grade: gradeRecord?.total_grade || null,
            letter_grade: gradeRecord?.letter_grade || null,
            remarks: gradeRecord?.remarks || 'PENDING',
            // Additional grade info
            gradeStatus: gradeRecord ? getGradeStatus(gradeRecord.remarks) : 'pending',
            isPassed: gradeRecord ? ['PASSED', 'CONDITIONAL'].includes(gradeRecord.remarks) : false,
            isFailed: gradeRecord ? gradeRecord.remarks === 'FAILED' : false,
            isIncomplete: gradeRecord ? gradeRecord.remarks === 'INCOMPLETE' : true
        };
    });
}

// Get grade status for styling
function getGradeStatus(remarks) {
    if (!remarks) return 'pending';
    
    switch (remarks.toUpperCase()) {
        case 'PASSED': return 'passed';
        case 'FAILED': return 'failed';
        case 'CONDITIONAL': return 'conditional';
        case 'INCOMPLETE': return 'incomplete';
        default: return 'pending';
    }
}

// Create and display grades table
function createGradesTable(subjectsWithGrades) {
    const container = document.getElementById('gradesTableContainer');
    if (!container) return;
    
    // Create table HTML
    const tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>Subject Code</th>
                    <th>Subject Name</th>
                    <th>Units</th>
                    <th>Prelim<br><span style="font-size: 0.8em; opacity: 0.7;">(33%)</span></th>
                    <th>Midterm<br><span style="font-size: 0.8em; opacity: 0.7;">(33%)</span></th>
                    <th>Final<br><span style="font-size: 0.8em; opacity: 0.7;">(34%)</span></th>
                    <th>Total</th>
                    <th>Letter Grade</th>
                    <th>Remarks</th>
                    <th>Instructor</th>
                    <th>Schedule</th>
                </tr>
            </thead>
            <tbody>
                ${subjectsWithGrades.map(subject => createSubjectRow(subject)).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = tableHTML;
}

// Create individual subject row
function createSubjectRow(subject) {
    const hasAllGrades = subject.prelim_grade !== null && 
                        subject.midterm_grade !== null && 
                        subject.final_grade !== null;
    
    return `
        <tr class="subject-row ${subject.gradeStatus}">
            <td class="subject-code">${subject.subject_code}</td>
            <td class="subject-name">${subject.subject_name}</td>
            <td class="units">${subject.units}</td>
            <td class="grade-cell ${getGradeCellClass(subject.prelim_grade)}">
                ${formatGradeDisplay(subject.prelim_grade)}
            </td>
            <td class="grade-cell ${getGradeCellClass(subject.midterm_grade)}">
                ${formatGradeDisplay(subject.midterm_grade)}
            </td>
            <td class="grade-cell ${getGradeCellClass(subject.final_grade)}">
                ${formatGradeDisplay(subject.final_grade)}
            </td>
            <td class="grade-cell ${getGradeCellClass(subject.total_grade)}">
                <strong>${formatGradeDisplay(subject.total_grade, true)}</strong>
            </td>
            <td class="letter-grade-cell">
                ${subject.letter_grade ? 
                    `<span class="letter-grade ${getLetterGradeClass(subject.letter_grade)}">${subject.letter_grade}</span>` : 
                    '<span class="grade-pending">-</span>'
                }
            </td>
            <td class="remarks">
                <span class="remarks ${subject.gradeStatus}">${subject.remarks}</span>
            </td>
            <td class="instructor">${subject.instructor}</td>
            <td class="schedule">${subject.schedule}</td>
        </tr>
    `;
}

// Format grade display
function formatGradeDisplay(grade, isTotal = false) {
    if (grade === null || grade === undefined || grade === '') {
        return '<span class="grade-pending">-</span>';
    }
    
    const numGrade = parseFloat(grade);
    if (isNaN(numGrade)) {
        return '<span class="grade-pending">-</span>';
    }
    
    return isTotal ? numGrade.toFixed(2) : numGrade.toFixed(0);
}

// Get CSS class for grade cell based on value
function getGradeCellClass(grade) {
    if (grade === null || grade === undefined) return '';
    
    const numGrade = parseFloat(grade);
    if (isNaN(numGrade)) return '';
    
    if (numGrade >= 97) return 'grade-excellent';
    if (numGrade >= 91) return 'grade-very-good';
    if (numGrade >= 85) return 'grade-good';
    if (numGrade >= 75) return 'grade-satisfactory';
    return 'grade-failed';
}

// Get CSS class for letter grade
function getLetterGradeClass(letterGrade) {
    if (!letterGrade) return '';
    
    const grade = parseFloat(letterGrade);
    if (grade <= 1.25) return 'excellent';
    if (grade <= 1.75) return 'very-good';
    if (grade <= 2.25) return 'good';
    if (grade <= 3.00) return 'satisfactory';
    if (grade <= 4.00) return 'conditional';
    return 'failed';
}

// REPLACE the updateStudentInfo function in student-grades.js with this enhanced version
function updateStudentInfo(student) {
    console.log('📝 Updating student info display:', student);
    
    const elements = {
        studentName: document.getElementById('studentName'),
        studentId: document.getElementById('gradesStudentId'), // Use the new ID
        studentProgram: document.getElementById('studentProgram'),
        studentYear: document.getElementById('studentYear'),
        currentSemester: document.getElementById('currentSemester')
    };
    
    // ENHANCED: Update with fallback values and better formatting
    if (elements.studentName) {
        elements.studentName.textContent = student.name || student.student_name || 'Student Name';
    }
    
    // CRITICAL FIX: Check if Student ID element is an input field - if so, don't overwrite it
    if (elements.studentId) {
        const isInputField = elements.studentId.tagName === 'INPUT' || 
                           elements.studentId.tagName === 'TEXTAREA' || 
                           elements.studentId.contentEditable === 'true';
        
        if (!isInputField) {
            // Only update if it's a display element (div, span, etc.)
            elements.studentId.textContent = student.studentId || student.student_id || student.id || '-';
            console.log('✅ Student ID display element updated:', student.studentId || student.student_id);
        } else {
            // If it's an input field, preserve its current value and don't overwrite
            console.log('⚠️ Student ID is an input field - preserving current value:', elements.studentId.value);
        }
    }
    
    if (elements.studentProgram) {
        elements.studentProgram.textContent = student.program || 'Unknown Program';
    }
    
    if (elements.studentYear) {
        // FIXED: Format year level properly
        const yearLevel = student.yearLevel || student.year_level || 'Unknown Year';
        elements.studentYear.textContent = yearLevel;
    }
    
    if (elements.currentSemester) {
        const semester = student.semester || currentSemester || 'Current Semester';
        elements.currentSemester.textContent = semester;
    }
    
    // ADDITIONAL: Update any other student info elements
    const additionalElements = {
        studentEmail: document.getElementById('studentEmail'),
        studentPhone: document.getElementById('studentPhone'),
        studentAddress: document.getElementById('studentAddress')
    };
    
    if (additionalElements.studentEmail) {
        additionalElements.studentEmail.textContent = student.email || student.student_email || 'N/A';
    }
    
    if (additionalElements.studentPhone) {
        additionalElements.studentPhone.textContent = student.phone || 'N/A';
    }
    
    if (additionalElements.studentAddress) {
        additionalElements.studentAddress.textContent = student.address || 'N/A';
    }
    
    console.log('✅ Student info display updated successfully');
}

// ADD this new function to student-grades.js (after the existing functions)
function detectPageContext() {
    console.log('🔍 Detecting page context...');
    
    // Check if we're on a profile/form page
    const profileForm = document.getElementById('profile-form');
    const isProfilePage = !!profileForm;
    
    // Check if Student ID is an input field
    const studentIdElement = document.getElementById('studentId');
    const studentIdIsInput = studentIdElement && (
        studentIdElement.tagName === 'INPUT' || 
        studentIdElement.tagName === 'TEXTAREA' ||
        studentIdElement.contentEditable === 'true'
    );
    
    console.log('🔍 Page context detected:', {
        isProfilePage,
        studentIdIsInput,
        studentIdTagName: studentIdElement?.tagName
    });
    
    return {
        isProfilePage,
        studentIdIsInput,
        shouldPreserveInputs: isProfilePage || studentIdIsInput
    };
}

// MODIFY the initializeGradesModule function to use this context check
// ADD this line at the very beginning of initializeGradesModule function:
async function initializeGradesModule() {
    try {
        // ADDED: Detect page context to prevent input field conflicts
        const pageContext = detectPageContext();
        
        if (pageContext.shouldPreserveInputs) {
            console.log('⚠️ Detected form inputs - adjusting grades module behavior');
        }
        
        // ... rest of existing initializeGradesModule code remains the same ...
        
        // Get student ID from session/localStorage or URL
        let inputStudentId = getCurrentStudentId();
        
        if (!inputStudentId) {
            showError('Student ID not found. Please log in again.');
            return;
        }
        
        console.log('👤 Input student ID:', inputStudentId);
        
        // Resolve to actual student ID if needed
        currentStudentId = await resolveStudentId(inputStudentId);
        
        console.log('👤 Resolved student ID:', currentStudentId);
        
        // Load student data and grades
        await loadStudentData();
        await loadStudentGrades();
        
        // CRITICAL FIX: Setup the refresh button properly
        setupRefreshButton();
        
    } catch (error) {
        console.error('❌ Error initializing grades module:', error);
        showError('Failed to initialize grades system. Please refresh the page.');
    }
}

// Update GPA display
function updateGPADisplay(semesterGrades) {
    try {
        // Calculate current semester GPA
        const currentSemesterGPA = calculateSemesterGPA(semesterGrades);
        
        // Calculate overall GPA (all semesters)
        const overallGPA = calculateOverallGPA();
        
        // Calculate total units
        const semesterUnits = enrolledSubjects.filter(s => 
            (s.semester || 'Current') === currentSemester
        ).reduce((sum, subject) => sum + (parseInt(subject.units) || 3), 0);
        
        const totalUnitsCompleted = calculateTotalUnitsCompleted();
        
        // Update display elements
        const elements = {
            currentGPA: document.getElementById('currentGPA'),
            overallGPA: document.getElementById('overallGPA'),
            totalUnits: document.getElementById('totalUnits'),
            currentStatus: document.getElementById('currentStatus'),
            overallStatus: document.getElementById('overallStatus'),
            completionRate: document.getElementById('completionRate')
        };
        
        if (elements.currentGPA) {
            elements.currentGPA.textContent = currentSemesterGPA.gpa.toFixed(2);
        }
        
        if (elements.overallGPA) {
            elements.overallGPA.textContent = overallGPA.gpa.toFixed(2);
        }
        
        if (elements.totalUnits) {
            elements.totalUnits.textContent = totalUnitsCompleted;
        }
        
        if (elements.currentStatus) {
            elements.currentStatus.textContent = getGPAStatus(currentSemesterGPA.gpa);
        }
        
        if (elements.overallStatus) {
            elements.overallStatus.textContent = getGPAStatus(overallGPA.gpa);
        }
        
        if (elements.completionRate) {
            const expectedUnits = studentData?.yearLevel === '4th Year' ? 120 : 
                                 studentData?.yearLevel === '3rd Year' ? 90 : 
                                 studentData?.yearLevel === '2nd Year' ? 60 : 30;
            const rate = Math.min(100, (totalUnitsCompleted / expectedUnits) * 100);
            elements.completionRate.textContent = `${rate.toFixed(0)}%`;
        }
        
    } catch (error) {
        console.error('❌ Error updating GPA display:', error);
    }
}

// Calculate semester GPA
function calculateSemesterGPA(semesterGrades) {
    const gradesWithUnits = semesterGrades.filter(grade => 
        grade.letter_grade && grade.letter_grade !== '5.00' && grade.remarks !== 'FAILED'
    );
    
    if (gradesWithUnits.length === 0) {
        return { gpa: 0.00, totalUnits: 0, qualityPoints: 0 };
    }
    
    let totalQualityPoints = 0;
    let totalUnits = 0;
    
    gradesWithUnits.forEach(grade => {
        const units = getSubjectUnits(grade.subject_code);
        const gradePoint = parseFloat(grade.letter_grade) || 0;
        
        totalQualityPoints += (gradePoint * units);
        totalUnits += units;
    });
    
    const gpa = totalUnits > 0 ? totalQualityPoints / totalUnits : 0;
    
    return { gpa, totalUnits, qualityPoints: totalQualityPoints };
}

// Calculate overall GPA (all semesters)
function calculateOverallGPA() {
    if (studentGrades.length === 0) {
        return { gpa: 0.00, totalUnits: 0, qualityPoints: 0 };
    }
    
    const passedGrades = studentGrades.filter(grade => 
        grade.letter_grade && grade.letter_grade !== '5.00' && grade.remarks !== 'FAILED'
    );
    
    let totalQualityPoints = 0;
    let totalUnits = 0;
    
    passedGrades.forEach(grade => {
        const units = getSubjectUnits(grade.subject_code);
        const gradePoint = parseFloat(grade.letter_grade) || 0;
        
        totalQualityPoints += (gradePoint * units);
        totalUnits += units;
    });
    
    const gpa = totalUnits > 0 ? totalQualityPoints / totalUnits : 0;
    
    return { gpa, totalUnits, qualityPoints: totalQualityPoints };
}

// Get subject units
function getSubjectUnits(subjectCode) {
    const subject = enrolledSubjects.find(s => 
        (s.subject_code || s.code) === subjectCode
    );
    return parseInt(subject?.units) || 3;
}

// Calculate total completed units
function calculateTotalUnitsCompleted() {
    const passedGrades = studentGrades.filter(grade => 
        grade.remarks === 'PASSED' || grade.remarks === 'CONDITIONAL'
    );
    
    return passedGrades.reduce((total, grade) => {
        return total + getSubjectUnits(grade.subject_code);
    }, 0);
}

// Get GPA status text
function getGPAStatus(gpa) {
    if (gpa === 0) return 'No grades yet';
    if (gpa <= 1.25) return 'Excellent';
    if (gpa <= 1.75) return 'Very Good';
    if (gpa <= 2.25) return 'Good';
    if (gpa <= 3.00) return 'Satisfactory';
    if (gpa <= 4.00) return 'Conditional';
    return 'Failed';
}

// Update statistics display - FIXED to count subjects per current semester only
function updateStatistics(subjectsWithGrades) {
    // FIXED: Count subjects from CURRENT SEMESTER only, not all semesters
    const totalSubjects = subjectsWithGrades.length; // Current semester subjects only
    
    // Count passed subjects from current semester display
    const passedSubjects = subjectsWithGrades.filter(s => s.isPassed).length;
    
    // Calculate units earned from current semester
    const unitsEarned = subjectsWithGrades
        .filter(s => s.isPassed)
        .reduce((sum, s) => sum + s.units, 0);
    
    // Calculate average grade (numerical) from current semester
    const gradesWithValues = subjectsWithGrades.filter(s => s.total_grade !== null);
    const averageGrade = gradesWithValues.length > 0 ? 
        gradesWithValues.reduce((sum, s) => sum + parseFloat(s.total_grade), 0) / gradesWithValues.length : 0;
    
    // Update elements
    const elements = {
        totalSubjects: document.getElementById('gradesTotalSubjects'),
        passedSubjects: document.getElementById('passedSubjects'),
        unitsEarned: document.getElementById('unitsEarned'),
        averageGrade: document.getElementById('averageGrade')
    };
    
    if (elements.totalSubjects) elements.totalSubjects.textContent = totalSubjects;
    if (elements.passedSubjects) elements.passedSubjects.textContent = passedSubjects;
    if (elements.unitsEarned) elements.unitsEarned.textContent = unitsEarned;
    if (elements.averageGrade) elements.averageGrade.textContent = averageGrade.toFixed(2);
    
    // Show statistics section
    const statsSection = document.getElementById('summaryStats');
    if (statsSection) {
        statsSection.style.display = 'grid';
    }
    
    console.log('📊 Statistics updated for current semester:', {
        currentSemester,
        totalSubjects,
        passedSubjects,
        unitsEarned,
        averageGrade: averageGrade.toFixed(2)
    });
}

// DEBUG function to check data state
function debugStatistics() {
    console.log('🔍 DEBUG: Statistics Data State:', {
        enrolledSubjects_length: enrolledSubjects.length,
        allSemesters: allSemesters,
        currentSemester: currentSemester,
        studentGrades_length: studentGrades.length,
        enrolledSubjects_sample: enrolledSubjects.slice(0, 2)
    });
}

// Show loading state
function showLoading(show = true) {
    const tableContainer = document.getElementById('gradesTableContainer');
    
    if (show) {
        if (tableContainer) {
            tableContainer.innerHTML = `
                <div class="loading" id="loadingIndicator">
                    <i class="fas fa-spinner fa-spin"></i>
                    <h3>Loading your grades...</h3>
                    <p>Please wait while we fetch your academic records.</p>
                </div>
            `;
        }
    }
    // Remove the else block that was causing issues
}


// Show no grades message
function showNoGrades(message = 'No grades available for the selected semester') {
    const container = document.getElementById('gradesTableContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div class="no-grades">
            <i class="fas fa-inbox"></i>
            <h3>No Grades Available</h3>
            <p>${message}</p>
        </div>
    `;
}

// Show error message
function showError(message) {
    const container = document.getElementById('gradesTableContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <strong>Error:</strong> ${message}
        </div>
    `;
}

// Show success message
function showSuccess(message) {
    const container = document.getElementById('gradesTableContainer');
    if (!container) return;
    
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <strong>Success:</strong> ${message}
    `;
    
    container.insertBefore(successDiv, container.firstChild);
    
    // Remove after 5 seconds
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.parentNode.removeChild(successDiv);
        }
    }, 5000);
}

// REPLACE the refreshGrades function with this enhanced version
async function refreshGrades() {
    try {
        console.log('🔄 Refreshing grades data...');
        showLoading(true);
        
        // STEP 1: Reload student data first
        await loadStudentData();
        
        // STEP 2: Get enrolled student data using the CORRECT endpoint
        const enrolledResponse = await fetch(`/api/enrollment/enrolled-students/student/${currentStudentId}`);
        const enrolledData = await enrolledResponse.json();
        
        console.log('📋 Enrolled data response:', enrolledData);
        
        // STEP 3: Get ALL grades from database FIRST (this was the main issue)
        const gradesResponse = await fetch(`/api/enrollment/grades/student/${currentStudentId}`);
        const gradesData = await gradesResponse.json();
        
        console.log('📊 Grades data response:', gradesData);
        
        if (gradesData.success) {
            studentGrades = gradesData.data || [];
            console.log('📊 Student grades refreshed:', studentGrades.length);
        } else {
            console.warn('⚠️ No grades data during refresh:', gradesData.message);
            studentGrades = [];
        }
        
        // STEP 4: Process current enrollment
        if (enrolledData.success && enrolledData.data && enrolledData.data.length > 0) {
            const enrolledStudent = enrolledData.data[0];
            
            // CRITICAL FIX: Use subjects_parsed directly (it's already enriched from backend)
            enrolledSubjects = [];
            if (enrolledStudent.subjects_parsed && Array.isArray(enrolledStudent.subjects_parsed)) {
                console.log('✅ Using PRE-ENRICHED subjects_parsed from backend');
                
                enrolledSubjects = enrolledStudent.subjects_parsed.map(subject => ({
                    subject_code: subject.subject_code || subject.code || 'UNKNOWN',
                    subject_name: subject.subject_name || subject.description || subject.name || 'Unknown Subject',
                    units: parseInt(subject.units) || 3,
                    section: subject.section || 'A',
                    instructor: subject.instructor && 
                               subject.instructor !== 'TBA' && 
                               !subject.instructor.includes('TBA - No Data') 
                               ? subject.instructor 
                               : 'TBA',
                    room: subject.room && 
                          subject.room !== 'TBA' && 
                          !subject.room.includes('TBA - No Data') 
                          ? subject.room 
                          : 'TBA',
                    schedule: (subject.day && subject.time) ? `${subject.day} ${subject.time}` : 'TBA',
                    prerequisite: subject.prerequisite || 'None',
                    semester: enrolledStudent.semester || 'Current Semester'
                }));
                
            } else if (enrolledStudent.subjects) {
                console.warn('⚠️ FALLBACK: Parsing raw subjects during refresh');
                try {
                    const parsedSubjects = JSON.parse(enrolledStudent.subjects);
                    enrolledSubjects = Array.isArray(parsedSubjects) ? parsedSubjects : Object.values(parsedSubjects);
                    
                    enrolledSubjects = enrolledSubjects.map(subject => ({
                        subject_code: subject.code || subject.subject_code || 'UNKNOWN',
                        subject_name: subject.description || subject.subject_name || subject.name || 'Unknown Subject',
                        units: parseInt(subject.units) || 3,
                        section: subject.section || 'A',
                        instructor: subject.instructor || 'TBA',
                        room: subject.room || 'TBA',
                        schedule: (subject.day && subject.time) ? `${subject.day} ${subject.time}` : 'TBA',
                        prerequisite: subject.prereq || subject.prerequisite || 'None',
                        semester: enrolledStudent.semester || 'Current Semester'
                    }));
                } catch (parseError) {
                    console.error('❌ Error parsing subjects during refresh:', parseError);
                    enrolledSubjects = [];
                }
            }
            
            console.log('📚 Current enrolled subjects refreshed:', enrolledSubjects.length);
        }
        
        // STEP 5: CRITICAL FIX - Load historical subjects again
        await loadHistoricalSubjects();
        
        // STEP 6: Process and display the data
        processSemesterData();
        displayGrades();
        
        // STEP 7: Update student info display
        updateStudentInfo(studentData);
        
        showSuccess('Grades refreshed successfully!');
        
    } catch (error) {
        console.error('❌ Error refreshing grades:', error);
        showError('Failed to refresh grades: ' + error.message);
    } finally {
        showLoading(false);
    }
}


// Utility function to format grade colors
function addGradeColorStyles() {
    // This function can be called to ensure grade colors are applied
    const style = document.createElement('style');
    style.textContent = `
        .subject-row.passed { background-color: #f8fff8; }
        .subject-row.failed { background-color: #fff8f8; }
        .subject-row.conditional { background-color: #fffbf0; }
        .subject-row.incomplete { background-color: #f8f9fa; }
        
        .grade-pending {
            color: #6c757d;
            font-style: italic;
        }
        
        .grade-cell.has-grade {
            font-weight: 600;
        }
    `;
    document.head.appendChild(style);
}

// Initialize color styles
addGradeColorStyles();

// REPLACE the downloadGradesPDF function with this fixed version
async function downloadGradesPDF() {
    try {
        console.log('📄 Generating PDF report...');
        showLoading(true);
        
        // Check if jsPDF is available
        if (typeof window.jspdf === 'undefined') {
            throw new Error('PDF library not loaded. Please refresh the page and try again.');
        }
        
        // Get all grades data
        const allGrades = [];
        
        allSemesters.forEach(semester => {
            const semesterSubjects = enrolledSubjects.filter(subject => 
                (subject.semester || 'Current') === semester
            );
            
            const semesterGrades = studentGrades.filter(grade => 
                grade.semester === semester
            );
            
            if (semesterSubjects.length > 0) {
                const subjectsWithGrades = mergeSubjectsWithGrades(semesterSubjects, semesterGrades);
                allGrades.push({
                    semester,
                    subjects: subjectsWithGrades
                });
            }
        });
        
        // Create PDF content
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(20);
        doc.text('Academic Transcript', 20, 20);
        
        // Student Info
        doc.setFontSize(12);
        doc.text(`Student Name: ${studentData?.name || 'N/A'}`, 20, 35);
        doc.text(`Student ID: ${studentData?.studentId || currentStudentId}`, 20, 45);
        doc.text(`Program: ${studentData?.program || 'N/A'}`, 20, 55);
        doc.text(`Year Level: ${studentData?.yearLevel || 'N/A'}`, 20, 65);
        
        let yPosition = 85;
        
        // Grades by semester
        allGrades.forEach(semesterData => {
            if (semesterData.subjects.length > 0) {
                // Check for new page
                if (yPosition > 250) {
                    doc.addPage();
                    yPosition = 20;
                }
                
                // Semester header
                doc.setFontSize(14);
                doc.text(`${semesterData.semester}`, 20, yPosition);
                yPosition += 10;
                
                // Table headers
                doc.setFontSize(8);
                doc.text('Subject Code', 20, yPosition);
                doc.text('Subject Name', 50, yPosition);
                doc.text('Units', 120, yPosition);
                doc.text('Prelim', 135, yPosition);
                doc.text('Midterm', 150, yPosition);
                doc.text('Final', 165, yPosition);
                doc.text('Total', 180, yPosition);
                doc.text('Grade', 195, yPosition);
                
                yPosition += 5;
                
                // Draw line
                doc.line(20, yPosition, 200, yPosition);
                yPosition += 5;
                
                // Subject rows
                semesterData.subjects.forEach(subject => {
                    if (yPosition > 270) { // New page if needed
                        doc.addPage();
                        yPosition = 20;
                    }
                    
                    // FIXED: Safe value extraction with null checks
                    const subjectCode = String(subject.subject_code || '');
                    const subjectName = String(subject.subject_name || '').substring(0, 25);
                    const units = String(subject.units || '');
                    const prelimGrade = subject.prelim_grade !== null ? String(subject.prelim_grade) : '-';
                    const midtermGrade = subject.midterm_grade !== null ? String(subject.midterm_grade) : '-';
                    const finalGrade = subject.final_grade !== null ? String(subject.final_grade) : '-';
                    const totalGrade = subject.total_grade !== null ? parseFloat(subject.total_grade).toFixed(2) : '-';
                    const letterGrade = String(subject.letter_grade || '-');
                    
                    doc.text(subjectCode, 20, yPosition);
                    doc.text(subjectName, 50, yPosition);
                    doc.text(units, 120, yPosition);
                    doc.text(prelimGrade, 135, yPosition);
                    doc.text(midtermGrade, 150, yPosition);
                    doc.text(finalGrade, 165, yPosition);
                    doc.text(totalGrade, 180, yPosition);
                    doc.text(letterGrade, 195, yPosition);
                    
                    yPosition += 8;
                });
                
                yPosition += 10; // Extra space between semesters
            }
        });
        
        // GPA Summary
        const overallGPA = calculateOverallGPA();
        doc.setFontSize(12);
        doc.text(`Overall GPA: ${overallGPA.gpa.toFixed(2)}`, 20, yPosition + 10);
        doc.text(`Total Units Completed: ${calculateTotalUnitsCompleted()}`, 20, yPosition + 20);
        
        // Footer
        doc.setFontSize(8);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, doc.internal.pageSize.height - 10);
        
        // Save the PDF
        const fileName = `${studentData?.name || 'Student'}_Grades_${new Date().getFullYear()}.pdf`;
        doc.save(fileName);
        
        showSuccess('PDF downloaded successfully!');
        
    } catch (error) {
        console.error('❌ Error generating PDF:', error);
        showError('Failed to generate PDF: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// REPLACE the downloadGradesExcel function with this fixed version
async function downloadGradesExcel() {
    try {
        console.log('📊 Generating Excel report...');
        showLoading(true);
        
        // Check if XLSX library is available
        if (typeof XLSX === 'undefined') {
            throw new Error('Excel library not loaded. Please refresh the page and try again.');
        }
        
        // Create workbook
        const wb = XLSX.utils.book_new();
        
        // Student Info Sheet
        const studentInfo = [
            ['Student Information'],
            ['Name', studentData?.name || 'N/A'],
            ['Student ID', studentData?.studentId || currentStudentId],
            ['Program', studentData?.program || 'N/A'],
            ['Year Level', studentData?.yearLevel || 'N/A'],
            ['Generated On', new Date().toLocaleDateString()],
            [],
            ['Overall GPA', calculateOverallGPA().gpa.toFixed(2)],
            ['Total Units Completed', calculateTotalUnitsCompleted()]
        ];
        
        const infoWS = XLSX.utils.aoa_to_sheet(studentInfo);
        XLSX.utils.book_append_sheet(wb, infoWS, 'Student Info');
        
        // Create sheets for each semester
        allSemesters.forEach(semester => {
            const semesterSubjects = enrolledSubjects.filter(subject => 
                (subject.semester || 'Current') === semester
            );
            
            const semesterGrades = studentGrades.filter(grade => 
                grade.semester === semester
            );
            
            if (semesterSubjects.length > 0) {
                const subjectsWithGrades = mergeSubjectsWithGrades(semesterSubjects, semesterGrades);
                
                const sheetData = [
                    ['Subject Code', 'Subject Name', 'Units', 'Prelim (33%)', 'Midterm (33%)', 'Final (34%)', 'Total', 'Letter Grade', 'Remarks', 'Instructor', 'Schedule']
                ];
                
                subjectsWithGrades.forEach(subject => {
                    // FIXED: Safe value extraction with null checks
                    const totalGrade = subject.total_grade !== null ? parseFloat(subject.total_grade).toFixed(2) : '';
                    
                    sheetData.push([
                        subject.subject_code || '',
                        subject.subject_name || '',
                        subject.units || '',
                        subject.prelim_grade || '',
                        subject.midterm_grade || '',
                        subject.final_grade || '',
                        totalGrade,
                        subject.letter_grade || '',
                        subject.remarks || '',
                        subject.instructor || '',
                        subject.schedule || ''
                    ]);
                });
                
                const ws = XLSX.utils.aoa_to_sheet(sheetData);
                // Clean semester name for sheet name (remove invalid characters)
                const cleanSemesterName = semester.replace(/[\/\\?*[\]]/g, '').substring(0, 31);
                XLSX.utils.book_append_sheet(wb, ws, cleanSemesterName);
            }
        });
        
        // Save the Excel file
        const fileName = `${studentData?.name || 'Student'}_Grades_${new Date().getFullYear()}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        showSuccess('Excel file downloaded successfully!');
        
    } catch (error) {
        console.error('❌ Error generating Excel:', error);
        showError('Failed to generate Excel: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Export functions for global access
window.downloadGradesPDF = downloadGradesPDF;
window.downloadGradesExcel = downloadGradesExcel;

// Export functions for global access
window.loadStudentGrades = loadStudentGrades;
window.refreshGrades = refreshGrades; // Changed from loadStudentGrades to refreshGrades
window.switchSemester = switchSemester;

console.log('✅ Student Grades JavaScript module loaded successfully');