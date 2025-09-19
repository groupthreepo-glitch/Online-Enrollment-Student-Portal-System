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

        // Modal Management Functions - Add to your existing JavaScript

        // Open modal function
        function openModal(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('active');
                document.body.style.overflow = 'hidden'; // Prevent background scroll
            }
        }

        // Close modal function
        function closeModal(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.remove('active');
                document.body.style.overflow = ''; // Restore scroll
                
                // Clear forms when closing
                if (modalId === 'addSubjectModal') {
                    document.getElementById('addSubjectForm').reset();
                } else if (modalId === 'editSubjectModal') {
                    document.getElementById('editSubjectForm').reset();
                }
            }
        }

        // Close modal when clicking overlay
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('modal-overlay')) {
                closeModal(e.target.id);
            }
        });

        // Close modal with Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                const activeModal = document.querySelector('.modal-overlay.active');
                if (activeModal) {
                    closeModal(activeModal.id);
                }
            }
        });

        // Save new subject function
        async function saveNewSubject() {
            const form = document.getElementById('addSubjectForm');
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            if (!window.courseManagement || !window.courseManagement.currentProgram) {
                alert('Please select a program first');
                return;
            }

            const subjectData = {
                subject_code: document.getElementById('subjectCode').value.trim(),
                subject_name: document.getElementById('subjectDescription').value.trim(),
                units: parseInt(document.getElementById('subjectUnits').value),
                section: document.getElementById('subjectSection').value.trim() || '-',
                prerequisite: document.getElementById('subjectPrereq').value.trim() || '-',
                schedule: document.getElementById('subjectSchedule').value.trim() || '-',
                program_id: window.courseManagement.currentProgram.id,
                year_level: window.courseManagement.currentYearLevel,
                semester: window.courseManagement.currentSemester
            };

            try {
                const response = await fetch('/api/curriculum', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(subjectData)
                });

                const result = await response.json();

                if (result.success) {
                    window.courseManagement.showNotification('Subject added successfully!', 'success');
                    closeModal('addSubjectModal');
                    // Reload curriculum and units
                    window.courseManagement.loadCurriculum();
                    window.courseManagement.loadUnitsCount();
                } else {
                    window.courseManagement.showNotification('Failed to add subject: ' + result.message, 'error');
                }
            } catch (error) {
                console.error('Error adding subject:', error);
                window.courseManagement.showNotification('Error adding subject: ' + error.message, 'error');
            }
        }

        // Save edited subject function
        async function saveEditedSubject() {
            const form = document.getElementById('editSubjectForm');
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            const subjectId = document.getElementById('editSubjectId').value;
            const subjectData = {
                subject_code: document.getElementById('editSubjectCode').value.trim(),
                subject_name: document.getElementById('editSubjectDescription').value.trim(),
                units: parseInt(document.getElementById('editSubjectUnits').value),
                section: document.getElementById('editSubjectSection').value.trim() || '-',
                prerequisite: document.getElementById('editSubjectPrereq').value.trim() || '-',
                schedule: document.getElementById('editSubjectSchedule').value.trim() || '-'
            };

            try {
                const response = await fetch(`/api/curriculum/${subjectId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(subjectData)
                });

                const result = await response.json();

                if (result.success) {
                    window.courseManagement.showNotification('Subject updated successfully!', 'success');
                    closeModal('editSubjectModal');
                    // Reload curriculum and units
                    window.courseManagement.loadCurriculum();
                    window.courseManagement.loadUnitsCount();
                } else {
                    window.courseManagement.showNotification('Failed to update subject: ' + result.message, 'error');
                }
            } catch (error) {
                console.error('Error updating subject:', error);
                window.courseManagement.showNotification('Error updating subject: ' + error.message, 'error');
            }
        }

        // Generate report function
        function generateReport() {
            if (!window.courseManagement || !window.courseManagement.currentProgram) {
                alert('Please select a program first');
                return;
            }

            const programName = window.courseManagement.currentProgram.name;
            const yearLevel = window.courseManagement.currentYearLevel;
            const semester = window.courseManagement.currentSemester;
            
            window.courseManagement.showNotification(`Generating report for ${programName} - ${yearLevel} ${semester}...`, 'info');
            
            // You can implement actual report generation here
            setTimeout(() => {
                window.courseManagement.showNotification('Report generated successfully! (Feature to be implemented)', 'success');
            }, 2000);
        }
        