const { chromium } = require('playwright');

async function testFormSubmission() {
    console.log('=== Google Form Submission Test ===');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        // Navigate to the form
        console.log('Navigating to Google Form...');
        await page.goto('https://docs.google.com/forms/d/1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg/viewform');
        await page.waitForLoadState('networkidle');

        // Fill out the form with test data
        console.log('Filling form with test data...');

        // Child Name
        await page.fill('input[aria-labelledby*="Child"]', 'Subagent Test Child');

        // Parent Name
        await page.fill('input[aria-labelledby*="Parent Name"]', 'Subagent Test Parent');

        // Parent Email
        await page.fill('input[aria-labelledby*="Email"]', 'subagent.test@example.com');

        // Parent Mobile
        await page.fill('input[aria-labelledby*="Mobile"]', '9876543210');

        // Interest Level - select "Ready to Sign up" (high interest)
        await page.click('div[role="radio"]:has-text("Ready to Sign up and save almost 25% through available discounts")');

        console.log('Form filled, taking screenshot before submission...');
        await page.screenshot({ path: '/tmp/form_before_submit.png', fullPage: true });

        // Submit the form
        console.log('Submitting form...');
        await page.click('div[role="button"]:has-text("Submit")');

        // Wait for submission confirmation
        await page.waitForSelector('div:has-text("Your response has been recorded")', { timeout: 10000 });
        console.log('Form submitted successfully!');

        await page.screenshot({ path: '/tmp/form_after_submit.png', fullPage: true });

    } catch (error) {
        console.error('Error during form submission:', error);
        await page.screenshot({ path: '/tmp/form_error.png', fullPage: true });
    } finally {
        await browser.close();
    }
}

testFormSubmission();