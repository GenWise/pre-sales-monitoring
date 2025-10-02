const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();
const fs = require('fs');

// Master Sheet Configuration
const SHEET_ID = process.env.PRESALES_MASTER_SHEET_ID || '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ';
const CREDENTIALS_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_FILE || '/Users/rajeshpanchanathan/code/pre-sales-monitoring/credentials/service-account-key.json';

// Expected column order for master sheet
const EXPECTED_COLUMNS = [
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

// Valid dropdown values
const VALID_VALUES = {
    'Interest Level': ['High', 'Medium', 'Low'],
    'Source Tag': ['returning_students', 'ats_qualifiers', 'website', 'early_bird'],
    'Duplicate Flag': ['Yes', 'No'],
    'Status': ['New Parent', 'Contacted', 'Follow-up', 'Enrolled', 'Not Interested'],
    'Assigned Owner': ['Unassigned', 'Rajesh', 'Team Member']
};

class MasterSheetRepairer {
    constructor() {
        this.sheetId = SHEET_ID;
        this.credentialsFile = CREDENTIALS_PATH;
        this.doc = null;
        this.corruptedRows = [];
        this.repairedRows = [];
        this.backupData = [];

        if (!this.sheetId) {
            throw new Error('SHEET_ID not configured');
        }

        if (!fs.existsSync(this.credentialsFile)) {
            throw new Error(`Service account credentials file not found: ${this.credentialsFile}`);
        }
    }

    async initialize() {
        console.log('🔧 Initializing Google Sheets connection...');

        // Set up authentication using JWT
        const serviceAccountAuth = new JWT({
            keyFile: this.credentialsFile,
            scopes: [
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/drive',
            ],
        });

        // Connect to the document
        this.doc = new GoogleSpreadsheet(this.sheetId, serviceAccountAuth);
        await this.doc.loadInfo();

        console.log(`📊 Connected to sheet: ${this.doc.title}`);
    }

    async analyzeCorruption() {
        console.log('\n🔍 ANALYZING DATA CORRUPTION...');

        const sheet = this.doc.sheetsByIndex[0];
        await sheet.loadHeaderRow();

        console.log('Current headers:', sheet.headerValues);
        console.log('Expected headers:', EXPECTED_COLUMNS);

        // Load all rows
        const rows = await sheet.getRows();
        console.log(`📋 Total rows to analyze: ${rows.length}`);

        let corruptionCount = 0;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowData = this.extractRowData(row);

            // Backup original data
            this.backupData.push({
                index: i,
                original: { ...rowData }
            });

            // Check for corruption patterns
            const corruption = this.detectCorruption(rowData, i + 2); // +2 for header and 1-indexed

            if (corruption.isCorrupted) {
                corruptionCount++;
                this.corruptedRows.push({
                    index: i,
                    rowNumber: i + 2,
                    corruption: corruption,
                    original: rowData,
                    rowObject: row
                });

                console.log(`❌ Row ${i + 2}: ${corruption.issues.join(', ')}`);
            }
        }

        console.log(`\n📊 CORRUPTION ANALYSIS COMPLETE:`);
        console.log(`   Total rows: ${rows.length}`);
        console.log(`   Corrupted rows: ${corruptionCount}`);
        console.log(`   Data integrity: ${((rows.length - corruptionCount) / rows.length * 100).toFixed(1)}%`);

        return corruptionCount;
    }

    extractRowData(row) {
        return {
            'Child Name': row.get('Child Name') || '',
            'Parent Name': row.get('Parent Name') || '',
            'Parent Email': row.get('Parent Email') || '',
            'Parent Mobile': row.get('Parent Mobile') || '',
            'Interest Level': row.get('Interest Level') || '',
            'Source Tag': row.get('Source Tag') || '',
            'Timestamp': row.get('Timestamp') || '',
            'Duplicate Flag': row.get('Duplicate Flag') || '',
            'Status': row.get('Status') || '',
            'Assigned Owner': row.get('Assigned Owner') || '',
            'Notes': row.get('Notes') || ''
        };
    }

    detectCorruption(rowData, rowNumber) {
        const issues = [];
        let isCorrupted = false;

        // Check for timestamp in wrong columns (common corruption pattern)
        const timestampPattern = /^\d{1,2}\/\d{1,2}\/\d{4}/;

        if (timestampPattern.test(rowData['Child Name'])) {
            issues.push('Timestamp found in Child Name column');
            isCorrupted = true;
        }

        if (timestampPattern.test(rowData['Parent Name'])) {
            issues.push('Timestamp found in Parent Name column');
            isCorrupted = true;
        }

        // Check for email patterns in wrong columns
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (emailPattern.test(rowData['Child Name'])) {
            issues.push('Email found in Child Name column');
            isCorrupted = true;
        }

        if (emailPattern.test(rowData['Parent Mobile'])) {
            issues.push('Email found in Parent Mobile column');
            isCorrupted = true;
        }

        // Check for phone numbers in wrong columns
        const phonePattern = /^[\+]?[\d\s\-\(\)]{10,}$/;

        if (phonePattern.test(rowData['Child Name'])) {
            issues.push('Phone number found in Child Name column');
            isCorrupted = true;
        }

        if (phonePattern.test(rowData['Parent Email'])) {
            issues.push('Phone number found in Parent Email column');
            isCorrupted = true;
        }

        // Check for invalid dropdown values
        for (const [column, validValues] of Object.entries(VALID_VALUES)) {
            const value = rowData[column];
            if (value && !validValues.includes(value)) {
                issues.push(`Invalid ${column}: "${value}"`);
                isCorrupted = true;
            }
        }

        return { isCorrupted, issues };
    }

    async createBackup() {
        console.log('\n💾 CREATING BACKUP...');

        const backupFileName = `/Users/rajeshpanchanathan/code/pre-sales-monitoring/master_sheet_backup_${Date.now()}.json`;

        fs.writeFileSync(backupFileName, JSON.stringify({
            timestamp: new Date().toISOString(),
            sheetId: SHEET_ID,
            backupData: this.backupData
        }, null, 2));

        console.log(`✅ Backup created: ${backupFileName}`);
        return backupFileName;
    }

    async repairCorruption() {
        console.log('\n🔧 STARTING DATA REPAIR...');

        if (this.corruptedRows.length === 0) {
            console.log('✅ No corruption detected. No repairs needed.');
            return;
        }

        console.log(`🔧 Repairing ${this.corruptedRows.length} corrupted rows...`);

        for (const corruptedRow of this.corruptedRows) {
            console.log(`\n🔧 Repairing row ${corruptedRow.rowNumber}...`);

            const repairedData = this.attemptDataRealignment(corruptedRow.original);

            if (repairedData) {
                // Update the row
                const row = corruptedRow.rowObject;

                for (const [column, value] of Object.entries(repairedData)) {
                    if (row.get(column) !== value) {
                        row.set(column, value);
                        console.log(`   ${column}: "${row.get(column)}" → "${value}"`);
                    }
                }

                await row.save();

                this.repairedRows.push({
                    rowNumber: corruptedRow.rowNumber,
                    original: corruptedRow.original,
                    repaired: repairedData
                });

                console.log(`✅ Row ${corruptedRow.rowNumber} repaired successfully`);
            } else {
                console.log(`⚠️  Row ${corruptedRow.rowNumber} requires manual review`);
            }
        }

        console.log(`\n📊 REPAIR SUMMARY:`);
        console.log(`   Rows repaired: ${this.repairedRows.length}`);
        console.log(`   Rows needing manual review: ${this.corruptedRows.length - this.repairedRows.length}`);
    }

    attemptDataRealignment(originalData) {
        // Common corruption pattern: columns shifted left
        // Try to intelligently realign based on data patterns

        const repairedData = { ...originalData };
        const values = Object.values(originalData).filter(v => v.trim() !== '');

        if (values.length === 0) return null;

        // Reset all fields
        for (const column of EXPECTED_COLUMNS) {
            repairedData[column] = '';
        }

        // Attempt intelligent assignment based on patterns
        for (const value of values) {
            if (!value || value.trim() === '') continue;

            const trimmedValue = value.trim();

            // Timestamp detection
            if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(trimmedValue)) {
                repairedData['Timestamp'] = trimmedValue;
            }
            // Email detection
            else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue)) {
                repairedData['Parent Email'] = trimmedValue;
            }
            // Phone number detection
            else if (/^[\+]?[\d\s\-\(\)]{10,}$/.test(trimmedValue)) {
                repairedData['Parent Mobile'] = trimmedValue;
            }
            // Valid dropdown values
            else if (VALID_VALUES['Interest Level'].includes(trimmedValue)) {
                repairedData['Interest Level'] = trimmedValue;
            }
            else if (VALID_VALUES['Source Tag'].includes(trimmedValue)) {
                repairedData['Source Tag'] = trimmedValue;
            }
            else if (VALID_VALUES['Duplicate Flag'].includes(trimmedValue)) {
                repairedData['Duplicate Flag'] = trimmedValue;
            }
            else if (VALID_VALUES['Status'].includes(trimmedValue)) {
                repairedData['Status'] = trimmedValue;
            }
            else if (VALID_VALUES['Assigned Owner'].includes(trimmedValue)) {
                repairedData['Assigned Owner'] = trimmedValue;
            }
            // Name fields (assign to first available)
            else if (!repairedData['Child Name']) {
                repairedData['Child Name'] = trimmedValue;
            }
            else if (!repairedData['Parent Name']) {
                repairedData['Parent Name'] = trimmedValue;
            }
            else {
                repairedData['Notes'] = (repairedData['Notes'] + ' ' + trimmedValue).trim();
            }
        }

        return repairedData;
    }

    async validateRepairs() {
        console.log('\n✅ VALIDATING REPAIRS...');

        const sheet = this.doc.sheetsByIndex[0];
        const rows = await sheet.getRows();

        let validationErrors = 0;

        for (let i = 0; i < rows.length; i++) {
            const rowData = this.extractRowData(rows[i]);
            const corruption = this.detectCorruption(rowData, i + 2);

            if (corruption.isCorrupted) {
                validationErrors++;
                console.log(`❌ Row ${i + 2} still has issues: ${corruption.issues.join(', ')}`);
            }
        }

        if (validationErrors === 0) {
            console.log('✅ All data validation checks passed!');
        } else {
            console.log(`⚠️  ${validationErrors} rows still have validation issues`);
        }

        return validationErrors === 0;
    }

    async generateReport() {
        const reportPath = `/Users/rajeshpanchanathan/code/pre-sales-monitoring/repair_report_${Date.now()}.json`;

        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalRowsAnalyzed: this.backupData.length,
                corruptedRowsFound: this.corruptedRows.length,
                rowsRepaired: this.repairedRows.length,
                repairSuccessRate: this.corruptedRows.length > 0 ?
                    (this.repairedRows.length / this.corruptedRows.length * 100).toFixed(1) + '%' : 'N/A'
            },
            corruptedRows: this.corruptedRows.map(row => ({
                rowNumber: row.rowNumber,
                issues: row.corruption.issues,
                originalData: row.original
            })),
            repairedRows: this.repairedRows
        };

        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`📄 Detailed report saved: ${reportPath}`);

        return report;
    }
}

// Main execution
async function main() {
    console.log('🚨 MASTER SHEET DATA CORRUPTION REPAIR');
    console.log('=====================================\n');

    const repairer = new MasterSheetRepairer();

    try {
        await repairer.initialize();

        const corruptionCount = await repairer.analyzeCorruption();

        if (corruptionCount > 0) {
            await repairer.createBackup();
            await repairer.repairCorruption();
            const isValid = await repairer.validateRepairs();

            if (!isValid) {
                console.log('\n⚠️  Some validation issues remain. Manual review required.');
            }
        }

        const report = await repairer.generateReport();

        console.log('\n🎯 FINAL SUMMARY:');
        console.log(`   Total rows analyzed: ${report.summary.totalRowsAnalyzed}`);
        console.log(`   Corrupted rows found: ${report.summary.corruptedRowsFound}`);
        console.log(`   Rows successfully repaired: ${report.summary.rowsRepaired}`);
        console.log(`   Repair success rate: ${report.summary.repairSuccessRate}`);

        if (corruptionCount === 0) {
            console.log('\n✅ MASTER SHEET IS CLEAN - No corruption detected!');
        } else if (report.summary.rowsRepaired === corruptionCount) {
            console.log('\n✅ ALL CORRUPTION REPAIRED SUCCESSFULLY!');
        } else {
            console.log('\n⚠️  PARTIAL REPAIR COMPLETED - Manual review needed for remaining issues');
        }

    } catch (error) {
        console.error('❌ ERROR during repair process:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { MasterSheetRepairer };