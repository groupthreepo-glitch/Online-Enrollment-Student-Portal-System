// Programs Management Frontend
let programsData = [];
let editingProgram = null;

// DOM Elements
const programsTable = document.getElementById('programsTable');
const programForm = document.getElementById('programForm');
const addProgramBtn = document.getElementById('addProgramBtn');
const searchInput = document.getElementById('searchPrograms');
const sortSelect = document.getElementById('sortPrograms');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadPrograms();
    initializeEventListeners();
});

// Event Listeners
function initializeEventListeners() {
    if (addProgramBtn) {
        addProgramBtn.addEventListener('click', showAddProgramModal);
    }
    
    if (programForm) {
        programForm.addEventListener('submit', handleProgramSubmit);
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    
    if (sortSelect) {
        sortSelect.addEventListener('change', handleSort);
    }
}

// Load Programs
async function loadPrograms() {
    try {
        const response = await fetch('/api/programs');
        const result = await response.json();
        
        if (result.success) {
            programsData = result.data;
            renderProgramsTable();
        } else {
            showNotification('Error loading programs: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading programs:', error);
        showNotification('Error loading programs', 'error');
    }
}

// Render Programs Table
function renderProgramsTable(data = programsData) {
    if (!programsTable) return;
    
    const tbody = programsTable.querySelector('tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No programs found</td></tr>';
        return;
    }
    
    data.forEach(program => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${program.program_name}</td>
            <td>${program.description || '-'}</td>
            <td>${formatDate(program.created_at)}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editProgram(${program.id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteProgram(${program.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Format Date
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Show Add Program Modal
function showAddProgramModal() {
    editingProgram = null;
    resetProgramForm();
    const modal = document.getElementById('programModal');
    if (modal) {
        modal.style.display = 'block';
        document.getElementById('programModalTitle').textContent = 'Add New Program';
    }
}

// Show Edit Program Modal
function editProgram(id) {
    const program = programsData.find(p => p.id === id);
    if (!program) return;
    
    editingProgram = program;
    populateProgramForm(program);
    const modal = document.getElementById('programModal');
    if (modal) {
        modal.style.display = 'block';
        document.getElementById('programModalTitle').textContent = 'Edit Program';
    }
}

// Populate Program Form
function populateProgramForm(program) {
    if (!programForm) return;
    
    const elements = programForm.elements;
    elements.program_name.value = program.program_name || '';
    elements.description.value = program.description || '';
}

// Reset Program Form
function resetProgramForm() {
    if (!programForm) return;
    programForm.reset();
}

// Handle Program Form Submit
async function handleProgramSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(programForm);
    const data = {
        program_name: formData.get('program_name').trim(),
        description: formData.get('description').trim()
    };
    
    // Validation
    if (!data.program_name) {
        showNotification('Program name is required', 'error');
        return;
    }
    
    try {
        let response;
        if (editingProgram) {
            response = await fetch(`/api/programs/${editingProgram.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
        } else {
            response = await fetch('/api/programs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
        }
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(result.message, 'success');
            closeProgramModal();
            loadPrograms(); // Reload data
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        console.error('Error saving program:', error);
        showNotification('Error saving program', 'error');
    }
}

// Delete Program
async function deleteProgram(id) {
    if (!confirm('Are you sure you want to delete this program? This action cannot be undone.')) return;
    
    try {
        const response = await fetch(`/api/programs/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(result.message, 'success');
            loadPrograms(); // Reload data
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting program:', error);
        showNotification('Error deleting program', 'error');
    }
}

// Close Program Modal
function closeProgramModal() {
    const modal = document.getElementById('programModal');
    if (modal) {
        modal.style.display = 'none';
    }
    resetProgramForm();
    editingProgram = null;
}

// Handle Search
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const filteredData = programsData.filter(program => 
        program.program_name.toLowerCase().includes(searchTerm) ||
        (program.description && program.description.toLowerCase().includes(searchTerm))
    );
    renderProgramsTable(filteredData);
}

// Handle Sort
function handleSort(e) {
    const sortBy = e.target.value;
    let sortedData = [...programsData];
    
    switch (sortBy) {
        case 'program_name':
            sortedData.sort((a, b) => a.program_name.localeCompare(b.program_name));
            break;
        case 'program_name_desc':
            sortedData.sort((a, b) => b.program_name.localeCompare(a.program_name));
            break;
        case 'created_at':
            sortedData.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            break;
        case 'created_at_desc':
            sortedData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
        default:
            sortedData = programsData;
    }
    
    renderProgramsTable(sortedData);
}

// Show Notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Export function for other modules
window.getAllPrograms = function() {
    return programsData;
};

// Export function for student enrollment
window.getProgramById = function(id) {
    return programsData.find(p => p.id == id);
};

// Modal event listeners
document.addEventListener('click', function(e) {
    const modal = document.getElementById('programModal');
    if (e.target === modal) {
        closeProgramModal();
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeProgramModal();
    }
});

// Bulk operations
function selectAllPrograms() {
    const checkboxes = document.querySelectorAll('.program-checkbox');
    const selectAllCheckbox = document.getElementById('selectAllPrograms');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
}

function getSelectedPrograms() {
    const checkboxes = document.querySelectorAll('.program-checkbox:checked');
    return Array.from(checkboxes).map(checkbox => parseInt(checkbox.value));
}

async function bulkDeletePrograms() {
    const selectedIds = getSelectedPrograms();
    
    if (selectedIds.length === 0) {
        showNotification('Please select programs to delete', 'warning');
        return;
    }
    
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} program(s)?`)) return;
    
    try {
        const promises = selectedIds.map(id => 
            fetch(`/api/programs/${id}`, { method: 'DELETE' })
        );
        
        const responses = await Promise.all(promises);
        const results = await Promise.all(responses.map(r => r.json()));
        
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        if (successful > 0) {
            showNotification(`${successful} program(s) deleted successfully`, 'success');
        }
        if (failed > 0) {
            showNotification(`${failed} program(s) could not be deleted`, 'error');
        }
        
        loadPrograms(); // Reload data
    } catch (error) {
        console.error('Error in bulk delete:', error);
        showNotification('Error deleting programs', 'error');
    }
}

// Export to CSV
function exportProgramsToCSV() {
    if (programsData.length === 0) {
        showNotification('No data to export', 'warning');
        return;
    }
    
    const headers = ['Program Name', 'Description', 'Created At'];
    const csvContent = [
        headers.join(','),
        ...programsData.map(program => [
            `"${program.program_name}"`,
            `"${program.description || ''}"`,
            `"${formatDate(program.created_at)}"`
        ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `programs_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    showNotification('Programs exported successfully', 'success');
}