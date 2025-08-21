// Firebase Configuration
// TODO: Replace with your Firebase project configuration
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Global state
let currentUser = null;
let userProfile = null;

// Authentication state observer
auth.onAuthStateChanged((user) => {
    currentUser = user;
    
    if (user) {
        console.log('User signed in:', user.uid);
        loadUserProfile(user.uid);
        updateUIForAuthenticatedUser();
    } else {
        console.log('User signed out');
        updateUIForUnauthenticatedUser();
    }
});

// Authentication functions
function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .catch((error) => {
            console.error('Google sign-in error:', error);
            showToast('Failed to sign in with Google', 'error');
        });
}

function signInWithEmail(email, password) {
    auth.signInWithEmailAndPassword(email, password)
        .catch((error) => {
            console.error('Email sign-in error:', error);
            showToast('Failed to sign in with email', 'error');
        });
}

function createUserWithEmail(email, password) {
    auth.createUserWithEmailAndPassword(email, password)
        .catch((error) => {
            console.error('Email sign-up error:', error);
            showToast('Failed to create account', 'error');
        });
}

function signOut() {
    auth.signOut()
        .then(() => {
            console.log('User signed out successfully');
            window.location.href = 'index.html';
        })
        .catch((error) => {
            console.error('Sign-out error:', error);
            showToast('Failed to sign out', 'error');
        });
}

// User profile functions
async function loadUserProfile(uid) {
    try {
        const doc = await db.collection('users').doc(uid).collection('profile').doc('main').get();
        if (doc.exists) {
            userProfile = doc.data();
            console.log('User profile loaded:', userProfile);
        } else {
            console.log('No profile found for user');
            userProfile = null;
        }
        
    } catch (error) {
        console.error('Error loading user profile:', error);
        showToast('Failed to load profile', 'error');
    }
}

async function saveUserProfile(uid, profileData) {
    try {
        await db.collection('users').doc(uid).collection('profile').doc('main').set({
            ...profileData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        userProfile = profileData;
        console.log('Profile saved successfully');
        return true;
    } catch (error) {
        console.error('Error saving profile:', error);
        showToast('Failed to save profile', 'error');
        return false;
    }
}

async function saveRecommendations(uid, recommendations) {
    try {
        const docRef = await db.collection('users').doc(uid).collection('recommendations').add({
            recommendations: recommendations,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            userId: uid
        });
        
        console.log('Recommendations saved with ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error saving recommendations:', error);
        showToast('Failed to save recommendations', 'error');
        return null;
    }
}

async function loadLatestRecommendations(uid) {
    try {
        const querySnapshot = await db.collection('users').doc(uid)
            .collection('recommendations')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();
        
        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            return {
                id: doc.id,
                data: doc.data()
            };
        }
        return null;
    } catch (error) {
        console.error('Error loading recommendations:', error);
        showToast('Failed to load recommendations', 'error');
        return null;
    }
}

async function deleteUserData(uid) {
    try {
        // Delete profile
        await db.collection('users').doc(uid).collection('profile').doc('main').delete();
        
        // Delete all recommendations
        const recommendationsSnapshot = await db.collection('users').doc(uid)
            .collection('recommendations').get();
        
        const deletePromises = recommendationsSnapshot.docs.map(doc => doc.ref.delete());
        await Promise.all(deletePromises);
        
        // Delete user document
        await db.collection('users').doc(uid).delete();
        
        console.log('All user data deleted successfully');
        return true;
    } catch (error) {
        console.error('Error deleting user data:', error);
        showToast('Failed to delete user data', 'error');
        return false;
    }
}

// UI update functions
function updateUIForAuthenticatedUser() {
    const signInBtn = document.getElementById('signInBtn');
    const signOutBtn = document.getElementById('signOutBtn');
    const welcomeSection = document.getElementById('welcomeSection');
    const profileSection = document.getElementById('profileSection');
    
    if (signInBtn) signInBtn.style.display = 'none';
    if (signOutBtn) signOutBtn.style.display = 'block';
    if (welcomeSection) welcomeSection.style.display = 'none';
    if (profileSection) profileSection.style.display = 'block';
    
    // Update user name if on dashboard
    const userNameElement = document.getElementById('userName');
    if (userNameElement && userProfile) {
        userNameElement.textContent = userProfile.name || 'User';
    }
}

function updateUIForUnauthenticatedUser() {
    const signInBtn = document.getElementById('signInBtn');
    const signOutBtn = document.getElementById('signOutBtn');
    const welcomeSection = document.getElementById('welcomeSection');
    const profileSection = document.getElementById('profileSection');
    
    if (signInBtn) signInBtn.style.display = 'block';
    if (signOutBtn) signOutBtn.style.display = 'none';
    if (welcomeSection) welcomeSection.style.display = 'block';
    if (profileSection) profileSection.style.display = 'none';
}

// Navigation functions
function navigateToDashboard() {
    window.location.href = 'dashboard.html';
}

function navigateToIndex() {
    window.location.href = 'index.html';
}

// Utility functions
function showToast(message, type = 'info') {
    if (typeof showToastMessage === 'function') {
        showToastMessage(message, type);
    } else {
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}

function showLoading() {
    const loadingSection = document.getElementById('loadingSection');
    const profileSection = document.getElementById('profileSection');
    
    if (loadingSection) loadingSection.style.display = 'block';
    if (profileSection) profileSection.style.display = 'none';
}

function hideLoading() {
    const loadingSection = document.getElementById('loadingSection');
    const profileSection = document.getElementById('profileSection');
    
    if (loadingSection) loadingSection.style.display = 'none';
    if (profileSection) profileSection.style.display = 'block';
}

// Event listeners for common elements
document.addEventListener('DOMContentLoaded', function() {
    // Sign in button
    const signInBtn = document.getElementById('signInBtn');
    if (signInBtn) {
        signInBtn.addEventListener('click', signInWithGoogle);
    }
    
    // Sign out button
    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', signOut);
    }
    
    // Get started button
    const getStartedBtn = document.getElementById('getStartedBtn');
    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', () => {
            if (currentUser) {
                navigateToDashboard();
            } else {
                signInWithGoogle();
            }
        });
    }
    
    // Profile form submission
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileSubmit);
    }
});

// Profile form submission handler
async function handleProfileSubmit(event) {
    event.preventDefault();
    
    if (!currentUser) {
        showToast('Please sign in first', 'error');
        return;
    }
    
    const formData = new FormData(event.target);
    const profileData = {
        name: formData.get('name'),
        education: formData.get('education'),
        skills: formData.get('skills').split(',').map(skill => skill.trim()).filter(skill => skill),
        interests: Array.from(formData.getAll('interests')),
        weeklyTime: parseInt(formData.get('weeklyTime')),
        budget: formData.get('budget'),
        language: formData.get('language'),
        createdAt: new Date()
    };
    
    // Validate required fields
    if (!profileData.name || !profileData.education || profileData.skills.length === 0 || 
        profileData.interests.length === 0) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    showLoading();
    
    try {
        // Save profile
        const profileSaved = await saveUserProfile(currentUser.uid, profileData);
        if (!profileSaved) {
            hideLoading();
            return;
        }
        
        // Get recommendations
        const recommendations = await getRecommendations(profileData);
        if (recommendations) {
            // Save recommendations
            await saveRecommendations(currentUser.uid, recommendations);
            
            // Navigate to dashboard
            navigateToDashboard();
        } else {
            hideLoading();
            showToast('Failed to get recommendations', 'error');
        }
    } catch (error) {
        console.error('Error in profile submission:', error);
        hideLoading();
        showToast('An error occurred. Please try again.', 'error');
    }
}

// Dashboard data loading
async function loadDashboardData() {
    if (!currentUser) {
        navigateToIndex();
        return;
    }
    
    try {
        // Load profile
        await loadUserProfile(currentUser.uid);
        
        // Load latest recommendations
        const recommendationsData = await loadLatestRecommendations(currentUser.uid);
        
        if (recommendationsData) {
            renderRecommendations(recommendationsData.data.recommendations);
        } else {
            // No recommendations found, redirect to profile
            navigateToIndex();
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showToast('Failed to load dashboard data', 'error');
    }
}

// Export functions for use in other modules
window.app = {
    auth,
    db,
    currentUser,
    userProfile,
    signInWithGoogle,
    signInWithEmail,
    createUserWithEmail,
    signOut,
    saveUserProfile,
    saveRecommendations,
    loadLatestRecommendations,
    deleteUserData,
    navigateToDashboard,
    navigateToIndex,
    showToast,
    showLoading,
    hideLoading
};
