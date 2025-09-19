// enrollment-requests.js - Frontend JavaScript for Registrar Enrollment Management

// Global variables
let allEnrollmentRequests = [];
let filteredRequests = [];
let currentFilter = 'all';
let currentEnrollmentId = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeEnrollmentRequests();
    setupEventListeners();
});

// Initialize enrollment requests functionality
async function initializeEnrollmentRequests() {
    console.log('🚀 Initializing enrollment requests...');
    await loadEnrollmentRequests();
    updateStats();
}

// Setup event listeners
function setupEventListeners() {
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            setActiveFilter(filter);
        });
    });

    // Search functionality
    const searchInput = document.getElementById('enrollment-search');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterRequests();
        });
    }

    // Export button
    const exportBtn = document.querySelector('.export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportEnrollmentData);
    }
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
            filterRequests();
        } else {
            console.error('❌ Failed to load enrollment requests:', result.message);
            showNotification('Failed to load enrollment requests', 'error');
        }
    } catch (error) {
        console.error('❌ Error loading enrollment requests:', error);
        showNotification('Error loading enrollment requests', 'error');
    }
}

// Set active filter and update display
function setActiveFilter(filter) {
    currentFilter = filter;
    
    // Update filter button states
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
    
    // Apply filter
    filterRequests();
}

// Filter requests based on current filter and search
function filterRequests() {
    const searchTerm = document.getElementById('enrollment-search')?.value.toLowerCase() || '';
    
    filteredRequests = allEnrollmentRequests.filter(request => {
        // Filter by status
        const statusMatch = currentFilter === 'all' || request.status === currentFilter;
        
        // Filter by search term (student name)
        const searchMatch = searchTerm === '' || 
            (request.student_name && request.student_name.toLowerCase().includes(searchTerm));
        
        return statusMatch && searchMatch;
    });
    
    renderEnrollmentRequests();
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
        
        // Fetch and populate data (rest of your existing code...)
        const response = await fetch(`/api/enrollment/request/${enrollmentId}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'Failed to load enrollment details');
        }
        
        // Get fee breakdown
        let feeBreakdown = null;
        try {
            const feesUrl = `/api/enrollment/tuition-fees?program=${encodeURIComponent(result.data.program)}&yearLevel=${encodeURIComponent(result.data.year_level)}&term=${encodeURIComponent(result.data.semester)}`;
            const feesResponse = await fetch(feesUrl);
            if (feesResponse.ok) {
                const feesResult = await feesResponse.json();
                if (feesResult.success) {
                    feeBreakdown = feesResult.fees;
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
                    <div class="modal-header" style="padding: 24px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 16px 16px 0 0;">
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

// DESCRIPTION: Enhanced populate function with element existence checks
function populateEnrollmentModal(request, feeBreakdown) {
    console.log('📋 Populating modal with data:', request);
    
    // Wait a bit more for DOM to be ready
    setTimeout(() => {
        // Enhanced element setter with existence check
        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = value || '-';
                console.log(`✅ Set ${id}: ${value || '-'}`);
                return true;
            } else {
                console.warn(`❌ Element not found: ${id}`);
                return false;
            }
        };
        
        // Check if modal body exists before populating
        const modalBody = document.querySelector('#enrollment-modal .modal-body');
        if (!modalBody) {
            console.error('❌ Modal body not found, recreating modal...');
            createEnrollmentModal();
            return;
        }
        
        // Clear loading state first
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
                        <span id="modal-student-id" style="font-weight: 600; color: #374151;">${request.student_id || '-'}</span>
                    </div>
                    <div class="info-item">
                        <label style="display: block; font-size: 0.75rem; font-weight: 500; color: #6b7280; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Full Name</label>
                        <span id="modal-student-name" style="font-weight: 600; color: #374151;">${request.student_name || 'Unknown Student'}</span>
                    </div>
                    <div class="info-item">
                        <label style="display: block; font-size: 0.75rem; font-weight: 500; color: #6b7280; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Email</label>
                        <span id="modal-student-email" style="font-weight: 600; color: #374151;">${request.student_email || '-'}</span>
                    </div>
                    <div class="info-item">
                        <label style="display: block; font-size: 0.75rem; font-weight: 500; color: #6b7280; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Contact</label>
                        <span id="modal-student-contact" style="font-weight: 600; color: #374151;">${request.phone || '-'}</span>
                    </div>
                </div>
            </div>
            
            <!-- Enrollment Information Section -->
            <div class="modal-section" style="margin-bottom: 32px;">
                <div class="section-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #f3f4f6;">
                    <div style="display: flex; align-items: center;">
                        <i class="fas fa-graduation-cap" style="color: #667eea; margin-right: 8px; font-size: 18px;"></i>
                        <h3 style="margin: 0; font-size: 1.125rem; font-weight: 600; color: #374151;">Enrollment Information</h3>
                    </div>
                    <span id="modal-status" class="status-badge status-${request.status || 'pending'}">${(request.status || 'pending').toUpperCase()}</span>
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
                        <label style="display: block; font-size: 0.75rem; font-weight: 500; color: #6b7280; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Academic Term</label>
                        <span style="font-weight: 600; color: #374151;">${request.semester || '-'}</span>
                    </div>
                    <div class="info-item">
                        <label style="display: block; font-size: 0.75rem; font-weight: 500; color: #6b7280; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Total Fee</label>
                        <span style="font-weight: 600; color: #27ae60;">₱${parseFloat(request.total_fees || 0).toLocaleString()}</span>
                    </div>
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
                                style="padding: 8px 16px; background: #3498db; color: white; border: none; border-radius: 6px; cursor: pointer;">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button onclick="downloadDocument('${request.payment_receipt}')" 
                                style="padding: 8px 16px; background: #27ae60; color: white; border: none; border-radius: 6px; cursor: pointer;">
                            <i class="fas fa-download"></i> Download
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
            
            <!-- Notes Section -->
            <div class="modal-section" style="margin-bottom: 32px;">
                <div class="section-header" style="display: flex; align-items: center; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #f3f4f6;">
                    <i class="fas fa-sticky-note" style="color: #667eea; margin-right: 8px; font-size: 18px;"></i>
                    <h3 style="margin: 0; font-size: 1.125rem; font-weight: 600; color: #374151;">Registrar Notes</h3>
                </div>
                <textarea id="modal-notes" placeholder="Add notes or remarks for this enrollment..." 
                          style="width: 100%; min-height: 100px; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; resize: vertical; font-family: inherit; font-size: 0.875rem;">${request.remarks || ''}</textarea>
            </div>
        `;
        
        // Update action buttons
        updateModalActionButtons(request.status);
        
        console.log('✅ Modal population completed with direct HTML');
        
    }, 200);
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

// NEW: Populate section
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

// REPLACE the existing viewDocument function in enrollment-requests.js:
function viewDocument(filename) {
    if (!filename) {
        showNotification('Document not found', 'error');
        return;
    }
    
    console.log('👁️ Viewing document:', filename);
    
    // FIXED: Proper file path construction
    const documentUrl = `/api/enrollment/receipt/${encodeURIComponent(filename)}`;
    
    // Open in new tab with error handling
    const newWindow = window.open(documentUrl, '_blank');
    if (!newWindow) {
        showNotification('Could not open document. Please check your popup blocker.', 'warning');
    }
}

// REPLACE the existing downloadDocument function in enrollment-requests.js:
function downloadDocument(filename) {
    if (!filename) {
        showNotification('Document not found', 'error');
        return;
    }
    
    console.log('💾 Downloading document:', filename);
    
    // FIXED: Proper download with fetch to handle errors
    const downloadUrl = `/api/enrollment/receipt/${encodeURIComponent(filename)}`;
    
    fetch(downloadUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.blob();
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            showNotification('Document downloaded successfully!', 'success');
        })
        .catch(error => {
            console.error('❌ Download error:', error);
            showNotification(`Failed to download document: ${error.message}`, 'error');
        });
}

// Update statistics counters
function updateStats() {
    const pendingCount = allEnrollmentRequests.filter(r => r.status === 'pending').length;
    const approvedCount = allEnrollmentRequests.filter(r => r.status === 'approved').length;
    const rejectedCount = allEnrollmentRequests.filter(r => r.status === 'rejected').length;
    
    // Update counter elements
    const pendingEl = document.getElementById('pending-count');
    const approvedEl = document.getElementById('approved-count');
    const rejectedEl = document.getElementById('rejected-count');
    
    if (pendingEl) pendingEl.textContent = `${pendingCount} Pending`;
    if (approvedEl) approvedEl.textContent = `${approvedCount} Approved`;
    if (rejectedEl) rejectedEl.textContent = `${rejectedCount} Rejected`;
}

// Export enrollment data
function exportEnrollmentData() {
    try {
        // Prepare CSV data
        const headers = ['ID', 'Student ID', 'Student Name', 'Program', 'Year Level', 'Semester', 'Status', 'Total Fees', 'Request Date'];
        const csvData = [headers];
        
        filteredRequests.forEach(request => {
            csvData.push([
                request.id,
                request.student_id,
                request.student_name || 'Unknown',
                request.program,
                request.year_level,
                request.semester,
                request.status,
                request.total_fees,
                new Date(request.created_at).toLocaleDateString()
            ]);
        });
        
        // Create CSV content
        const csvContent = csvData.map(row => row.map(field => `"${field}"`).join(',')).join('\n');
        
        // Create and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `enrollment-requests-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        window.URL.revokeObjectURL(url);
        showNotification('Data exported successfully!', 'success');
        
    } catch (error) {
        console.error('❌ Error exporting data:', error);
        showNotification('Error exporting data', 'error');
    }
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