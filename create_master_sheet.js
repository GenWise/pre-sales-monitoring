const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const fs = require('fs');
const path = require('path');

// Service account credentials
const CREDENTIALS_FILE = '/Users/rajeshpanchanathan/Documents/genwise/projects/rzrpy/sheets-and-python-340711-e964234d8202.json';

async function createMasterSheet() {
    console.log('Setting up Pre-sales Monitoring Master Database...');

    try {
        // Load service account credentials
        const serviceAccountAuth = new JWT({
            keyFile: CREDENTIALS_FILE,
            scopes: [
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/drive.file',
            ],
        });

        // Create a new document
        console.log('Creating new Google Sheet...');
        const doc = new GoogleSpreadsheet();
        await doc.useServiceAccountAuth(serviceAccountAuth);

        // Create the spreadsheet
        await doc.createNewSpreadsheetDocument({
            title: 'Pre-sales Monitoring Master Database',
        });

        console.log(`Created spreadsheet: ${doc.spreadsheetId}`);

        // Get the first sheet
        const sheet = doc.sheetsByIndex[0];

        // Define headers
        const headers = [
            'Child Name',
            'Parent Name',
            'Parent Email',
            'Parent Mobile',
            'Interest Level',
            'Source Tag',
            'Timestamp',
            'Duplicate Flag',
            'Status',
            'Assigned Owner',
            'Notes'
        ];

        // Set headers
        console.log('Setting up headers...');
        await sheet.setHeaderRow(headers);

        // Format the header row
        console.log('Formatting header row...');
        await sheet.loadCells('A1:K1');
        for (let i = 0; i < headers.length; i++) {
            const cell = sheet.getCell(0, i);
            cell.backgroundColor = { red: 0.2, green: 0.2, blue: 0.8 };
            cell.textFormat = { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } };
            cell.horizontalAlignment = 'CENTER';
        }
        await sheet.saveUpdatedCells();

        // Set column widths
        console.log('Adjusting column widths...');
        await sheet.updateProperties({
            gridProperties: {
                frozenRowCount: 1,
            }
        });

        // Add data validation
        console.log('Setting up data validation...');

        // Interest Level validation (Column E)
        await sheet.addDataValidation('E2:E1000', {
            condition: {
                type: 'ONE_OF_LIST',
                values: ['High', 'Medium', 'Low']
            },
            showCustomUi: true,
            strict: true
        });

        // Status validation (Column I)
        await sheet.addDataValidation('I2:I1000', {
            condition: {
                type: 'ONE_OF_LIST',
                values: ['New Parent', 'Existing Parent', 'First Call Pending', 'Warm', 'Hot', 'Not Interested']
            },
            showCustomUi: true,
            strict: true
        });

        // Source Tag validation (Column F)
        await sheet.addDataValidation('F2:F1000', {
            condition: {
                type: 'ONE_OF_LIST',
                values: ['returning_students', 'ats_qualifiers', 'website', 'early_bird', 'summer_program_2026']
            },
            showCustomUi: true,
            strict: true
        });

        // Duplicate Flag validation (Column H)
        await sheet.addDataValidation('H2:H1000', {
            condition: {
                type: 'ONE_OF_LIST',
                values: ['Yes', 'No']
            },
            showCustomUi: true,
            strict: true
        });

        const sheetUrl = `https://docs.google.com/spreadsheets/d/${doc.spreadsheetId}/edit`;

        console.log('\n✅ Successfully created Pre-sales Monitoring Master Database!');
        console.log(`📊 Sheet Name: Pre-sales Monitoring Master Database`);
        console.log(`🔗 Sheet URL: ${sheetUrl}`);
        console.log(`📋 Sheet ID: ${doc.spreadsheetId}`);

        // Update .env file
        const envContent = `PRESALES_MASTER_SHEET_ID=${doc.spreadsheetId}\n`;
        fs.writeFileSync(path.join(__dirname, '.env'), envContent);
        console.log('✅ Updated .env file with PRESALES_MASTER_SHEET_ID');

        return {
            sheetId: doc.spreadsheetId,
            sheetUrl: sheetUrl
        };

    } catch (error) {
        console.error('❌ Error creating sheet:', error.message);

        if (error.message.includes('quota') || error.message.includes('storage')) {
            console.log('\n📝 Manual Setup Instructions:');
            console.log('1. Go to https://sheets.google.com');
            console.log('2. Create a new spreadsheet named "Pre-sales Monitoring Master Database"');
            console.log('3. Share it with: sheets-and-python-340711@sheets-and-python-340711.iam.gserviceaccount.com');
            console.log('4. Copy the Sheet ID from the URL and run this script again');
        }

        throw error;
    }
}

if (require.main === module) {
    createMasterSheet()
        .then(result => {
            console.log('\n🎉 Setup completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('Setup failed:', error.message);
            process.exit(1);
        });
}

module.exports = { createMasterSheet };