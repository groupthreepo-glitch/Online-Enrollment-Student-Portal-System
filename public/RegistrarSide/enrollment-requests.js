// enrollment-requests.js - Frontend JavaScript for Registrar Enrollment Management

// Global variables
let allEnrollmentRequests = [];
let filteredRequests = [];
let currentFilter = 'all';
let currentEnrollmentId = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Starting initialization...');
    
    // Initialize data first
    setTimeout(async () => {
        await initializeEnrollmentRequests();
        
        // Then setup event listeners after data is loaded
        setTimeout(() => {
            setupEventListenersFixed();
        }, 500);
        
    }, 100);
});

async function initializeEnrollmentRequests() {
    console.log('🚀 Initializing enrollment requests...');
    await loadEnrollmentRequests();
    
    console.log('📊 Initial data loaded:');
    console.log(`Total requests: ${allEnrollmentRequests.length}`);
    allEnrollmentRequests.forEach(req => {
        console.log(`- ${req.student_name}: status="${req.status}"`);
    });
    
    // Set initial filter and apply it
    currentFilter = 'all';
    applyFilter(); // Use only this function
    updateStats();
}

// Load all enrollment requests from database
async function loadEnrollmentRequests() {
    try {
        console.log('📋 Loading enrollment requests...');
        
        const response = await fetch('/api/enrollment/all-requests');
        const result = await response.json();
        
        if (result.success) {
            allEnrollmentRequests = result.data;
            console.log('✅ Loaded', allEnrollmentRequests.length, 'enrollment requests');
            
            // Apply current filter and render
            applyFilter();
        } else {
            console.error('❌ Failed to load enrollment requests:', result.message);
            showNotification('Failed to load enrollment requests', 'error');
        }
    } catch (error) {
        console.error('❌ Error loading enrollment requests:', error);
        showNotification('Error loading enrollment requests', 'error');
    }
}

function setupEventListenersFixed() {
    console.log('Setting up event listeners - FIXED VERSION');
    
    // 1. Setup filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    console.log(`Found ${filterButtons.length} filter buttons`);
    
    filterButtons.forEach((btn) => {
        const filterValue = btn.getAttribute('data-filter');
        console.log(`Setting up filter button: ${filterValue}`);
        
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log(`CLICKED FILTER: ${filterValue}`);
            console.log(`Before - Current filter: ${currentFilter}, Total requests: ${allEnrollmentRequests.length}`);
            
            // Update current filter
            currentFilter = filterValue;
            
            // Update button states
            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            console.log(`After - Current filter: ${currentFilter}`);
            
            // Apply the filter
            applyFilter();
        });
    });
    
    // 2. Setup search
    const searchInput = document.getElementById('enrollment-search');
    if (searchInput) {
        console.log('Setting up search input');
        searchInput.addEventListener('input', function() {
            console.log(`Search changed: ${this.value}`);
            setTimeout(() => applyFilter(), 300);
        });
    }
    
    // 3. Setup export button
    const exportBtn = document.querySelector('.export-btn');
    if (exportBtn) {
        console.log('Setting up export button');
        exportBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Export button clicked');
            exportEnrollmentData();
        });
    }
    
    console.log('Event listeners setup completed');
}

// DESCRIPTION: Add CSS animations for the loading spinner
// ADD this CSS to your HTML head section or existing CSS file
const spinnerStyles = document.createElement('style');
spinnerStyles.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .loading-spinner {
        animation: spin 1s linear infinite;
    }
    
    /* Enhanced filter button styles */
    .filter-btn {
        transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
        position: relative;
        overflow: hidden;
    }
    
    .filter-btn:before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
        transition: left 0.5s;
    }
    
    .filter-btn:hover:before {
        left: 100%;
    }
`;

function applyFilter() {
    console.log(`APPLYING FILTER: ${currentFilter}`);
    console.log(`Total requests available: ${allEnrollmentRequests.length}`);
    
    const searchTerm = document.getElementById('enrollment-search')?.value?.toLowerCase() || '';
    
    filteredRequests = allEnrollmentRequests.filter(request => {
        let matches = false;
        const status = (request.status || 'pending').toLowerCase();
        
        // Filter by status/type
        switch (currentFilter) {
            case 'all':
                matches = true;
                break;
            case 'pending':
                matches = status === 'pending';
                break;
            case 'approved':
                matches = status === 'approved';
                break;
            case 'rejected':
                matches = status === 'rejected';
                break;
            case 'regular':
                matches = !request.student_type || request.student_type === 'regular';
                break;
            case 'irregular':
                matches = request.student_type === 'irregular';
                break;
            case 'with-receipt':
                matches = request.payment_receipt && request.payment_receipt.trim() !== '';
                break;
            case 'no-receipt':
                matches = !request.payment_receipt || request.payment_receipt.trim() === '';
                break;
            case 'recent':
                const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                matches = new Date(request.created_at) >= weekAgo;
                break;
        }
        
        // Apply search filter
        if (matches && searchTerm) {
            const searchFields = [
                request.student_name,
                request.student_id,
                request.program,
                request.student_email,
                request.status
            ].join(' ').toLowerCase();
            
            matches = searchFields.includes(searchTerm);
        }
        
        return matches;
    });
    
    console.log(`Filter result: ${filteredRequests.length} out of ${allEnrollmentRequests.length} requests`);
    console.log(`Filtered requests:`, filteredRequests.map(r => `${r.student_name}(${r.status})`));
    
    // Re-render the list
    renderEnrollmentRequests();
    updateFilteredStats();
}

// DESCRIPTION: New function to show filtered statistics
// ADD this new function to enrollment-requests.js
function updateFilteredStats() {
    const totalShowing = filteredRequests.length;
    const totalAll = allEnrollmentRequests.length;
    
    // Create or update results counter
    let resultsCounter = document.getElementById('results-counter');
    if (!resultsCounter) {
        resultsCounter = document.createElement('div');
        resultsCounter.id = 'results-counter';
        resultsCounter.style.cssText = `
            padding: 8px 16px;
            background: rgba(52, 152, 219, 0.1);
            border: 1px solid rgba(52, 152, 219, 0.2);
            border-radius: 20px;
            color: #3498db;
            font-size: 0.875rem;
            font-weight: 500;
            margin-bottom: 16px;
            text-align: center;
        `;
        
        // Insert before enrollment list
        const enrollmentList = document.getElementById('enrollment-list');
        if (enrollmentList && enrollmentList.parentNode) {
            enrollmentList.parentNode.insertBefore(resultsCounter, enrollmentList);
        }
    }
    
    // Update counter text based on current filter
    const filterText = currentFilter === 'all' ? 'requests' : `${currentFilter} requests`;
    resultsCounter.innerHTML = `
        <i class="fas fa-filter" style="margin-right: 6px;"></i>
        Showing ${totalShowing} of ${totalAll} ${filterText}
    `;
    
    // Hide counter if showing all without search
    const searchTerm = document.getElementById('enrollment-search')?.value || '';
    if (currentFilter === 'all' && searchTerm === '' && totalShowing === totalAll) {
        resultsCounter.style.display = 'none';
    } else {
        resultsCounter.style.display = 'block';
    }
}


// ADD this missing function to handle export functionality
async function exportEnrollmentData() {
    try {
        console.log('📤 Exporting enrollment data...');
        
        // Show loading notification
        showNotification('Preparing export...', 'info');
        
        // Create CSV content
        const headers = [
            'Student ID',
            'Student Name',
            'Program',
            'Year Level',
            'Student Type',
            'Status',
            'Total Fees',
            'Payment Receipt',
            'Submission Date',
            'Remarks'
        ];
        
        const csvRows = [headers.join(',')];
        
        // Use filtered requests for export
        const dataToExport = currentFilter === 'all' ? allEnrollmentRequests : filteredRequests;
        
        dataToExport.forEach(request => {
            const row = [
                request.student_id || '',
                `"${request.student_name || ''}"`,
                request.program || '',
                request.year_level || '',
                request.student_type || 'regular',
                request.status || '',
                `₱${parseFloat(request.total_fees || 0).toLocaleString()}`,
                request.payment_receipt ? 'Yes' : 'No',
                new Date(request.created_at).toLocaleDateString(),
                `"${request.remarks || ''}"`
            ];
            csvRows.push(row.join(','));
        });
        
        // Create and download CSV
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `enrollment_requests_${currentFilter}_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showNotification(`Exported ${dataToExport.length} enrollment records`, 'success');
        }
        
    } catch (error) {
        console.error('❌ Export error:', error);
        showNotification('Failed to export data', 'error');
    }
}

// Render enrollment requests in the UI
function renderEnrollmentRequests() {
    const enrollmentList = document.getElementById('enrollment-list');
    const noEnrollments = document.getElementById('no-enrollments');
    
    if (!enrollmentList) return;
    
    // Clear existing content
    enrollmentList.innerHTML = '';
    
    if (filteredRequests.length === 0) {
        enrollmentList.appendChild(noEnrollments);
        return;
    }
    
    // Hide no enrollments message
    if (noEnrollments) {
        noEnrollments.remove();
    }
    
    // Render each request
    filteredRequests.forEach(request => {
        const requestCard = createEnrollmentCard(request);
        enrollmentList.appendChild(requestCard);
    });

    // DESCRIPTION: Force button visibility after rendering
setTimeout(() => {
    console.log('🔧 Forcing button visibility...');
    
    // Find all enrollment cards
    const cards = document.querySelectorAll('.enrollment-card');
    cards.forEach((card, index) => {
        // Find the last div (button container)
        const lastDiv = card.querySelector('div:last-child');
        if (lastDiv) {
            lastDiv.style.display = 'flex';
            lastDiv.style.justifyContent = 'flex-end';
            lastDiv.style.gap = '8px';
            
            // Force all buttons to be visible
            const buttons = lastDiv.querySelectorAll('button');
            buttons.forEach(btn => {
                btn.style.display = 'inline-block';
                btn.style.visibility = 'visible';
                btn.style.opacity = '1';
                btn.style.position = 'relative';
                btn.style.zIndex = '10';
            });
            
            console.log(`Card ${index + 1}: Fixed ${buttons.length} buttons`);
        }
    });
}, 200);
} // <-- This is the closing brace of the function

// DESCRIPTION: Manual function to check and fix buttons
function forceFixButtons() {
    console.log('🔧 Manually fixing buttons...');
    
    const cards = document.querySelectorAll('.enrollment-card');
    let totalButtons = 0;
    
    cards.forEach((card, cardIndex) => {
        const buttons = card.querySelectorAll('button');
        buttons.forEach((btn, btnIndex) => {
            btn.style.cssText = `
                display: inline-block !important;
                visibility: visible !important;
                opacity: 1 !important;
                padding: 8px 16px !important;
                border: none !important;
                border-radius: 4px !important;
                cursor: pointer !important;
                font-size: 14px !important;
                font-weight: 500 !important;
                color: white !important;
                margin-left: 5px !important;
            `;
            
            // Set background colors based on button text
            if (btn.textContent.includes('View')) {
                btn.style.backgroundColor = '#3498db';
            } else if (btn.textContent.includes('Approve')) {
                btn.style.backgroundColor = '#27ae60';
            } else if (btn.textContent.includes('Reject')) {
                btn.style.backgroundColor = '#e74c3c';
            }
            
            totalButtons++;
        });
    });
    
    console.log(`✅ Fixed ${totalButtons} buttons across ${cards.length} cards`);
}

// REPLACE the existing createEnrollmentCard function with this enhanced version:

function createEnrollmentCard(request) {
    const card = document.createElement('div');
    card.className = `enrollment-card ${request.status}`;
    
    // Minimalist card styling with unique design elements
    card.style.cssText = `
        background: linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%);
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06);
        margin-bottom: 24px;
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
        border: 1px solid rgba(0, 0, 0, 0.04);
        position: relative;
        backdrop-filter: blur(10px);
    `;
    
    // Enhanced hover effect with smooth animation
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-4px) scale(1.01)';
        this.style.boxShadow = '0 16px 48px rgba(0, 0, 0, 0.12)';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) scale(1)';
        this.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.06)';
    });
    
    // Format date and time
    const requestDate = new Date(request.created_at);
    const formattedDate = requestDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
    const formattedTime = requestDate.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    // Parse subjects to get count and total units
    let subjectCount = 0;
    let totalUnits = 0;
    
    try {
        const subjects = JSON.parse(request.subjects || '[]');
        subjectCount = subjects.length;
        totalUnits = subjects.reduce((sum, subject) => sum + (subject.units || 0), 0);
    } catch (e) {
        console.warn('Could not parse subjects for request:', request.id);
    }
    
    // Calculate estimated tuition
    const totalFees = parseFloat(request.total_fees || 0);
    
    // Status configuration with modern color palette
    const statusConfig = {
        pending: { 
            color: '#ff6b35', 
            bg: 'rgba(255, 107, 53, 0.1)', 
            icon: 'fas fa-clock',
            text: 'UNDER REVIEW',
            gradient: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)'
        },
        approved: { 
            color: '#00d2ff', 
            bg: 'rgba(0, 210, 255, 0.1)', 
            icon: 'fas fa-check-circle',
            text: 'APPROVED',
            gradient: 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)'
        },
        rejected: { 
            color: '#ff416c', 
            bg: 'rgba(255, 65, 108, 0.1)', 
            icon: 'fas fa-times-circle',
            text: 'REJECTED',
            gradient: 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)'
        }
    };
    
    const status = statusConfig[request.status] || statusConfig.pending;
    
    card.innerHTML = `
        <!-- Status indicator stripe with gradient -->
        <div class="status-stripe" style="height: 6px; background: ${status.gradient}; position: relative;">
            <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%); animation: shimmer 2s infinite;"></div>
        </div>
        
        <!-- Main card content with clean layout -->
        <div class="card-content" style="padding: 24px;">
            
            <!-- Header section with student info and status -->
            <div class="card-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                <div class="student-section">
                    <div class="student-avatar" style="width: 48px; height: 48px; border-radius: 12px; background: ${status.gradient}; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                        <i class="fas fa-user-graduate" style="color: white; font-size: 20px;"></i>
                    </div>
                    <h3 class="student-name" style="margin: 0 0 4px 0; font-size: 1.25rem; font-weight: 600; color: #1a1a1a; letter-spacing: -0.02em;">
                        ${request.student_name || 'Unknown Student'}
                    </h3>
                    <p class="student-id" style="margin: 0; color: #6b7280; font-size: 0.875rem; font-weight: 500;">
                        ${request.student_id}
                    </p>
                </div>
                
                <div class="status-badge" style="background: ${status.bg}; color: ${status.color}; padding: 8px 16px; border-radius: 24px; font-weight: 600; font-size: 0.75rem; border: 1px solid ${status.color}20; backdrop-filter: blur(10px);">
                    <i class="${status.icon}" style="margin-right: 6px;"></i>
                    ${status.text}
                </div>
            </div>
            
            <!-- Academic info grid -->
            <div class="academic-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 16px; margin-bottom: 24px;">
                <div class="info-item" style="text-align: center; padding: 16px; background: rgba(255,255,255,0.7); border-radius: 12px; border: 1px solid rgba(0,0,0,0.04);">
                    <div style="font-size: 0.75rem; color: #6b7280; font-weight: 500; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">PROGRAM</div>
                    <div style="font-weight: 600; color: #374151; font-size: 0.875rem;">${request.program}</div>
                    <div style="font-size: 0.75rem; color: #9ca3af; margin-top: 2px;">${request.year_level}</div>
                </div>

                <!-- NEW: Student Type Display -->
    <div class="info-item" style="text-align: center; padding: 16px; background: rgba(255,255,255,0.7); border-radius: 12px; border: 1px solid rgba(0,0,0,0.04);">
        <div style="font-size: 0.75rem; color: #6b7280; font-weight: 500; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">STUDENT TYPE</div>
        <div style="font-weight: 600; color: ${request.student_type === 'irregular' ? '#e67e22' : '#3498db'}; font-size: 0.875rem; text-transform: capitalize;">
            ${request.student_type || 'Regular'}
        </div>
        <div style="font-size: 0.75rem; color: #9ca3af; margin-top: 2px;">
            ${request.student_type === 'irregular' ? 'Custom Schedule' : 'Standard Load'}
        </div>
    </div>
                
                <div class="info-item" style="text-align: center; padding: 16px; background: rgba(255,255,255,0.7); border-radius: 12px; border: 1px solid rgba(0,0,0,0.04);">
                    <div style="font-size: 0.75rem; color: #6b7280; font-weight: 500; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">SUBJECTS</div>
                    <div style="font-weight: 700; color: #374151; font-size: 1.25rem;">${subjectCount}</div>
                    <div style="font-size: 0.75rem; color: #9ca3af; margin-top: 2px;">${totalUnits} units</div>
                </div>
                
                <div class="info-item" style="text-align: center; padding: 16px; background: rgba(255,255,255,0.7); border-radius: 12px; border: 1px solid rgba(0,0,0,0.04);">
                    <div style="font-size: 0.75rem; color: #6b7280; font-weight: 500; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">TOTAL FEE</div>
                    <div style="font-weight: 700; color: #10b981; font-size: 1.25rem;">₱${totalFees.toLocaleString()}</div>
                    <div style="font-size: 0.75rem; color: #9ca3af; margin-top: 2px;">${request.semester}</div>
                </div>
                
                <div class="info-item" style="text-align: center; padding: 16px; background: rgba(255,255,255,0.7); border-radius: 12px; border: 1px solid rgba(0,0,0,0.04);">
                    <div style="font-size: 0.75rem; color: #6b7280; font-weight: 500; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">SUBMITTED</div>
                    <div style="font-weight: 600; color: #374151; font-size: 0.875rem;">${formattedDate}</div>
                    <div style="font-size: 0.75rem; color: #9ca3af; margin-top: 2px;">${formattedTime}</div>
                </div>
            </div>
            
            <!-- Payment receipt status -->
            <div class="receipt-status" style="display: flex; align-items: center; justify-content: space-between; padding: 16px; background: ${request.payment_receipt ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; border-radius: 12px; border: 1px solid ${request.payment_receipt ? '#10b98120' : '#ef444420'}; margin-bottom: 24px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 40px; height: 40px; border-radius: 10px; background: ${request.payment_receipt ? '#10b981' : '#ef4444'}; display: flex; align-items: center; justify-content: center;">
                        <i class="fas ${request.payment_receipt ? 'fa-receipt' : 'fa-exclamation-triangle'}" style="color: white; font-size: 16px;"></i>
                    </div>
                    <div>
                        <div style="font-weight: 600; color: #374151; font-size: 0.875rem;">
                            ${request.payment_receipt ? 'Payment Receipt Uploaded' : 'No Payment Receipt'}
                        </div>
                        <div style="font-size: 0.75rem; color: #6b7280; margin-top: 2px;">
                            ${request.payment_receipt ? 'Ready for verification' : 'Student needs to upload proof'}
                        </div>
                    </div>
                </div>
            </div>
            
            ${request.remarks ? `
            <!-- Registrar notes -->
            <div class="remarks-section" style="background: linear-gradient(135deg, #3498db 0%, #3498db 100%); padding: 16px; border-radius: 12px; margin-bottom: 24px; color: white;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <i class="fas fa-sticky-note" style="font-size: 16px; opacity: 0.9;"></i>
                    <span style="font-weight: 600; font-size: 0.875rem;">Registrar Notes</span>
                </div>
                <div style="font-size: 0.875rem; line-height: 1.5; opacity: 0.95;">${request.remarks}</div>
            </div>
            ` : ''}
            
            <!-- Action buttons -->
            <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
    <button onclick="viewEnrollmentDetails(${request.id})" 
            style="padding: 8px 16px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500;">
        👁️ View Details
    </button>
    
    ${request.status === 'pending' ? `
        <button onclick="updateEnrollmentStatus(${request.id}, 'approved')" 
                style="padding: 8px 16px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500;">
            ✓ Approve
        </button>
        <button onclick="updateEnrollmentStatus(${request.id}, 'rejected')" 
                style="padding: 8px 16px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500;">
            ✗ Reject
        </button>
    ` : ''}
    <button onclick="deleteEnrollmentRequest(${request.id}, '${request.student_name || 'Unknown Student'}')" 
            style="padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s;"
            onmouseover="this.style.background='#c82333'; this.style.transform='translateY(-1px)'"
            onmouseout="this.style.background='#dc3545'; this.style.transform='translateY(0)'">
        🗑️ Delete
    </button>
</div>
        </div>
    `;
    
    // Enhanced button hover effects
    const actionButtons = card.querySelectorAll('.action-btn');
    actionButtons.forEach(btn => {
        btn.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = this.style.boxShadow.replace('0.3)', '0.5)');
        });
        
        btn.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = this.style.boxShadow.replace('0.5)', '0.3)');
        });
    });
    
    return card;
}

// DESCRIPTION: Add shimmer animation CSS
// ADD this CSS to the head of your HTML or in a separate CSS file:

const shimmerStyles = document.createElement('style');
shimmerStyles.textContent = `
    @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
    }
    
    .enrollment-card:hover .status-stripe > div {
        animation-duration: 1s;
    }
    
    /* Additional responsive improvements */
    @media (max-width: 768px) {
        .academic-grid {
            grid-template-columns: repeat(2, 1fr) !important;
        }
        
        .action-buttons {
            flex-direction: column;
        }
        
        .action-btn {
            width: 100%;
            justify-content: center;
        }
    }
`;

// Add the styles to document head if not already added
if (!document.getElementById('enrollment-card-styles')) {
    shimmerStyles.id = 'enrollment-card-styles';
    document.head.appendChild(shimmerStyles);
}

// ADD this missing function to enrollment-requests.js
function updateEnrollmentStatusFromModal(status) {
    updateEnrollmentStatus(currentEnrollmentId, status);
}

// ADD this function to check and create modal if needed
function ensureModalExists() {
    if (!document.getElementById('enrollment-modal')) {
        console.log('🔧 Modal not found, creating new modal...');
        createEnrollmentModal();
        return true; // Modal was just created
    }
    return false; // Modal already existed
}

// REPLACE the modal showing part in viewEnrollmentDetails function
async function viewEnrollmentDetails(enrollmentId) {
    try {
        currentEnrollmentId = enrollmentId;
        console.log('👁️ Viewing enrollment details for ID:', enrollmentId);
        
        // Remove existing modal completely
        const existingModal = document.getElementById('enrollment-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create fresh modal
        createEnrollmentModal();
        
        // Wait for DOM to be ready
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const modal = document.getElementById('enrollment-modal');
        if (!modal) {
            throw new Error('Failed to create modal');
        }
        
        // Show modal with proper positioning
        modal.style.display = 'flex';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.zIndex = '99999';
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // FIXED: Use the correct API endpoint - match what's working in your backend
        const response = await fetch(`/api/enrollment/request/${enrollmentId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('authToken') || ''}`
            }
        });
        
        if (!response.ok) {
            // Try alternative endpoint if first fails
            const altResponse = await fetch(`/api/enrollment/all-requests`);
            const altResult = await altResponse.json();
            
            if (altResult.success) {
                // Find the specific request from the all-requests data
                const request = altResult.data.find(r => r.id === enrollmentId);
                if (request) {
                    console.log('✅ Found request data from alternative endpoint');
                    await populateEnrollmentModal(request);
                    return;
                }
            }
            
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'Failed to load enrollment details');
        }
        
        // Get fee breakdown
        let feeBreakdown = null;
        try {
            const request = result.data;
            if (request.student_type === 'irregular') {
                let subjects = [];
                try {
                    subjects = JSON.parse(request.subjects || '[]');
                } catch (e) {
                    console.warn('Could not parse subjects for irregular fee calculation');
                }
                feeBreakdown = await calculateIrregularFees(subjects, request.student_type);
            } else {
                const feesUrl = `/api/enrollment/tuition-fees?program=${encodeURIComponent(request.program)}&yearLevel=${encodeURIComponent(request.year_level)}&term=${encodeURIComponent(request.semester)}&studentType=${request.student_type || 'regular'}`;
                const feesResponse = await fetch(feesUrl);
                if (feesResponse.ok) {
                    const feesResult = await feesResponse.json();
                    if (feesResult.success) {
                        feeBreakdown = feesResult.fees;
                    }
                }
            }
        } catch (feeError) {
            console.warn('⚠️ Could not load fee breakdown:', feeError);
        }
        
        // Wait then populate modal
        setTimeout(() => {
            populateEnrollmentModal(result.data, feeBreakdown);
        }, 500);
        
    } catch (error) {
        console.error('❌ Error viewing enrollment details:', error);
        showNotification(`Failed to load enrollment details: ${error.message}`, 'error');
        closeEnrollmentModal();
    }
}



// REPLACE the existing createEnrollmentModal function with this updated version
function createEnrollmentModal() {
    // Check if modal already exists
    if (document.getElementById('enrollment-modal')) {
        return;
    }
    
    const modalHtml = `
        <div id="enrollment-modal" class="enrollment-modal-wrapper">
            <div class="enrollment-modal-overlay" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; padding: 20px;">
                <div class="enrollment-modal-content" style="background: white; border-radius: 16px; max-width: 900px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                    
                    <!-- Modal Header -->
                    <div class="modal-header" style="padding: 24px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);); color: white; border-radius: 16px 16px 0 0;">
                        <div>
                            <h2 style="margin: 0; font-size: 1.5rem; font-weight: 600;">Enrollment Details</h2>
                            <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 0.875rem;">Review student enrollment information</p>
                        </div>
                        <button onclick="closeEnrollmentModal()" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 40px; height: 40px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px; transition: all 0.2s;">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <!-- Modal Body -->
                    <div class="modal-body" style="padding: 24px;">
                        <div style="text-align: center; padding: 80px 20px;">
                            <div class="loading-spinner" style="
                                width: 50px; 
                                height: 50px; 
                                margin: 0 auto 20px; 
                                border: 4px solid #f3f3f3; 
                                border-top: 4px solid #3498db; 
                                border-radius: 50%; 
                                animation: spin 1s linear infinite;
                            "></div>
                            <p style="color: #6b7280; margin: 0; font-size: 1.1em;">Loading enrollment details...</p>
                        </div>
                    </div>
                    
                    <!-- Modal Footer -->
                    <div class="modal-footer" style="padding: 24px; border-top: 1px solid #e5e7eb; background: #f9fafb; border-radius: 0 0 16px 16px; display: flex; justify-content: space-between; align-items: center;">
                        <button onclick="closeEnrollmentModal()" 
                                style="padding: 10px 20px; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; font-weight: 500;">
                            Close
                        </button>
                        
                        <div style="display: flex; gap: 12px;">
                            <button id="modal-delete-btn" onclick="deleteEnrollmentRequest(currentEnrollmentId)" 
                                    style="padding: 10px 20px; background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                                <i class="fas fa-trash-alt" style="margin-right: 6px;"></i>
                                Delete Request
                            </button>
                            
                            <button id="modal-approve-btn" onclick="updateEnrollmentStatusFromModal('approved')" 
                                    style="padding: 10px 20px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; display: none;">
                                <i class="fas fa-check" style="margin-right: 6px;"></i>
                                Approve Enrollment
                            </button>
                            <button id="modal-reject-btn" onclick="updateEnrollmentStatusFromModal('rejected')" 
                                    style="padding: 10px 20px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; display: none;">
                                <i class="fas fa-times" style="margin-right: 6px;"></i>
                                Reject Enrollment
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to document body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    console.log('✅ Enrollment modal created with unique classes');

    
    // DESCRIPTION: Add these updated modal styles with better visibility
const modalStyles = document.createElement('style');
modalStyles.textContent = `
    #enrollment-modal {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background-color: rgba(0,0,0,0.7) !important;
        z-index: 99999 !important;
        display: none !important;
        overflow-y: auto !important;
    }
    
    #enrollment-modal .modal-overlay {
        width: 100% !important;
        height: 100% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 20px !important;
        box-sizing: border-box !important;
    }
    
    #enrollment-modal .modal-content {
        background: white !important;
        border-radius: 16px !important;
        max-width: 900px !important;
        width: 100% !important;
        max-height: 90vh !important;
        overflow-y: auto !important;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3) !important;
        position: relative !important;
        z-index: 100000 !important;
    }
    
    #enrollment-modal.show {
        display: flex !important;
        animation: fadeIn 0.3s ease-out;
    }
    
    #enrollment-modal.show .modal-content {
        animation: slideIn 0.3s ease-out;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes slideIn {
        from { transform: translateY(-20px) scale(0.95); opacity: 0; }
        to { transform: translateY(0) scale(1); opacity: 1; }
    }
    
    .status-badge {
        padding: 6px 12px;
        border-radius: 20px;
        font-weight: 600;
        font-size: 0.75rem;
        text-transform: uppercase;
    }
    
    .status-badge.status-pending {
        background: rgba(255, 107, 53, 0.1);
        color: #ff6b35;
        border: 1px solid rgba(255, 107, 53, 0.2);
    }
    
    .status-badge.status-approved {
        background: rgba(16, 185, 129, 0.1);
        color: #10b981;
        border: 1px solid rgba(16, 185, 129, 0.2);
    }
    
    .status-badge.status-rejected {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
        border: 1px solid rgba(239, 68, 68, 0.2);
    }
`;

    if (!document.getElementById('modal-styles')) {
        modalStyles.id = 'modal-styles';
        document.head.appendChild(modalStyles);
    }
    
    console.log('✅ Modal created successfully with all required elements');
}



// DESCRIPTION: Enhanced populateEnrollmentModal function with subjects table
// REPLACE the existing populateEnrollmentModal function in enrollment-requests.js

function populateEnrollmentModal(request, feeBreakdown) {
    console.log('📋 Populating modal with data:', request);
    
    // Validate request data
    if (!request) {
        console.error('❌ No request data provided to populate modal');
        showNotification('No enrollment data available', 'error');
        closeEnrollmentModal();
        return;
    }
    
    // Wait a bit more for DOM to be ready
    setTimeout(() => {
        // Check if modal body exists before populating
        const modalBody = document.querySelector('#enrollment-modal .modal-body');
        if (!modalBody) {
            console.error('❌ Modal body not found, recreating modal...');
            createEnrollmentModal();
            
            // Try again after modal recreation
            setTimeout(() => {
                populateEnrollmentModal(request, feeBreakdown);
            }, 500);
            return;
        }
        
        // Parse subjects data for display
        let subjects = [];
        let totalUnits = 0;
        let subjectCount = 0;
        
        try {
            subjects = JSON.parse(request.subjects || '[]');
            subjectCount = subjects.length;
            totalUnits = subjects.reduce((sum, subject) => sum + (subject.units || 0), 0);
        } catch (e) {
            console.warn('Could not parse subjects JSON:', e);
        }
        
        // Clear loading state and populate with comprehensive enrollment details
        modalBody.innerHTML = `
            <!-- Student Information Section -->
            <div class="modal-section" style="margin-bottom: 32px;">
                <div class="section-header" style="display: flex; align-items: center; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #f3f4f6;">
                    <i class="fas fa-user-graduate" style="color: #3498db; margin-right: 8px; font-size: 18px;"></i>
                    <h3 style="margin: 0; font-size: 1.125rem; font-weight: 600; color: #374151;">Student Information</h3>
                </div>
                
                <div class="info-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
                    <div class="info-item">
                        <label style="display: block; font-size: 0.75rem; font-weight: 500; color: #6b7280; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Student ID</label>
                        <span style="font-weight: 600; color: #374151;">${request.student_id || '-'}</span>
                    </div>
                    <div class="info-item">
                        <label style="display: block; font-size: 0.75rem; font-weight: 500; color: #6b7280; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Full Name</label>
                        <span style="font-weight: 600; color: #374151;">${request.student_name || 'Unknown Student'}</span>
                    </div>
                    <div class="info-item">
                        <label style="display: block; font-size: 0.75rem; font-weight: 500; color: #6b7280; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Email</label>
                        <span style="font-weight: 600; color: #374151;">${request.student_email || '-'}</span>
                    </div>
                    <div class="info-item">
                        <label style="display: block; font-size: 0.75rem; font-weight: 500; color: #6b7280; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Contact</label>
                        <span style="font-weight: 600; color: #374151;">${request.phone || '-'}</span>
                    </div>
                </div>
            </div>
            
            <!-- Enrollment Information Section -->
            <div class="modal-section" style="margin-bottom: 32px;">
                <div class="section-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #f3f4f6;">
                    <div style="display: flex; align-items: center;">
                        <i class="fas fa-graduation-cap" style="color: #3498db; margin-right: 8px; font-size: 18px;"></i>
                        <h3 style="margin: 0; font-size: 1.125rem; font-weight: 600; color: #374151;">Enrollment Information</h3>
                    </div>
                    <span class="status-badge status-${request.status || 'pending'}">${(request.status || 'pending').toUpperCase()}</span>
                </div>
                
                <div class="info-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                    <div class="info-item">
                        <label style="display: block; font-size: 0.75rem; font-weight: 500; color: #6b7280; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Program</label>
                        <span style="font-weight: 600; color: #374151;">${request.program || '-'}</span>
                    </div>
                    <div class="info-item">
                        <label style="display: block; font-size: 0.75rem; font-weight: 500; color: #6b7280; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Year Level</label>
                        <span style="font-weight: 600; color: #374151;">${request.year_level || '-'}</span>
                    </div>
                    <div class="info-item">
                        <label style="display: block; font-size: 0.75rem; font-weight: 500; color: #6b7280; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Student Type</label>
                        <span style="font-weight: 600; color: ${request.student_type === 'irregular' ? '#e67e22' : '#3498db'}; text-transform: capitalize;">
                            ${request.student_type || 'Regular'}
                            <br><small style="color: #9ca3af; font-weight: 400; font-size: 0.8em;">
                                ${request.student_type === 'irregular' ? 'Custom subject selection' : 'Standard curriculum'}
                            </small>
                        </span>
                    </div>
                    <div class="info-item">
                        <label style="display: block; font-size: 0.75rem; font-weight: 500; color: #6b7280; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Academic Term</label>
                        <span style="font-weight: 600; color: #374151;">${request.semester || '-'}</span>
                    </div>
                    <div class="info-item">
                        <label style="display: block; font-size: 0.75rem; font-weight: 500; color: #6b7280; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Total Fee</label>
                        <span style="font-weight: 600; color: #27ae60;">₱${parseFloat(request.total_fees || 0).toLocaleString()}</span>
                    </div>
                </div>
            </div>
            
            <!-- Enrolled Subjects Section -->
            <div class="modal-section" style="margin-bottom: 32px;">
                <div class="section-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #f3f4f6;">
                    <div style="display: flex; align-items: center;">
                        <i class="fas fa-book-open" style="color: #e67e22; margin-right: 8px; font-size: 18px;"></i>
                        <h3 style="margin: 0; font-size: 1.125rem; font-weight: 600; color: #374151;">Enrolled Subjects</h3>
                    </div>
                    <div style="display: flex; gap: 16px; font-size: 0.875rem;">
                        <span style="background: rgba(52, 152, 219, 0.1); color: #3498db; padding: 4px 8px; border-radius: 12px; font-weight: 600;">
                            ${subjectCount} Subjects
                        </span>
                        <span style="background: rgba(39, 174, 96, 0.1); color: #27ae60; padding: 4px 8px; border-radius: 12px; font-weight: 600;">
                            ${totalUnits} Units
                        </span>
                    </div>
                </div>
                
                <div style="overflow-x: auto; border-radius: 8px; border: 1px solid #e5e7eb;">
                    ${subjects.length > 0 ? `
                    <table style="width: 100%; border-collapse: collapse; background: white;">
                        <thead>
                            <tr style="background: linear-gradient(135deg, #3498db 0%, #3498db 100%); color: white;">
                                <th style="padding: 12px 8px; text-align: left; font-weight: 600; font-size: 0.875rem;">Subject Code</th>
                                <th style="padding: 12px 8px; text-align: left; font-weight: 600; font-size: 0.875rem;">Description</th>
                                <th style="padding: 12px 8px; text-align: center; font-weight: 600; font-size: 0.875rem;">Section</th>
                                <th style="padding: 12px 8px; text-align: center; font-weight: 600; font-size: 0.875rem;">Units</th>
                                <th style="padding: 12px 8px; text-align: left; font-weight: 600; font-size: 0.875rem;">Prerequisite</th>
                                <th style="padding: 12px 8px; text-align: center; font-weight: 600; font-size: 0.875rem;">Schedule</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${subjects.map((subject, index) => `
                                <tr style="border-bottom: 1px solid #f3f4f6; ${index % 2 === 0 ? 'background: #f9fafb;' : 'background: white;'}">
                                    <td style="padding: 12px 8px; font-weight: 600; color: #3498db; font-size: 0.875rem;">${subject.code || '-'}</td>
                                    <td style="padding: 12px 8px; color: #374151; font-size: 0.875rem; max-width: 250px;">${subject.description || '-'}</td>
                                    <td style="padding: 12px 8px; text-align: center; font-weight: 500; background: rgba(52, 152, 219, 0.1); color: #3498db;">${subject.section || 'A'}</td>
                                    <td style="padding: 12px 8px; text-align: center; font-weight: 600; color: #27ae60; background: rgba(39, 174, 96, 0.1);">${subject.units || 0}</td>
                                    <td style="padding: 12px 8px; color: #6b7280; font-size: 0.875rem; ${(subject.prereq === '-' || !subject.prereq) ? 'font-style: italic;' : ''}">${subject.prereq || '-'}</td>
                                    <td style="padding: 12px 8px; text-align: center; font-size: 0.875rem;">
                                        <div style="color: #e67e22; font-weight: 500; margin-bottom: 2px;">${subject.day || 'TBA'}</div>
                                        <div style="color: #3498db; font-size: 0.8rem;">${subject.time || 'TBA'}</div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-top: 2px solid #dee2e6;">
                                <td colspan="3" style="padding: 12px 8px; font-weight: 700; color: #2c3e50; text-align: right;">TOTAL:</td>
                                <td style="padding: 12px 8px; text-align: center; font-weight: 700; color: #27ae60; font-size: 1.1rem; background: rgba(39, 174, 96, 0.1);">${totalUnits}</td>
                                <td colspan="2" style="padding: 12px 8px; color: #6b7280; font-style: italic;">units enrolled</td>
                            </tr>
                        </tfoot>
                    </table>
                    ` : `
                    <div style="text-align: center; padding: 40px; background: #f8f9fa; color: #6b7280;">
                        <i class="fas fa-book-open" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                        <p style="margin: 0; font-style: italic; font-size: 1.1rem;">No subjects enrolled</p>
                    </div>
                    `}
                </div>
            </div>
            
            <!-- Payment Receipt Section -->
            <div class="modal-section" style="margin-bottom: 32px;">
                <div class="section-header" style="display: flex; align-items: center; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #f3f4f6;">
                    <i class="fas fa-receipt" style="color: #667eea; margin-right: 8px; font-size: 18px;"></i>
                    <h3 style="margin: 0; font-size: 1.125rem; font-weight: 600; color: #374151;">Payment Receipt</h3>
                </div>
                ${request.payment_receipt ? `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px; background: rgba(16, 185, 129, 0.1); border-radius: 12px; border: 1px solid #10b98120;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 40px; height: 40px; border-radius: 10px; background: #10b981; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-receipt" style="color: white; font-size: 16px;"></i>
                        </div>
                        <div>
                            <div style="font-weight: 600; color: #374151;">${request.payment_receipt}</div>
                            <div style="font-size: 0.875rem; color: #6b7280;">Receipt uploaded successfully</div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="viewDocument('${request.payment_receipt}')" 
                                style="padding: 8px 16px; background: #3498db; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; transition: all 0.2s;">
                            <i class="fas fa-eye" style="margin-right: 6px;"></i> View
                        </button>
                        <button onclick="downloadDocument('${request.payment_receipt}')" 
                                style="padding: 8px 16px; background: #27ae60; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; transition: all 0.2s;">
                            <i class="fas fa-download" style="margin-right: 6px;"></i> Download
                        </button>
                    </div>
                </div>
                ` : `
                <div style="text-align: center; padding: 40px; background: #f8f9fa; border-radius: 8px; border: 2px dashed #dee2e6;">
                    <i class="fas fa-file-upload" style="font-size: 48px; color: #bdc3c7; margin-bottom: 15px;"></i>
                    <p style="margin: 0; color: #7f8c8d; font-style: italic;">No payment receipt uploaded</p>
                </div>
                `}
            </div>
            
            <!-- Fee Breakdown Section -->
            ${feeBreakdown ? `
            <div class="modal-section" style="margin-bottom: 32px;">
                <div class="section-header" style="display: flex; align-items: center; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #f3f4f6;">
                    <i class="fas fa-calculator" style="color: #f39c12; margin-right: 8px; font-size: 18px;"></i>
                    <h3 style="margin: 0; font-size: 1.125rem; font-weight: 600; color: #374151;">Fee Breakdown</h3>
                </div>
                
                <div style="background: white; border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f8f9fa;">
                                <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #374151;">Fee Type</th>
                                <th style="padding: 12px 16px; text-align: right; font-weight: 600; color: #374151;">Amount</th>
                                <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #374151;">Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${feeBreakdown.breakdown.map((item, index) => `
                                <tr style="border-bottom: 1px solid #f3f4f6;">
                                    <td style="padding: 12px 16px; font-weight: 500; color: #374151;">${item.item}</td>
                                    <td style="padding: 12px 16px; text-align: right; font-weight: 600; color: #27ae60;">₱${item.amount.toLocaleString()}</td>
                                    <td style="padding: 12px 16px; color: #6b7280; font-size: 0.875rem;">${item.details}</td>
                                </tr>
                            `).join('')}
                            <tr style="border-top: 2px solid #3498db; background: #f8f9fa;">
                                <td style="padding: 16px; font-weight: 700; color: #2c3e50; font-size: 1.1rem;">TOTAL</td>
                                <td style="padding: 16px; text-align: right; font-weight: 700; color: #27ae60; font-size: 1.2rem;">₱${feeBreakdown.total.toLocaleString()}</td>
                                <td style="padding: 16px; color: #6b7280; font-style: italic;">Total enrollment fees</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            ` : ''}
            
            <!-- Notes Section -->
            <div class="modal-section" style="margin-bottom: 32px;">
                <div class="section-header" style="display: flex; align-items: center; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #f3f4f6;">
                    <i class="fas fa-sticky-note" style="color: #667eea; margin-right: 8px; font-size: 18px;"></i>
                    <h3 style="margin: 0; font-size: 1.125rem; font-weight: 600; color: #374151;">Registrar Notes</h3>
                </div>
                <textarea id="modal-notes" placeholder="Add notes or remarks for this enrollment..." 
                          style="width: 100%; min-height: 100px; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; resize: vertical; font-family: inherit; font-size: 0.875rem; background: #f9fafb;">${request.remarks || ''}</textarea>
            </div>
        `;
        
        // Update action buttons
        updateModalActionButtons(request.status);
        
        console.log('✅ Modal population completed successfully');
        
    }, 200);
}

// DESCRIPTION: Enhanced document viewing function with proper error handling
// REPLACE the existing viewDocument function with this corrected version
function viewDocument(filename) {
    if (!filename) {
        showNotification('Document not found', 'error');
        return;
    }
    
    console.log('👁️ Viewing document:', filename);
    
    // FIXED: Use the same endpoint as download but without download parameter
    const documentUrl = `/api/enrollment/receipt/${encodeURIComponent(filename)}`;
    
    // Create a modal to display the document
    const viewerModal = document.createElement('div');
    viewerModal.className = 'document-viewer-modal';
    viewerModal.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background: rgba(0,0,0,0.9) !important;
        z-index: 100001 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 20px !important;
    `;
    
    // Determine if it's an image
    const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(filename);
    
    viewerModal.innerHTML = `
        <div style="background: white; border-radius: 12px; max-width: 90vw; max-height: 90vh; overflow: hidden; position: relative; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
            <div style="padding: 16px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; background: #f8f9fa;">
                <h3 style="margin: 0; font-size: 1.1rem; color: #374151;">📄 ${filename}</h3>
                <div style="display: flex; gap: 8px;">
                    <button onclick="downloadDocument('${filename}')" 
                            style="background: #27ae60; color: white; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer; font-weight: 500;">
                        <i class="fas fa-download"></i> Download
                    </button>
                    <button onclick="this.closest('.document-viewer-modal').remove(); document.body.style.overflow = '';" 
                            style="background: #ef4444; color: white; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer; font-weight: 500;">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            </div>
            <div style="padding: 20px; text-align: center; max-height: 75vh; overflow: auto;">
                ${isImage ? `
                    <img src="${documentUrl}" 
                         style="max-width: 100%; max-height: 70vh; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"
                         onerror="this.parentElement.innerHTML='<div style=\\'color: #ef4444; font-size: 1.1rem; padding: 40px;\\'>❌ Could not load receipt image<br><small style=\\'color: #666;\\'>The image may be corrupted or in an unsupported format</small></div>'"
                         onload="console.log('✅ Receipt image loaded successfully')">
                ` : `
                    <div style="padding: 40px; color: #6b7280;">
                        <i class="fas fa-file" style="font-size: 48px; margin-bottom: 16px;"></i>
                        <p style="margin: 0; font-size: 1.1rem;">Preview not available for this file type</p>
                        <button onclick="downloadDocument('${filename}')" 
                                style="margin-top: 16px; padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 6px; cursor: pointer;">
                            <i class="fas fa-download"></i> Download to View
                        </button>
                    </div>
                `}
            </div>
        </div>
    `;
    
    document.body.appendChild(viewerModal);
    document.body.style.overflow = 'hidden';
    
    // Close handlers
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            viewerModal.remove();
            document.body.style.overflow = '';
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
    
    viewerModal.addEventListener('click', (e) => {
        if (e.target === viewerModal) {
            viewerModal.remove();
            document.body.style.overflow = '';
        }
    });
}

// DESCRIPTION: Fix the download function with proper error handling and progress
// REPLACE the existing downloadDocument function with this corrected version
function downloadDocument(filename) {
    if (!filename) {
        showNotification('Document not found', 'error');
        return;
    }
    
    console.log('💾 Downloading document:', filename);
    
    // Show download progress notification
    const downloadNotification = document.createElement('div');
    downloadNotification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #3498db;
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        z-index: 10001;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        min-width: 250px;
    `;
    
    downloadNotification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <div class="loading-spinner" style="width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.3); border-top: 2px solid white; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <div>
                <div style="font-weight: 600; margin-bottom: 2px;">Downloading Receipt...</div>
                <div style="font-size: 0.875rem; opacity: 0.9;">${filename}</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(downloadNotification);
    
    // FIXED: Correct API endpoint for downloading receipts
    const downloadUrl = `/api/enrollment/receipt/${encodeURIComponent(filename)}?download=1`;
    
    // Use fetch to handle errors better
    fetch(downloadUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Receipt not found`);
            }
            return response.blob();
        })
        .then(blob => {
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            // Update notification to success
            downloadNotification.style.background = '#27ae60';
            downloadNotification.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px;">
                    <i class="fas fa-check-circle" style="font-size: 20px;"></i>
                    <div>
                        <div style="font-weight: 600; margin-bottom: 2px;">Receipt Downloaded!</div>
                        <div style="font-size: 0.875rem; opacity: 0.9;">${filename}</div>
                    </div>
                </div>
            `;
            
            // Remove notification after 3 seconds
            setTimeout(() => {
                if (downloadNotification.parentElement) {
                    downloadNotification.remove();
                }
            }, 3000);
        })
        .catch(error => {
            console.error('❌ Download error:', error);
            
            // Update notification to error
            downloadNotification.style.background = '#ef4444';
            downloadNotification.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px;">
                    <i class="fas fa-exclamation-circle" style="font-size: 20px;"></i>
                    <div>
                        <div style="font-weight: 600; margin-bottom: 2px;">Download Failed</div>
                        <div style="font-size: 0.875rem; opacity: 0.9;">${error.message}</div>
                    </div>
                    <button onclick="this.closest('div').parentElement.remove()" 
                            style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin-left: auto;">
                        ✕
                    </button>
                </div>
            `;
            
            // Remove notification after 5 seconds
            setTimeout(() => {
                if (downloadNotification.parentElement) {
                    downloadNotification.remove();
                }
            }, 5000);
        });
}

// NEW: Populate subjects table with enhanced formatting
function populateSubjectsTable(subjectsJson) {
    const subjectsTableBody = document.getElementById('modal-subjects-table-body');
    const subjectsCount = document.getElementById('modal-subjects-count');
    const subjectsUnits = document.getElementById('modal-subjects-units');
    
    if (!subjectsTableBody) return;
    
    let subjects = [];
    let totalUnits = 0;
    
    try {
        subjects = JSON.parse(subjectsJson || '[]');
    } catch (e) {
        console.warn('Could not parse subjects JSON:', e);
    }
    
    // Clear existing content
    subjectsTableBody.innerHTML = '';
    
    if (subjects.length === 0) {
        subjectsTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: #7f8c8d; font-style: italic; padding: 20px;">
                    No subjects selected
                </td>
            </tr>
        `;
    } else {
        subjects.forEach((subject, index) => {
            totalUnits += subject.units || 0;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="font-weight: 600; color: #3498db;">${subject.code || '-'}</td>
                <td>${subject.description || '-'}</td>
                <td style="text-align: center; background: #f8f9fa;">${subject.section || 'A'}</td>
                <td style="text-align: center; font-weight: 600; color: #27ae60;">${subject.units || 0}</td>
                <td style="color: #7f8c8d;">${subject.prereq || '-'}</td>
                <td style="color: #e67e22;">${subject.day || 'TBA'}</td>
                <td style="color: #3498db;">${subject.time || 'TBA'}</td>
            `;
            subjectsTableBody.appendChild(row);
        });
    }
    
    // Update summary
    if (subjectsCount) subjectsCount.textContent = subjects.length;
    if (subjectsUnits) subjectsUnits.textContent = totalUnits;
}

// NEW: Populate fee breakdown section
function populateFeeBreakdown(request, feeBreakdown) {
    const feeBreakdownContainer = document.getElementById('modal-fee-breakdown');
    
    if (!feeBreakdownContainer) return;
    
    feeBreakdownContainer.innerHTML = '';
    
    if (feeBreakdown && feeBreakdown.breakdown) {
        // Create fee breakdown table
        const table = document.createElement('table');
        table.className = 'fee-breakdown-table';
        table.style.cssText = 'width: 100%; border-collapse: collapse; margin-top: 10px;';
        
        // Table header
        table.innerHTML = `
            <thead>
                <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                    <th style="padding: 10px; text-align: left; font-weight: 600;">Fee Type</th>
                    <th style="padding: 10px; text-align: right; font-weight: 600;">Amount</th>
                    <th style="padding: 10px; text-align: left; font-weight: 600;">Details</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        
        const tbody = table.querySelector('tbody');
        
        // Add each fee breakdown item
        feeBreakdown.breakdown.forEach(item => {
            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid #eee';
            row.innerHTML = `
                <td style="padding: 8px; font-weight: 500;">${item.item}</td>
                <td style="padding: 8px; text-align: right; font-weight: 600; color: #27ae60;">₱${item.amount.toLocaleString()}</td>
                <td style="padding: 8px; color: #7f8c8d; font-size: 0.9em;">${item.details}</td>
            `;
            tbody.appendChild(row);
        });
        
        // Add total row
        const totalRow = document.createElement('tr');
        totalRow.style.cssText = 'border-top: 2px solid #3498db; background: #f8f9fa; font-weight: 700;';
        totalRow.innerHTML = `
            <td style="padding: 12px; font-weight: 700; color: #2c3e50;">TOTAL</td>
            <td style="padding: 12px; text-align: right; font-weight: 700; color: #27ae60; font-size: 1.1em;">₱${feeBreakdown.total.toLocaleString()}</td>
            <td style="padding: 12px; color: #7f8c8d;">Total enrollment fees</td>
        `;
        tbody.appendChild(totalRow);
        
        feeBreakdownContainer.appendChild(table);
    } else {
        // Fallback display if no breakdown available
        feeBreakdownContainer.innerHTML = `
            <div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                <p style="margin: 0; color: #7f8c8d; font-style: italic;">Fee breakdown not available</p>
                <p style="margin: 10px 0 0 0; font-size: 1.2em; font-weight: 600; color: #27ae60;">
                    Total: ₱${parseFloat(request.total_fees || 0).toLocaleString()}
                </p>
            </div>
        `;
    }
}

// NEW: Enhanced documents section
function populateDocumentsSection(request) {
    const documentsContainer = document.getElementById('modal-documents');
    if (!documentsContainer) return;
    
    documentsContainer.innerHTML = '';
    
    if (request.payment_receipt) {
        const docCard = document.createElement('div');
        docCard.className = 'document-card';
        docCard.style.cssText = `
            display: flex;
            align-items: center;
            padding: 15px;
            border: 1px solid #e1e8ed;
            border-radius: 8px;
            background: white;
            margin-bottom: 10px;
        `;
        
        docCard.innerHTML = `
            <div class="document-icon" style="margin-right: 15px; font-size: 24px; color: #3498db;">
                <i class="fas fa-receipt"></i>
            </div>
            <div class="document-info" style="flex: 1;">
                <div class="document-name" style="font-weight: 600; color: #2c3e50;">Payment Receipt</div>
                <div class="document-filename" style="color: #7f8c8d; font-size: 0.9em; margin-top: 2px;">${request.payment_receipt}</div>
                <div class="document-upload-date" style="color: #95a5a6; font-size: 0.8em; margin-top: 2px;">
                    Uploaded: ${new Date(request.created_at).toLocaleDateString()}
                </div>
            </div>
            <div class="document-actions" style="display: flex; gap: 8px;">
                <button class="document-action-btn" onclick="viewDocument('${request.payment_receipt}')" 
                        style="padding: 6px 12px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="document-action-btn" onclick="downloadDocument('${request.payment_receipt}')" 
                        style="padding: 6px 12px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                    <i class="fas fa-download"></i> Download
                </button>
            </div>
        `;
        
        documentsContainer.appendChild(docCard);
    } else {
        documentsContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; background: #f8f9fa; border-radius: 8px; border: 2px dashed #dee2e6;">
                <i class="fas fa-file-upload" style="font-size: 48px; color: #bdc3c7; margin-bottom: 15px;"></i>
                <p style="margin: 0; color: #7f8c8d; font-style: italic;">No payment receipt uploaded</p>
            </div>
        `;
    }
}

// NEW: Update modal action buttons based on status
function updateModalActionButtons(status) {
    const approveBtn = document.getElementById('modal-approve-btn');
    const rejectBtn = document.getElementById('modal-reject-btn');
    
    if (approveBtn && rejectBtn) {
        if (status === 'pending') {
            approveBtn.style.display = 'inline-block';
            rejectBtn.style.display = 'inline-block';
        } else {
            approveBtn.style.display = 'none';
            rejectBtn.style.display = 'none';
        }
    }
}

// REPLACE the existing showModalLoading function:
function showModalLoading() {
    const modal = document.getElementById('enrollment-modal');
    if (!modal) {
        console.warn('⚠️ Modal not found for loading state');
        return;
    }
    
    const modalBody = modal.querySelector('.modal-body');
    if (modalBody) {
        modalBody.innerHTML = `
            <div style="text-align: center; padding: 80px 20px;">
                <div class="loading-spinner" style="
                    width: 50px; 
                    height: 50px; 
                    margin: 0 auto 20px; 
                    border: 4px solid #f3f3f3; 
                    border-top: 4px solid #3498db; 
                    border-radius: 50%; 
                    animation: spin 1s linear infinite;
                "></div>
                <p style="color: #6b7280; margin: 0; font-size: 1.1em;">Loading enrollment details...</p>
                <p style="color: #9ca3af; margin: 10px 0 0 0; font-size: 0.9em;">Please wait while we fetch the information</p>
            </div>
        `;
        console.log('✅ Loading state displayed');
    } else {
        console.warn('⚠️ Modal body not found for loading state');
    }
}

// REPLACE the existing calculateTuitionFees function in enrollment-requests.js
async function calculateTuitionFees(program, yearLevel, semester, studentType = 'regular') {
    try {
        console.log('💰 Calculating fees for:', { program, yearLevel, semester, studentType });
        
        const params = new URLSearchParams({
            program: program,
            yearLevel: yearLevel,
            term: semester,
            studentType: studentType  // ← ENSURE this parameter is included
        });
        
        const response = await fetch(`/api/enrollment/tuition-fees?${params}`);
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Fee calculation result:', result.fees);
            return result.fees;
        } else {
            console.error('❌ Fee calculation failed:', result.message);
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('❌ Error calculating fees:', error);
        throw error;
    }
}

// ADD this function to enrollment-requests.js to handle irregular student fee display
async function calculateIrregularFees(subjects, studentType) {
    if (studentType !== 'irregular' || !subjects || subjects.length === 0) {
        return null;
    }
    
    const totalUnits = subjects.reduce((sum, subject) => sum + (parseInt(subject.units) || 0), 0);
    const IRREGULAR_RATE = 450.00;
    
    const tuitionFee = IRREGULAR_RATE * totalUnits;
    const labFee = 500;
    const miscFee = 500;
    const enrollmentFee = 350;
    const irregularityFee = 300;
    const total = tuitionFee + labFee + miscFee + enrollmentFee + irregularityFee;
    
    return {
        tuition: tuitionFee,
        laboratory: labFee,
        miscellaneous: miscFee,
        enrollment: enrollmentFee,
        irregularity: irregularityFee,
        total: total,
        totalUnits: totalUnits,
        perUnitRate: IRREGULAR_RATE,
        studentType: 'irregular',
        breakdown: [
            { item: 'Tuition Fee', amount: tuitionFee, details: `${totalUnits} units × ₱${IRREGULAR_RATE.toFixed(2)} (Irregular Rate)` },
            { item: 'Laboratory Fee', amount: labFee, details: 'Lab equipment and materials' },
            { item: 'Miscellaneous Fee', amount: miscFee, details: 'ID, library, and additional services' },
            { item: 'Enrollment Fee', amount: enrollmentFee, details: 'Registration processing fee (Higher for irregular)' },
            { item: 'Irregularity Fee', amount: irregularityFee, details: 'Additional fee for non-standard enrollment' }
        ]
    };
}

// Update enrollment status (approve/reject)
async function updateEnrollmentStatus(enrollmentId, newStatus) {
    try {
        // If called from modal, use currentEnrollmentId
        const requestId = enrollmentId || currentEnrollmentId;
        
        if (!requestId) {
            showNotification('No enrollment request selected', 'error');
            return;
        }
        
        console.log(`📝 Updating enrollment ${requestId} to status: ${newStatus}`);
        
        // Get notes from modal if available
        const notes = document.getElementById('modal-notes')?.value || '';
        
        const response = await fetch(`/api/enrollment/update-status/${requestId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: newStatus,
                remarks: notes
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(`Enrollment ${newStatus} successfully!`, 'success');
            
            // Close modal if open
            closeEnrollmentModal();
            
            // Reload data
            await loadEnrollmentRequests();
            updateStats();
            
        } else {
            showNotification(result.message || 'Failed to update enrollment status', 'error');
        }
        
    } catch (error) {
        console.error('❌ Error updating enrollment status:', error);
        showNotification('Error updating enrollment status', 'error');
    }
}

// REPLACE the existing closeEnrollmentModal function:
function closeEnrollmentModal() {
    console.log('🔒 Closing enrollment modal');
    
    const modal = document.getElementById('enrollment-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove(); // Remove the entire modal instead of just hiding
        }, 300);
        document.body.style.overflow = '';
        console.log('✅ Modal closed and removed');
    }
    
    currentEnrollmentId = null;
}


// Update statistics counters
function updateStats() {
    const pendingCount = allEnrollmentRequests.filter(r => r.status === 'pending').length;
    const approvedCount = allEnrollmentRequests.filter(r => r.status === 'approved').length;
    const rejectedCount = allEnrollmentRequests.filter(r => r.status === 'rejected').length;
    
    // NEW: Additional filter counts
    const regularCount = allEnrollmentRequests.filter(r => !r.student_type || r.student_type === 'regular').length;
    const irregularCount = allEnrollmentRequests.filter(r => r.student_type === 'irregular').length;
    const withReceiptCount = allEnrollmentRequests.filter(r => r.payment_receipt && r.payment_receipt.trim() !== '').length;
    const noReceiptCount = allEnrollmentRequests.filter(r => !r.payment_receipt || r.payment_receipt.trim() === '').length;
    
    // Recent requests (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentCount = allEnrollmentRequests.filter(r => new Date(r.created_at) >= sevenDaysAgo).length;
    
    // Update existing counters
    const pendingEl = document.getElementById('pending-count');
    const approvedEl = document.getElementById('approved-count');
    const rejectedEl = document.getElementById('rejected-count');
    
    if (pendingEl) pendingEl.textContent = `${pendingCount} Pending`;
    if (approvedEl) approvedEl.textContent = `${approvedCount} Approved`;
    if (rejectedEl) rejectedEl.textContent = `${rejectedCount} Rejected`;
    
    // NEW: Update filter button badges with counts
    updateFilterButtonBadges({
        all: allEnrollmentRequests.length,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        regular: regularCount,
        irregular: irregularCount,
        'with-receipt': withReceiptCount,
        'no-receipt': noReceiptCount,
        recent: recentCount
    });
    
    console.log(`📊 Stats updated: ${pendingCount} pending, ${approvedCount} approved, ${rejectedCount} rejected`);
    console.log(`👥 Student types: ${regularCount} regular, ${irregularCount} irregular`);
    console.log(`📄 Receipts: ${withReceiptCount} with receipt, ${noReceiptCount} without receipt`);
    console.log(`📅 Recent: ${recentCount} requests in last 7 days`);
}

function updateFilterButtonBadges(counts) {
    Object.keys(counts).forEach(filter => {
        const btn = document.querySelector(`[data-filter="${filter}"]`);
        if (btn) {
            const count = counts[filter];
            const existingBadge = btn.querySelector('.filter-badge');
            
            if (existingBadge) {
                existingBadge.remove();
            }
            
            if (count > 0) {
                const badge = document.createElement('span');
                badge.className = 'filter-badge';
                badge.textContent = count;
                badge.style.cssText = `
                    background: #e74c3c;
                    color: white;
                    border-radius: 10px;
                    padding: 2px 6px;
                    font-size: 0.7rem;
                    font-weight: 600;
                    margin-left: 6px;
                    min-width: 18px;
                    text-align: center;
                    display: inline-block;
                `;
                btn.appendChild(badge);
            }
        }
    });
}

// 5. NEW: Delete enrollment request function
async function deleteEnrollmentRequest(enrollmentId, studentName = 'Unknown Student') {
    // Show confirmation dialog with enhanced styling
    const confirmed = await showDeleteConfirmation(studentName);
    if (!confirmed) return;
    
    try {
        console.log(`🗑️ Deleting enrollment request ${enrollmentId} for ${studentName}`);
        
        // Show loading state
        showDeletionProgress(enrollmentId);
        
        const response = await fetch(`/api/enrollment/delete/${enrollmentId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(`Enrollment request for ${studentName} deleted successfully!`, 'success');
            
            // Remove from local arrays
            allEnrollmentRequests = allEnrollmentRequests.filter(r => r.id !== enrollmentId);
            filteredRequests = filteredRequests.filter(r => r.id !== enrollmentId);
            
            // Update UI
            renderEnrollmentRequests();
            updateStats();
            
            // Close modal if it's open for this request
            if (currentEnrollmentId === enrollmentId) {
                closeEnrollmentModal();
            }
            
        } else {
            showNotification(result.message || 'Failed to delete enrollment request', 'error');
        }
        
    } catch (error) {
        console.error('❌ Error deleting enrollment request:', error);
        showNotification('Error deleting enrollment request. Please try again.', 'error');
    }
}

// 6. NEW: Enhanced delete confirmation dialog
function showDeleteConfirmation(studentName) {
    return new Promise((resolve) => {
        const confirmDialog = document.createElement('div');
        confirmDialog.className = 'delete-confirmation-modal';
        confirmDialog.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: rgba(0,0,0,0.7) !important;
            z-index: 100000 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            animation: fadeIn 0.3s ease-out;
        `;
        
        confirmDialog.innerHTML = `
            <div style="background: white; border-radius: 16px; padding: 32px; max-width: 480px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); animation: slideInScale 0.3s ease-out;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                        <i class="fas fa-trash-alt" style="color: white; font-size: 32px;"></i>
                    </div>
                    <h3 style="margin: 0 0 8px 0; color: #2c3e50; font-size: 1.5rem; font-weight: 600;">Delete Enrollment Request</h3>
                    <p style="margin: 0; color: #7f8c8d; font-size: 1rem; line-height: 1.5;">
                        Are you sure you want to permanently delete the enrollment request for:<br>
                        <strong style="color: #2c3e50; font-size: 1.1rem;">${studentName}</strong>
                    </p>
                </div>
                
                <div style="background: #fff5f5; border: 1px solid #fed7d7; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                    <div style="display: flex; align-items: center; gap: 8px; color: #e53e3e; font-weight: 500; margin-bottom: 8px;">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>Warning: This action cannot be undone</span>
                    </div>
                    <ul style="margin: 0; padding-left: 20px; color: #742a2a; font-size: 0.9rem; line-height: 1.4;">
                        <li>Student enrollment data will be permanently deleted</li>
                        <li>Associated payment records will be removed</li>
                        <li>This action cannot be reversed</li>
                    </ul>
                </div>
                
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button id="cancel-delete" style="
                        padding: 12px 24px; 
                        background: #f8f9fa; 
                        color: #495057; 
                        border: 2px solid #dee2e6; 
                        border-radius: 8px; 
                        cursor: pointer; 
                        font-weight: 600; 
                        font-size: 0.95rem;
                        transition: all 0.2s;
                        min-width: 120px;
                    " onmouseover="this.style.background='#e9ecef'" onmouseout="this.style.background='#f8f9fa'">
                        <i class="fas fa-times" style="margin-right: 8px;"></i>
                        Cancel
                    </button>
                    <button id="confirm-delete" style="
                        padding: 12px 24px; 
                        background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); 
                        color: white; 
                        border: none; 
                        border-radius: 8px; 
                        cursor: pointer; 
                        font-weight: 600; 
                        font-size: 0.95rem;
                        transition: all 0.2s;
                        min-width: 120px;
                        box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(231, 76, 60, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(231, 76, 60, 0.3)'">
                        <i class="fas fa-trash-alt" style="margin-right: 8px;"></i>
                        Delete Request
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(confirmDialog);
        document.body.style.overflow = 'hidden';
        
        // Add CSS animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideInScale {
                from { transform: translateY(-20px) scale(0.95); opacity: 0; }
                to { transform: translateY(0) scale(1); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        // Event handlers
        document.getElementById('cancel-delete').onclick = () => {
            confirmDialog.remove();
            document.body.style.overflow = '';
            resolve(false);
        };
        
        document.getElementById('confirm-delete').onclick = () => {
            confirmDialog.remove();
            document.body.style.overflow = '';
            resolve(true);
        };
        
        // Close on outside click
        confirmDialog.onclick = (e) => {
            if (e.target === confirmDialog) {
                confirmDialog.remove();
                document.body.style.overflow = '';
                resolve(false);
            }
        };
        
        // Close on Escape
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                confirmDialog.remove();
                document.body.style.overflow = '';
                document.removeEventListener('keydown', handleEscape);
                resolve(false);
            }
        };
        document.addEventListener('keydown', handleEscape);
    });
}

// 7. NEW: Show deletion progress
function showDeletionProgress(enrollmentId) {
    const card = document.querySelector(`[data-enrollment-id="${enrollmentId}"]`);
    if (card) {
        card.style.opacity = '0.5';
        card.style.pointerEvents = 'none';
        
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(231, 76, 60, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            border-radius: 16px;
            z-index: 10;
        `;
        overlay.innerHTML = `
            <div style="text-align: center;">
                <div style="width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.3); border-top: 3px solid white; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 8px;"></div>
                <div>Deleting...</div>
            </div>
        `;
        
        card.style.position = 'relative';
        card.appendChild(overlay);
    }
}

// 10. NEW: Bulk operations for multiple selections
let selectedRequests = new Set();

function toggleRequestSelection(enrollmentId, checkbox) {
    if (checkbox.checked) {
        selectedRequests.add(enrollmentId);
    } else {
        selectedRequests.delete(enrollmentId);
    }
    
    updateBulkActionButtons();
}

function updateBulkActionButtons() {
    const bulkActions = document.querySelector('.bulk-actions');
    const selectedCount = selectedRequests.size;
    
    if (selectedCount > 0) {
        if (!bulkActions) {
            createBulkActionButtons();
        }
        
        const countSpan = document.querySelector('.selected-count');
        if (countSpan) {
            countSpan.textContent = selectedCount;
        }
        
        document.querySelector('.bulk-actions').style.display = 'flex';
    } else {
        if (bulkActions) {
            bulkActions.style.display = 'none';
        }
    }
}

function createBulkActionButtons() {
    const filtersContainer = document.querySelector('.enrollment-filters');
    const bulkActions = document.createElement('div');
    bulkActions.className = 'bulk-actions';
    bulkActions.style.cssText = `
        display: none;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
        color: white;
        border-radius: 8px;
        margin-top: 12px;
        box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
    `;
    
    bulkActions.innerHTML = `
        <i class="fas fa-check-double"></i>
        <span><strong><span class="selected-count">0</span></strong> requests selected</span>
        <div style="margin-left: auto; display: flex; gap: 8px;">
            <button onclick="bulkApprove()" style="padding: 6px 12px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; border-radius: 4px; cursor: pointer;">
                <i class="fas fa-check"></i> Approve All
            </button>
            <button onclick="bulkReject()" style="padding: 6px 12px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; border-radius: 4px; cursor: pointer;">
                <i class="fas fa-times"></i> Reject All
            </button>
            <button onclick="bulkDelete()" style="padding: 6px 12px; background: rgba(220, 53, 69, 0.9); border: 1px solid rgba(220, 53, 69, 1); color: white; border-radius: 4px; cursor: pointer;">
                <i class="fas fa-trash"></i> Delete All
            </button>
            <button onclick="clearSelection()" style="padding: 6px 12px; background: rgba(108, 117, 125, 0.9); border: 1px solid rgba(108, 117, 125, 1); color: white; border-radius: 4px; cursor: pointer;">
                Clear
            </button>
        </div>
    `;
    
    filtersContainer.appendChild(bulkActions);
}

// 11. NEW: Bulk operation functions
async function bulkDelete() {
    if (selectedRequests.size === 0) return;
    
    const confirmed = await showBulkDeleteConfirmation(selectedRequests.size);
    if (!confirmed) return;
    
    const requestIds = Array.from(selectedRequests);
    let successCount = 0;
    
    for (const id of requestIds) {
        try {
            const response = await fetch(`/api/enrollment/delete/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
                }
            });
            
            const result = await response.json();
            if (result.success) {
                successCount++;
                allEnrollmentRequests = allEnrollmentRequests.filter(r => r.id !== id);
            }
        } catch (error) {
            console.error(`Error deleting request ${id}:`, error);
        }
    }
    
    showNotification(`Successfully deleted ${successCount} of ${requestIds.length} requests`, 'success');
    
    selectedRequests.clear();
    renderEnrollmentRequests();
    updateStats();
    updateBulkActionButtons();
}

function clearSelection() {
    selectedRequests.clear();
    document.querySelectorAll('.request-checkbox').forEach(cb => cb.checked = false);
    updateBulkActionButtons();
}

function showBulkDeleteConfirmation(count) {
    return confirm(`Are you sure you want to delete ${count} enrollment request(s)? This action cannot be undone.`);
}


// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'error' ? '#f8d7da' : type === 'warning' ? '#fff3cd' : type === 'success' ? '#d4edda' : '#d1ecf1'};
        border: 1px solid ${type === 'error' ? '#f5c6cb' : type === 'warning' ? '#ffeaa7' : type === 'success' ? '#c3e6cb' : '#bee5eb'};
        border-radius: 8px;
        color: ${type === 'error' ? '#721c24' : type === 'warning' ? '#856404' : type === 'success' ? '#155724' : '#0c5460'};
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideInRight 0.3s ease-out;
    `;

    const icon = type === 'error' ? 'fas fa-exclamation-circle' : 
                type === 'warning' ? 'fas fa-exclamation-triangle' : 
                type === 'success' ? 'fas fa-check-circle' :
                'fas fa-info-circle';

    notification.innerHTML = `
        <i class="${icon}" style="margin-right: 8px;"></i>
        ${message}
        <button onclick="this.parentElement.remove()" style="float: right; background: none; border: none; font-size: 16px; cursor: pointer; margin-left: 10px;">&times;</button>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}



// REPLACE the existing click outside handler with this updated version
document.addEventListener('click', function(e) {
    const modal = document.getElementById('enrollment-modal');
    if (modal && e.target.classList.contains('enrollment-modal-overlay')) {
        closeEnrollmentModal();
    }
});

// Keyboard navigation
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeEnrollmentModal();
    }
});
