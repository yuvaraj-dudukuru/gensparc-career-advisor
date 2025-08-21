// Basic unit tests for utils.js

const {
    calculateFitScore,
    normalizeSkills,
    cosineSimilarity,
    calculateOverlapRatio,
    calculateGapSkills,
    calculateOverlapSkills,
    sanitizeSkill,
    validateAndCleanProfile
} = require('./utils');

// Mock test data
const mockUserSkills = ['python', 'sql', 'excel'];
const mockRoleSkills = [
    { name: 'python', weight: 1.0 },
    { name: 'sql', weight: 0.9 },
    { name: 'statistics', weight: 0.8 },
    { name: 'tableau', weight: 0.7 }
];

// Test normalizeSkills function
function testNormalizeSkills() {
    console.log('Testing normalizeSkills...');
    
    const result = normalizeSkills(mockUserSkills);
    const expected = { python: 1.0, sql: 1.0, excel: 1.0 };
    
    const passed = JSON.stringify(result) === JSON.stringify(expected);
    console.log(`  normalizeSkills: ${passed ? 'PASS' : 'FAIL'}`);
    
    return passed;
}

// Test cosineSimilarity function
function testCosineSimilarity() {
    console.log('Testing cosineSimilarity...');
    
    const vectorA = { a: 1, b: 2, c: 3 };
    const vectorB = { a: 1, b: 2, c: 3 };
    
    const result = cosineSimilarity(vectorA, vectorB);
    const expected = 1.0; // Perfect similarity
    
    const passed = Math.abs(result - expected) < 0.001;
    console.log(`  cosineSimilarity (perfect match): ${passed ? 'PASS' : 'FAIL'}`);
    
    // Test orthogonal vectors
    const vectorC = { a: 1, b: 0, c: 0 };
    const vectorD = { a: 0, b: 1, c: 0 };
    
    const result2 = cosineSimilarity(vectorC, vectorD);
    const expected2 = 0; // Orthogonal vectors
    
    const passed2 = Math.abs(result2 - expected2) < 0.001;
    console.log(`  cosineSimilarity (orthogonal): ${passed2 ? 'PASS' : 'FAIL'}`);
    
    return passed && passed2;
}

// Test calculateFitScore function
function testCalculateFitScore() {
    console.log('Testing calculateFitScore...');
    
    const result = calculateFitScore(mockUserSkills, mockRoleSkills);
    
    // Should return a score between 0 and 100
    const passed = result >= 0 && result <= 100;
    console.log(`  calculateFitScore: ${passed ? 'PASS' : 'FAIL'} (score: ${result})`);
    
    return passed;
}

// Test calculateOverlapRatio function
function testCalculateOverlapRatio() {
    console.log('Testing calculateOverlapRatio...');
    
    const result = calculateOverlapRatio(mockUserSkills, mockRoleSkills);
    const expected = 2 / 4; // 2 overlapping skills out of 4 role skills
    
    const passed = Math.abs(result - expected) < 0.001;
    console.log(`  calculateOverlapRatio: ${passed ? 'PASS' : 'FAIL'} (ratio: ${result})`);
    
    return passed;
}

// Test calculateGapSkills function
function testCalculateGapSkills() {
    console.log('Testing calculateGapSkills...');
    
    const result = calculateGapSkills(mockUserSkills, mockRoleSkills);
    const expected = ['statistics', 'tableau'];
    
    const passed = JSON.stringify(result.sort()) === JSON.stringify(expected.sort());
    console.log(`  calculateGapSkills: ${passed ? 'PASS' : 'FAIL'}`);
    
    return passed;
}

// Test calculateOverlapSkills function
function testCalculateOverlapSkills() {
    console.log('Testing calculateOverlapSkills...');
    
    const result = calculateOverlapSkills(mockUserSkills, mockRoleSkills);
    const expected = ['python', 'sql'];
    
    const passed = JSON.stringify(result.sort()) === JSON.stringify(expected.sort());
    console.log(`  calculateOverlapSkills: ${passed ? 'PASS' : 'FAIL'}`);
    
    return passed;
}

// Test sanitizeSkill function
function testSanitizeSkill() {
    console.log('Testing sanitizeSkill...');
    
    const testCases = [
        { input: '  Python!@#  ', expected: 'python' },
        { input: 'SQL Server', expected: 'sql server' },
        { input: 'C++', expected: 'c' },
        { input: '', expected: '' },
        { input: 'a'.repeat(100), expected: 'a'.repeat(50) }
    ];
    
    let allPassed = true;
    
    testCases.forEach((testCase, index) => {
        const result = sanitizeSkill(testCase.input);
        const passed = result === testCase.expected;
        
        if (!passed) {
            console.log(`    Test case ${index + 1} FAILED: expected "${testCase.expected}", got "${result}"`);
            allPassed = false;
        }
    });
    
    console.log(`  sanitizeSkill: ${allPassed ? 'PASS' : 'FAIL'}`);
    return allPassed;
}

// Test validateAndCleanProfile function
function testValidateAndCleanProfile() {
    console.log('Testing validateAndCleanProfile...');
    
    const mockProfile = {
        name: 'Test User',
        education: 'UG',
        skills: ['python', 'sql', 'excel'],
        interests: ['data', 'technology'],
        weeklyTime: 15,
        budget: 'free',
        language: 'en'
    };
    
    const result = validateAndCleanProfile(mockProfile);
    
    // Check if all required fields are present and cleaned
    const passed = result.name === 'Test User' &&
                   result.education === 'UG' &&
                   Array.isArray(result.skills) &&
                   Array.isArray(result.interests) &&
                   result.weeklyTime === 15 &&
                   result.budget === 'free' &&
                   result.language === 'en';
    
    console.log(`  validateAndCleanProfile: ${passed ? 'PASS' : 'FAIL'}`);
    return passed;
}

// Run all tests
function runAllTests() {
    console.log('Running utility function tests...\n');
    
    const tests = [
        testNormalizeSkills,
        testCosineSimilarity,
        testCalculateFitScore,
        testCalculateOverlapRatio,
        testCalculateGapSkills,
        testCalculateOverlapSkills,
        testSanitizeSkill,
        testValidateAndCleanProfile
    ];
    
    let passedTests = 0;
    let totalTests = tests.length;
    
    tests.forEach(test => {
        try {
            if (test()) {
                passedTests++;
            }
        } catch (error) {
            console.log(`  ${test.name}: FAILED with error: ${error.message}`);
        }
    });
    
    console.log(`\nTest Results: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All tests passed!');
    } else {
        console.log('❌ Some tests failed. Please check the output above.');
    }
    
    return passedTests === totalTests;
}

// Export for use in other test files
module.exports = {
    runAllTests,
    testNormalizeSkills,
    testCosineSimilarity,
    testCalculateFitScore,
    testCalculateOverlapRatio,
    testCalculateGapSkills,
    testCalculateOverlapSkills,
    testSanitizeSkill,
    testValidateAndCleanProfile
};

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests();
}
