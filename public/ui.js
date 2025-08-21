// UI Helper Functions

// Toast message system
function showToastMessage(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span>${message}</span>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 5000);
    
    // Remove on click
    toast.addEventListener('click', () => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    });
}

// Modal management
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function closeModalOnOutsideClick(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideModal(modalId);
            }
        });
    }
}

// Recommendation card rendering
function renderRecommendations(recommendations) {
    const container = document.getElementById('recommendationsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!recommendations || recommendations.length === 0) {
        container.innerHTML = `
            <div class="no-recommendations">
                <p>No recommendations found. Please generate new ones.</p>
            </div>
        `;
        return;
    }
    
    recommendations.forEach((rec, index) => {
        const card = createRecommendationCard(rec, index);
        container.appendChild(card);
    });
}

function createRecommendationCard(recommendation, index) {
    const card = document.createElement('div');
    card.className = 'recommendation-card';
    card.innerHTML = `
        <div class="card-header">
            <h4 class="card-title">${recommendation.title}</h4>
            <div style="display:flex; gap:0.5rem; align-items:center;">
                ${typeof recommendation.demandScore === 'number' ? `<span class="fit-score" title="Demand score">D:${recommendation.demandScore}</span>` : ''}
                <span class="fit-score" title="Fit score">${recommendation.fitScore}%</span>
            </div>
        </div>
        <p class="card-why">${recommendation.why}</p>
        
        <div class="skills-section">
            <h5>Your Skills (${recommendation.overlapSkills.length})</h5>
            <div class="skills-tags">
                ${recommendation.overlapSkills.map(skill => 
                    `<span class="skill-tag overlap-skill">${skill}</span>`
                ).join('')}
            </div>
        </div>
        
        <div class="skills-section">
            <h5>Skills to Learn (${recommendation.gapSkills.length})</h5>
            <div class="skills-tags">
                ${recommendation.gapSkills.map(skill => 
                    `<span class="skill-tag gap-skill">${skill}</span>`
                ).join('')}
            </div>
        </div>
        
        <div class="card-actions">
            <button class="btn btn-primary" onclick="viewLearningPlan('${index}')">
                View Learning Plan
            </button>
        </div>
    `;
    
    return card;
}

// Learning plan modal rendering
function viewLearningPlan(index) {
    const recommendations = window.currentRecommendations || [];
    const recommendation = recommendations[index];
    
    if (!recommendation || !recommendation.plan) {
        showToastMessage('Learning plan not available', 'error');
        return;
    }
    
    const modalTitle = document.getElementById('modalTitle');
    const planContent = document.getElementById('planContent');
    
    if (modalTitle) modalTitle.textContent = `${recommendation.title} - Learning Plan`;
    
    if (planContent) {
        planContent.innerHTML = renderLearningPlan(recommendation.plan, recommendation.title);
    }
    
    // Store current recommendation for PDF download
    window.currentLearningPlan = recommendation;
    
    showModal('planModal');
}

function renderLearningPlan(plan, roleTitle) {
    if (!plan.weeks || !Array.isArray(plan.weeks)) {
        return '<p>Learning plan format is invalid.</p>';
    }
    
    let html = `
        <div class="plan-header">
            <h4>4-Week Learning Path for ${roleTitle}</h4>
            <p>This structured plan will help you build the necessary skills step by step.</p>
        </div>
    `;
    
    plan.weeks.forEach(week => {
        html += `
            <div class="plan-week">
                <div class="week-header">
                    <div class="week-number">${week.week}</div>
                    <h5 class="week-title">Week ${week.week}</h5>
                </div>
                
                <div class="plan-section">
                    <h5>Topics to Cover</h5>
                    <ul>
                        ${Array.isArray(week.topics) ? 
                            week.topics.map(topic => `<li>${topic}</li>`).join('') :
                            '<li>Topics not specified</li>'
                        }
                    </ul>
                </div>
                
                <div class="plan-section">
                    <h5>Practice Activities</h5>
                    <ul>
                        ${Array.isArray(week.practice) ? 
                            week.practice.map(activity => `<li>${activity}</li>`).join('') :
                            '<li>Practice activities not specified</li>'
                        }
                    </ul>
                </div>
                
                <div class="plan-section">
                    <h5>Assessment</h5>
                    <ul>
                        <li>${week.assessment || 'Assessment not specified'}</li>
                    </ul>
                </div>
                
                <div class="plan-section">
                    <h5>Project</h5>
                    <ul>
                        <li>${week.project || 'Project not specified'}</li>
                    </ul>
                </div>
            </div>
        `;
    });
    
    return html;
}

// Profile modal rendering
function showProfileModal() {
    const profileContent = document.getElementById('profileContent');
    if (!profileContent || !window.app.userProfile) return;
    
    const profile = window.app.userProfile;
    
    profileContent.innerHTML = `
        <div class="profile-info">
            <div class="profile-item">
                <h5>Name</h5>
                <p>${profile.name || 'Not specified'}</p>
            </div>
            <div class="profile-item">
                <h5>Education</h5>
                <p>${profile.education || 'Not specified'}</p>
            </div>
            <div class="profile-item">
                <h5>Skills</h5>
                <p>${Array.isArray(profile.skills) ? profile.skills.join(', ') : 'Not specified'}</p>
            </div>
            <div class="profile-item">
                <h5>Interests</h5>
                <p>${Array.isArray(profile.interests) ? profile.interests.join(', ') : 'Not specified'}</p>
            </div>
            <div class="profile-item">
                <h5>Weekly Study Time</h5>
                <p>${profile.weeklyTime || 'Not specified'} hours</p>
            </div>
            <div class="profile-item">
                <h5>Budget Preference</h5>
                <p>${profile.budget || 'Not specified'}</p>
            </div>
            <div class="profile-item">
                <h5>Language</h5>
                <p>${profile.language === 'hi' ? 'Hindi' : 'English'}</p>
            </div>
        </div>
    `;
    
    showModal('profileModal');
}

// PDF download functionality
function downloadPDF() {
    if (!window.currentLearningPlan) {
        showToastMessage('No learning plan available for download', 'error');
        return;
    }
    
    // Use browser's print functionality for PDF generation
    window.print();
}

// Form validation and serialization
function validateForm(formElement) {
    const requiredFields = formElement.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.classList.add('error');
            isValid = false;
        } else {
            field.classList.remove('error');
        }
    });
    
    return isValid;
}

function serializeForm(formElement) {
    const formData = new FormData(formElement);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
        if (key === 'interests') {
            if (!data[key]) data[key] = [];
            data[key].push(value);
        } else if (key === 'skills') {
            data[key] = value.split(',').map(skill => skill.trim()).filter(skill => skill);
        } else if (key === 'weeklyTime') {
            data[key] = parseInt(value);
        } else {
            data[key] = value;
        }
    }
    
    return data;
}

// Loading states
function showLoadingState(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <div class="loading-content">
                <div class="spinner"></div>
                <p>Loading...</p>
            </div>
        `;
    }
}

function hideLoadingState(elementId, originalContent) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = originalContent;
    }
}

// Error handling
function showError(message, elementId = null) {
    showToastMessage(message, 'error');
    
    if (elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.add('error');
            setTimeout(() => {
                element.classList.remove('error');
            }, 3000);
        }
    }
}

function showSuccess(message) {
    showToastMessage(message, 'success');
}

// Dashboard event handlers
function setupDashboardEventHandlers() {
    // Profile button
    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn) {
        profileBtn.addEventListener('click', showProfileModal);
    }
    
    // Regenerate button
    const regenerateBtn = document.getElementById('regenerateBtn');
    if (regenerateBtn) {
        regenerateBtn.addEventListener('click', regenerateRecommendations);
    }
    
    // Modal close buttons
    const closeModal = document.getElementById('closeModal');
    if (closeModal) {
        closeModal.addEventListener('click', () => hideModal('planModal'));
    }
    
    const closeProfileModal = document.getElementById('closeProfileModal');
    if (closeProfileModal) {
        closeProfileModal.addEventListener('click', () => hideModal('profileModal'));
    }
    
    const closeDeleteModal = document.getElementById('closeDeleteModal');
    if (closeDeleteModal) {
        closeDeleteModal.addEventListener('click', () => hideModal('deleteModal'));
    }
    
    // Download PDF button
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', downloadPDF);
    }
    
    // Save plan button
    const savePlanBtn = document.getElementById('savePlanBtn');
    if (savePlanBtn) {
        savePlanBtn.addEventListener('click', saveLearningPlan);
    }
    
    // Edit profile button
    const editProfileBtn = document.getElementById('editProfileBtn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', editProfile);
    }
    
    // Delete data button
    const deleteDataBtn = document.getElementById('deleteDataBtn');
    if (deleteDataBtn) {
        deleteDataBtn.addEventListener('click', () => showModal('deleteModal'));
    }
    
    // Delete confirmation
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', confirmDeleteData);
    }
    
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', () => hideModal('deleteModal'));
    }
    
    // Setup modal outside click handlers
    closeModalOnOutsideClick('planModal');
    closeModalOnOutsideClick('profileModal');
    closeModalOnOutsideClick('deleteModal');
}

// Action functions
async function regenerateRecommendations() {
    if (!window.app.currentUser || !window.app.userProfile) {
        showToastMessage('Please complete your profile first', 'error');
        return;
    }
    
    try {
        showToastMessage('Generating new recommendations...', 'info');
        
        const recommendations = await getRecommendations(window.app.userProfile);
        if (recommendations) {
            await window.app.saveRecommendations(window.app.currentUser.uid, recommendations);
            window.location.reload();
        } else {
            showToastMessage('Failed to generate new recommendations', 'error');
        }
    } catch (error) {
        console.error('Error regenerating recommendations:', error);
        showToastMessage('Failed to regenerate recommendations', 'error');
    }
}

async function saveLearningPlan() {
    if (!window.currentLearningPlan) {
        showToastMessage('No learning plan to save', 'error');
        return;
    }
    
    try {
        // Save to user's saved plans collection
        await window.app.db.collection('users').doc(window.app.currentUser.uid)
            .collection('savedPlans').add({
                roleId: window.currentLearningPlan.roleId,
                title: window.currentLearningPlan.title,
                plan: window.currentLearningPlan.plan,
                savedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        showToastMessage('Learning plan saved successfully!', 'success');
        hideModal('planModal');
    } catch (error) {
        console.error('Error saving learning plan:', error);
        showToastMessage('Failed to save learning plan', 'error');
    }
}

function editProfile() {
    hideModal('profileModal');
    window.location.href = 'index.html';
}

async function confirmDeleteData() {
    if (!window.app.currentUser) {
        showToastMessage('No user logged in', 'error');
        return;
    }
    
    try {
        await window.app.deleteUserData(window.app.currentUser.uid);
        showToastMessage('All data deleted successfully', 'success');
        hideModal('deleteModal');
        
        // Sign out and redirect
        setTimeout(() => {
            window.app.signOut();
        }, 1500);
    } catch (error) {
        console.error('Error deleting user data:', error);
        showToastMessage('Failed to delete user data', 'error');
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the dashboard page
    if (window.location.pathname.includes('dashboard.html')) {
        setupDashboardEventHandlers();
    }
});

// Export functions for global use
window.ui = {
    showToastMessage,
    showModal,
    hideModal,
    renderRecommendations,
    viewLearningPlan,
    showProfileModal,
    downloadPDF,
    validateForm,
    serializeForm,
    showLoadingState,
    hideLoadingState,
    showError,
    showSuccess
};
