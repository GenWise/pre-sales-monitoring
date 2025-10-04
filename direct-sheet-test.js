const { chromium } = require('playwright');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

async function testDirectSheetImplementation() {
    console.log('=== DIRECT SHEET WRITE IMPLEMENTATION TEST ===');
    console.log('Testing: Form → Google Apps Script → Direct Master Sheet Write');
    console.log('Starting test at:', new Date().toISOString());

    const results = {
        timestamp: new Date().toISOString(),
        steps: [],
        sheetData: {},
        errors: [],
        success: false,
        testData: {
            child_name: 'Direct Write Test Child',
            parent_name: 'Direct Write Test Parent',
            parent_email: 'directwrite.test@example.com',
            parent_mobile: '9876543210'
        }
    };

    let browser;

    try {
        // Step 1: Initialize Google Sheets connection
        console.log('\n1. Connecting to Google Sheets...');
        results.steps.push({ step: 1, action: 'Connecting to Google Sheets', timestamp: new Date().toISOString() });

        const serviceAccountAuth = new JWT({
            email: 'sheetspython@sheets-and-python-340711.iam.gserviceaccount.com',
            key: `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDZMvlkSHN293qT
mKJa6oXC+NVf5MpuePXz3ZpMPUT7bBhcCV5Z23VdhCX85eQELl8pCTi0hjJwaBC1
3AA397w3D10k5AlK+0/1RapRqdM6DWOQXff0fS72yLwOXekiqqYS+FALiCDLEE3x
xpVcSrd6MnLxHC1xxcpPKxXjmsLNc8PDzw1o8dMHG/PoP2thjbou2H81oNF9rW/O
ji9aIfqUKUSRBI5qoMu0jD0sn5bNEQN6k/SIV9gSlJmmvZMa8Re7ezRsleEhVvee
aR9OdBbCawRWdocFxpVSMaM119yaSleGvXUkUbrBRTNTY3/1boat6iaGmAh24Jgh
kVk/5CJlAgMBAAECggEAOB0KwGVVa1lhkis/WrS3TRljauxdfjAC/vd0CxlTLo+N
NY34Ecf4aOogtFciUxA15pCq1TzMYC0KkClf5xW6SxFNk5/UZMpLrIbMi1+QIjHe
VKhqTIBg90ICD8YkWp/y2vjLGUeYjU3PjVSsNtVY1JmfB3qrpPagH1b2x0Au7svt
XgWgnrUNnwYbB1rr4Hre0exxakzNAs3Q1l72LrKOdEcZa2f+mCNbLn3eO/FV16i1
n/y0nXaeoYlIATbmTWIq+/tTceBuod2O4UJMxOIN8QzVfgMVGK+Om9/UnrcQQPwH
WGacXJ+Xg4vCFbI/3suLODeZf1hrvVV3cfK0KEtYGwKBgQDnsuHa0d4F67QIkFoQ
LO89S+uySBH8E81hb8GFHLrdkcTkSWGyVf2GjBwXnyhVKzjBm5Rzk+5QqDlV27xz
nlFt/e/UV5uvVNcXa51MMt2K2M8Jpi0tr5G+nny18Oa6HuorB2oiyJwKQ+3pSGeC
lsHWuSWOCfUeYNpc1QH1J1e08wKBgQDv+sa1SalgOoTZo4KySBrOMDxgz38ieEOn
w89bAo2ZLNrnhLDl+2dWlAWaGyT2fLW6IW3iRyqm7iJM8MR0au8cnETMJbOdi5KL
ggdMOMOosP8t5NtUF/x/f/fHZMYW2LiBhjpyHR1bGzeecxgHPgo11mkFCEiaVURi
e7GVLLQBRwKBgQDLtm53au/verYWlXxqHmfWF+tKG62cWXjJA249b+4oIyLeqFo6
Zvp6ErQcXLYkc9T5/KVAHT96MP4ALCt76CWmNI9pvgFG3awjjl2Fgm9gxZD65d1w
/p2A4G27tevWlpnCbUl2/bScHe+OnTdNDOmutah8Qur945/54NpQxl+J2wKBgQDu
qy9S/4angKu9tEP4wYN/SzPRaKxdgNRwlmq0be6bx6OSnEI/CHC3B5ImuRZi2pb2
HecmI3dE/BM7CD2qNuvGPZiinGBtsHE3tENDyDS3ogi4ASMtGInz2DZ6pTvpXvLp
RrD76v7WLFR9jqP4F/iZoLtj2OA0NddERxbPcN05YwKBgFFIvTdfoozIc7y2U6ck
BMtPE85t9dxRhngKo5eI/nJyFabh6HUs0FucDSlIJ8iyvfZKUHdms6QzlNddm1fZ
mHgfhAExC2fwlqGcmnw/ONhbhq6NWYglALsxKmrqfn20aF9O1G1jACABIYajsj8D
Fz18fsQhJmPVAMWc0mJ9N7dS
-----END PRIVATE KEY-----`,
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });

        const doc = new GoogleSpreadsheet('1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ', serviceAccountAuth);
        await doc.loadInfo();
        console.log('Connected to sheet:', doc.title);

        // Step 2: Get baseline data from master sheet
        console.log('\n2. Getting baseline sheet data...');
        results.steps.push({ step: 2, action: 'Getting baseline data', timestamp: new Date().toISOString() });

        const sheet = doc.sheetsById[0]; // First sheet
        await sheet.loadCells();

        const rows = await sheet.getRows();
        results.sheetData.baseline = {
            rowCount: rows.length,
            timestamp: new Date().toISOString(),
            lastRowData: rows.length > 0 ? {
                child_name: rows[rows.length - 1]._rawData[0] || '',
                parent_name: rows[rows.length - 1]._rawData[1] || '',
                parent_email: rows[rows.length - 1]._rawData[2] || '',
                parent_mobile: rows[rows.length - 1]._rawData[3] || ''
            } : null
        };

        console.log(`Baseline: ${results.sheetData.baseline.rowCount} rows found`);
        if (results.sheetData.baseline.lastRowData) {
            console.log('Last row data:', results.sheetData.baseline.lastRowData);
        }

        // Step 3: Launch browser and navigate to form
        console.log('\n3. Launching browser for form submission...');
        results.steps.push({ step: 3, action: 'Launching browser', timestamp: new Date().toISOString() });

        browser = await chromium.launch({ headless: false });
        const context = await browser.newContext();
        const page = await context.newPage();

        // Navigate to the Google Form
        const formUrl = 'https://docs.google.com/forms/d/1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg/viewform';
        console.log('Navigating to form:', formUrl);
        await page.goto(formUrl, { waitUntil: 'networkidle' });

        // Take screenshot of initial form
        await page.screenshot({ path: '/Users/rajeshpanchanathan/code/pre-sales-monitoring/test-screenshots/form-initial.png' });
        console.log('Screenshot saved: form-initial.png');

        // Step 4: Fill out the form with test data
        console.log('\n4. Filling out the form...');
        results.steps.push({ step: 4, action: 'Filling form fields', timestamp: new Date().toISOString() });

        // Wait for form to load
        await page.waitForSelector('input[type="text"], textarea', { timeout: 10000 });

        // Get all input fields and fill them systematically
        const inputs = await page.$$('input[type="text"], textarea');
        console.log(`Found ${inputs.length} text input fields`);

        const testDataArray = [
            results.testData.child_name,
            results.testData.parent_name,
            results.testData.parent_email,
            results.testData.parent_mobile
        ];

        // Fill each input field
        for (let i = 0; i < Math.min(inputs.length, testDataArray.length); i++) {
            await inputs[i].fill(testDataArray[i]);
            console.log(`Filled field ${i + 1}: ${testDataArray[i]}`);
            await page.waitForTimeout(500);
        }

        // Scroll down to reveal any hidden form elements
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(1000);

        // Handle radio buttons for interest level - select first option (Ready to Sign up)
        try {
            await page.waitForSelector('input[type="radio"]', { timeout: 5000 });
            const radioButtons = await page.$$('input[type="radio"]');
            console.log(`Found ${radioButtons.length} radio buttons`);

            if (radioButtons.length > 0) {
                await radioButtons[0].click(); // Select first radio option (highest interest)
                console.log('Selected interest level: Ready to Sign up');
                await page.waitForTimeout(1000);
            } else {
                console.log('No radio buttons found after scrolling');
            }
        } catch (error) {
            console.log('Could not find/select interest level radio button:', error.message);
        }

        // Take screenshot before submission
        await page.screenshot({ path: '/Users/rajeshpanchanathan/code/pre-sales-monitoring/test-screenshots/form-filled.png' });
        console.log('Screenshot saved: form-filled.png');

        // Step 5: Submit the form
        console.log('\n5. Submitting the form...');
        results.steps.push({ step: 5, action: 'Submitting form', timestamp: new Date().toISOString() });

        // Find and click submit button
        const submitButton = await page.locator('span:has-text("Submit"), input[type="submit"], button[type="submit"]').first();

        if (await submitButton.count() > 0) {
            await submitButton.click();
            console.log('Form submitted successfully');

            // Wait for submission confirmation
            try {
                await page.waitForSelector('div:has-text("Your response has been recorded"), div:has-text("Thank you")', { timeout: 10000 });
                console.log('Submission confirmation received');
            } catch (error) {
                console.log('Warning: Could not find submission confirmation message');
            }

            // Take screenshot of confirmation
            await page.screenshot({ path: '/Users/rajeshpanchanathan/code/pre-sales-monitoring/test-screenshots/form-submitted.png' });
            console.log('Screenshot saved: form-submitted.png');

        } else {
            throw new Error('Submit button not found');
        }

        // Step 6: Wait for Google Apps Script processing
        console.log('\n6. Waiting 15 seconds for Google Apps Script processing...');
        results.steps.push({ step: 6, action: 'Waiting for script processing', timestamp: new Date().toISOString() });

        await new Promise(resolve => setTimeout(resolve, 15000)); // Wait 15 seconds

        // Step 7: Check for new data in sheet
        console.log('\n7. Checking for new data in master sheet...');
        results.steps.push({ step: 7, action: 'Checking for new data', timestamp: new Date().toISOString() });

        await sheet.loadCells(); // Reload sheet data
        const newRows = await sheet.getRows();

        results.sheetData.after = {
            rowCount: newRows.length,
            timestamp: new Date().toISOString(),
            lastRowData: newRows.length > 0 ? {
                child_name: newRows[newRows.length - 1]._rawData[0] || '',
                parent_name: newRows[newRows.length - 1]._rawData[1] || '',
                parent_email: newRows[newRows.length - 1]._rawData[2] || '',
                parent_mobile: newRows[newRows.length - 1]._rawData[3] || '',
                new_existing: newRows[newRows.length - 1]._rawData[4] || '',
                interest_level: newRows[newRows.length - 1]._rawData[5] || '',
                source_tag: newRows[newRows.length - 1]._rawData[6] || '',
                timestamp: newRows[newRows.length - 1]._rawData[7] || '',
                duplicate_flag: newRows[newRows.length - 1]._rawData[8] || '',
                status: newRows[newRows.length - 1]._rawData[9] || '',
                assigned_owner: newRows[newRows.length - 1]._rawData[10] || '',
                notes: newRows[newRows.length - 1]._rawData[11] || ''
            } : null
        };

        const rowIncrease = results.sheetData.after.rowCount - results.sheetData.baseline.rowCount;
        console.log(`After submission: ${results.sheetData.after.rowCount} rows found (${rowIncrease > 0 ? '+' : ''}${rowIncrease})`);

        // Step 8: Validate data
        console.log('\n8. Validating data alignment...');
        results.steps.push({ step: 8, action: 'Validating data', timestamp: new Date().toISOString() });

        if (rowIncrease > 0) {
            const lastRow = results.sheetData.after.lastRowData;
            const validations = [];

            // Check if our test data appears in the new row
            const dataMatches = {
                child_name: lastRow.child_name === results.testData.child_name,
                parent_name: lastRow.parent_name === results.testData.parent_name,
                parent_email: lastRow.parent_email === results.testData.parent_email,
                parent_mobile: lastRow.parent_mobile === results.testData.parent_mobile
            };

            console.log('Data validation results:');
            console.log('- Child Name:', dataMatches.child_name ? '✓' : '✗', `(expected: "${results.testData.child_name}", got: "${lastRow.child_name}")`);
            console.log('- Parent Name:', dataMatches.parent_name ? '✓' : '✗', `(expected: "${results.testData.parent_name}", got: "${lastRow.parent_name}")`);
            console.log('- Parent Email:', dataMatches.parent_email ? '✓' : '✗', `(expected: "${results.testData.parent_email}", got: "${lastRow.parent_email}")`);
            console.log('- Parent Mobile:', dataMatches.parent_mobile ? '✓' : '✗', `(expected: "${results.testData.parent_mobile}", got: "${lastRow.parent_mobile}")`);

            console.log('\nAdditional columns:');
            console.log('- Source Tag:', lastRow.source_tag || 'NOT SET');
            console.log('- Interest Level:', lastRow.interest_level || 'NOT SET');
            console.log('- Status:', lastRow.status || 'NOT SET');
            console.log('- Timestamp:', lastRow.timestamp || 'NOT SET');

            const allDataMatches = Object.values(dataMatches).every(match => match);
            if (allDataMatches) {
                console.log('\n✓ SUCCESS: Form submission directly wrote to master sheet with correct data!');
                results.success = true;
            } else {
                console.log('\n✗ ISSUE: Data mismatch detected in sheet');
                results.errors.push('Test data does not match what was written to sheet');
            }

            results.dataValidation = {
                matches: dataMatches,
                allMatch: allDataMatches,
                newRowData: lastRow
            };

        } else {
            console.log('\n✗ CRITICAL: No new row detected in master sheet');
            results.errors.push('Form submission did not create new row in master sheet');
        }

        results.steps.push({ step: 9, action: 'Test completed', timestamp: new Date().toISOString() });

    } catch (error) {
        results.errors.push(`Test execution error: ${error.message}`);
        console.error('Test execution error:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }

    // Generate comprehensive test report
    console.log('\n=== DIRECT SHEET WRITE TEST RESULTS ===');
    console.log('Test Duration:', new Date().toISOString());
    console.log('Success:', results.success);
    console.log('Steps Completed:', results.steps.length);
    console.log('Errors Found:', results.errors.length);

    if (results.sheetData.baseline && results.sheetData.after) {
        console.log('\nSheet Row Comparison:');
        console.log('Before:', results.sheetData.baseline.rowCount, 'rows');
        console.log('After:', results.sheetData.after.rowCount, 'rows');
        console.log('Change:', results.sheetData.after.rowCount - results.sheetData.baseline.rowCount);
    }

    if (results.errors.length > 0) {
        console.log('\nErrors Detected:');
        results.errors.forEach((error, index) => {
            console.log(`${index + 1}. ${error}`);
        });
    }

    // Save detailed results
    const fs = require('fs');
    const dir = '/Users/rajeshpanchanathan/code/pre-sales-monitoring/test-screenshots';
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(
        '/Users/rajeshpanchanathan/code/pre-sales-monitoring/direct-sheet-test-results.json',
        JSON.stringify(results, null, 2)
    );
    console.log('\nDetailed results saved to: direct-sheet-test-results.json');

    return results;
}

// Run the test
testDirectSheetImplementation().catch(console.error);