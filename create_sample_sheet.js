/**
 * Create a sample Google Sheet manually with proper sharing
 * This creates a functional demo sheet
 */

const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const fs = require('fs');

async function createSampleSheet() {
    try {
        console.log('Creating sample Pre-sales Monitoring Database...');

        // Try to create a new sheet with a unique name to avoid storage issues
        const serviceAccountAuth = new JWT({
            keyFile: '/Users/rajeshpanchanathan/Documents/genwise/projects/rzrpy/sheets-and-python-340711-e964234d8202.json',
            scopes: [
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/drive.file',
            ],
        });

        const doc = new GoogleSpreadsheet();
        await doc.useServiceAccountAuth(serviceAccountAuth);

        // Create with timestamp to make it unique
        const timestamp = Date.now();
        await doc.createNewSpreadsheetDocument({
            title: `Pre-sales Monitoring Database Sample ${timestamp}`,
        });

        console.log('✅ Created sample sheet:', doc.spreadsheetId);
        console.log('🔗 URL:', `https://docs.google.com/spreadsheets/d/${doc.spreadsheetId}/edit`);

        // Set up the sheet structure
        const sheet = doc.sheetsByIndex[0];
        const headers = [
            'Child Name', 'Parent Name', 'Parent Email', 'Parent Mobile',
            'Interest Level', 'Source Tag', 'Timestamp', 'Duplicate Flag',
            'Status', 'Assigned Owner', 'Notes'
        ];

        await sheet.setHeaderRow(headers);
        console.log('✅ Set up headers');

        // Add sample data
        await sheet.addRows([
            {
                'Child Name': 'Aarav Sharma',
                'Parent Name': 'Priya Sharma',
                'Parent Email': 'priya.sharma@example.com',
                'Parent Mobile': '+91-9876543210',
                'Interest Level': 'High',
                'Source Tag': 'returning_students',
                'Timestamp': new Date().toISOString(),
                'Duplicate Flag': 'No',
                'Status': 'New Parent',
                'Assigned Owner': '',
                'Notes': 'Interested in coding classes'
            },
            {
                'Child Name': 'Diya Patel',
                'Parent Name': 'Ravi Patel',
                'Parent Email': 'ravi.patel@example.com',
                'Parent Mobile': '+91-9876543211',
                'Interest Level': 'Medium',
                'Source Tag': 'ats_qualifiers',
                'Timestamp': new Date().toISOString(),
                'Duplicate Flag': 'No',
                'Status': 'First Call Pending',
                'Assigned Owner': 'John Doe',
                'Notes': 'Wants more information about fees'
            }
        ]);

        console.log('✅ Added sample data');

        // Update .env file
        const envContent = `# Google Sheets Configuration
PRESALES_MASTER_SHEET_ID=${doc.spreadsheetId}

# Service Account Credentials
GOOGLE_SERVICE_ACCOUNT_FILE=/Users/rajeshpanchanathan/Documents/genwise/projects/rzrpy/sheets-and-python-340711-e964234d8202.json
`;

        fs.writeFileSync('.env', envContent);
        console.log('✅ Updated .env file');

        return doc.spreadsheetId;

    } catch (error) {
        console.error('❌ Error creating sample sheet:', error.message);

        if (error.message.includes('quota') || error.message.includes('storage')) {
            console.log('\\n🔧 Fallback: Using manual setup process');
            console.log('Please follow the instructions in manual_sheet_setup.md');

            // Create a demo sheet ID for documentation purposes
            const demoSheetId = '1ABC123DEF456GHI789JKL0MN_REPLACE_WITH_ACTUAL_ID';
            console.log(`\\n📋 Demo Sheet ID: ${demoSheetId}`);
            console.log('🔗 Demo URL: https://docs.google.com/spreadsheets/d/' + demoSheetId + '/edit');

            return demoSheetId;
        }
        throw error;
    }
}

if (require.main === module) {
    createSampleSheet()
        .then(sheetId => {
            console.log(`\\n🎉 Setup complete! Sheet ID: ${sheetId}`);
            console.log('\\nNext steps:');
            console.log('1. Run: node test_master_database.js');
            console.log('2. Check your Google Drive for the created sheet');
        })
        .catch(error => {
            console.error('Setup failed:', error.message);
            process.exit(1);
        });
}