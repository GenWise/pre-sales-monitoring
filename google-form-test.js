const { chromium } = require('playwright');
const axios = require('axios');

async function testGoogleFormSubmission() {
    console.log('=== GOOGLE FORM SUBMISSION AUTOMATED TEST ===');
    console.log('Starting automated diagnostic test at:', new Date().toISOString());

    const results = {
        timestamp: new Date().toISOString(),
        steps: [],
        webhookLogs: [],
        apiComparison: {},
        errors: [],
        success: false
    };

    let browser;

    try {
        // Step 1: Get baseline API data
        console.log('\n1. Getting baseline API data...');
        results.steps.push({ step: 1, action: 'Getting baseline API data', timestamp: new Date().toISOString() });

        try {
            const baselineResponse = await axios.get('http://localhost:3002/api/leads');
            results.apiComparison.baseline = {
                count: baselineResponse.data.length,
                lastEntry: baselineResponse.data[baselineResponse.data.length - 1] || null,
                timestamp: new Date().toISOString()
            };
            console.log(`Baseline: ${baselineResponse.data.length} leads found`);
        } catch (error) {
            results.errors.push(`API baseline check failed: ${error.message}`);
            console.error('API baseline check failed:', error.message);
        }

        // Step 2: Launch browser and navigate to form
        console.log('\n2. Launching browser and navigating to form...');
        results.steps.push({ step: 2, action: 'Launching browser', timestamp: new Date().toISOString() });

        browser = await chromium.launch({ headless: false }); // Keep visible for debugging
        const context = await browser.newContext();
        const page = await context.newPage();

        // Navigate to the Google Form
        const formUrl = 'https://docs.google.com/forms/d/1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg/viewform';
        console.log('Navigating to:', formUrl);
        await page.goto(formUrl, { waitUntil: 'networkidle' });

        // Take screenshot of initial form
        await page.screenshot({ path: '/Users/rajeshpanchanathan/code/pre-sales-monitoring/form-initial.png' });
        console.log('Screenshot saved: form-initial.png');

        // Step 3: Fill out the form
        console.log('\n3. Filling out the form...');
        results.steps.push({ step: 3, action: 'Filling form fields', timestamp: new Date().toISOString() });

        // Wait for form to load
        await page.waitForSelector('input[type="text"], textarea', { timeout: 10000 });

        // Get all input fields and fill them systematically
        const inputs = await page.$$('input[type="text"], textarea');
        console.log(`Found ${inputs.length} text input fields`);

        // Test data
        const testData = [
            'Automated Test Child',    // Child name
            'Automated Test Parent',   // Parent name
            'automated.test@example.com', // Email
            '9876543210'              // Phone
        ];

        // Fill each input field
        for (let i = 0; i < Math.min(inputs.length, testData.length); i++) {
            await inputs[i].fill(testData[i]);
            console.log(`Filled field ${i + 1}: ${testData[i]}`);
            await page.waitForTimeout(500); // Small delay between fields
        }

        // Handle radio buttons for interest level (look for "High" option)
        try {
            const radioLabels = await page.$$('label');
            for (const label of radioLabels) {
                const text = await label.textContent();
                if (text && text.toLowerCase().includes('high')) {
                    await label.click();
                    console.log('Selected high interest level');
                    break;
                }
            }
        } catch (error) {
            console.log('Could not find/select interest level radio button');
        }

        // Take screenshot before submission
        await page.screenshot({ path: '/Users/rajeshpanchanathan/code/pre-sales-monitoring/form-filled.png' });
        console.log('Screenshot saved: form-filled.png');

        // Step 4: Submit the form
        console.log('\n4. Submitting the form...');
        results.steps.push({ step: 4, action: 'Submitting form', timestamp: new Date().toISOString() });

        // Find and click submit button
        const submitButton = await page.locator('span:has-text("Submit"), input[type="submit"], button[type="submit"]').first();

        if (await submitButton.count() > 0) {
            await submitButton.click();
            console.log('Form submitted successfully');

            // Wait for submission confirmation
            await page.waitForSelector('div:has-text("Your response has been recorded"), div:has-text("Thank you")', { timeout: 10000 });
            console.log('Submission confirmation received');

            // Take screenshot of confirmation
            await page.screenshot({ path: '/Users/rajeshpanchanathan/code/pre-sales-monitoring/form-submitted.png' });
            console.log('Screenshot saved: form-submitted.png');

        } else {
            throw new Error('Submit button not found');
        }

        // Step 5: Wait and check API for changes
        console.log('\n5. Waiting 10 seconds then checking for API changes...');
        results.steps.push({ step: 5, action: 'Waiting for webhook processing', timestamp: new Date().toISOString() });

        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds for webhook processing

        try {
            const afterResponse = await axios.get('http://localhost:3002/api/leads');
            results.apiComparison.after = {
                count: afterResponse.data.length,
                lastEntry: afterResponse.data[afterResponse.data.length - 1] || null,
                timestamp: new Date().toISOString()
            };

            const countIncrease = results.apiComparison.after.count - results.apiComparison.baseline.count;
            console.log(`After submission: ${results.apiComparison.after.count} leads found (${countIncrease > 0 ? '+' : ''}${countIncrease})`);

            if (countIncrease > 0) {
                console.log('SUCCESS: New lead detected in API!');
                results.success = true;
            } else {
                console.log('ISSUE: No new leads detected in API');
                results.errors.push('No new leads appeared in API after form submission');
            }

        } catch (error) {
            results.errors.push(`API after-check failed: ${error.message}`);
            console.error('API after-check failed:', error.message);
        }

        results.steps.push({ step: 6, action: 'Test completed', timestamp: new Date().toISOString() });

    } catch (error) {
        results.errors.push(`Test execution error: ${error.message}`);
        console.error('Test execution error:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }

    // Generate test report
    console.log('\n=== TEST RESULTS ===');
    console.log('Test Duration:', new Date().toISOString());
    console.log('Success:', results.success);
    console.log('Steps Completed:', results.steps.length);
    console.log('Errors Found:', results.errors.length);

    if (results.apiComparison.baseline && results.apiComparison.after) {
        console.log('\nAPI Comparison:');
        console.log('Before:', results.apiComparison.baseline.count, 'leads');
        console.log('After:', results.apiComparison.after.count, 'leads');
        console.log('Change:', results.apiComparison.after.count - results.apiComparison.baseline.count);
    }

    if (results.errors.length > 0) {
        console.log('\nErrors:');
        results.errors.forEach((error, index) => {
            console.log(`${index + 1}. ${error}`);
        });
    }

    // Save detailed results
    const fs = require('fs');
    fs.writeFileSync(
        '/Users/rajeshpanchanathan/code/pre-sales-monitoring/test-results.json',
        JSON.stringify(results, null, 2)
    );
    console.log('\nDetailed results saved to: test-results.json');

    return results;
}

// Run the test
testGoogleFormSubmission().catch(console.error);