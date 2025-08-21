// Prompt builders for Gemini AI

// Build prompt for explaining why a role fits the user
function buildExplainPrompt(profile, role, roleSkills) {
    const language = profile.language === 'hi' ? 'Hindi' : 'English';
    const educationLevel = getEducationDisplay(profile.education);
    
    return `You are a career advisor helping a user understand why a specific job role fits their background.

User Profile:
- Name: ${profile.name}
- Education: ${educationLevel}
- Current Skills: ${profile.skills.join(', ')}
- Interests: ${profile.interests.join(', ')}
- Weekly Study Time: ${profile.weeklyTime} hours
- Budget Preference: ${profile.budget}
- Language: ${language}

Job Role: ${role.title}
Required Skills: ${roleSkills.map(s => s.name).join(', ')}

Task: Write a concise explanation (maximum 120 words) in ${language} explaining why this role is a good fit for the user. Include a short bullet list mapping of user's skills to required skills.

Focus on:
1. How their current skills align with the role requirements
2. How their interests connect to this career path
3. Why this role makes sense given their background

Guidelines:
- Be encouraging and positive
- Use specific examples from their skills
- Keep it under 120 words
- Write in ${language}
- Avoid mentioning sensitive personal attributes
- Focus on professional growth opportunities
- Include a 2–3 bullet mapping like "python → data cleaning, automation" using the user's skills

Response: Write only the explanation, no additional formatting or text.`;
}

// Build prompt for generating learning plan
function buildPlanPrompt(profile, gapSkills) {
    const language = profile.language === 'hi' ? 'Hindi' : 'English';
    const budgetText = getBudgetText(profile.budget);
    const timeText = getTimeText(profile.weeklyTime);
    
    return `You are a learning path designer creating a 4-week structured learning plan.

User Context:
- Current Skills: ${profile.skills.join(', ')}
- Skills to Learn: ${gapSkills.join(', ')}
- Weekly Study Time: ${profile.weeklyTime} hours (${timeText})
- Budget: ${budgetText}
- Language: ${language}

Requirements:
Create a 4-week learning plan in JSON format with the following structure:

{
  "prerequisites": ["skill or concept"],
  "weeks": [
    {
      "week": 1,
      "topics": ["Topic 1", "Topic 2"],
      "timePerTopicHours": [2, 2],
      "practice": ["Practice activity 1", "Practice activity 2"],
      "assessment": "Assessment description",
      "project": "Project description",
      "resources": [
        {"title":"NPTEL/YouTube/Docs link title","type":"free|low|paid","url":"https://..."}
      ]
    }
  ]
}

Guidelines:
- Each week should have 2-3 topics that build progressively
- Practice activities should be hands-on and practical
- Assessments should be measurable (quizzes, tests, etc.)
- Projects should be realistic and build upon previous weeks (one cumulative portfolio project)
- Respect the ${profile.weeklyTime} hours per week constraint; ensure sum(timePerTopicHours) ≤ ${profile.weeklyTime}
- Use ${budgetText} resources; prefer NPTEL, IIT courses, official docs, low-bandwidth options
- Make content relevant to Indian job market context
- Ensure topics are specific and actionable
- Provide resource URLs when possible

Response: Return ONLY the JSON object, no additional text, explanations, or markdown formatting. The response must be valid JSON that can be parsed directly.`;
}

// Build prompt for extracting skills from free text
function buildExtractSkillsPrompt(text, languageCode) {
    const language = languageCode === 'hi' ? 'Hindi' : 'English';
    return `You are a skills extractor. Given a user's free-text description, extract hard and soft skills with confidence scores and short evidence quotes from the text. Return ONLY JSON.

Input Language: ${language}

Text:
"""
${text}
"""

Output JSON schema:
{
  "hardSkills": [{"name": "python", "confidence": 0.9, "evidence": "built a script in python"}],
  "softSkills": [{"name": "communication", "confidence": 0.8, "evidence": "presented in college"}]
}

Guidelines:
- Use standardized skill names (e.g., python, sql, excel, react, aws)
- Confidence in [0,1]
- Evidence must be a short quote from input
- Return only JSON, no markdown.`;
}

// Helper function to get education display text
function getEducationDisplay(education) {
    const educationMap = {
        '12th': '12th Standard',
        'Diploma': 'Diploma',
        'UG': 'Undergraduate Degree',
        'PG': 'Postgraduate Degree',
        'Other': 'Other Education'
    };
    return educationMap[education] || education;
}

// Helper function to get budget text
function getBudgetText(budget) {
    const budgetMap = {
        'free': 'free resources only (YouTube, free courses, documentation)',
        'low': 'low-cost resources (under ₹1000/month for courses, books)',
        'any': 'any budget resources (premium courses, certifications, tools)'
    };
    return budgetMap[budget] || budget;
}

// Helper function to get time text
function getTimeText(hours) {
    if (hours <= 5) return 'part-time learning';
    if (hours <= 10) return 'moderate learning pace';
    if (hours <= 20) return 'intensive learning';
    return 'full-time learning pace';
}

// Export functions
module.exports = {
    buildExplainPrompt,
    buildPlanPrompt,
    buildExtractSkillsPrompt
};
