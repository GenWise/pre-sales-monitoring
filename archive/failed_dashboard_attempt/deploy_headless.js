#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const FORMS_CONFIG = [
    {
        id: '1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA',
        name: 'returning_students',
        url: 'https://docs.google.com/forms/d/1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA/edit',
        scriptPath: './corrected_scripts/returning_students_bound_script.js'
    },
    {
        id: '1gGyfmy4NmEgAdZrbex0ffoqGlI1B_LuRUfzvQeOCHCQ',
        name: 'ats_qualifiers',
        url: 'https://docs.google.com/forms/d/1gGyfmy4NmEgAdZrbex0ffoqGlI1B_LuRUfzvQeOCHCQ/edit',
        scriptPath: './corrected_scripts/ats_qualifiers_bound_script.js'
    },
    {
        id: '1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg',
        name: 'website',
        url: 'https://docs.google.com/forms/d/1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg/edit',
        scriptPath: './corrected_scripts/website_bound_script.js'
    },
    {
        id: '1IJVMLXOThuQE8WVI4bYiruJrTyxsznTomotkS2rfyYY',
        name: 'early_bird',
        url: 'https://docs.google.com/forms/d/1IJVMLXOThuQE8WVI4bYiruJrTyxsznTomotkS2rfyYY/edit',
        scriptPath: './corrected_scripts/early_bird_bound_script.js'
    }
];

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function deployFormScript(browser, form, scriptContent) {
    console.log(`\n🚀 Deploying to ${form.name}...`);

    const page = await browser.newPage();
    try {
        // Navigate to form
        console.log(`   📡 Navigating to form: ${form.url}`);
        await page.goto(form.url, { waitUntil: 'networkidle2', timeout: 30000 });

        // Take screenshot for debugging
        await page.screenshot({ path: `screenshots/${form.name}_01_loaded.png` });

        // Look for the three dots menu
        console.log(`   🔍 Looking for three dots menu...`);
        const menuSelectors = [
            '[data-test-id="Dhiq0c"]', // Updated selector
            'button[aria-label="More"]',
            'button[data-tooltip="More"]',
            '.VfPpkd-Bz112c-LgbsSe[aria-label*="More"]',
            '[jsname="LgbsSe"]'
        ];

        let menuButton = null;
        for (const selector of menuSelectors) {
            try {
                await page.waitForSelector(selector, { timeout: 5000 });
                menuButton = await page.$(selector);
                if (menuButton) {
                    console.log(`   ✅ Found menu with selector: ${selector}`);
                    break;
                }
            } catch (e) {
                console.log(`   ⚠️  Selector ${selector} not found, trying next...`);
            }
        }

        if (!menuButton) {
            // Try to find any button that might be the menu
            console.log(`   🔍 Searching for menu button by text...`);
            const buttons = await page.$$('button');
            for (const button of buttons) {
                const text = await page.evaluate(el => el.textContent || el.getAttribute('aria-label') || '', button);
                if (text.includes('More') || text.includes('⋮') || text.includes('menu')) {
                    menuButton = button;
                    console.log(`   ✅ Found menu button: ${text}`);
                    break;
                }
            }
        }

        if (!menuButton) {
            throw new Error('Could not find three dots menu button');
        }

        // Click the menu
        console.log(`   🖱️  Clicking three dots menu...`);
        await menuButton.click();
        await delay(2000);

        await page.screenshot({ path: `screenshots/${form.name}_02_menu_opened.png` });

        // Look for Script editor option
        console.log(`   🔍 Looking for Script editor option...`);
        const scriptEditorSelectors = [
            'span:contains("Script editor")',
            'div:contains("Script editor")',
            '[role="menuitem"]:contains("Script editor")'
        ];

        // Use XPath to find "Script editor" text
        const scriptEditorXPath = "//span[contains(text(), 'Script editor')] | //div[contains(text(), 'Script editor')]";
        await page.waitForXPath(scriptEditorXPath, { timeout: 10000 });

        const [scriptEditor] = await page.$x(scriptEditorXPath);
        if (!scriptEditor) {
            throw new Error('Could not find Script editor menu item');
        }

        console.log(`   🖱️  Clicking Script editor...`);
        await scriptEditor.click();

        // Wait for new tab/window to open (Apps Script editor)
        console.log(`   ⏳ Waiting for Apps Script editor to open...`);
        await delay(5000);

        // Get all pages (tabs)
        const pages = await browser.pages();
        const scriptPage = pages[pages.length - 1]; // Newest tab

        // Switch to script editor tab
        await scriptPage.bringToFront();
        await delay(3000);

        await scriptPage.screenshot({ path: `screenshots/${form.name}_03_script_editor.png` });

        // Wait for Apps Script editor to load
        console.log(`   ⏳ Waiting for code editor to load...`);
        await scriptPage.waitForSelector('.ace_editor, .monaco-editor, textarea', { timeout: 30000 });

        // Clear existing code and paste new script
        console.log(`   📝 Replacing script content...`);

        // Try different approaches to clear and set code
        const codeSetMethods = [
            // Method 1: Monaco editor
            async () => {
                const editor = await scriptPage.$('.monaco-editor');
                if (editor) {
                    await scriptPage.evaluate(() => {
                        if (window.monaco && window.monaco.editor) {
                            const editors = window.monaco.editor.getModels();
                            if (editors.length > 0) {
                                editors[0].setValue('');
                            }
                        }
                    });
                    await scriptPage.evaluate((code) => {
                        if (window.monaco && window.monaco.editor) {
                            const editors = window.monaco.editor.getModels();
                            if (editors.length > 0) {
                                editors[0].setValue(code);
                            }
                        }
                    }, scriptContent);
                    return true;
                }
                return false;
            },

            // Method 2: ACE editor
            async () => {
                const aceEditor = await scriptPage.$('.ace_editor');
                if (aceEditor) {
                    await scriptPage.evaluate(() => {
                        if (window.ace) {
                            const editor = window.ace.edit(document.querySelector('.ace_editor'));
                            editor.setValue('');
                        }
                    });
                    await scriptPage.evaluate((code) => {
                        if (window.ace) {
                            const editor = window.ace.edit(document.querySelector('.ace_editor'));
                            editor.setValue(code);
                        }
                    }, scriptContent);
                    return true;
                }
                return false;
            },

            // Method 3: Direct textarea
            async () => {
                const textarea = await scriptPage.$('textarea');
                if (textarea) {
                    await textarea.click({ clickCount: 3 }); // Select all
                    await textarea.type(scriptContent);
                    return true;
                }
                return false;
            }
        ];

        let codeSet = false;
        for (const method of codeSetMethods) {
            try {
                if (await method()) {
                    codeSet = true;
                    console.log(`   ✅ Code set successfully`);
                    break;
                }
            } catch (e) {
                console.log(`   ⚠️  Code setting method failed: ${e.message}`);
            }
        }

        if (!codeSet) {
            throw new Error('Could not set script code in editor');
        }

        await delay(2000);
        await scriptPage.screenshot({ path: `screenshots/${form.name}_04_code_set.png` });

        // Save the project (Cmd+S)
        console.log(`   💾 Saving project...`);
        await scriptPage.keyboard.down('Meta'); // Mac Command key
        await scriptPage.keyboard.press('s');
        await scriptPage.keyboard.up('Meta');

        await delay(3000);
        await scriptPage.screenshot({ path: `screenshots/${form.name}_05_saved.png` });

        console.log(`   ✅ ${form.name} deployment completed successfully!`);

        await scriptPage.close();
        return { success: true, form: form.name };

    } catch (error) {
        console.log(`   ❌ Error deploying ${form.name}: ${error.message}`);
        await page.screenshot({ path: `screenshots/${form.name}_error.png` });
        return { success: false, form: form.name, error: error.message };
    } finally {
        await page.close();
    }
}

async function main() {
    console.log('🚀 HEADLESS GOOGLE FORMS SCRIPT DEPLOYMENT');
    console.log('==========================================\n');

    // Ensure screenshots directory exists
    try {
        await fs.mkdir('screenshots', { recursive: true });
    } catch (e) {
        // Directory already exists
    }

    // Verify all script files exist
    console.log('🔍 Verifying script files...');
    for (const form of FORMS_CONFIG) {
        try {
            await fs.access(form.scriptPath);
            console.log(`   ✅ ${form.name}: ${form.scriptPath}`);
        } catch (e) {
            console.log(`   ❌ ${form.name}: Script file not found at ${form.scriptPath}`);
            process.exit(1);
        }
    }

    console.log('\n🌐 Launching browser...');
    const browser = await puppeteer.launch({
        headless: false, // Set to true for truly headless
        defaultViewport: null,
        args: [
            '--start-maximized',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
        ]
    });

    const results = [];

    try {
        for (const form of FORMS_CONFIG) {
            // Read script content
            const scriptContent = await fs.readFile(form.scriptPath, 'utf8');

            // Deploy to form
            const result = await deployFormScript(browser, form, scriptContent);
            results.push(result);

            // Small delay between forms
            await delay(2000);
        }

    } catch (error) {
        console.log(`💥 FATAL ERROR: ${error.message}`);
    } finally {
        await browser.close();
    }

    // Generate report
    console.log('\n📋 DEPLOYMENT SUMMARY');
    console.log('=====================');

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`✅ Successful: ${successful.length}/${results.length}`);
    successful.forEach(r => console.log(`   ✅ ${r.form}`));

    if (failed.length > 0) {
        console.log(`❌ Failed: ${failed.length}/${results.length}`);
        failed.forEach(r => console.log(`   ❌ ${r.form}: ${r.error}`));
    }

    // Save detailed report
    const report = {
        timestamp: new Date().toISOString(),
        results: results,
        summary: {
            total: results.length,
            successful: successful.length,
            failed: failed.length
        }
    };

    await fs.writeFile('deployment_report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Detailed report saved to deployment_report.json');

    if (failed.length === 0) {
        console.log('\n🎉 ALL DEPLOYMENTS SUCCESSFUL!');
        console.log('Your Google Forms are now fully automated!');
    } else {
        console.log('\n⚠️  Some deployments failed. Check the report for details.');
    }
}

if (require.main === module) {
    main().catch(console.error);
}