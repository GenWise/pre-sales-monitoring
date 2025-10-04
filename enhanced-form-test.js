const { chromium } = require('playwright');

async function inspectGoogleForm() {
    console.log('=== GOOGLE FORM INSPECTION TEST ===');
    console.log('Inspecting form structure to identify missing elements...');

    let browser;

    try {
        browser = await chromium.launch({ headless: false });
        const context = await browser.newContext();
        const page = await context.newPage();

        // Navigate to the Google Form
        const formUrl = 'https://docs.google.com/forms/d/1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg/viewform';
        console.log('Navigating to:', formUrl);
        await page.goto(formUrl, { waitUntil: 'networkidle' });

        // Wait for form to fully load
        await page.waitForSelector('form', { timeout: 10000 });

        // Get all form questions and structure
        const formStructure = await page.evaluate(() => {
            const questions = [];

            // Find all question containers
            const questionDivs = document.querySelectorAll('[role="listitem"], .freebirdFormviewerViewItemsItemItem');

            questionDivs.forEach((div, index) => {
                const questionText = div.querySelector('.freebirdFormviewerViewItemsItemItemTitle, [role="heading"], .Elumcf')?.textContent?.trim();

                if (questionText) {
                    const question = {
                        index: index,
                        text: questionText,
                        type: 'unknown',
                        options: [],
                        required: div.querySelector('.freebirdFormviewerViewItemsItemRequiredAsterisk, [aria-label*="required"]') ? true : false
                    };

                    // Check for input types
                    if (div.querySelector('input[type="text"], textarea')) {
                        question.type = 'text';
                    } else if (div.querySelector('input[type="radio"]')) {
                        question.type = 'radio';
                        const radioOptions = div.querySelectorAll('label');
                        radioOptions.forEach(label => {
                            const optionText = label.textContent?.trim();
                            if (optionText && optionText.length > 0) {
                                question.options.push(optionText);
                            }
                        });
                    } else if (div.querySelector('select')) {
                        question.type = 'select';
                        const selectOptions = div.querySelectorAll('option');
                        selectOptions.forEach(option => {
                            const optionText = option.textContent?.trim();
                            if (optionText && optionText.length > 0) {
                                question.options.push(optionText);
                            }
                        });
                    }

                    questions.push(question);
                }
            });

            return questions;
        });

        console.log('\n=== FORM STRUCTURE ANALYSIS ===');
        formStructure.forEach(q => {
            console.log(`\nQuestion ${q.index}: "${q.text}"`);
            console.log(`  Type: ${q.type}`);
            console.log(`  Required: ${q.required}`);
            if (q.options.length > 0) {
                console.log(`  Options: ${q.options.join(', ')}`);
            }
        });

        // Try to find and fill the complete form including interest level
        console.log('\n=== FILLING COMPLETE FORM ===');

        // Fill text fields
        const inputs = await page.$$('input[type="text"], textarea');
        console.log(`Found ${inputs.length} text input fields`);

        const testData = [
            'Enhanced Test Child',
            'Enhanced Test Parent',
            'enhanced.test@example.com',
            '9876543210'
        ];

        for (let i = 0; i < Math.min(inputs.length, testData.length); i++) {
            await inputs[i].fill(testData[i]);
            console.log(`Filled field ${i + 1}: ${testData[i]}`);
            await page.waitForTimeout(500);
        }

        // Look for radio buttons more systematically
        console.log('\nLooking for radio button groups...');
        const radioGroups = await page.$$('[role="radiogroup"], .freebirdFormviewerViewItemsRadioRadiogroupRadioGroup');
        console.log(`Found ${radioGroups.length} radio groups`);

        for (let i = 0; i < radioGroups.length; i++) {
            const group = radioGroups[i];
            const labels = await group.$$('label');
            console.log(`Radio group ${i + 1} has ${labels.length} options:`);

            for (let j = 0; j < labels.length; j++) {
                const text = await labels[j].textContent();
                console.log(`  Option ${j + 1}: "${text?.trim()}"`);

                // Select first option that sounds like "high" interest
                if (text && (text.toLowerCase().includes('high') || text.toLowerCase().includes('ready') || text.toLowerCase().includes('sign up'))) {
                    await labels[j].click();
                    console.log(`    ✓ Selected this option`);
                    break;
                }
            }
        }

        // Take screenshot of complete form
        await page.screenshot({ path: '/Users/rajeshpanchanathan/code/pre-sales-monitoring/form-complete.png' });
        console.log('Screenshot saved: form-complete.png');

        // Submit the form
        console.log('\n=== SUBMITTING FORM ===');

        // Look for submit button more broadly
        const submitSelectors = [
            'input[type="submit"]',
            'button[type="submit"]',
            '[role="button"]:has-text("Submit")',
            'span:has-text("Submit")',
            '.freebirdFormviewerViewNavigationSubmitButton'
        ];

        let submitButton = null;
        for (const selector of submitSelectors) {
            try {
                submitButton = await page.locator(selector).first();
                if (await submitButton.count() > 0) {
                    console.log(`Found submit button with selector: ${selector}`);
                    break;
                }
            } catch (e) {
                // Continue trying other selectors
            }
        }

        if (submitButton && await submitButton.count() > 0) {
            await submitButton.click();
            console.log('Form submitted');

            // Wait longer for confirmation and try multiple selectors
            try {
                await page.waitForSelector([
                    'div:has-text("Your response has been recorded")',
                    'div:has-text("Thank you")',
                    'div:has-text("response")',
                    '.freebirdFormviewerViewResponseConfirmationMessage'
                ].join(','), { timeout: 15000 });

                console.log('✓ Submission confirmed');

                // Take screenshot of confirmation
                await page.screenshot({ path: '/Users/rajeshpanchanathan/code/pre-sales-monitoring/form-confirmation.png' });
                console.log('Screenshot saved: form-confirmation.png');

            } catch (error) {
                console.log('⚠️ Could not find confirmation message, but form may have been submitted');
                await page.screenshot({ path: '/Users/rajeshpanchanathan/code/pre-sales-monitoring/form-after-submit.png' });
                console.log('Screenshot saved: form-after-submit.png');
            }
        } else {
            console.log('❌ Could not find submit button');
        }

    } catch (error) {
        console.error('Test error:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the enhanced test
inspectGoogleForm().catch(console.error);