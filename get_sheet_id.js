/**
 * Helper script to extract Sheet ID from a Google Sheets URL
 * and update the .env file automatically
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function extractSheetId(url) {
    // Extract Sheet ID from various Google Sheets URL formats
    const patterns = [
        /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,  // Standard format
        /\/d\/([a-zA-Z0-9-_]+)/,                // Short format
        /^([a-zA-Z0-9-_]+)$/                    // Just the ID
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return match[1];
        }
    }

    return null;
}

function updateEnvFile(sheetId) {
    const envPath = path.join(__dirname, '.env');

    try {
        let envContent = '';

        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');

            // Replace existing PRESALES_MASTER_SHEET_ID
            if (envContent.includes('PRESALES_MASTER_SHEET_ID=')) {
                envContent = envContent.replace(
                    /PRESALES_MASTER_SHEET_ID=.*/,
                    `PRESALES_MASTER_SHEET_ID=${sheetId}`
                );
            } else {
                envContent += `\\nPRESALES_MASTER_SHEET_ID=${sheetId}\\n`;
            }
        } else {
            // Create new .env file
            envContent = `# Google Sheets Configuration
PRESALES_MASTER_SHEET_ID=${sheetId}

# Service Account Credentials
GOOGLE_SERVICE_ACCOUNT_FILE=/Users/rajeshpanchanathan/Documents/genwise/projects/rzrpy/sheets-and-python-340711-e964234d8202.json
`;
        }

        fs.writeFileSync(envPath, envContent);
        console.log('✅ Updated .env file with Sheet ID:', sheetId);
        return true;
    } catch (error) {
        console.error('❌ Error updating .env file:', error.message);
        return false;
    }
}

async function main() {
    console.log('🔧 Google Sheets Setup Helper\\n');

    console.log('Follow these steps:');
    console.log('1. Go to https://sheets.google.com');
    console.log('2. Create a new spreadsheet named "Pre-sales Monitoring Master Database"');
    console.log('3. Follow the setup instructions in manual_sheet_setup.md');
    console.log('4. Share it with: sheets-and-python-340711@sheets-and-python-340711.iam.gserviceaccount.com');
    console.log('5. Copy the URL or Sheet ID and paste it below\\n');

    rl.question('Enter the Google Sheets URL or Sheet ID: ', (input) => {
        const sheetId = extractSheetId(input.trim());

        if (!sheetId) {
            console.log('❌ Invalid URL or Sheet ID format');
            console.log('Please check the input and try again');
            rl.close();
            return;
        }

        console.log('\\n📋 Extracted Sheet ID:', sheetId);
        console.log('🔗 Sheet URL: https://docs.google.com/spreadsheets/d/' + sheetId + '/edit');

        const success = updateEnvFile(sheetId);

        if (success) {
            console.log('\\n🎉 Setup completed! You can now run:');
            console.log('   node test_master_database.js');
        }

        rl.close();
    });
}

if (require.main === module) {
    main();
}

module.exports = { extractSheetId, updateEnvFile };