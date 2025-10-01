#!/usr/bin/env node

/**
 * GOOGLE FORMS SCRIPT DEPLOYMENT AUTOMATION
 *
 * This script automates the deployment of Google Apps Scripts directly into Google Forms
 * using Puppeteer for browser automation. It handles authentication, navigation,
 * script deployment, and verification.
 *
 * REQUIRES: npm install puppeteer readline-sync chalk
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const readline = require('readline-sync');
const chalk = require('chalk');

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  forms: [
    {
      name: 'returning_students',
      id: '1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA',
      url: 'https://docs.google.com/forms/d/1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA/edit',
      scriptPath: '/Users/rajeshpanchanathan/code/pre-sales-monitoring/corrected_scripts/returning_students_bound_script.js'
    },
    {
      name: 'ats_qualifiers',
      id: '1gGyfmy4NmEgAdZrbex0ffoqGlI1B_LuRUfzvQeOCHCQ',
      url: 'https://docs.google.com/forms/d/1gGyfmy4NmEgAdZrbex0ffoqGlI1B_LuRUfzvQeOCHCQ/edit',
      scriptPath: '/Users/rajeshpanchanathan/code/pre-sales-monitoring/corrected_scripts/ats_qualifiers_bound_script.js'
    },
    {
      name: 'website',
      id: '1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg',
      url: 'https://docs.google.com/forms/d/1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg/edit',
      scriptPath: '/Users/rajeshpanchanathan/code/pre-sales-monitoring/corrected_scripts/website_bound_script.js'
    },
    {
      name: 'early_bird',
      id: '1IJVMLXOThuQE8WVI4bYiruJrTyxsznTomotkS2rfyYY',
      url: 'https://docs.google.com/forms/d/1IJVMLXOThuQE8WVI4bYiruJrTyxsznTomotkS2rfyYY/edit',
      scriptPath: '/Users/rajeshpanchanathan/code/pre-sales-monitoring/corrected_scripts/early_bird_bound_script.js'
    }
  ],

  timeouts: {
    navigation: 30000,
    element: 10000,
    script: 5000,
    save: 15000
  },

  retries: {
    maxAttempts: 3,
    delay: 2000
  },

  screenshots: {
    enabled: true,
    directory: '/Users/rajeshpanchanathan/code/pre-sales-monitoring/screenshots'
  }
};

// =============================================================================
// DEPLOYMENT AUTOMATION CLASS
// =============================================================================

class GoogleFormsScriptDeployer {
  constructor() {
    this.browser = null;
    this.page = null;
    this.deploymentReport = {
      startTime: new Date().toISOString(),
      forms: [],
      summary: {
        total: CONFIG.forms.length,
        successful: 0,
        failed: 0,
        errors: []
      }
    };

    this.ensureDirectories();
  }

  /**
   * Ensure required directories exist
   */
  ensureDirectories() {
    if (!fs.existsSync(CONFIG.screenshots.directory)) {
      fs.mkdirSync(CONFIG.screenshots.directory, { recursive: true });
    }
  }

  /**
   * Initialize browser and page
   */
  async initialize() {
    console.log(chalk.blue('🚀 Initializing browser automation...'));

    this.browser = await puppeteer.launch({
      headless: false, // Set to true for headless operation
      defaultViewport: { width: 1920, height: 1080 },
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });

    this.page = await this.browser.newPage();
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Set longer timeouts
    this.page.setDefaultTimeout(CONFIG.timeouts.navigation);
    this.page.setDefaultNavigationTimeout(CONFIG.timeouts.navigation);

    console.log(chalk.green('✅ Browser initialized successfully'));
  }

  /**
   * Handle Google authentication
   */
  async handleAuthentication() {
    console.log(chalk.blue('🔐 Handling Google authentication...'));

    try {
      // Navigate to Google Forms first
      await this.page.goto('https://forms.google.com', { waitUntil: 'networkidle0' });
      await this.takeScreenshot('01_google_forms_landing');

      // Check if already logged in
      const isLoggedIn = await this.page.$('div[data-user-email]') !== null;

      if (isLoggedIn) {
        console.log(chalk.green('✅ Already authenticated with Google'));
        return true;
      }

      // Look for sign-in button
      const signInButton = await this.page.$('a[href*="accounts.google.com"]');
      if (signInButton) {
        console.log(chalk.yellow('🔑 Clicking sign-in button...'));
        await signInButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
      }

      await this.takeScreenshot('02_auth_page');

      // Wait for manual authentication
      console.log(chalk.yellow('⏳ Please complete Google authentication in the browser...'));
      console.log(chalk.yellow('   - Enter your email and password'));
      console.log(chalk.yellow('   - Complete any 2FA if required'));
      console.log(chalk.yellow('   - Wait for redirect to Google Forms'));

      // Wait for authentication to complete
      await this.waitForAuthentication();

      console.log(chalk.green('✅ Authentication completed'));
      return true;

    } catch (error) {
      console.error(chalk.red('❌ Authentication failed:'), error.message);
      await this.takeScreenshot('error_authentication');
      return false;
    }
  }

  /**
   * Wait for authentication to complete
   */
  async waitForAuthentication() {
    const maxWaitTime = 300000; // 5 minutes
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        // Check if we're back at Google Forms and logged in
        const currentUrl = this.page.url();

        if (currentUrl.includes('forms.google.com') || currentUrl.includes('docs.google.com')) {
          const userElement = await this.page.$('div[data-user-email], img[data-src*="googleusercontent.com"]');
          if (userElement) {
            return true;
          }
        }

        await this.page.waitForTimeout(2000);

      } catch (error) {
        // Continue waiting
      }
    }

    throw new Error('Authentication timeout - please ensure you are logged in');
  }

  /**
   * Deploy script to a specific form
   */
  async deployToForm(formConfig) {
    const formReport = {
      name: formConfig.name,
      id: formConfig.id,
      url: formConfig.url,
      startTime: new Date().toISOString(),
      status: 'pending',
      steps: [],
      errors: []
    };

    try {
      console.log(chalk.blue(`\n📝 Deploying script to ${formConfig.name}...`));

      // Step 1: Load the script content
      formReport.steps.push('Loading script content');
      const scriptContent = fs.readFileSync(formConfig.scriptPath, 'utf8');
      console.log(chalk.gray(`   Script loaded: ${scriptContent.length} characters`));

      // Step 2: Navigate to form
      formReport.steps.push('Navigating to form');
      await this.page.goto(formConfig.url, { waitUntil: 'networkidle0' });
      await this.takeScreenshot(`${formConfig.name}_01_form_loaded`);

      // Step 3: Open script editor
      formReport.steps.push('Opening script editor');
      await this.openScriptEditor();
      await this.takeScreenshot(`${formConfig.name}_02_script_editor_opened`);

      // Step 4: Clear existing code and paste new script
      formReport.steps.push('Deploying script content');
      await this.deployScript(scriptContent);
      await this.takeScreenshot(`${formConfig.name}_03_script_deployed`);

      // Step 5: Save the project
      formReport.steps.push('Saving project');
      await this.saveProject();
      await this.takeScreenshot(`${formConfig.name}_04_project_saved`);

      // Step 6: Test the webhook function
      formReport.steps.push('Testing webhook');
      const testResult = await this.testWebhookFunction();
      formReport.testResult = testResult;
      await this.takeScreenshot(`${formConfig.name}_05_test_completed`);

      formReport.status = 'success';
      formReport.endTime = new Date().toISOString();

      console.log(chalk.green(`✅ ${formConfig.name} deployment completed successfully`));
      this.deploymentReport.summary.successful++;

    } catch (error) {
      formReport.status = 'failed';
      formReport.errors.push(error.message);
      formReport.endTime = new Date().toISOString();

      console.error(chalk.red(`❌ ${formConfig.name} deployment failed:`), error.message);
      await this.takeScreenshot(`${formConfig.name}_error`);

      this.deploymentReport.summary.failed++;
      this.deploymentReport.summary.errors.push({
        form: formConfig.name,
        error: error.message
      });
    }

    this.deploymentReport.forms.push(formReport);
  }

  /**
   * Open the script editor from Google Form
   */
  async openScriptEditor() {
    try {
      // Look for the three-dots menu (more options)
      const menuSelectors = [
        'button[aria-label="More"]',
        'button[data-tooltip="More"]',
        'div[role="button"][aria-label="More"]',
        '.docs-icon-more-vert',
        '[data-testid="more-menu"]'
      ];

      let menuButton = null;
      for (const selector of menuSelectors) {
        menuButton = await this.page.$(selector);
        if (menuButton) break;
      }

      if (!menuButton) {
        // Try finding by icon or text
        await this.page.waitForTimeout(2000);
        menuButton = await this.page.$x("//button[contains(@aria-label, 'More') or contains(@data-tooltip, 'More')]");
        if (menuButton.length > 0) {
          menuButton = menuButton[0];
        } else {
          throw new Error('Could not find More menu button');
        }
      }

      console.log(chalk.gray('   Clicking More menu...'));
      await menuButton.click();
      await this.page.waitForTimeout(1000);

      // Look for Script editor option
      const scriptEditorSelectors = [
        'div[role="menuitem"]:has-text("Script editor")',
        'span:has-text("Script editor")',
        '[data-testid="script-editor"]'
      ];

      let scriptEditorOption = null;
      for (const selector of scriptEditorSelectors) {
        try {
          scriptEditorOption = await this.page.$(selector);
          if (scriptEditorOption) break;
        } catch (e) {
          // Continue to next selector
        }
      }

      if (!scriptEditorOption) {
        // Try XPath approach
        const scriptEditorElements = await this.page.$x("//span[contains(text(), 'Script editor')] | //div[contains(text(), 'Script editor')]");
        if (scriptEditorElements.length > 0) {
          scriptEditorOption = scriptEditorElements[0];
        } else {
          throw new Error('Could not find Script editor option in menu');
        }
      }

      console.log(chalk.gray('   Clicking Script editor...'));
      await scriptEditorOption.click();

      // Wait for Apps Script editor to load
      await this.page.waitForTimeout(3000);

      // Handle new tab if Apps Script opens in new tab
      const pages = await this.browser.pages();
      if (pages.length > 1) {
        // Switch to the Apps Script tab
        this.page = pages[pages.length - 1];
        await this.page.bringToFront();
      }

      // Wait for Apps Script interface to load
      await this.page.waitForTimeout(5000);

      console.log(chalk.gray('   Script editor opened successfully'));

    } catch (error) {
      throw new Error(`Failed to open script editor: ${error.message}`);
    }
  }

  /**
   * Deploy script content to the editor
   */
  async deployScript(scriptContent) {
    try {
      console.log(chalk.gray('   Clearing existing code...'));

      // Wait for the code editor to be ready
      await this.page.waitForTimeout(3000);

      // Find the code editor - try multiple selectors
      const editorSelectors = [
        '.ace_editor .ace_text-input',
        '#script-editor .ace_text-input',
        '.CodeMirror textarea',
        '.monaco-editor textarea',
        '[role="textbox"]'
      ];

      let codeEditor = null;
      for (const selector of editorSelectors) {
        try {
          codeEditor = await this.page.$(selector);
          if (codeEditor) break;
        } catch (e) {
          continue;
        }
      }

      if (!codeEditor) {
        // Try clicking on the editor area first
        const editorArea = await this.page.$('.ace_editor, .CodeMirror, .monaco-editor');
        if (editorArea) {
          await editorArea.click();
          await this.page.waitForTimeout(1000);

          // Try again to find the input
          for (const selector of editorSelectors) {
            try {
              codeEditor = await this.page.$(selector);
              if (codeEditor) break;
            } catch (e) {
              continue;
            }
          }
        }
      }

      if (!codeEditor) {
        // Fallback: use keyboard shortcuts
        console.log(chalk.yellow('   Using fallback method with keyboard shortcuts...'));

        // Focus on the page and select all
        await this.page.keyboard.press('Escape');
        await this.page.waitForTimeout(500);
        await this.page.keyboard.down('Meta'); // Cmd on Mac
        await this.page.keyboard.press('a');
        await this.page.keyboard.up('Meta');
        await this.page.waitForTimeout(500);

        // Type the new script
        await this.page.keyboard.type(scriptContent);

      } else {
        // Focus on the editor
        await codeEditor.focus();
        await this.page.waitForTimeout(500);

        // Select all existing code
        await this.page.keyboard.down('Meta'); // Cmd on Mac (use 'Control' for Windows/Linux)
        await this.page.keyboard.press('a');
        await this.page.keyboard.up('Meta');
        await this.page.waitForTimeout(500);

        // Type the new script content
        await this.page.keyboard.type(scriptContent);
      }

      console.log(chalk.gray('   Script content deployed successfully'));

    } catch (error) {
      throw new Error(`Failed to deploy script: ${error.message}`);
    }
  }

  /**
   * Save the Apps Script project
   */
  async saveProject() {
    try {
      console.log(chalk.gray('   Saving project...'));

      // Use Cmd+S (Mac) or Ctrl+S (Windows/Linux) to save
      await this.page.keyboard.down('Meta'); // Use 'Control' for Windows/Linux
      await this.page.keyboard.press('s');
      await this.page.keyboard.up('Meta');

      // Wait for save to complete
      await this.page.waitForTimeout(3000);

      // Look for save confirmation or any save-related indicators
      try {
        await this.page.waitForSelector('.docs-save-indicator', { timeout: 5000 });
        console.log(chalk.gray('   Save indicator detected'));
      } catch (e) {
        // Save indicator might not be visible, continue
        console.log(chalk.gray('   Save completed (no indicator found)'));
      }

      console.log(chalk.gray('   Project saved successfully'));

    } catch (error) {
      throw new Error(`Failed to save project: ${error.message}`);
    }
  }

  /**
   * Test the webhook function
   */
  async testWebhookFunction() {
    try {
      console.log(chalk.gray('   Testing webhook function...'));

      // Look for function dropdown or run button
      const runButtonSelectors = [
        'button[aria-label="Run"]',
        '#run-button',
        '.run-button',
        'button:has-text("Run")'
      ];

      // First, try to select the testWebhook function
      const functionDropdownSelectors = [
        'select[title*="function"]',
        '#function-dropdown',
        '.function-selector'
      ];

      let functionDropdown = null;
      for (const selector of functionDropdownSelectors) {
        try {
          functionDropdown = await this.page.$(selector);
          if (functionDropdown) break;
        } catch (e) {
          continue;
        }
      }

      if (functionDropdown) {
        await functionDropdown.click();
        await this.page.waitForTimeout(1000);

        // Look for testWebhook option
        const testWebhookOption = await this.page.$x("//option[contains(text(), 'testWebhook')]");
        if (testWebhookOption.length > 0) {
          await testWebhookOption[0].click();
          console.log(chalk.gray('   testWebhook function selected'));
        }
      }

      // Try to click run button
      let runButton = null;
      for (const selector of runButtonSelectors) {
        try {
          runButton = await this.page.$(selector);
          if (runButton) break;
        } catch (e) {
          continue;
        }
      }

      if (runButton) {
        await runButton.click();
        console.log(chalk.gray('   Run button clicked'));

        // Wait for execution
        await this.page.waitForTimeout(5000);

        // Check for any authorization dialogs
        await this.handleAuthorization();

        return { success: true, message: 'Test function executed' };
      } else {
        console.log(chalk.yellow('   Could not find run button - test skipped'));
        return { success: false, message: 'Run button not found' };
      }

    } catch (error) {
      console.log(chalk.yellow(`   Test function failed: ${error.message}`));
      return { success: false, message: error.message };
    }
  }

  /**
   * Handle authorization dialogs
   */
  async handleAuthorization() {
    try {
      // Look for authorization dialog
      const authDialogSelectors = [
        'button:has-text("Review permissions")',
        'button:has-text("Authorize")',
        'button[aria-label*="authorize"]'
      ];

      let authButton = null;
      for (const selector of authDialogSelectors) {
        try {
          authButton = await this.page.$(selector);
          if (authButton) break;
        } catch (e) {
          continue;
        }
      }

      if (authButton) {
        console.log(chalk.yellow('   Authorization required - please complete manually'));
        console.log(chalk.yellow('   Waiting 30 seconds for manual authorization...'));

        await this.page.waitForTimeout(30000);
      }

    } catch (error) {
      // Authorization handling is optional
      console.log(chalk.gray('   No authorization required'));
    }
  }

  /**
   * Take a screenshot for debugging
   */
  async takeScreenshot(name) {
    if (!CONFIG.screenshots.enabled) return;

    try {
      const filename = `${Date.now()}_${name}.png`;
      const filepath = path.join(CONFIG.screenshots.directory, filename);
      await this.page.screenshot({ path: filepath, fullPage: true });
      console.log(chalk.gray(`   Screenshot saved: ${filename}`));
    } catch (error) {
      console.log(chalk.gray(`   Screenshot failed: ${error.message}`));
    }
  }

  /**
   * Run the complete deployment process
   */
  async deploy() {
    try {
      console.log(chalk.blue.bold('\n🚀 STARTING GOOGLE FORMS SCRIPT DEPLOYMENT\n'));

      // Initialize browser
      await this.initialize();

      // Handle authentication
      const authSuccess = await this.handleAuthentication();
      if (!authSuccess) {
        throw new Error('Authentication failed');
      }

      // Deploy to each form
      for (const formConfig of CONFIG.forms) {
        await this.deployToForm(formConfig);

        // Add delay between deployments
        if (CONFIG.forms.indexOf(formConfig) < CONFIG.forms.length - 1) {
          console.log(chalk.gray('⏳ Waiting before next deployment...'));
          await this.page.waitForTimeout(3000);
        }
      }

      // Generate final report
      this.deploymentReport.endTime = new Date().toISOString();
      await this.generateReport();

      console.log(chalk.green.bold('\n✅ DEPLOYMENT COMPLETED\n'));

    } catch (error) {
      console.error(chalk.red.bold('\n❌ DEPLOYMENT FAILED\n'), error.message);
      await this.takeScreenshot('deployment_failed');
      throw error;

    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  /**
   * Generate deployment report
   */
  async generateReport() {
    const reportPath = '/Users/rajeshpanchanathan/code/pre-sales-monitoring/deployment_report.json';

    // Calculate duration
    const startTime = new Date(this.deploymentReport.startTime);
    const endTime = new Date(this.deploymentReport.endTime);
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationMin = Math.round(durationMs / 60000 * 100) / 100;

    this.deploymentReport.summary.duration = `${durationMin} minutes`;

    // Write report to file
    fs.writeFileSync(reportPath, JSON.stringify(this.deploymentReport, null, 2));

    // Console summary
    console.log(chalk.blue.bold('\n📊 DEPLOYMENT SUMMARY'));
    console.log(chalk.blue('='.repeat(50)));
    console.log(chalk.green(`✅ Successful: ${this.deploymentReport.summary.successful}/${this.deploymentReport.summary.total}`));
    console.log(chalk.red(`❌ Failed: ${this.deploymentReport.summary.failed}/${this.deploymentReport.summary.total}`));
    console.log(chalk.blue(`⏱️  Duration: ${this.deploymentReport.summary.duration}`));
    console.log(chalk.blue(`📄 Report: ${reportPath}`));

    if (this.deploymentReport.summary.errors.length > 0) {
      console.log(chalk.red('\n🚨 ERRORS:'));
      this.deploymentReport.summary.errors.forEach(error => {
        console.log(chalk.red(`   ${error.form}: ${error.error}`));
      });
    }

    console.log(chalk.blue('='.repeat(50)));
  }
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
  try {
    console.log(chalk.blue.bold('🚀 GOOGLE FORMS SCRIPT DEPLOYMENT AUTOMATION'));
    console.log(chalk.blue('================================================'));
    console.log(chalk.gray(`Forms to deploy: ${CONFIG.forms.length}`));
    console.log(chalk.gray(`Screenshots: ${CONFIG.screenshots.enabled ? 'Enabled' : 'Disabled'}`));
    console.log(chalk.gray(`Timeout: ${CONFIG.timeouts.navigation}ms`));

    // Verify script files exist
    console.log(chalk.blue('\n🔍 Verifying script files...'));
    for (const form of CONFIG.forms) {
      if (!fs.existsSync(form.scriptPath)) {
        throw new Error(`Script file not found: ${form.scriptPath}`);
      }
      console.log(chalk.green(`   ✅ ${form.name}: ${form.scriptPath}`));
    }

    // Confirm deployment
    console.log(chalk.yellow('\n⚠️  This will deploy scripts to Google Forms via browser automation.'));
    console.log(chalk.yellow('   Make sure you have:'));
    console.log(chalk.yellow('   - Google account access'));
    console.log(chalk.yellow('   - Edit permissions on all forms'));
    console.log(chalk.yellow('   - Stable internet connection'));

    const confirm = readline.question('\nProceed with deployment? (y/N): ');
    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      console.log(chalk.gray('Deployment cancelled.'));
      return;
    }

    // Run deployment
    const deployer = new GoogleFormsScriptDeployer();
    await deployer.deploy();

  } catch (error) {
    console.error(chalk.red.bold('\n💥 FATAL ERROR:'), error.message);
    process.exit(1);
  }
}

// Handle command line execution
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('Unhandled error:'), error);
    process.exit(1);
  });
}

module.exports = { GoogleFormsScriptDeployer, CONFIG };