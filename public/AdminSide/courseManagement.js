// File: AdminSide/courseManagement.js
// Description: Complete Course Management JavaScript file

class CourseManagement {
    constructor() {
        this.currentProgram = null;
        this.currentYearLevel = '1st Year';
        this.currentSemester = '1st Term';
        this.init();
    }

    init() {
    console.log('🚀 Initializing Course Management...');
    
    // First, bind event listeners
    this.bindEventListeners();
    
    // Then load programs with a delay to ensure DOM is ready
    setTimeout(() => {
        this.loadPrograms();
    }, 500); // Increased delay
    
    console.log('✅ Course Management initialized');
}

    bindEventListeners() {
    console.log('🔗 Binding event listeners...');
    
    // Program selection - Use event delegation for dynamically created cards
    document.addEventListener('click', (e) => {
        const programCard = e.target.closest('.program-card');
        if (programCard) {
            const programId = programCard.dataset.programId;
            const programName = programCard.dataset.programName;
            console.log('🖱️ Program card clicked via delegation:', { programId, programName });
            this.selectProgram(programId, programName);
        }
    });

    // Year level dropdown - Check if element exists first
    const yearSelect = document.querySelector('#yearSelect');
    if (yearSelect) {
        yearSelect.addEventListener('change', (e) => {
            console.log('📅 Year level changed to:', e.target.value);
            this.currentYearLevel = e.target.value;
            this.updateCurriculumDetails();
            this.loadCurriculum();
        });
        console.log('✅ Year select listener bound');
    } else {
        console.warn('⚠️ Year select element not found, will try again later');
        // Retry binding this specific listener after a delay
        setTimeout(() => {
            const retryYearSelect = document.querySelector('#yearSelect');
            if (retryYearSelect) {
                retryYearSelect.addEventListener('change', (e) => {
                    console.log('📅 Year level changed to:', e.target.value);
                    this.currentYearLevel = e.target.value;
                    this.updateCurriculumDetails();
                    this.loadCurriculum();
                });
                console.log('✅ Year select listener bound (retry)');
            }
        }, 1000);
    }

    // Semester dropdown - Check if element exists first
    const termSelect = document.querySelector('#termSelect');
    if (termSelect) {
        termSelect.addEventListener('change', (e) => {
            console.log('📆 Semester changed to:', e.target.value);
            this.currentSemester = e.target.value;
            this.updateCurriculumDetails();
            this.loadCurriculum();
        });
        console.log('✅ Term select listener bound');
    } else {
        console.warn('⚠️ Term select element not found, will try again later');
        // Retry binding this specific listener after a delay
        setTimeout(() => {
            const retryTermSelect = document.querySelector('#termSelect');
            if (retryTermSelect) {
                retryTermSelect.addEventListener('change', (e) => {
                    console.log('📆 Semester changed to:', e.target.value);
                    this.currentSemester = e.target.value;
                    this.updateCurriculumDetails();
                    this.loadCurriculum();
                });
                console.log('✅ Term select listener bound (retry)');
            }
        }, 1000);
    }

    // Add Subject button - REPLACE EXISTING CODE
const addSubjectBtn = document.querySelector('.action-btn.btn-primary');
if (addSubjectBtn) {
    addSubjectBtn.addEventListener('click', () => {
        console.log('🔘 Add Subject button clicked');
        if (window.courseManagement && window.courseManagement.currentProgram) {
            console.log('📋 Opening add subject modal for program:', window.courseManagement.currentProgram.name);
            if (typeof openModal === 'function') {
                openModal('addSubjectModal');
            } else if (typeof window.openModal === 'function') {
                window.openModal('addSubjectModal');
            } else {
                console.error('❌ openModal function not found');
                alert('Modal system not ready. Please refresh the page.');
            }
        } else {
            alert('Please select a program first');
        }
    });
    console.log('✅ Add Subject button listener bound');
} else {
    console.warn('⚠️ Add Subject button not found');
}

// Edit Curriculum button  
const editCurriculumBtn = document.querySelectorAll('.action-btn.btn-secondary')[0]; // First secondary button
if (editCurriculumBtn) {
    editCurriculumBtn.addEventListener('click', () => this.toggleEditMode());
    console.log('✅ Edit Curriculum button listener bound');
}

// Save Changes button
const saveChangesBtn = document.querySelector('.action-btn.btn-success');
if (saveChangesBtn) {
    saveChangesBtn.addEventListener('click', () => this.saveChanges());
    console.log('✅ Save Changes button listener bound');
}

// Generate Report button
const generateReportBtn = document.querySelectorAll('.action-btn.btn-secondary')[1]; // Second secondary button
if (generateReportBtn) {
    generateReportBtn.addEventListener('click', () => generateReport());
    console.log('✅ Generate Report button listener bound');
}
    
    console.log('✅ Event listeners binding completed');
}

    // ADD THESE NEW METHODS TO YOUR CourseManagement CLASS

toggleEditMode() {
    // Toggle edit mode functionality
    this.showNotification('Edit mode toggled - curriculum editing enabled', 'info');
}

saveChanges() {
    if (!this.currentProgram) {
        this.showNotification('No program selected to save changes', 'warning');
        return;
    }
    
    this.showNotification('Changes saved successfully!', 'success');
}

// ADD this method to CourseManagement class

async getProgram(programId) {
    try {
        const response = await fetch('/api/programs');
        const result = await response.json();
        if (result.success && result.data) {
            return result.data.find(p => p.id == programId);
        }
        return null;
    } catch (error) {
        console.error('Error fetching program:', error);
        return null;
    }
}

async loadPrograms() {
    try {
        console.log('📚 Loading programs from database...');
        
        const response = await fetch('/api/programs');
        console.log('📡 Programs response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('📊 Programs result:', result);

        if (result.success && result.data && Array.isArray(result.data) && result.data.length > 0) {
            console.log('✅ Programs loaded successfully:', result.data.length, 'programs');
            this.renderPrograms(result.data);
            
            // AUTO-SELECT FIRST PROGRAM if none selected
            if (!this.currentProgram && result.data.length > 0) {
                setTimeout(() => {
                    const firstProgram = result.data[0];
                    console.log('🎯 Auto-selecting first program:', firstProgram);
                    this.selectProgram(firstProgram.id, firstProgram.program_name);
                }, 100);
            }
        } else {
            console.error('❌ No programs found or invalid data structure:', result);
            this.showNotification('No programs found in database. Please add programs first.', 'warning');
            this.renderPrograms([]);
        }
    } catch (error) {
        console.error('❌ Error loading programs:', error);
        this.showNotification('Error loading programs: ' + error.message, 'error');
        this.renderPrograms([]);
    }
}

// 4. FIXED loadCurriculum method with exact database value mapping
async loadCurriculum() {
    if (!this.currentProgram) {
        console.log('⚠️ No program selected, showing selection message');
        const tableBody = document.querySelector('#subjectsTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center" style="padding: 30px; color: #666;">
                        <div style="padding: 20px; background: #e3f2fd; border-radius: 8px; margin: 10px;">
                            <h5 style="color: #1976d2;">👈 Select a Program</h5>
                            <p>Please select a program from the left panel to view its curriculum.</p>
                        </div>
                    </td>
                </tr>
            `;
        }
        return;
    }

    try {
        // CRITICAL FIX: Ensure exact parameter format and proper encoding
const params = new URLSearchParams();
params.append('program_id', this.currentProgram.id.toString());
params.append('year_level', this.currentYearLevel.trim()); 
params.append('semester', this.currentSemester.trim());

const url = `/api/curriculum?${params.toString()}`;
console.log('🔄 Loading curriculum with exact parameters:', {
    url: url,
    program_id: this.currentProgram.id,
    program_name: this.currentProgram.name,
    year_level: `"${this.currentYearLevel.trim()}"`,
    semester: `"${this.currentSemester.trim()}"`,
    year_level_length: this.currentYearLevel.trim().length,
    semester_length: this.currentSemester.trim().length
});

        const response = await fetch(url);
        console.log('📡 Curriculum response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('📚 Curriculum API result:', result);

        if (result.success) {
            console.log('✅ Curriculum loaded:', result.data.length, 'subjects for', this.currentYearLevel, '-', this.currentSemester);
            this.renderCurriculum(result.data);
            this.loadUnitsCount();
        } else {
            console.error('❌ Curriculum request failed:', result.message);
            this.showNotification('Failed to load curriculum: ' + (result.message || 'Unknown error'), 'error');
            this.renderCurriculum([]);
        }
    } catch (error) {
        console.error('❌ Error loading curriculum:', error);
        this.showNotification('Error loading curriculum: ' + error.message, 'error');
        this.renderCurriculum([]);
    }
}

// ADD this line at the end of the selectProgram method, just before setTimeout
selectProgram(programId, programName) {
    console.log('🎯 Selecting program:', { programId, programName });
    
    // Remove active class from all cards
    document.querySelectorAll('.program-card').forEach(card => {
        card.classList.remove('active');
    });
    
    // Add active class to selected card
    const selectedCard = document.querySelector(`[data-program-id="${programId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('active');
        console.log('✅ Active class added to selected card');
    } else {
        console.warn('⚠️ Selected card not found for program ID:', programId);
    }
    
    // Store current program with both id and name
    this.currentProgram = {
        id: programId,
        name: programName
    };
    
    console.log('✅ Program selected:', this.currentProgram);
    
    // UPDATE CURRICULUM TITLE - ADD THIS LINE
    const curriculumTitle = document.querySelector('#curriculumTitle');
    if (curriculumTitle) {
        curriculumTitle.textContent = programName;
    }
    
    // Update UI immediately
    this.updateCurriculumDetails();
    
    // Load curriculum with a small delay to ensure UI updates
    setTimeout(() => {
        this.loadCurriculum();
        this.loadUnitsCount();
    }, 100);
}

    // 3. FIXED renderPrograms method
    renderPrograms(programs) {
    const programsContainer = document.querySelector('.program-cards');
    if (!programsContainer) {
        console.error('❌ Programs container (.program-cards) not found in DOM');
        return;
    }

    console.log('🎨 Rendering', programs.length, 'programs');
    programsContainer.innerHTML = '';
    
    if (programs.length === 0) {
        programsContainer.innerHTML = `
            <div class="no-programs" style="text-align: center; padding: 40px; color: #666; background: #f8f9fa; border-radius: 8px;">
                <h4>No Programs Found</h4>
                <p>No programs are available in the database.</p>
                <button onclick="window.courseManagement.loadPrograms()" class="btn btn-primary btn-sm">Reload Programs</button>
            </div>
        `;
        return;
    }
    
    programs.forEach((program) => {
        const programCard = document.createElement('div');
        programCard.className = 'program-card';
        programCard.dataset.programId = program.id;
        programCard.dataset.programName = program.description; // Use description instead of program_name
        
        // Use the short program_name for display
        const abbreviation = program.program_name; // This is already BSIT, BSCS, etc.
            
        programCard.innerHTML = `
            <div class="program-code">${abbreviation}</div>
            <div class="program-name">${program.description}</div>
        `;
        
        programCard.addEventListener('click', () => {
            console.log('🖱️ Program card clicked:', program.description);
            this.selectProgram(program.id, program.description); // Pass description as name
        });
        
        programsContainer.appendChild(programCard);
        console.log('✅ Added program card:', abbreviation, '-', program.description);
    });

    console.log('✅ Programs rendered successfully');
}


    updateCurriculumDetails() {
        const curriculumDetails = document.querySelector('#curriculumDetails');
        if (curriculumDetails) {
            curriculumDetails.textContent = `${this.currentYearLevel} - ${this.currentSemester}`;
        }
    }

    
    // 5. FIXED renderCurriculum method with better empty state
renderCurriculum(subjects) {
    const tableBody = document.querySelector('#subjectsTableBody');
    if (!tableBody) {
        console.error('❌ Subjects table body (#subjectsTableBody) not found');
        this.showNotification('UI Error: Subjects table not found', 'error');
        return;
    }

    console.log('🎨 Rendering curriculum with', subjects.length, 'subjects');
    
    tableBody.innerHTML = '';

    if (subjects.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="9" class="text-center" style="padding: 30px; color: #666;">
                <div style="padding: 20px; background: #f8f9fa; border-radius: 8px; margin: 10px;">
                    <h5 style="margin-bottom: 10px; color: #495057;">No Subjects Found</h5>
                    <p style="margin-bottom: 5px;">
                        No curriculum data found for:<br>
                        <strong>${this.currentProgram?.name || 'Selected Program'}</strong><br>
                        <strong>${this.currentYearLevel} - ${this.currentSemester}</strong>
                    </p>
                    <small style="color: #6c757d;">
                        Try selecting a different year level or semester, or add subjects using the "Add Subject" button.
                    </small>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
        return;
    }

    subjects.forEach(subject => {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid #dee2e6';
        row.innerHTML = `
            <td style="padding: 12px; font-weight: 500;">${subject.subject_code || 'N/A'}</td>
            <td style="padding: 12px;">${subject.subject_name || 'N/A'}</td>
            <td style="padding: 12px; text-align: center;">${subject.section || '-'}</td>
            <td style="padding: 12px; text-align: center; font-weight: 500;">
                <span class="units-badge">${subject.units || 0}</span>
            </td>
            <td style="padding: 12px; color: #6c757d;">${subject.prerequisite || '-'}</td>
            <td style="padding: 12px;">
                <div class="schedule-display">${subject.schedule || '-'}</div>
            </td>
            <td style="padding: 12px; color: #6c757d;">${subject.instructor || '-'}</td>
            <td style="padding: 12px; color: #6c757d;">${subject.room || '-'}</td>
            <td style="padding: 12px; text-align: center;">
                <button class="table-action-btn btn-edit" onclick="window.courseManagement.editSubject(${subject.id})" title="Edit Subject">
                    ✏️ Edit
                </button>
                <button class="table-action-btn btn-delete" onclick="window.courseManagement.deleteSubject(${subject.id})" title="Delete Subject">
                    🗑️ Delete
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    console.log('✅ Curriculum rendered successfully');
}

    // 6. FIXED loadUnitsCount method
async loadUnitsCount() {
    if (!this.currentProgram) {
        const unitsElement = document.querySelector('#totalUnits');
        if (unitsElement) {
            unitsElement.textContent = '0 Units';
        }
        return;
    }

    try {
        console.log('📊 Loading units count for program:', this.currentProgram.id);
        
        const response = await fetch(`/api/curriculum/units-summary?program_id=${this.currentProgram.id}`);
        const result = await response.json();

        if (result.success && Array.isArray(result.data)) {
            console.log('📈 Units summary:', result.data);
            this.updateUnitsDisplay(result.data);
        } else {
            console.warn('⚠️ Failed to load units summary:', result.message);
        }
    } catch (error) {
        console.error('❌ Error loading units count:', error);
    }
}

    // 7. FIXED updateUnitsDisplay method
updateUnitsDisplay(unitsSummary) {
    const unitsElement = document.querySelector('#totalUnits');
    if (!unitsElement) {
        console.warn('⚠️ Total units element (#totalUnits) not found');
        return;
    }

    const currentSemesterUnits = unitsSummary.find(
        item => item.year_level === this.currentYearLevel && item.semester === this.currentSemester
    );

    const totalUnits = currentSemesterUnits ? currentSemesterUnits.total_units : 0;
    unitsElement.textContent = `${totalUnits} Units`;
    
    console.log('📊 Units display updated:', `${totalUnits} Units`);
}

    showAddSubjectModal() {
        if (!this.currentProgram) {
            this.showNotification('Please select a program first', 'warning');
            return;
        }

        // For now, just show an alert. You can implement modal later
        this.showNotification('Add Subject feature - to be implemented with modal', 'info');
    }

    // Add this method to your CourseManagement class
async addSubject() {
    if (!this.currentProgram) {
        this.showNotification('Please select a program first', 'warning');
        return;
    }

    try {
        // Get form data from the Add Subject modal
        const subjectCode = document.getElementById('subjectCode')?.value.trim();
        const subjectDescription = document.getElementById('subjectDescription')?.value.trim();
        const subjectUnits = document.getElementById('subjectUnits')?.value.trim();
        const subjectSection = document.getElementById('subjectSection')?.value.trim();
        const subjectPrereq = document.getElementById('subjectPrereq')?.value.trim();
        const subjectSchedule = document.getElementById('subjectSchedule')?.value.trim();
        const subjectInstructor = document.getElementById('subjectInstructor')?.value.trim();
        const subjectRoom = document.getElementById('subjectRoom')?.value.trim();

        // Validation
        if (!subjectCode || !subjectDescription || !subjectUnits) {
            this.showNotification('Subject Code, Description, and Units are required', 'error');
            return;
        }

        if (isNaN(subjectUnits) || subjectUnits <= 0) {
            this.showNotification('Units must be a positive number', 'error');
            return;
        }

        // Prepare data for API
        const subjectData = {
            program_id: this.currentProgram.id,
            year_level: this.currentYearLevel,
            semester: this.currentSemester,
            subject_code: subjectCode,
            subject_name: subjectDescription,
            units: parseInt(subjectUnits),
            section: subjectSection || null,
            prerequisite: subjectPrereq || null,
            schedule: subjectSchedule || null,
            instructor: subjectInstructor || null,
            room: subjectRoom || null
        };

        console.log('📝 Adding new subject:', subjectData);

        // Send POST request to add subject
        const response = await fetch('/api/curriculum', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(subjectData)
        });

        const result = await response.json();

        if (result.success) {
            this.showNotification('Subject added successfully!', 'success');
            
            // Clear form
            document.getElementById('addSubjectForm').reset();
            
            // Close modal
            closeModal('addSubjectModal');
            
            // Reload curriculum and units
            this.loadCurriculum();
            this.loadUnitsCount();
        } else {
            this.showNotification('Failed to add subject: ' + (result.message || 'Unknown error'), 'error');
        }

    } catch (error) {
        console.error('❌ Error adding subject:', error);
        this.showNotification('Error adding subject: ' + error.message, 'error');
    }
}

// REPLACE the existing updateSubject() method with this:
async updateSubject() {
    try {
        console.log('🔄 updateSubject called');

        // Get form data INCLUDING hidden fields and new fields
        const subjectId = document.getElementById('editSubjectId')?.value;
        const programId = document.getElementById('editProgramId')?.value;
        const yearLevel = document.getElementById('editYearLevel')?.value;
        const semester = document.getElementById('editSemester')?.value;
        const subjectCode = document.getElementById('editSubjectCode')?.value.trim();
        const subjectDescription = document.getElementById('editSubjectDescription')?.value.trim();
        const subjectUnits = document.getElementById('editSubjectUnits')?.value.trim();
        const subjectSection = document.getElementById('editSubjectSection')?.value.trim();
        const subjectPrereq = document.getElementById('editSubjectPrereq')?.value.trim();
        const subjectSchedule = document.getElementById('editSubjectSchedule')?.value.trim();
        const subjectInstructor = document.getElementById('editSubjectInstructor')?.value.trim();
        const subjectRoom = document.getElementById('editSubjectRoom')?.value.trim();

        console.log('📝 Complete form data extracted:', {
            subjectId, programId, yearLevel, semester, subjectCode, subjectDescription, subjectUnits, subjectInstructor, subjectRoom
        });

        // Enhanced validation
        if (!subjectId || !programId || !yearLevel || !semester || !subjectCode || !subjectDescription || !subjectUnits) {
            this.showNotification('All required fields must be filled (including context)', 'error');
            console.error('❌ Missing required fields:', { subjectId, programId, yearLevel, semester });
            return;
        }

        // Get program details
        const programResponse = await fetch('/api/programs');
        const programsResult = await programResponse.json();
        const program = programsResult.data.find(p => p.id == programId);
        
        if (!program) {
            this.showNotification('Program not found', 'error');
            return;
        }

        // Prepare complete data with program code
        const subjectData = {
            program_id: program.program_name,        // Use program code (BSCS, BSIT, etc.)
            year_level: yearLevel,                   // From hidden field
            semester: semester,                      // From hidden field  
            subject_code: subjectCode,
            subject_name: subjectDescription,
            units: parseInt(subjectUnits),
            section: subjectSection || null,
            prerequisite: subjectPrereq === '-' ? null : subjectPrereq || null,
            schedule: subjectSchedule || null,
            instructor: subjectInstructor || null,
            room: subjectRoom || null
        };

        console.log('📤 Sending complete update data:', subjectData);

        // Send PUT request
        const updateResponse = await fetch(`/api/curriculum/${subjectId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(subjectData)
        });

        const result = await updateResponse.json();
        console.log('📥 Server response:', result);

        if (result.success) {
            this.showNotification('Subject updated successfully!', 'success');
            closeModal('editSubjectModal');
            this.loadCurriculum();
            this.loadUnitsCount();
        } else {
            this.showNotification('Failed to update subject: ' + (result.message || 'Unknown error'), 'error');
        }

    } catch (error) {
        console.error('❌ Error updating subject:', error);
        this.showNotification('Error updating subject: ' + error.message, 'error');
    }
}

    async editSubject(subjectId) {
    try {
        console.log('✏️ Loading subject data for editing:', subjectId);
        console.log('📍 Current context:', {
            currentProgram: this.currentProgram,
            currentYearLevel: this.currentYearLevel,
            currentSemester: this.currentSemester
        });
        
        // Get current curriculum data
        const params = new URLSearchParams({
            program_id: this.currentProgram.id,
            year_level: this.currentYearLevel,
            semester: this.currentSemester
        });
        
        const response = await fetch(`/api/curriculum?${params}`);
        const result = await response.json();

        if (result.success) {
            const subject = result.data.find(s => s.id === subjectId);
            if (subject) {
                // Populate ALL form fields including hidden ones
                document.getElementById('editSubjectId').value = subject.id;
                document.getElementById('editSubjectCode').value = subject.subject_code || '';
                document.getElementById('editSubjectDescription').value = subject.subject_name || '';
                document.getElementById('editSubjectUnits').value = subject.units || '';
                document.getElementById('editSubjectSection').value = subject.section || '';
                document.getElementById('editSubjectPrereq').value = subject.prerequisite || '';
                document.getElementById('editSubjectSchedule').value = subject.schedule || '';
                document.getElementById('editSubjectInstructor').value = subject.instructor || '';
                document.getElementById('editSubjectRoom').value = subject.room || '';
                
                // CRITICAL: Populate hidden fields with current context
                document.getElementById('editProgramId').value = this.currentProgram.id;
                document.getElementById('editYearLevel').value = this.currentYearLevel;
                document.getElementById('editSemester').value = this.currentSemester;
                
                console.log('✅ Edit form populated with context:', {
                    subjectId: subject.id,
                    programId: this.currentProgram.id,
                    yearLevel: this.currentYearLevel,
                    semester: this.currentSemester
                });
                
                // Open the edit modal
                openModal('editSubjectModal');
                
            } else {
                this.showNotification('Subject not found', 'error');
            }
        } else {
            this.showNotification('Failed to load subject data: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading subject data:', error);
        this.showNotification('Error loading subject data: ' + error.message, 'error');
    }
}


// Add this method to your CourseManagement class
async deleteSubject(subjectId) {
    if (!confirm('Are you sure you want to delete this subject? This action cannot be undone.')) {
        return;
    }

    try {
        console.log('🗑️ Deleting subject:', subjectId);
        
        const response = await fetch(`/api/curriculum/${subjectId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const result = await response.json();

        if (result.success) {
            this.showNotification('Subject deleted successfully!', 'success');
            // Reload curriculum and units count
            this.loadCurriculum();
            this.loadUnitsCount();
        } else {
            this.showNotification('Failed to delete subject: ' + (result.message || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('❌ Error deleting subject:', error);
        this.showNotification('Error deleting subject: ' + error.message, 'error');
    }
}

    // 8. ADD this debugging method to your class
async debugCurrentState() {
    console.log('🔧 Current CourseManagement State:');
    console.log('- Current Program:', this.currentProgram);
    console.log('- Current Year Level:', this.currentYearLevel);
    console.log('- Current Semester:', this.currentSemester);
    
    // Test API calls
    if (this.currentProgram) {
        const params = new URLSearchParams({
            program_id: this.currentProgram.id,
            year_level: this.currentYearLevel,
            semester: this.currentSemester
        });
        
        const response = await fetch(`/api/curriculum?${params}`);
        const result = await response.json();
        console.log('- API Response:', result);
    }
    
    return this.currentProgram;
}

    

    filterSubjects(searchTerm) {
        const rows = document.querySelectorAll('#subjectsTableBody tr');
        
        rows.forEach(row => {
            if (row.cells.length < 6) return; // Skip empty state row
            
            const subjectCode = row.cells[0].textContent.toLowerCase();
            const subjectName = row.cells[1].textContent.toLowerCase();
            const searchLower = searchTerm.toLowerCase();
            
            if (subjectCode.includes(searchLower) || subjectName.includes(searchLower)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    toggleEditMode() {
        this.showNotification('Edit mode toggle - to be implemented', 'info');
    }

    saveChanges() {
        this.showNotification('Save changes - to be implemented', 'info');
    }

   showNotification(message, type = 'info') {
    console.log(`${type.toUpperCase()}: ${message}`);
    
    const notificationColors = {
        'error': '#dc3545',
        'success': '#28a745', 
        'warning': '#ffc107',
        'info': '#17a2b8'
    };

    const textColors = {
        'error': '#fff',
        'success': '#fff',
        'warning': '#000',
        'info': '#fff'
    };

    // Remove existing notifications
    document.querySelectorAll('.course-notification').forEach(n => n.remove());

    const toast = document.createElement('div');
    toast.className = 'course-notification';
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${notificationColors[type] || '#333'};
        color: ${textColors[type] || '#fff'};
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 9999;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        max-width: 400px;
        word-wrap: break-word;
    `;
    
    const icon = {
        'error': '❌',
        'success': '✅',
        'warning': '⚠️',
        'info': 'ℹ️'
    };
    
    toast.innerHTML = `${icon[type] || ''} ${message}`;
    
    document.body.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.parentNode.removeChild(toast), 300);
        }
    }, 5000);
}

// Initialize when DOM is loaded
}

document.addEventListener('DOMContentLoaded', function() {
    window.courseManagement = new CourseManagement();
});

// ADD this to the END of your courseManagement.js file or add as separate script

// Enhanced initialization with better error recovery
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM loaded, initializing Course Management...');
    
    // Wait a bit more for all resources to load
    setTimeout(() => {
        try {
            console.log('🔧 Starting CourseManagement initialization...');
            
            // Check if class exists
            if (typeof CourseManagement === 'undefined') {
                console.error('❌ CourseManagement class not found!');
                return;
            }
            
            // Initialize
            window.courseManagement = new CourseManagement();
            console.log('✅ CourseManagement initialized successfully');
            
            // Add debug functions to window
            window.debugCM = () => window.courseManagement.debugCurrentState();
            window.reloadPrograms = () => window.courseManagement.loadPrograms();
            window.reloadCurriculum = () => window.courseManagement.loadCurriculum();
            
        } catch (error) {
            console.error('❌ CourseManagement initialization failed:', error);
            // Show user-friendly error message
            const errorDiv = document.createElement('div');
            errorDiv.innerHTML = `
                <div style="background: #f8d7da; color: #721c24; padding: 15px; margin: 20px; border-radius: 5px; text-align: center;">
                    <h4>⚠️ Course Management Loading Error</h4>
                    <p>There was an issue loading the course management system. Please refresh the page.</p>
                    <button onclick="location.reload()" style="background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Refresh Page</button>
                </div>
            `;
            document.body.insertBefore(errorDiv, document.body.firstChild);
        }
    }, 1000); // Increased delay to 1 second
});

function initializeCourseManagement() {
    try {
        console.log('🔧 Starting CourseManagement initialization...');
        
        // Check if class exists
        if (typeof CourseManagement === 'undefined') {
            console.error('❌ CourseManagement class not found!');
            setTimeout(initializeCourseManagement, 1000);
            return;
        }
        
        // Initialize
        window.courseManagement = new CourseManagement();
        console.log('✅ CourseManagement initialized successfully');
        
        // Add debug functions to window
        window.debugCM = () => window.courseManagement.debugCurrentState();
        window.reloadPrograms = () => window.courseManagement.loadPrograms();
        window.reloadCurriculum = () => window.courseManagement.loadCurriculum();
        
        console.log('🛠️ Debug functions added to window object');
        
    } catch (error) {
        console.error('❌ CourseManagement initialization failed:', error);
        setTimeout(initializeCourseManagement, 2000);
    }
}



async function testInitialLoad() {
    console.log('🧪 Testing initial data load...');
    
    try {
        // Test programs API
        const programsResponse = await fetch('/api/programs');
        const programsData = await programsResponse.json();
        
        console.log('📊 Programs test:', {
            status: programsResponse.status,
            success: programsData.success,
            count: programsData.data?.length || 0
        });
        
        if (!programsData.success || !programsData.data?.length) {
            showDataWarning('No programs found in database. Please add programs first.');
            return;
        }
        
        // Test curriculum API for first program
        const firstProgram = programsData.data[0];
        const curriculumResponse = await fetch(`/api/curriculum?program_id=${firstProgram.id}&year_level=1st Year&semester=1st Term`);
        const curriculumData = await curriculumResponse.json();
        
        console.log('📚 Curriculum test:', {
            status: curriculumResponse.status,
            success: curriculumData.success,
            count: curriculumData.data?.length || 0
        });
        
        if (curriculumData.success && curriculumData.data?.length > 0) {
            showSuccessMessage(`Course Management loaded successfully! Found ${programsData.data.length} programs and curriculum data.`);
        } else {
            showDataWarning(`Programs loaded (${programsData.data.length}), but no curriculum data found. Add subjects to programs.`);
        }
        
    } catch (error) {
        console.error('❌ Initial load test failed:', error);
        showDataWarning(`Data load test failed: ${error.message}`);
    }
}

function showInitializationError(message) {
    const errorHtml = `
        <div class="initialization-error" style="
            background: #f8d7da; 
            border: 1px solid #f5c6cb; 
            color: #721c24; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px; 
            text-align: center;
        ">
            <h4>⚠️ Course Management Initialization Error</h4>
            <p><strong>${message}</strong></p>
            <p>Please check the browser console for detailed error information.</p>
            <button onclick="initializeCourseManagementWithRecovery()" style="
                background: #dc3545; 
                color: white; 
                border: none; 
                padding: 8px 16px; 
                border-radius: 4px; 
                cursor: pointer;
            ">Retry Initialization</button>
        </div>
    `;
    
    // Try to find a main container to show the error
    const containers = ['.program-cards', '.main-content', '.container', 'main', 'body'];
    for (const container of containers) {
        const element = document.querySelector(container);
        if (element) {
            element.innerHTML = errorHtml;
            break;
        }
    }
}

function showDataWarning(message) {
    console.warn('⚠️', message);
    
    // Show temporary notification
    const notification = document.createElement('div');
    notification.innerHTML = `
        <div style="
            position: fixed; 
            top: 20px; 
            right: 20px; 
            background: #fff3cd; 
            border: 1px solid #ffeaa7; 
            color: #856404; 
            padding: 15px 20px; 
            border-radius: 8px; 
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            z-index: 9999;
            max-width: 400px;
        ">
            <strong>⚠️ Notice:</strong> ${message}
            <button onclick="this.parentElement.parentElement.remove()" style="
                float: right; 
                background: none; 
                border: none; 
                font-size: 18px; 
                cursor: pointer;
                margin-left: 10px;
            ">&times;</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.parentElement.removeChild(notification);
        }
    }, 10000);
}

function showSuccessMessage(message) {
    console.log('✅', message);
    
    const notification = document.createElement('div');
    notification.innerHTML = `
        <div style="
            position: fixed; 
            top: 20px; 
            right: 20px; 
            background: #d4edda; 
            border: 1px solid #c3e6cb; 
            color: #155724; 
            padding: 15px 20px; 
            border-radius: 8px; 
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            z-index: 9999;
            max-width: 400px;
        ">
            <strong>✅ Success:</strong> ${message}
            <button onclick="this.parentElement.parentElement.remove()" style="
                float: right; 
                background: none; 
                border: none; 
                font-size: 18px; 
                cursor: pointer;
                margin-left: 10px;
            ">&times;</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.parentElement.removeChild(notification);
        }
    }, 5000);
}

// Emergency recovery functions
window.emergencyRecovery = {
    reinitialize: initializeCourseManagementWithRecovery,
    checkDOM: () => {
        const elements = {
            'Program Cards': '.program-cards',
            'Subjects Table': '#subjectsTableBody', 
            'Year Select': '#yearSelect',
            'Term Select': '#termSelect',
            'Total Units': '#totalUnits'
        };
        
        console.log('🔍 DOM Elements Status:');
        Object.entries(elements).forEach(([name, selector]) => {
            const exists = !!document.querySelector(selector);
            console.log(`${exists ? '✅' : '❌'} ${name}: ${selector}`);
        });
    },
    testAPI: async () => {
        try {
            const response = await fetch('/api/programs');
            const data = await response.json();
            console.log('API Test Result:', { 
                status: response.status, 
                success: data.success, 
                programCount: data.data?.length || 0 
            });
            return data;
        } catch (error) {
            console.error('API Test Failed:', error);
            return { error: error.message };
        }
    }
};

console.log('🛠️ Course Management recovery tools loaded:');
console.log('- emergencyRecovery.reinitialize() - Retry initialization');
console.log('- emergencyRecovery.checkDOM() - Check DOM elements');
console.log('- emergencyRecovery.testAPI() - Test API connectivity');
console.log('- debugCM() - Debug current state');
console.log('- reloadPrograms() - Reload programs');
console.log('- reloadCurriculum() - Reload curriculum');

// Ensure global access and retry mechanism
window.initializeCourseManagementWithRecovery = function() {
    try {
        if (typeof CourseManagement !== 'undefined') {
            window.courseManagement = new CourseManagement();
            console.log('✅ CourseManagement initialized successfully');
            return true;
        } else {
            console.error('❌ CourseManagement class not found');
            return false;
        }
    } catch (error) {
        console.error('❌ Failed to initialize CourseManagement:', error);
        return false;
    }
};

// Auto-initialize if not already done
if (typeof window !== 'undefined' && !window.courseManagement) {
    // Wait a bit for DOM to be ready
    setTimeout(() => {
        window.initializeCourseManagementWithRecovery();
    }, 500);
}

// Make functions globally accessible for HTML onclick events
window.addSubject = function() {
    if (window.courseManagement) {
        window.courseManagement.addSubject();
    } else {
        console.error('CourseManagement not initialized');
        alert('System not ready. Please refresh the page.');
    }
};

window.updateSubject = function() {
    if (window.courseManagement) {
        window.courseManagement.updateSubject();
    } else {
        console.error('CourseManagement not initialized');
        alert('System not ready. Please refresh the page.');
    }
};

// Make edit/delete functions globally accessible - ADD THIS AT THE END
window.editSubject = function(subjectId) {
    if (window.courseManagement) {
        window.courseManagement.editSubject(subjectId);
    } else {
        console.error('CourseManagement not initialized');
        alert('System not ready. Please refresh the page.');
    }
};

window.deleteSubject = function(subjectId) {
    if (window.courseManagement) {
        window.courseManagement.deleteSubject(subjectId);
    } else {
        console.error('CourseManagement not initialized');
        alert('System not ready. Please refresh the page.');
    }
};