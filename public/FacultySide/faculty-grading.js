// Faculty Grading System JavaScript
// Create this file as: public/js/faculty-grading.js

let currentStudents = [];
let currentStudentData = null;
let gradingChanges = {};

// REPLACE the entire DOMContentLoaded function with this FIXED version:
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎓 Faculty Grading System Initialized');
    
    // Load students immediately when page loads
    loadStudentsForGrading();
    
    // FIXED: Add event listeners after a delay to ensure DOM is ready
    setTimeout(() => {
        const programFilter = document.getElementById('gradingProgramFilter');
        const yearLevelFilter = document.getElementById('gradingYearLevelFilter');
        const semesterFilter = document.getElementById('gradingSemesterFilter');
        const searchFilter = document.getElementById('gradingSearchFilter');
        
        if (programFilter) {
            programFilter.addEventListener('change', function() {
                console.log('🔍 PROGRAM FILTER CHANGED TO:', this.value);
                loadStudentsForGrading(); // Call loadStudentsForGrading instead of filterStudents
            });
            console.log('✅ Program filter event listener added');
        }
        
        if (yearLevelFilter) {
            yearLevelFilter.addEventListener('change', function() {
                console.log('🔍 YEAR LEVEL FILTER CHANGED TO:', this.value);
                loadStudentsForGrading(); // Call loadStudentsForGrading instead of filterStudents
            });
            console.log('✅ Year level filter event listener added');
        }
        
        if (semesterFilter) {
            semesterFilter.addEventListener('change', function() {
                console.log('🔍 SEMESTER FILTER CHANGED TO:', this.value);
                loadStudentsForGrading(); // Call loadStudentsForGrading instead of filterStudents
            });
            console.log('✅ Semester filter event listener added');
        }
        
        if (searchFilter) {
            searchFilter.addEventListener('input', function() {
                console.log('🔍 SEARCH FILTER CHANGED TO:', this.value);
                clearTimeout(window.searchTimeout);
                window.searchTimeout = setTimeout(loadStudentsForGrading, 500); // Call loadStudentsForGrading
            });
            
            searchFilter.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    console.log('🔍 Enter pressed, filtering...');
                    loadStudentsForGrading(); // Call loadStudentsForGrading instead of filterStudents
                }
            });
            console.log('✅ Search filter event listeners added');
        }
        
    }, 1000);
});

// REPLACE the filter collection part in loadStudentsForGrading function with this FIXED version:
async function loadStudentsForGrading() {
    try {
        console.log('👥 Loading students for grading...');
        
        // Get actual selected values using unique grading IDs
        const programFilter = document.getElementById('gradingProgramFilter');
        const yearLevelFilter = document.getElementById('gradingYearLevelFilter');
        const semesterFilter = document.getElementById('gradingSemesterFilter');
        const searchFilter = document.getElementById('gradingSearchFilter');
        
        const filters = {
            program: programFilter?.value || '',
            yearLevel: yearLevelFilter?.value || '',
            semester: semesterFilter?.value || '',
            search: searchFilter?.value || ''
        };
        
        console.log('🔍 Filter values:', filters);
        
        // Only send non-empty values
        const queryParams = new URLSearchParams();
        if (filters.program && filters.program !== '') {
            queryParams.append('program', filters.program);
        }
        if (filters.yearLevel && filters.yearLevel !== '') {
            queryParams.append('yearLevel', filters.yearLevel);
        }
        if (filters.semester && filters.semester !== '') {
            queryParams.append('semester', filters.semester);
        }
        if (filters.search && filters.search !== '') {
            queryParams.append('search', filters.search);
        }
        
        const queryString = queryParams.toString();
        console.log('🔍 Query string being sent:', queryString);
        
        const response = await fetch(`/api/enrollment/grading/students?${queryString}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📊 API Response received');
        
        if (result.success) {
            currentStudents = result.data;
            console.log('✅ Students loaded:', currentStudents.length);
            
            // Ensure subjects_parsed exists
            currentStudents = currentStudents.map(student => {
                if (!student.subjects_parsed) {
                    student.subjects_parsed = [];
                    student.subjects_count = 0;
                }
                return student;
            });
            
            // Update displays
            displayStudentsTable(currentStudents);
            
            // CRITICAL FIX: Force immediate stats update
            updateStatsFromCurrentStudents(currentStudents);
            
        } else {
            throw new Error(result.message || 'Failed to load students');
        }
        
    } catch (error) {
        console.error('❌ Error loading students:', error);
        showErrorMessage('Failed to load students: ' + error.message);
        
        // Show empty state
        const container = document.getElementById('studentsTableContainer');
        if (container) {
            container.innerHTML = `
                <div class="no-students">
                    <h3>❌ Error Loading Students</h3>
                    <p>${error.message}</p>
                    <button onclick="loadStudentsForGrading()" class="retry-btn">🔄 Retry</button>
                </div>
            `;
        }
        
        // Set all stats to 0 on error
        updateStatsFromCurrentStudents([]);
    }
}

// REPLACE the existing displayStudentsTable function with this FIXED version
function displayStudentsTable(students) {
    const container = document.getElementById('studentsTableContainer');
    
    console.log('📊 FIXED: Displaying students table with', students ? students.length : 0, 'students');
    
    if (!students || students.length === 0) {
        container.innerHTML = `
            <div class="no-students">
                <h3>📭 No Students Found</h3>
                <p>No enrolled students match the selected filters.</p>
            </div>
        `;
        // Update section header
        const sectionHeader = document.querySelector('.section-header');
        if (sectionHeader) {
            sectionHeader.innerHTML = '<span id="studentsCount">0</span> Students Found';
        }
        
        // CRITICAL: Update stats to 0 when no students
        updateStatsFromCurrentStudents([]);
        return;
    }
    
    const tableHTML = `
        <table class="students-table">
            <thead>
                <tr>
                    <th>Student ID</th>
                    <th>Student Name</th>
                    <th>Program</th>
                    <th>Year Level</th>
                    <th>Semester</th>
                    <th>Type</th>
                    <th>Subjects</th>
                    <th>Grades Status</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                ${students.map(student => `
                    <tr>
                        <td><strong>${student.student_id}</strong></td>
                        <td>
                            <div class="student-info">
                                <div class="student-name">${student.student_name}</div>
                                <small class="student-email">${student.student_email || 'N/A'}</small>
                            </div>
                        </td>
                        <td><span class="program-badge">${student.program}</span></td>
                        <td>${student.year_level}</td>
                        <td>${student.semester}</td>
                        <td>
                            <span class="student-type-badge ${student.student_type || 'regular'}">
                                ${(student.student_type || 'regular').toUpperCase()}
                            </span>
                        </td>
                        <td>
                            <div class="subjects-info">
                                <strong>${student.subjects_count || 0}</strong> subjects
                            </div>
                        </td>
                        <td>
                            <div class="grades-status">
                                ${student.has_grades 
                                    ? '<span class="status-badge has-grades">✓ Has Grades</span>' 
                                    : '<span class="status-badge no-grades">⚠ No Grades</span>'
                                }
                            </div>
                        </td>
                        <td>
                            <button class="grade-btn" onclick="openGradingModal('${student.student_id}', ${student.enrolled_id})">
                                📊 Grade Student
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = tableHTML;
    
    // CRITICAL FIX: Update section header AND stats immediately
    const sectionHeader = document.querySelector('.section-header');
    if (sectionHeader) {
        sectionHeader.innerHTML = `<span id="studentsCount">${students.length}</span> Students Found`;
    }
    
    // CRITICAL: Update stats immediately after table display
    updateStatsFromCurrentStudents(students);
    
    console.log('✅ FIXED: Table and stats displayed with', students.length, 'students');
}

// FIXED: Updated to use grading-specific element IDs
function updateStatsFromCurrentStudents(students) {
    console.log('📊 CRITICAL FIX: Updating stats from current students...', students.length);
    
    const totalStudents = students ? students.length : 0;
    const programs = students ? new Set(students.map(s => s.program)).size : 0;
    const activeClasses = students ? new Set(students.map(s => `${s.program}-${s.year_level}-${s.semester}`)).size : 0;
    const pendingGrades = students ? students.filter(s => !s.has_grades).length : 0;
    
    // FIXED: Use grading-specific IDs
    const statUpdates = [
        { id: 'gradingTotalStudents', value: totalStudents },
        { id: 'gradingTotalPrograms', value: programs },
        { id: 'gradingActiveClasses', value: activeClasses },
        { id: 'gradingPendingGrades', value: pendingGrades }
    ];
    
    statUpdates.forEach(stat => {
        const element = document.getElementById(stat.id);
        if (element) {
            element.textContent = stat.value;
            element.innerHTML = stat.value;
            console.log(`✅ CRITICAL FIX: Updated ${stat.id} to:`, stat.value);
        } else {
            console.warn(`⚠️ Element ${stat.id} not found`);
        }
    });
    
    // Update section header
    const sectionHeader = document.querySelector('.section-header');
    if (sectionHeader) {
        sectionHeader.innerHTML = `<span id="studentsCount">${totalStudents}</span> Students Found`;
    }
    
    console.log('✅ CRITICAL FIX: All grading stats updated successfully');
}

// FIXED: Updated to use grading-specific element IDs
function forceUpdateStats(students) {
    console.log('⚡ FORCE: Updating all stats immediately with', students ? students.length : 0, 'students');
    
    const studentCount = students ? students.length : 0;
    const programs = students ? new Set(students.map(s => s.program)).size : 0;
    const activeClasses = students ? new Set(students.map(s => `${s.program}-${s.year_level}-${s.semester}`)).size : 0;
    const pendingGrades = students ? students.filter(s => !s.has_grades).length : 0;
    
    // FIXED: Use grading-specific IDs
    const stats = [
        { id: 'gradingTotalStudents', value: studentCount },
        { id: 'gradingTotalPrograms', value: programs },
        { id: 'gradingActiveClasses', value: activeClasses },
        { id: 'gradingPendingGrades', value: pendingGrades }
    ];
    
    stats.forEach(stat => {
        const element = document.getElementById(stat.id);
        if (element) {
            element.textContent = value;
            console.log(`⚡ FORCE updated ${stat.id}:`, value);
        }
    });
    
    // Update section header
    const sectionHeader = document.querySelector('.section-header');
    if (sectionHeader) {
        sectionHeader.innerHTML = `<span id="studentsCount">${studentCount}</span> Students Found`;
    }
}

// ADD this function to specifically update the Total Students stat
function updateTotalStudentsStat(count) {
    const totalStudentsElement = document.getElementById('totalStudents');
    if (totalStudentsElement) {
        totalStudentsElement.textContent = count;
        console.log('📊 Updated Total Students stat to:', count);
    }
}
// ADD this new function to force update the Total Students display
function forceUpdateTotalStudents(count) {
    console.log('🔧 FORCE updating Total Students display to:', count);
    
    // Update all possible Total Students elements
    const selectors = ['#totalStudents', '[data-stat="totalStudents"]', '.stat-number'];
    
    selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element, index) => {
            if (index === 0) { // First stat card should be Total Students
                element.textContent = count;
                console.log(`✅ Updated element ${selector}[${index}] to:`, count);
            }
        });
    });
    
    // Also update the section header
    const studentsCountElement = document.getElementById('studentsCount');
    if (studentsCountElement) {
        studentsCountElement.textContent = count;
    }
    
    const sectionHeader = document.querySelector('.section-header');
    if (sectionHeader) {
        sectionHeader.innerHTML = `<span id="studentsCount">${count}</span> Students Found`;
    }
}

// ADD this function to force update stats immediately:
function forceStatsUpdate(students) {
    console.log('⚡ FORCE: Updating all stats immediately with', students.length, 'students');
    
    const studentCount = students ? students.length : 0;
    const programs = students ? new Set(students.map(s => s.program)).size : 0;
    const activeClasses = students ? new Set(students.map(s => `${s.program}-${s.year_level}-${s.semester}`)).size : 0;
    const pendingGrades = students ? students.filter(s => !s.has_grades).length : 0;
    
    // Force update each stat element
    const stats = [
        { id: 'totalStudents', value: studentCount },
        { id: 'totalPrograms', value: programs },
        { id: 'activeClasses', value: activeClasses },
        { id: 'pendingGrades', value: pendingGrades }
    ];
    
    stats.forEach(stat => {
        const element = document.getElementById(stat.id);
        if (element) {
            element.textContent = stat.value;
            console.log(`⚡ FORCE updated ${stat.id}:`, stat.value);
        }
    });
    
    // Update section header
    const sectionHeader = document.querySelector('.section-header');
    if (sectionHeader) {
        sectionHeader.innerHTML = `<span id="studentsCount">${studentCount}</span> Students Found`;
    }
}

// REPLACE the existing updateAllStatsDisplays function with this ENHANCED version
function updateAllStatsDisplays(studentCount) {
    console.log('📊 Updating all stats displays to:', studentCount);
    
    // Update the main students count in section header
    const studentsCountElement = document.getElementById('studentsCount');
    if (studentsCountElement) {
        studentsCountElement.textContent = studentCount;
        console.log('✅ Updated section header count');
    }
    
    // Update the section header text
    const sectionHeader = document.querySelector('.section-header');
    if (sectionHeader) {
        sectionHeader.innerHTML = `<span id="studentsCount">${studentCount}</span> Students Found`;
        console.log('✅ Updated section header text');
    }
    
    // CRITICAL FIX: Update the "Total Students" stat card
    const totalStudentsElement = document.getElementById('totalStudents');
    if (totalStudentsElement) {
        totalStudentsElement.textContent = studentCount;
        console.log('✅ Updated Total Students stat card');
    }
    
    console.log('📊 All stats displays updated successfully');
}

// FIXED: Updated to use grading-specific element IDs
function updateStatsFromCurrentData(students) {
    console.log('📊 FIXED: Updating stats from current data...');
    
    if (!students || students.length === 0) {
        // FIXED: Use grading-specific IDs
        const statElements = ['gradingTotalStudents', 'gradingTotalPrograms', 'gradingActiveClasses', 'gradingPendingGrades'];
        statElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = '0';
                console.log(`✅ FIXED: Set ${id} to 0`);
            }
        });
        
        // Update section header
        const sectionHeader = document.querySelector('.section-header');
        if (sectionHeader) {
            sectionHeader.innerHTML = '<span id="studentsCount">0</span> Students Found';
        }
        return;
    }
    
    // Calculate stats from current students data
    const totalStudents = students.length;
    const programs = new Set(students.map(s => s.program)).size;
    const activeClasses = new Set(students.map(s => `${s.program}-${s.year_level}-${s.semester}`)).size;
    const pendingGrades = students.filter(s => !s.has_grades).length;
    
    // FIXED: Use grading-specific IDs
    const updateStat = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            console.log(`✅ FIXED: Updated ${id} to:`, value);
        }
    };
    
    updateStat('gradingTotalStudents', totalStudents);
    updateStat('gradingTotalPrograms', programs);
    updateStat('gradingActiveClasses', activeClasses);
    updateStat('gradingPendingGrades', pendingGrades);
    
    console.log('✅ FIXED: All grading stats updated successfully:', {
        totalStudents, programs, activeClasses, pendingGrades
    });
}

// Open grading modal for specific student - FIXED: Now filters by semester
async function openGradingModal(studentId, enrolledId) {
    try {
        console.log('📊 Opening grading modal for student:', studentId, 'enrolled ID:', enrolledId);
        
        // CRITICAL FIX: Get the SPECIFIC enrollment record first to get semester info
        const enrollmentResponse = await fetch(`/api/enrollment/enrolled-students/enrollment/${enrolledId}`);
        const enrollmentResult = await enrollmentResponse.json();
        
        if (!enrollmentResult.success || !enrollmentResult.data) {
            throw new Error('Could not find enrollment details');
        }
        
        const enrollmentData = enrollmentResult.data;
        console.log('📋 Retrieved enrollment data:', {
            enrolledId: enrollmentData.id,
            semester: enrollmentData.semester,
            yearLevel: enrollmentData.year_level,
            program: enrollmentData.program
        });
        
        // Set current student data with the specific enrollment info
        currentStudentData = {
            ...enrollmentData,
            enrolled_id: enrolledId
        };
        
        console.log('🎯 Current semester for grading:', currentStudentData.semester);
        
        // Load existing grades for this specific enrollment
        const gradesResponse = await fetch(`/api/enrollment/grades/student/${studentId}/enrollment/${enrolledId}`);
        const gradesResult = await gradesResponse.json();
        
        let existingGrades = {};
        if (gradesResult.success && gradesResult.data) {
            gradesResult.data.forEach(grade => {
                existingGrades[grade.subject_code] = grade;
            });
        }
        
        // Update modal content with semester-specific info
        document.getElementById('modalStudentName').textContent = `Grading: ${currentStudentData.student_name}`;
        document.getElementById('modalStudentInfo').innerHTML = `
            Student ID: ${currentStudentData.student_id} | Program: ${currentStudentData.program} | 
            Year: ${currentStudentData.year_level} | <strong>Semester: ${currentStudentData.semester}</strong>
        `;
        
        // Generate subjects table for THIS SPECIFIC semester
        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = generateGradingTable(currentStudentData, existingGrades);
        
        // Show modal
        document.getElementById('gradingModal').classList.add('active');
        
        // Reset changes tracking
        gradingChanges = {};
        updateChangesDisplay();
        
        console.log('✅ Grading modal opened for semester:', currentStudentData.semester);
        
    } catch (error) {
        console.error('❌ Error opening grading modal:', error);
        showErrorMessage('Failed to open grading modal: ' + error.message);
    }
}

// Generate grading table HTML - FIXED: Better semester display
function generateGradingTable(student, existingGrades) {
    if (!student.subjects_parsed || student.subjects_parsed.length === 0) {
        return `
            <div class="no-subjects">
                <h3>📭 No Subjects Found</h3>
                <p>This student has no enrolled subjects for <strong>${student.semester}</strong> to grade.</p>
            </div>
        `;
    }
    
    console.log('📚 Generating grading table for:', {
        semester: student.semester,
        subjectCount: student.subjects_parsed.length,
        academicYear: student.academic_year
    });
    
    return `
        <div class="semester-section">
            <div class="semester-header">
                <strong>${student.semester} - ${student.academic_year || '2025-2026'}</strong>
                <small style="display: block; color: #666; margin-top: 5px;">
                    ${student.subjects_parsed.length} subjects enrolled
                </small>
            </div>
            
            <table class="grades-table">
                <thead>
                    <tr>
                        <th>Subject Code</th>
                        <th>Subject Name</th>
                        <th>Units</th>
                        <th>Prelim<br><small>(33%)</small></th>
                        <th>Midterm<br><small>(33%)</small></th>
                        <th>Final<br><small>(34%)</small></th>
                        <th>Total</th>
                        <th>Letter Grade</th>
                        <th>Remarks</th>
                    </tr>
                </thead>
                <tbody>
                    ${student.subjects_parsed.map(subject => {
                        const existingGrade = existingGrades[subject.subject_code] || {};
                        
                        return `
                            <tr data-subject-code="${subject.subject_code}">
                                <td><strong>${subject.subject_code}</strong></td>
                                <td class="subject-name">${subject.subject_name}</td>
                                <td>${subject.units}</td>
                                <td>
                                    <input type="number" 
                                           class="grade-input" 
                                           data-grade-type="prelim_grade"
                                           data-subject-code="${subject.subject_code}"
                                           value="${existingGrade.prelim_grade || ''}"
                                           min="0" max="100" step="0.01"
                                           placeholder="0"
                                           onchange="handleGradeChange(this)">
                                </td>
                                <td>
                                    <input type="number" 
                                           class="grade-input" 
                                           data-grade-type="midterm_grade"
                                           data-subject-code="${subject.subject_code}"
                                           value="${existingGrade.midterm_grade || ''}"
                                           min="0" max="100" step="0.01"
                                           placeholder="0"
                                           onchange="handleGradeChange(this)">
                                </td>
                                <td>
                                    <input type="number" 
                                           class="grade-input" 
                                           data-grade-type="final_grade"
                                           data-subject-code="${subject.subject_code}"
                                           value="${existingGrade.final_grade || ''}"
                                           min="0" max="100" step="0.01"
                                           placeholder="0"
                                           onchange="handleGradeChange(this)">
                                </td>
                                <td class="total-grade" data-subject-code="${subject.subject_code}">
                                    ${existingGrade.total_grade ? parseFloat(existingGrade.total_grade).toFixed(2) : '-'}
                                </td>
                                <td class="letter-grade" data-subject-code="${subject.subject_code}">
                                    ${existingGrade.letter_grade || '-'}
                                </td>
                                <td class="remarks" data-subject-code="${subject.subject_code}">
                                    <span class="remarks-badge ${existingGrade.remarks ? existingGrade.remarks.toLowerCase() : 'incomplete'}">
                                        ${existingGrade.remarks || 'INCOMPLETE'}
                                    </span>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}


// Handle grade input changes
function handleGradeChange(input) {
    const subjectCode = input.dataset.subjectCode;
    const gradeType = input.dataset.gradeType;
    const value = input.value;
    
    // Track changes
    if (!gradingChanges[subjectCode]) {
        gradingChanges[subjectCode] = {};
    }
    gradingChanges[subjectCode][gradeType] = value;
    
    // Mark input as changed
    input.classList.add('changed');
    
    // Calculate total grade if all grades are filled
    calculateTotalGrade(subjectCode);
    
    // Update changes display
    updateChangesDisplay();
    
    console.log('📝 Grade changed:', subjectCode, gradeType, value);
}

// FIXED: Updated to 1.00-5.00 grading system (1.00 = highest, 5.00 = lowest)
function calculateTotalGrade(subjectCode) {
    const row = document.querySelector(`tr[data-subject-code="${subjectCode}"]`);
    const inputs = row.querySelectorAll('.grade-input');
    
    const grades = Array.from(inputs).map(input => parseFloat(input.value) || null);
    const validGrades = grades.filter(g => g !== null);
    
    if (validGrades.length === 3) { // All 3 grades present
        // Weighted calculation: Prelim 33%, Midterm 33%, Final 34%
        const total = (validGrades[0] * 0.33) + (validGrades[1] * 0.33) + (validGrades[2] * 0.34);
        
        // Update total display
        const totalCell = row.querySelector('.total-grade');
        totalCell.textContent = total.toFixed(2);
        
        // UPDATED: 1.00-5.00 grading system (1.00 = highest)
        let letterGrade = '';
        let remarks = '';
        
        if (total >= 97) { letterGrade = '1.00'; remarks = 'PASSED'; }
        else if (total >= 94) { letterGrade = '1.25'; remarks = 'PASSED'; }
        else if (total >= 91) { letterGrade = '1.50'; remarks = 'PASSED'; }
        else if (total >= 88) { letterGrade = '1.75'; remarks = 'PASSED'; }
        else if (total >= 85) { letterGrade = '2.00'; remarks = 'PASSED'; }
        else if (total >= 82) { letterGrade = '2.25'; remarks = 'PASSED'; }
        else if (total >= 79) { letterGrade = '2.50'; remarks = 'PASSED'; }
        else if (total >= 76) { letterGrade = '2.75'; remarks = 'PASSED'; }
        else if (total >= 75) { letterGrade = '3.00'; remarks = 'PASSED'; }
        else if (total >= 70) { letterGrade = '4.00'; remarks = 'CONDITIONAL'; }
        else { letterGrade = '5.00'; remarks = 'FAILED'; }
        
        // Update display
        const letterCell = row.querySelector('.letter-grade');
        const remarksCell = row.querySelector('.remarks');
        
        letterCell.textContent = letterGrade;
        remarksCell.innerHTML = `<span class="remarks-badge ${remarks.toLowerCase()}">${remarks}</span>`;
        
    } else {
        // Clear calculated fields if not all grades are present
        const totalCell = row.querySelector('.total-grade');
        const letterCell = row.querySelector('.letter-grade');
        const remarksCell = row.querySelector('.remarks');
        
        totalCell.textContent = '-';
        letterCell.textContent = '-';
        remarksCell.innerHTML = '<span class="remarks-badge incomplete">INCOMPLETE</span>';
    }
}

// Update changes display and enable/disable save button
function updateChangesDisplay() {
    const changesCount = Object.keys(gradingChanges).length;
    const changesText = document.getElementById('changesText');
    const saveBtn = document.getElementById('saveGradesBtn');
    
    if (changesCount > 0) {
        changesText.innerHTML = `<span class="changes-count">${changesCount}</span> subject${changesCount > 1 ? 's' : ''} modified`;
        saveBtn.disabled = false;
    } else {
        changesText.textContent = 'No changes made';
        saveBtn.disabled = true;
    }
}

// Save grades
async function saveGrades() {
    try {
        console.log('💾 Saving grades...');
        
        if (!currentStudentData || Object.keys(gradingChanges).length === 0) {
            showErrorMessage('No changes to save');
            return;
        }
        
        // Disable save button to prevent double-submission
        const saveBtn = document.getElementById('saveGradesBtn');
        const originalText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
        
        // Prepare grades data
        const gradesData = [];
        
        Object.entries(gradingChanges).forEach(([subjectCode, changes]) => {
            // Get subject info
            const subject = currentStudentData.subjects_parsed.find(s => s.subject_code === subjectCode);
            if (!subject) return;
            
            // Get all current values for this subject (ONLY 3 INPUTS NOW)
            const row = document.querySelector(`tr[data-subject-code="${subjectCode}"]`);
            const inputs = row.querySelectorAll('.grade-input');
            
            const gradeData = {
                subject_code: subjectCode,
                subject_name: subject.subject_name,
                prelim_grade: inputs[0].value || null,
                midterm_grade: inputs[1].value || null,
                final_grade: inputs[2].value || null,  // No semi-final anymore
                semi_final_grade: null  // Always null now
            };
            
            gradesData.push(gradeData);
        });
        
        console.log('📊 Grades to save:', gradesData);
        
        // Send to backend
        const response = await fetch('/api/enrollment/grades/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                studentId: currentStudentData.student_id,
                enrolledStudentId: currentStudentData.enrolled_id,
                grades: gradesData,
                facultyId: getCurrentFacultyId()
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Grades saved successfully');
            showSuccessMessage('Grades saved successfully!');
            
            // Clear changes tracking
            gradingChanges = {};
            
            // Remove 'changed' class from inputs
            document.querySelectorAll('.grade-input.changed').forEach(input => {
                input.classList.remove('changed');
            });
            
            // Update changes display
            updateChangesDisplay();
            
            // Refresh students list to update grades status
            await loadStudentsForGrading();
            
        } else {
            throw new Error(result.message || 'Failed to save grades');
        }
        
    } catch (error) {
        console.error('❌ Error saving grades:', error);
        showErrorMessage('Failed to save grades: ' + error.message);
    } finally {
        // Re-enable save button
        const saveBtn = document.getElementById('saveGradesBtn');
        saveBtn.disabled = Object.keys(gradingChanges).length === 0;
        saveBtn.textContent = 'Save Grades';
    }
}

// Close grading modal
function closeGradingModal() {
    const modal = document.getElementById('gradingModal');
    modal.classList.remove('active');
    
    // Reset data
    currentStudentData = null;
    gradingChanges = {};
}

// REPLACE the filterStudents function with this simplified version:
function filterStudents() {
    console.log('🔍 filterStudents called - redirecting to loadStudentsForGrading');
    loadStudentsForGrading();
}

// Update students count display
function updateStudentsCount(count) {
    const studentsCountElement = document.getElementById('studentsCount');
    if (studentsCountElement) {
        studentsCountElement.textContent = count;
    }
}

// NEW: Function to update both the stats and the section header count
function updateAllCounts(students) {
    const count = students ? students.length : 0;
    
    // Update the stats card
    updateStudentsCount(count);
    
    // Update the section header
    const sectionHeader = document.querySelector('.section-header');
    if (sectionHeader) {
        sectionHeader.innerHTML = `<span id="studentsCount">${count}</span> Students Found`;
    }
    
    console.log('📊 Updated all count displays to:', count);
}

// ADD this new function to update stats based on loaded student data
function updateStatsFromStudentData(students) {
    try {
        console.log('📊 Updating stats from loaded student data...');
        
        if (!students || students.length === 0) {
            console.log('⚠️ No students data to calculate stats from');
            return;
        }
        
        // Calculate stats from loaded students
        const totalStudents = students.length;
        const programs = new Set(students.map(s => s.program)).size;
        const activeClasses = new Set(students.map(s => `${s.program}-${s.year_level}-${s.semester}`)).size;
        const pendingGrades = students.filter(s => !s.has_grades).length;
        
        // Update the display
        const updateStat = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
                console.log(`✅ Updated ${id} to:`, value);
            }
        };
        
        updateStat('totalStudents', totalStudents);
        updateStat('totalPrograms', programs);
        updateStat('activeClasses', activeClasses);
        updateStat('pendingGrades', pendingGrades);
        
        console.log('✅ Stats updated from student data:', {
            totalStudents, programs, activeClasses, pendingGrades
        });
        
    } catch (error) {
        console.error('❌ Error updating stats from student data:', error);
    }
}

// FIXED: Updated to use grading-specific element IDs
async function loadGradingStats() {
    try {
        console.log('📊 Loading grading statistics...');
        
        const response = await fetch('/api/enrollment/grading/stats');
        
        if (response.ok) {
            const result = await response.json();
            
            if (result.success && result.stats) {
                const stats = result.stats;
                
                // FIXED: Use grading-specific IDs
                const updateStat = (id, value) => {
                    const element = document.getElementById(id);
                    if (element) {
                        element.textContent = value || 0;
                        console.log(`✅ Updated stat ${id}:`, value);
                    } else {
                        console.warn('⚠️ Stats element not found:', id);
                    }
                };
                
                updateStat('gradingTotalStudents', stats.totalStudents);
                updateStat('gradingTotalPrograms', stats.totalPrograms);
                updateStat('gradingActiveClasses', stats.activeClasses);
                updateStat('gradingPendingGrades', stats.pendingGrades);
                
                console.log('✅ Grading stats loaded successfully:', stats);
            }
        }
        
    } catch (error) {
        console.error('❌ Error loading grading stats:', error);
        // FIXED: Use grading-specific IDs for fallback
        ['gradingTotalStudents', 'gradingTotalPrograms', 'gradingActiveClasses', 'gradingPendingGrades'].forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = '0';
        });
    }
}

// NEW: Update stats based on currently filtered student data
function updateStatsFromFilteredData(students) {
    try {
        console.log('📊 Updating stats from filtered data...');
        
        if (!students || students.length === 0) {
            // Set all stats to 0 when no students
            updateAllStatsDisplays(0);
            const updateStat = (id, value) => {
                const element = document.getElementById(id);
                if (element) element.textContent = value;
            };
            updateStat('totalPrograms', 0);
            updateStat('activeClasses', 0);
            updateStat('pendingGrades', 0);
            return;
        }
        
        // Calculate stats from current filtered students
        const totalStudents = students.length;
        const programs = new Set(students.map(s => s.program)).size;
        const activeClasses = new Set(students.map(s => `${s.program}-${s.year_level}-${s.semester}`)).size;
        const pendingGrades = students.filter(s => !s.has_grades).length;
        
        // Update all stat displays
        const updateStat = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
                console.log(`✅ Updated ${id} to:`, value);
            }
        };
        
        updateStat('totalStudents', totalStudents);
        updateStat('totalPrograms', programs);
        updateStat('activeClasses', activeClasses);
        updateStat('pendingGrades', pendingGrades);
        
        console.log('✅ Stats updated from filtered data:', {
            totalStudents, programs, activeClasses, pendingGrades
        });
        
    } catch (error) {
        console.error('❌ Error updating stats from filtered data:', error);
    }
}

// Get current faculty ID (implement based on your session management)
function getCurrentFacultyId() {
    // This should return the current logged-in faculty's ID
    // You might get this from session storage, a global variable, or an API call
    return localStorage.getItem('facultyId') || sessionStorage.getItem('userId') || 1;
}

// Utility functions for showing messages
function showSuccessMessage(message) {
    // Create or update a success message element
    showMessage(message, 'success');
}

function showErrorMessage(message) {
    // Create or update an error message element
    showMessage(message, 'error');
}

function showMessage(message, type) {
    // Remove existing message
    const existingMessage = document.querySelector('.message-popup');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `message-popup ${type}`;
    messageDiv.innerHTML = `
        <div class="message-content">
            <span class="message-icon">${type === 'success' ? '✅' : '❌'}</span>
            <span class="message-text">${message}</span>
            <button class="message-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(messageDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (messageDiv && messageDiv.parentElement) {
            messageDiv.remove();
        }
    }, 5000);
}

// Add event listeners for filter inputs
document.addEventListener('DOMContentLoaded', function() {
    // Add enter key support for search
    const searchInput = document.getElementById('gradingSearchFilter');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                filterStudents();
            }
        });
    }
    
    // Add change listeners for select filters using unique grading IDs
['gradingProgramFilter', 'gradingYearLevelFilter', 'gradingSemesterFilter'].forEach(filterId => {
    const element = document.getElementById(filterId);
    if (element) {
        element.addEventListener('change', filterStudents);
    }
});
});

// Keyboard shortcut for modal
document.addEventListener('keydown', function(e) {
    // Close modal with Escape key
    if (e.key === 'Escape') {
        const modal = document.getElementById('gradingModal');
        if (modal.classList.contains('active')) {
            closeGradingModal();
        }
    }
    
    // Save with Ctrl+S
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        const modal = document.getElementById('gradingModal');
        if (modal.classList.contains('active')) {
            const saveBtn = document.getElementById('saveGradesBtn');
            if (!saveBtn.disabled) {
                saveGrades();
            }
        }
    }
});

// ADD this new function at the end of faculty-grading.js
function debugCurrentStats() {
    console.log('🔍 CURRENT STATS DEBUG:');
    ['totalStudents', 'totalPrograms', 'activeClasses', 'pendingGrades'].forEach(id => {
        const element = document.getElementById(id);
        console.log(`${id}:`, element ? element.textContent : 'NOT FOUND');
    });
    console.log('Current students array length:', currentStudents ? currentStudents.length : 'undefined');
}

// DEBUG: Add this function to test filters manually
function testFilters() {
    console.log('🧪 TESTING FILTERS...');
    const programFilter = document.getElementById('programFilter');
    const yearLevelFilter = document.getElementById('yearLevelFilter');
    const semesterFilter = document.getElementById('semesterFilter');
    
    console.log('Program filter:', {
        exists: !!programFilter,
        value: programFilter?.value,
        options: programFilter ? Array.from(programFilter.options).map(opt => opt.value) : 'N/A'
    });
    
    console.log('Year level filter:', {
        exists: !!yearLevelFilter,
        value: yearLevelFilter?.value,
        options: yearLevelFilter ? Array.from(yearLevelFilter.options).map(opt => opt.value) : 'N/A'
    });
    
    console.log('Semester filter:', {
        exists: !!semesterFilter,
        value: semesterFilter?.value,
        options: semesterFilter ? Array.from(semesterFilter.options).map(opt => opt.value) : 'N/A'
    });
}

// Call this in console to debug: testFilters()