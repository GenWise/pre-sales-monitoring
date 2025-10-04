/**
 * End-to-End Automation Test Script
 * Pre-sales Monitoring System
 *
 * Based on subagent-generated testing steps
 * Usage: node e2e_automation_test.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Test Configuration
const CONFIG = {
    formUrl: 'https://docs.google.com/forms/d/1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg/viewform',
    masterSheetId: '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ',
    apiEndpoint: 'http://localhost:3002/api/leads',
    testData: {
        childName: 'E2E Test Child',
        parentName: 'E2E Test Parent',
        email: 'e2e.test@automation.com',
        mobile: '9876543210',
        interest: 'High'
    },
    timeouts: {
        navigation: 30000,
        element: 10000,
        submission: 60000
    },
    screenshotDir: './test-screenshots'
};

class E2EAutomationTest {
    constructor() {
        this.browser = null;
        this.page = null;
        this.startTime = Date.now();
        this.results = {
            success: false,
            steps: [],
            errors: [],
            screenshots: []
        };
    }

    async setup() {
        // Create screenshots directory
        if (!fs.existsSync(CONFIG.screenshotDir)) {
            fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
        }

        // Launch browser
        this.browser = await chromium.launch({
            headless: false,
            timeout: CONFIG.timeouts.navigation
        });

        this.page = await this.browser.newPage();
        this.log('Browser launched successfully');
    }

    async step1_navigateToForm() {
        this.log('Step 1: Navigate to Google Form');
        await this.page.goto(CONFIG.formUrl, {
            waitUntil: 'networkidle',
            timeout: CONFIG.timeouts.navigation
        });

        await this.page.waitForSelector('form', { timeout: CONFIG.timeouts.element });
        await this.screenshot('01-form-loaded');
        this.log('✓ Form loaded successfully');
    }

    async step2_getBaselineData() {
        this.log('Step 2: Get baseline lead count');
        try {
            const response = await fetch(CONFIG.apiEndpoint);
            const data = await response.json();
            this.baselineCount = data.total || 0;
            this.log(`✓ Baseline lead count: ${this.baselineCount}`);
        } catch (error) {
            this.log(`⚠ API unavailable, skipping baseline check: ${error.message}`);
            this.baselineCount = null;
        }
    }

    async step3_fillChildName() {
        this.log('Step 3: Fill child name field');
        const selectors = [
            'input[type="text"]',
            'div[role="listitem"]:first-of-type input[type="text"]',
            'input[placeholder*="Your answer"]',
            '[data-params*="Child"] input',
            'input[aria-label*="Child"]'
        ];

        const element = await this.findElement(selectors);
        await element.fill(CONFIG.testData.childName);
        this.log(`✓ Child name filled: ${CONFIG.testData.childName}`);
    }

    async step4_fillParentName() {
        this.log('Step 4: Fill parent name field');
        const selectors = [
            'input[type="text"]:nth-of-type(2)',
            'div[role="listitem"]:nth-of-type(2) input[type="text"]',
            'input[placeholder*="Your answer"]:nth-of-type(2)',
            '[data-params*="Parent"] input',
            'input[aria-label*="Parent"]'
        ];

        const element = await this.findElement(selectors);
        await element.fill(CONFIG.testData.parentName);
        this.log(`✓ Parent name filled: ${CONFIG.testData.parentName}`);
    }

    async step5_fillEmail() {
        this.log('Step 5: Fill email field');
        const selectors = [
            'input[type="text"]:nth-of-type(3)',
            'div[role="listitem"]:nth-of-type(3) input[type="text"]',
            'input[placeholder*="Your answer"]:nth-of-type(3)',
            'input[type="email"]',
            'input[aria-label*="Email"]'
        ];

        const element = await this.findElement(selectors);
        await element.fill(CONFIG.testData.email);
        this.log(`✓ Email filled: ${CONFIG.testData.email}`);
    }

    async step6_fillMobile() {
        this.log('Step 6: Fill mobile field');
        const selectors = [
            'input[type="text"]:nth-of-type(4)',
            'div[role="listitem"]:nth-of-type(4) input[type="text"]',
            'input[placeholder*="Your answer"]:nth-of-type(4)',
            'input[type="tel"]',
            'input[aria-label*="Mobile"]'
        ];

        const element = await this.findElement(selectors);
        await element.fill(CONFIG.testData.mobile);
        this.log(`✓ Mobile filled: ${CONFIG.testData.mobile}`);
    }

    async step7_selectInterestLevel() {
        this.log('Step 7: Select high interest level');
        const highInterestSelectors = [
            'span:has-text("Ready to sign up")',
            'span:has-text("ready to sign up")',
            'span:has-text("High")',
            'span:has-text("Very interested")',
            'span:has-text("Definitely")'
        ];

        const element = await this.findElement(highInterestSelectors);
        await element.click();
        await this.page.waitForTimeout(1000);
        this.log('✓ High interest level selected');
        await this.screenshot('02-form-filled');
    }

    async step8_submitForm() {
        this.log('Step 8: Submit form');
        const submitSelectors = [
            'span:has-text("Submit")',
            'input[type="submit"]',
            '[role="button"]:has-text("Submit")'
        ];

        const submitButton = await this.findElement(submitSelectors);
        await submitButton.click();
        this.log('✓ Submit button clicked');
    }

    async step9_waitForConfirmation() {
        this.log('Step 9: Wait for submission confirmation');
        try {
            await this.page.waitForSelector(
                'text="Your response has been recorded"',
                { timeout: CONFIG.timeouts.submission }
            );
            await this.screenshot('03-submission-success');
            this.log('✓ Submission confirmation received');
            return true;
        } catch (error) {
            await this.screenshot('03-submission-failed');
            this.log(`✗ No confirmation message: ${error.message}`);
            return false;
        }
    }

    async step10_verifyApiUpdate() {
        this.log('Step 10: Verify API lead count increase');
        if (this.baselineCount === null) {
            this.log('⚠ Skipping API verification (baseline unavailable)');
            return true;
        }

        // Wait for potential processing delay
        await this.page.waitForTimeout(5000);

        try {
            const response = await fetch(CONFIG.apiEndpoint);
            const data = await response.json();
            const newCount = data.total || 0;

            if (newCount > this.baselineCount) {
                this.log(`✓ Lead count increased: ${this.baselineCount} → ${newCount}`);
                return true;
            } else {
                this.log(`✗ Lead count unchanged: ${this.baselineCount} → ${newCount}`);
                return false;
            }
        } catch (error) {
            this.log(`✗ API verification failed: ${error.message}`);
            return false;
        }
    }

    async findElement(selectors) {
        for (const selector of selectors) {
            try {
                await this.page.waitForSelector(selector, { timeout: 2000 });
                return await this.page.locator(selector).first();
            } catch (error) {
                // Continue to next selector
            }
        }
        throw new Error(`None of the selectors found: ${selectors.join(', ')}`);
    }

    async screenshot(name) {
        const filename = `${name}-${Date.now()}.png`;
        const filepath = path.join(CONFIG.screenshotDir, filename);
        await this.page.screenshot({ path: filepath });
        this.results.screenshots.push(filename);
        this.log(`📸 Screenshot saved: ${filename}`);
    }

    log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}`;
        console.log(logMessage);
        this.results.steps.push(logMessage);
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
            this.log('Browser closed');
        }
    }

    async run() {
        try {
            await this.setup();
            await this.step1_navigateToForm();
            await this.step2_getBaselineData();
            await this.step3_fillChildName();
            await this.step4_fillParentName();
            await this.step5_fillEmail();
            await this.step6_fillMobile();
            await this.step7_selectInterestLevel();
            await this.step8_submitForm();

            const confirmationReceived = await this.step9_waitForConfirmation();
            const apiUpdated = await this.step10_verifyApiUpdate();

            this.results.success = confirmationReceived && (apiUpdated || this.baselineCount === null);

            if (this.results.success) {
                this.log('🎉 E2E Test PASSED');
            } else {
                this.log('❌ E2E Test FAILED');
            }

        } catch (error) {
            this.log(`💥 Fatal error: ${error.message}`);
            this.results.errors.push(error.message);
            await this.screenshot('error-state');
        } finally {
            await this.cleanup();
            this.generateReport();
        }
    }

    generateReport() {
        const duration = Date.now() - this.startTime;
        const report = {
            testName: 'Pre-sales Monitoring E2E Test',
            timestamp: new Date().toISOString(),
            duration: `${duration}ms`,
            success: this.results.success,
            testData: CONFIG.testData,
            baselineLeadCount: this.baselineCount,
            steps: this.results.steps,
            errors: this.results.errors,
            screenshots: this.results.screenshots
        };

        const reportPath = path.join(CONFIG.screenshotDir, `e2e-report-${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        this.log(`📊 Test report saved: ${reportPath}`);

        return report;
    }
}

// Run the test if called directly
if (require.main === module) {
    const test = new E2EAutomationTest();
    test.run().then(() => {
        process.exit(test.results.success ? 0 : 1);
    });
}

module.exports = E2EAutomationTest;