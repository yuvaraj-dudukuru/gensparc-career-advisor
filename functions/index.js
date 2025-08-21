const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Initialize Firebase Admin
admin.initializeApp();

// Import local modules
const { buildExplainPrompt, buildPlanPrompt, buildExtractSkillsPrompt } = require('./prompts');
const { calculateFitScore, normalizeSkills, calculateEnhancedFitScore, canonicalizeSkillName } = require('./utils');
const roles = require('./roles.json');

// Initialize Express app
const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS configuration - only allow Firebase Hosting origin (tight allowlist)
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        try {
            const url = new URL(origin);
            const host = url.host; // includes port if any
            const hostname = url.hostname;
            const isLocal = host === 'localhost:5000' || host === '127.0.0.1:5000';
            const isFirebaseHost = hostname.endsWith('.web.app') || hostname.endsWith('.firebaseapp.com');
            if (isLocal || isFirebaseHost) {
                return callback(null, true);
            }
        } catch (_) {}
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
};

app.use(cors(corsOptions));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'GenSpark Career Advisor API',
        version: '1.0.0'
    });
});

// Main recommendation endpoint
app.post('/api/recommend', async (req, res) => {
    try {
        console.log('Received recommendation request:', { 
            uid: req.body.uid,
            profileKeys: Object.keys(req.body.profile || {})
        });

        // Validate request
        const validation = validateRequest(req.body);
        if (!validation.isValid) {
            console.warn('Invalid request:', validation.errors);
            return res.status(400).json({
                error: 'Invalid request',
                details: validation.errors
            });
        }

        const { uid, profile } = req.body;

        // Normalize and validate profile data
        const normalizedProfile = normalizeProfile(profile);
        
        // Get Gemini API key
        const geminiApiKey = getGeminiApiKey();
        if (!geminiApiKey) {
            console.error('Gemini API key not configured');
            return res.status(500).json({
                error: 'AI service not configured',
                message: 'Please contact support'
            });
        }

        // Generate recommendations
        const recommendations = await generateRecommendations(normalizedProfile, geminiApiKey);
        
        if (!recommendations || recommendations.length === 0) {
            console.error('Failed to generate recommendations');
            return res.status(500).json({
                error: 'Failed to generate recommendations',
                message: 'Please try again later'
            });
        }

        // Save recommendations to Firestore
        await saveRecommendationsToFirestore(uid, recommendations);

        console.log(`Generated ${recommendations.length} recommendations for user ${uid}`);

        res.status(200).json({
            success: true,
            recommendations: recommendations,
            generatedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error in /api/recommend:', error);
        
        let statusCode = 500;
        let errorMessage = 'Internal server error';
        
        if (error.message.includes('API key')) {
            statusCode = 500;
            errorMessage = 'AI service configuration error';
        } else if (error.message.includes('quota')) {
            statusCode = 429;
            errorMessage = 'Service quota exceeded. Please try again later.';
        } else if (error.message.includes('timeout')) {
            statusCode = 408;
            errorMessage = 'Request timeout. Please try again.';
        }
        
        res.status(statusCode).json({
            error: errorMessage,
            message: 'Please try again later'
        });
    }
});

// Request validation
function validateRequest(body) {
    const errors = [];
    
    if (!body.uid || typeof body.uid !== 'string') {
        errors.push('uid is required and must be a string');
    }
    
    if (!body.profile || typeof body.profile !== 'object') {
        errors.push('profile is required and must be an object');
        return { isValid: false, errors };
    }
    
    const profile = body.profile;
    
    if (!profile.name || typeof profile.name !== 'string' || profile.name.trim().length < 2) {
        errors.push('name must be at least 2 characters long');
    }
    
    if (!profile.education || !['12th', 'Diploma', 'UG', 'PG', 'Other'].includes(profile.education)) {
        errors.push('education must be one of: 12th, Diploma, UG, PG, Other');
    }
    
    if (!profile.skills || !Array.isArray(profile.skills) || profile.skills.length === 0) {
        errors.push('skills must be a non-empty array');
    }
    
    if (!profile.interests || !Array.isArray(profile.interests) || profile.interests.length === 0) {
        errors.push('interests must be a non-empty array');
    }
    
    if (!profile.weeklyTime || typeof profile.weeklyTime !== 'number' || profile.weeklyTime < 1 || profile.weeklyTime > 40) {
        errors.push('weeklyTime must be a number between 1 and 40');
    }
    
    if (!profile.budget || !['free', 'low', 'any'].includes(profile.budget)) {
        errors.push('budget must be one of: free, low, any');
    }
    
    if (!profile.language || !['en', 'hi'].includes(profile.language)) {
        errors.push('language must be one of: en, hi');
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// Profile normalization
function normalizeProfile(profile) {
    return {
        name: profile.name.trim(),
        education: profile.education,
        skills: profile.skills.map(skill => canonicalizeSkillName(skill)).filter(skill => skill.length > 0),
        interests: profile.interests.map(interest => interest.trim().toLowerCase()).filter(interest => interest.length > 0),
        weeklyTime: Math.min(Math.max(profile.weeklyTime, 1), 40),
        budget: profile.budget,
        language: profile.language
    };
}

// Get Gemini API key from environment or Firebase config
function getGeminiApiKey() {
    // Try environment variable first
    if (process.env.GEMINI_API_KEY) {
        return process.env.GEMINI_API_KEY;
    }
    
    // Try Firebase Functions config
    try {
        const config = functions.config();
        if (config.gemini && config.gemini.key) {
            return config.gemini.key;
        }
    } catch (error) {
        console.warn('Could not access Firebase config:', error.message);
    }
    
    return null;
}

// Generate recommendations using Gemini AI
async function generateRecommendations(profile, apiKey) {
    try {
        const recommendations = [];
        
        // Get top 3 role matches based on skills and interests
        const topRoles = getTopRoleMatches(profile, 3);
        
        const db = admin.firestore();
        for (const role of topRoles) {
            try {
                // Generate explanation for why this role fits
                const explainPrompt = buildExplainPrompt(profile, role, role.skills);
                const explanation = await callGeminiAPI(explainPrompt, apiKey);
                
                // Generate learning plan
                const planPrompt = buildPlanPrompt(profile, role.gapSkills);
                const planResponse = await callGeminiAPI(planPrompt, apiKey);
                
                // Parse learning plan
                const learningPlan = parseLearningPlan(planResponse);
                
                // Calculate fit score
                const fitScore = calculateEnhancedFitScore(profile.skills, role.skills, profile.interests, role);

                // Attach demand score if available
                let demandScore = null;
                try {
                    const trendDoc = await db.collection('trends').doc(`role_${role.roleId}`).get();
                    if (trendDoc.exists && trendDoc.data() && typeof trendDoc.data().demandScore === 'number') {
                        demandScore = Math.round(trendDoc.data().demandScore);
                    }
                } catch (_) {}
                
                const recommendation = {
                    roleId: role.roleId,
                    title: role.title,
                    fitScore: Math.round(fitScore),
                    demandScore: demandScore,
                    why: explanation || `Good match based on your ${profile.skills.join(', ')} skills.`,
                    overlapSkills: role.overlapSkills || [],
                    gapSkills: role.gapSkills || [],
                    plan: learningPlan
                };
                
                recommendations.push(recommendation);
                
            } catch (error) {
                console.error(`Error generating recommendation for ${role.title}:`, error);
                // Continue with other roles
            }
        }
        
        return recommendations;
        
    } catch (error) {
        console.error('Error in generateRecommendations:', error);
        throw error;
    }
}

// Get top role matches based on skills and interests
function getTopRoleMatches(profile, count = 3) {
    const roleScores = [];
    
    for (const role of Object.values(roles)) {
        const normalizedRoleSkills = role.skills.map(s => canonicalizeSkillName(s.name));
        const normalizedProfileSkills = profile.skills.map(s => canonicalizeSkillName(s));
        
        // Calculate overlap skills
        const overlapSkills = normalizedProfileSkills.filter(skill => 
            normalizedRoleSkills.includes(skill)
        );
        
        // Calculate gap skills
        const gapSkills = normalizedRoleSkills.filter(skill => 
            !normalizedProfileSkills.includes(skill)
        );
        
        // Enhanced score combining skills, overlap, and interest
        const score = calculateEnhancedFitScore(profile.skills, role.skills, profile.interests, role);
        
        roleScores.push({
            ...role,
            score,
            overlapSkills,
            gapSkills
        });
    }
    
    // Sort by score and return top matches
    return roleScores
        .sort((a, b) => b.score - a.score)
        .slice(0, count);
}

// Call Gemini API
async function callGeminiAPI(prompt, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
    
    const requestBody = {
        contents: [{
            parts: [{
                text: prompt
            }]
        }],
        generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
        },
        safetySettings: [
            {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
        ]
    };
    
    const maxRetries = 3;
    const timeoutMs = 20000;
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetchWithTimeout(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            }, timeoutMs);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Gemini API error:', response.status, errorText);
                if (response.status === 400) throw new Error('Invalid request to AI service');
                if (response.status === 429) throw new Error('AI service quota exceeded');
                if (response.status === 500) throw new Error('AI service internal error');
                throw new Error(`AI service error: ${response.status}`);
            }
            
            const data = await response.json();
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                throw new Error('Invalid response from AI service');
            }
            return data.candidates[0].content.parts[0].text;
        } catch (err) {
            lastError = err;
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
            if (attempt < maxRetries) await new Promise(r => setTimeout(r, delay));
        }
    }
    throw lastError || new Error('AI request failed');
}

function fetchWithTimeout(resource, options = {}, timeout = 20000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    return fetch(resource, { ...options, signal: controller.signal })
        .finally(() => clearTimeout(id));
}

// Parse learning plan from AI response
function parseLearningPlan(aiResponse) {
    try {
        // Try to extract JSON from the response
        let jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
        if (!jsonMatch) {
            jsonMatch = aiResponse.match(/```\s*([\s\S]*?)\s*```/);
        }
        
        let jsonString = jsonMatch ? jsonMatch[1] : aiResponse;
        if (!jsonMatch) {
            const first = aiResponse.indexOf('{');
            const last = aiResponse.lastIndexOf('}');
            if (first !== -1 && last !== -1 && last > first) {
                jsonString = aiResponse.substring(first, last + 1);
            }
        }
        
        // Clean up the JSON string
        jsonString = jsonString.trim();
        
        // Try to parse the JSON
        const plan = JSON.parse(jsonString);
        
        // Validate the plan structure
        if (!plan.weeks || !Array.isArray(plan.weeks)) {
            throw new Error('Invalid plan structure: missing weeks array');
        }
        
        // Ensure we have 4 weeks by padding or truncating
        if (plan.weeks.length < 4) {
            while (plan.weeks.length < 4) {
                plan.weeks.push({ week: plan.weeks.length + 1 });
            }
        } else if (plan.weeks.length > 4) {
            plan.weeks = plan.weeks.slice(0, 4);
        }
        
        // Validate each week
        plan.weeks.forEach((week, index) => {
            if (!week.week || week.week !== index + 1) {
                week.week = index + 1;
            }
            
            if (!week.topics || !Array.isArray(week.topics)) {
                week.topics = ['Topics to be determined'];
            }
            
            if (!week.practice || !Array.isArray(week.practice)) {
                week.practice = ['Practice activities to be determined'];
            }
            
            if (!week.assessment) {
                week.assessment = 'Assessment to be determined';
            }
            
            if (!week.project) {
                week.project = 'Project to be determined';
            }
        });
        
        return plan;
        
    } catch (error) {
        console.error('Error parsing learning plan:', error);
        
        // Return a fallback plan
        return {
            weeks: [
                {
                    week: 1,
                    topics: ['Basic concepts and fundamentals'],
                    practice: ['Hands-on exercises and tutorials'],
                    assessment: 'Knowledge check quiz',
                    project: 'Simple introductory project'
                },
                {
                    week: 2,
                    topics: ['Intermediate concepts and techniques'],
                    practice: ['Practical exercises and case studies'],
                    assessment: 'Skills assessment',
                    project: 'Intermediate level project'
                },
                {
                    week: 3,
                    topics: ['Advanced concepts and best practices'],
                    practice: ['Complex exercises and real-world scenarios'],
                    assessment: 'Advanced skills test',
                    project: 'Advanced level project'
                },
                {
                    week: 4,
                    topics: ['Integration and real-world application'],
                    practice: ['Final project preparation'],
                    assessment: 'Final project review',
                    project: 'Capstone project'
                }
            ]
        };
    }
}

// Extract skills endpoint
app.post('/api/extract_skills', async (req, res) => {
    try {
        const { text, language = 'en' } = req.body || {};
        if (!text || typeof text !== 'string' || text.trim().length < 10) {
            return res.status(400).json({ error: 'Invalid text input' });
        }
        const redacted = redactPII(text);
        const apiKey = getGeminiApiKey();
        if (!apiKey) return res.status(500).json({ error: 'AI service not configured' });
        const prompt = buildExtractSkillsPrompt(redacted, language);
        const response = await callGeminiAPI(prompt, apiKey);
        const payload = safeParseJSON(response);
        if (!payload) return res.status(500).json({ error: 'Failed to parse AI response' });
        const canon = (arr = []) => arr.map(s => ({
            name: canonicalizeSkillName(s.name || ''),
            confidence: typeof s.confidence === 'number' ? s.confidence : 0,
            evidence: s.evidence || ''
        })).filter(s => s.name);
        return res.status(200).json({
            hardSkills: canon(payload.hardSkills),
            softSkills: canon(payload.softSkills)
        });
    } catch (e) {
        console.error('extract_skills error', e);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

function redactPII(input) {
    return input
        .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
        .replace(/\b\+?\d[\d\s().-]{8,}\b/g, '[redacted-phone]');
}

function safeParseJSON(s) {
    try {
        const first = s.indexOf('{');
        const last = s.lastIndexOf('}');
        const json = first !== -1 && last !== -1 ? s.substring(first, last + 1) : s;
        return JSON.parse(json);
    } catch (_) { return null; }
}

// Trends endpoint reads precomputed snapshots from Firestore
app.get('/api/trends', async (req, res) => {
    try {
        const { skill, role } = req.query || {};
        if (!skill && !role) return res.status(400).json({ error: 'skill or role query is required' });
        const id = skill ? `skill_${canonicalizeSkillName(skill)}` : `role_${role}`;
        const snap = await admin.firestore().collection('trends').doc(id).get();
        if (!snap.exists) return res.status(404).json({ error: 'Not found' });
        const data = snap.data();
        const demandScore = computeDemandScore(data);
        return res.status(200).json({ ...data, demandScore });
    } catch (e) {
        console.error('trends error', e);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

function computeDemandScore(d) {
    try {
        const freq = Number(d.postingFrequencyNorm || 0);
        const trend = Number(d.trendSlopeNorm || 0);
        const salary = Number(d.salaryIndexNorm || 0);
        const score = 0.45 * freq + 0.35 * trend + 0.20 * salary;
        return Math.round(score * 100);
    } catch (_) { return null; }
}

// Save recommendations to Firestore
async function saveRecommendationsToFirestore(uid, recommendations) {
    try {
        const db = admin.firestore();
        
        await db.collection('users').doc(uid).collection('recommendations').add({
            recommendations: recommendations,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            userId: uid
        });
        
        console.log(`Saved recommendations to Firestore for user ${uid}`);
        
    } catch (error) {
        console.error('Error saving to Firestore:', error);
        // Don't throw error here as the main response is already sent
    }
}

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    
    if (error.message === 'Not allowed by CORS') {
        res.status(403).json({
            error: 'CORS error',
            message: 'Request not allowed from this origin'
        });
    } else {
        res.status(500).json({
            error: 'Internal server error',
            message: 'Something went wrong'
        });
    }
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: 'Endpoint not found'
    });
});

// Export the Express app as a Firebase Cloud Function
exports.app = functions.https.onRequest(app);
