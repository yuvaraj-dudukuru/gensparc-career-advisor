// Utility functions for GenSpark Career Advisor
const skillAliases = require('./skill_aliases.json');

/**
 * Calculate cosine similarity between two skill vectors
 * @param {Array} userSkills - Array of user skill strings
 * @param {Array} roleSkills - Array of role skill objects with name and weight
 * @returns {number} - Similarity score between 0 and 1
 */
function calculateFitScore(userSkills, roleSkills) {
    if (!userSkills || !roleSkills || userSkills.length === 0 || roleSkills.length === 0) {
        return 0;
    }
    
    // Normalize user skills
    const normalizedUserSkills = normalizeSkills(userSkills);
    
    // Create role skills vector
    const roleSkillsVector = {};
    roleSkills.forEach(skill => {
        const canonical = canonicalizeSkillName(skill.name);
        roleSkillsVector[canonical] = skill.weight || 1.0;
    });
    
    // Calculate cosine similarity
    const similarity = cosineSimilarity(normalizedUserSkills, roleSkillsVector);
    
    // Convert to percentage (0-100)
    return Math.round(similarity * 100);
}

/**
 * Normalize user skills for comparison
 * @param {Array} skills - Array of skill strings
 * @returns {Object} - Normalized skills object
 */
function normalizeSkills(skills) {
    const normalized = {};
    
    skills.forEach(skill => {
        const key = canonicalizeSkillName(skill);
        if (key.length > 0) {
            normalized[key] = 1.0;
        }
    });
    
    return normalized;
}

/**
 * Canonicalize a skill name using alias mapping
 * @param {string} name - Raw skill name
 * @returns {string} - Canonical skill name
 */
function canonicalizeSkillName(name) {
    if (typeof name !== 'string') return '';
    const cleaned = name
        .trim()
        .toLowerCase()
        .replace(/[^\/\w\s-]/g, '')
        .replace(/\s+/g, ' ');
    return skillAliases[cleaned] || cleaned;
}

/**
 * Calculate cosine similarity between two vectors
 * @param {Object} vectorA - First vector
 * @param {Object} vectorB - Second vector
 * @returns {number} - Similarity score between 0 and 1
 */
function cosineSimilarity(vectorA, vectorB) {
    // Get all unique keys from both vectors
    const allKeys = new Set([...Object.keys(vectorA), ...Object.keys(vectorB)]);
    
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    
    for (const key of allKeys) {
        const valueA = vectorA[key] || 0;
        const valueB = vectorB[key] || 0;
        
        dotProduct += valueA * valueB;
        magnitudeA += valueA * valueA;
        magnitudeB += valueB * valueB;
    }
    
    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);
    
    // Avoid division by zero
    if (magnitudeA === 0 || magnitudeB === 0) {
        return 0;
    }
    
    return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Calculate overlap ratio between user skills and role skills
 * @param {Array} userSkills - Array of user skill strings
 * @param {Array} roleSkills - Array of role skill objects
 * @returns {number} - Overlap ratio between 0 and 1
 */
function calculateOverlapRatio(userSkills, roleSkills) {
    if (!userSkills || !roleSkills || userSkills.length === 0 || roleSkills.length === 0) {
        return 0;
    }
    
    const normalizedUserSkills = userSkills.map(s => canonicalizeSkillName(s));
    const normalizedRoleSkills = roleSkills.map(s => canonicalizeSkillName(s.name));
    
    const overlap = normalizedUserSkills.filter(skill => 
        normalizedRoleSkills.includes(skill)
    ).length;
    
    return overlap / normalizedRoleSkills.length;
}

/**
 * Calculate gap skills (skills user needs to learn)
 * @param {Array} userSkills - Array of user skill strings
 * @param {Array} roleSkills - Array of role skill objects
 * @returns {Array} - Array of gap skill names
 */
function calculateGapSkills(userSkills, roleSkills) {
    if (!userSkills || !roleSkills) {
        return [];
    }
    
    const normalizedUserSkills = userSkills.map(s => canonicalizeSkillName(s));
    const normalizedRoleSkills = roleSkills.map(s => canonicalizeSkillName(s.name));
    
    return normalizedRoleSkills.filter(skill => 
        !normalizedUserSkills.includes(skill)
    );
}

/**
 * Calculate overlap skills (skills user already has)
 * @param {Array} userSkills - Array of user skill strings
 * @param {Array} roleSkills - Array of role skill objects
 * @returns {Array} - Array of overlap skill names
 */
function calculateOverlapSkills(userSkills, roleSkills) {
    if (!userSkills || !roleSkills) {
        return [];
    }
    
    const normalizedUserSkills = userSkills.map(s => canonicalizeSkillName(s));
    const normalizedRoleSkills = roleSkills.map(s => canonicalizeSkillName(s.name));
    
    return normalizedUserSkills.filter(skill => 
        normalizedRoleSkills.includes(skill)
    );
}

/**
 * Enhanced fit score calculation combining multiple factors
 * @param {Array} userSkills - Array of user skill strings
 * @param {Array} roleSkills - Array of role skill objects
 * @param {Array} userInterests - Array of user interest strings
 * @param {Object} role - Role object with sector and title
 * @returns {number} - Enhanced fit score between 0 and 100
 */
function calculateEnhancedFitScore(userSkills, roleSkills, userInterests, role) {
    // Skills similarity (60% weight)
    const skillsScore = calculateFitScore(userSkills, roleSkills) * 0.6;
    
    // Overlap ratio (20% weight)
    const overlapScore = calculateOverlapRatio(userSkills, roleSkills) * 100 * 0.2;
    
    // Interest match (20% weight)
    const interestScore = calculateInterestMatch(userInterests, role) * 100 * 0.2;
    
    return Math.round(skillsScore + overlapScore + interestScore);
}

/**
 * Calculate interest match between user interests and role
 * @param {Array} userInterests - Array of user interest strings
 * @param {Object} role - Role object with sector and title
 * @returns {number} - Interest match score between 0 and 1
 */
function calculateInterestMatch(userInterests, role) {
    if (!userInterests || !role) {
        return 0;
    }
    
    const normalizedInterests = userInterests.map(i => i.toLowerCase().trim());
    const roleText = `${role.sector} ${role.title}`.toLowerCase();
    
    // Check if any user interest appears in role description
    const hasMatch = normalizedInterests.some(interest => 
        roleText.includes(interest)
    );
    
    return hasMatch ? 1 : 0;
}

/**
 * Sanitize and validate skill names
 * @param {string} skill - Skill name to sanitize
 * @returns {string} - Sanitized skill name
 */
function sanitizeSkill(skill) {
    if (typeof skill !== 'string') {
        return '';
    }
    
    return canonicalizeSkillName(skill)
        .substring(0, 50); // Limit length
}

/**
 * Validate and clean user profile data
 * @param {Object} profile - User profile object
 * @returns {Object} - Cleaned profile object
 */
function validateAndCleanProfile(profile) {
    const cleaned = { ...profile };
    
    // Clean skills
    if (Array.isArray(cleaned.skills)) {
        cleaned.skills = cleaned.skills
            .map(sanitizeSkill)
            .filter(skill => skill.length > 0)
            .slice(0, 20); // Limit to 20 skills
    }
    
    // Clean interests
    if (Array.isArray(cleaned.interests)) {
        cleaned.interests = cleaned.interests
            .map(sanitizeSkill)
            .filter(interest => interest.length > 0)
            .slice(0, 10); // Limit to 10 interests
    }
    
    // Validate weekly time
    if (typeof cleaned.weeklyTime === 'number') {
        cleaned.weeklyTime = Math.min(Math.max(cleaned.weeklyTime, 1), 40);
    }
    
    // Validate education
    const validEducation = ['12th', 'Diploma', 'UG', 'PG', 'Other'];
    if (!validEducation.includes(cleaned.education)) {
        cleaned.education = 'Other';
    }
    
    // Validate budget
    const validBudget = ['free', 'low', 'any'];
    if (!validBudget.includes(cleaned.budget)) {
        cleaned.budget = 'free';
    }
    
    // Validate language
    const validLanguage = ['en', 'hi'];
    if (!validLanguage.includes(cleaned.language)) {
        cleaned.language = 'en';
    }
    
    return cleaned;
}

/**
 * Generate skill recommendations based on user's current skills
 * @param {Array} userSkills - Array of user skill strings
 * @param {Object} roles - All available roles
 * @returns {Array} - Array of recommended skills to learn
 */
function generateSkillRecommendations(userSkills, roles) {
    if (!userSkills || !roles) {
        return [];
    }
    
    const normalizedUserSkills = userSkills.map(s => s.toLowerCase().trim());
    const allSkills = new Set();
    const skillFrequency = {};
    
    // Collect all skills from all roles
    Object.values(roles).forEach(role => {
        role.skills.forEach(skill => {
            const skillName = skill.name.toLowerCase().trim();
            allSkills.add(skillName);
            
            if (!skillFrequency[skillName]) {
                skillFrequency[skillName] = 0;
            }
            skillFrequency[skillName]++;
        });
    });
    
    // Find skills user doesn't have
    const missingSkills = Array.from(allSkills).filter(skill => 
        !normalizedUserSkills.includes(skill)
    );
    
    // Sort by frequency and return top recommendations
    return missingSkills
        .sort((a, b) => skillFrequency[b] - skillFrequency[a])
        .slice(0, 10);
}

// Export all utility functions
module.exports = {
    calculateFitScore,
    normalizeSkills,
    cosineSimilarity,
    calculateOverlapRatio,
    calculateGapSkills,
    calculateOverlapSkills,
    calculateEnhancedFitScore,
    calculateInterestMatch,
    sanitizeSkill,
    validateAndCleanProfile,
    generateSkillRecommendations,
    canonicalizeSkillName
};
