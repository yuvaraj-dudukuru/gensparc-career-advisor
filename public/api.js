// API Functions for Cloud Function Communication

// Base URL for the Cloud Function
const API_BASE_URL = '/api';

// Get recommendations from the Cloud Function
async function getRecommendations(profileData) {
    if (!window.app || !window.app.currentUser) {
        console.error('User not authenticated');
        return null;
    }
    
    const requestData = {
        uid: window.app.currentUser.uid,
        profile: profileData
    };
    
    try {
        console.log('Sending recommendation request:', requestData);
        
        const response = await fetch(`${API_BASE_URL}/recommend`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Recommendations received:', data);
        
        // Validate response structure
        if (!data.recommendations || !Array.isArray(data.recommendations)) {
            throw new Error('Invalid response format: missing recommendations array');
        }
        
        // Store recommendations globally for dashboard use
        window.currentRecommendations = data.recommendations;
        
        return data.recommendations;
        
    } catch (error) {
        console.error('Error getting recommendations:', error);
        
        // Show user-friendly error message
        let errorMessage = 'Failed to get recommendations. ';
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorMessage += 'Please check your internet connection.';
        } else if (error.message.includes('HTTP error! status: 500')) {
            errorMessage += 'Server error. Please try again later.';
        } else if (error.message.includes('HTTP error! status: 429')) {
            errorMessage += 'Too many requests. Please wait a moment and try again.';
        } else if (error.message.includes('HTTP error! status: 400')) {
            errorMessage += 'Invalid request. Please check your profile information.';
        } else {
            errorMessage += 'Please try again later.';
        }
        
        if (window.ui && window.ui.showToastMessage) {
            window.ui.showToastMessage(errorMessage, 'error');
        } else {
            alert(errorMessage);
        }
        
        return null;
    }
}

// Test API connectivity
async function testAPIConnectivity() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (response.ok) {
            console.log('API connectivity test successful');
            return true;
        } else {
            console.warn('API connectivity test failed:', response.status);
            return false;
        }
    } catch (error) {
        console.error('API connectivity test error:', error);
        return false;
    }
}

// Retry mechanism for failed requests
async function getRecommendationsWithRetry(profileData, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Attempt ${attempt} of ${maxRetries} to get recommendations`);
            
            const result = await getRecommendations(profileData);
            if (result) {
                return result;
            }
            
        } catch (error) {
            lastError = error;
            console.warn(`Attempt ${attempt} failed:`, error);
            
            if (attempt < maxRetries) {
                // Wait before retrying (exponential backoff)
                const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
                console.log(`Waiting ${waitTime}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }
    
    // All retries failed
    console.error('All retry attempts failed:', lastError);
    throw lastError;
}

// Validate profile data before sending
function validateProfileForAPI(profileData) {
    const errors = [];
    
    if (!profileData.name || profileData.name.trim().length < 2) {
        errors.push('Name must be at least 2 characters long');
    }
    
    if (!profileData.education) {
        errors.push('Education level is required');
    }
    
    if (!profileData.skills || profileData.skills.length === 0) {
        errors.push('At least one skill is required');
    }
    
    if (!profileData.interests || profileData.interests.length === 0) {
        errors.push('At least one interest is required');
    }
    
    if (!profileData.weeklyTime || profileData.weeklyTime < 1 || profileData.weeklyTime > 40) {
        errors.push('Weekly study time must be between 1 and 40 hours');
    }
    
    if (!profileData.budget) {
        errors.push('Budget preference is required');
    }
    
    if (!profileData.language) {
        errors.push('Language preference is required');
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// Enhanced error handling with specific error types
function handleAPIError(error, context = '') {
    let userMessage = 'An error occurred';
    let logLevel = 'error';
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
        userMessage = 'Network error. Please check your internet connection.';
        logLevel = 'warn';
    } else if (error.message.includes('Failed to fetch')) {
        userMessage = 'Unable to connect to the server. Please try again later.';
        logLevel = 'warn';
    } else if (error.message.includes('timeout')) {
        userMessage = 'Request timed out. Please try again.';
        logLevel = 'warn';
    } else if (error.message.includes('quota')) {
        userMessage = 'Service quota exceeded. Please try again later.';
        logLevel = 'warn';
    } else if (error.message.includes('authentication')) {
        userMessage = 'Authentication failed. Please sign in again.';
        logLevel = 'error';
    } else if (error.message.includes('validation')) {
        userMessage = 'Invalid data provided. Please check your profile.';
        logLevel = 'warn';
    }
    
    // Log the error
    if (logLevel === 'error') {
        console.error(`API Error${context ? ` (${context})` : ''}:`, error);
    } else {
        console.warn(`API Warning${context ? ` (${context})` : ''}:`, error);
    }
    
    // Show user message
    if (window.ui && window.ui.showToastMessage) {
        window.ui.showToastMessage(userMessage, 'error');
    }
    
    return userMessage;
}

// Rate limiting helper
class RateLimiter {
    constructor(maxRequests = 5, timeWindow = 60000) { // 5 requests per minute
        this.maxRequests = maxRequests;
        this.timeWindow = timeWindow;
        this.requests = [];
    }
    
    canMakeRequest() {
        const now = Date.now();
        
        // Remove old requests outside the time window
        this.requests = this.requests.filter(time => now - time < this.timeWindow);
        
        if (this.requests.length < this.maxRequests) {
            this.requests.push(now);
            return true;
        }
        
        return false;
    }
    
    getTimeUntilNextRequest() {
        if (this.requests.length === 0) return 0;
        
        const oldestRequest = Math.min(...this.requests);
        const now = Date.now();
        const timeElapsed = now - oldestRequest;
        
        return Math.max(0, this.timeWindow - timeElapsed);
    }
}

// Global rate limiter instance
const apiRateLimiter = new RateLimiter();

// Rate-limited version of getRecommendations
async function getRecommendationsWithRateLimit(profileData) {
    if (!apiRateLimiter.canMakeRequest()) {
        const waitTime = apiRateLimiter.getTimeUntilNextRequest();
        const message = `Too many requests. Please wait ${Math.ceil(waitTime / 1000)} seconds.`;
        
        if (window.ui && window.ui.showToastMessage) {
            window.ui.showToastMessage(message, 'warning');
        }
        
        throw new Error('Rate limit exceeded');
    }
    
    return await getRecommendations(profileData);
}

// Health check for monitoring
async function performHealthCheck() {
    try {
        const startTime = Date.now();
        const response = await fetch(`${API_BASE_URL}/health`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        const endTime = Date.now();
        
        const healthData = {
            status: response.ok ? 'healthy' : 'unhealthy',
            responseTime: endTime - startTime,
            statusCode: response.status,
            timestamp: new Date().toISOString()
        };
        
        console.log('Health check result:', healthData);
        return healthData;
        
    } catch (error) {
        const healthData = {
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        };
        
        console.error('Health check failed:', healthData);
        return healthData;
    }
}

// Export functions for global use
window.api = {
    getRecommendations,
    getRecommendationsWithRetry,
    getRecommendationsWithRateLimit,
    validateProfileForAPI,
    testAPIConnectivity,
    performHealthCheck,
    handleAPIError
};

// Auto-export for backward compatibility
window.getRecommendations = getRecommendations;
