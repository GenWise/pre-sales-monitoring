const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const MasterDatabase = require('./masterDatabase');
const { FORMS_CONFIG, FormMappingUtils, MASTER_FIELDS } = require('./formsMapping');
require('dotenv').config();

/**
 * Google Forms Integration Module
 * Handles pulling responses from Google Forms and syncing to master database
 */
class FormsIntegration {
    constructor() {
        this.credentialsFile = process.env.GOOGLE_SERVICE_ACCOUNT_FILE;
        this.masterDb = new MasterDatabase();
        this.serviceAccountAuth = null;

        // Track processing state
        this.lastProcessedRows = {};
        this.processingErrors = [];
    }

    /**
     * Initialize the service account authentication
     */
    async initialize() {
        try {
            this.serviceAccountAuth = new JWT({
                keyFile: this.credentialsFile,
                scopes: [
                    'https://www.googleapis.com/auth/spreadsheets.readonly',
                    'https://www.googleapis.com/auth/drive.readonly',
                ],
            });

            // Initialize master database connection
            await this.masterDb.connect();
            console.log('Forms integration initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize forms integration:', error.message);
            throw error;
        }
    }

    /**
     * Get form response sheet for a specific form
     * @param {string} formId - Google Form ID
     * @returns {GoogleSpreadsheet} Connected spreadsheet document
     */
    async getFormResponseSheet(formId) {
        try {
            const doc = new GoogleSpreadsheet(formId, this.serviceAccountAuth);
            await doc.loadInfo();

            // Get the first sheet (Form Responses 1)
            const sheet = doc.sheetsByIndex[0];
            await sheet.loadHeaderRow();

            return sheet;
        } catch (error) {
            console.error(`Failed to access form responses for ${formId}:`, error.message);
            throw error;
        }
    }

    /**
     * Pull responses from a specific form
     * @param {string} formKey - Form configuration key (form1, form2, etc.)
     * @param {Object} options - Processing options
     * @returns {Object} Processing results
     */
    async pullFormResponses(formKey, options = {}) {
        const formConfig = FORMS_CONFIG[formKey];
        if (!formConfig) {
            throw new Error(`Unknown form configuration: ${formKey}`);
        }

        console.log(`Processing responses from ${formConfig.name}...`);

        try {
            const sheet = await this.getFormResponseSheet(formConfig.id);
            const rows = await sheet.getRows();

            const results = {
                formKey,
                formName: formConfig.name,
                totalResponses: rows.length,
                processed: 0,
                added: 0,
                duplicates: 0,
                errors: [],
                skipped: 0
            };

            // Determine starting point for processing
            const startIndex = options.processAll ? 0 : (this.lastProcessedRows[formKey] || 0);
            const rowsToProcess = rows.slice(startIndex);

            console.log(`Processing ${rowsToProcess.length} new responses (starting from row ${startIndex + 2})`);

            for (let i = 0; i < rowsToProcess.length; i++) {
                const row = rowsToProcess[i];
                const actualRowIndex = startIndex + i;

                try {
                    // Extract raw response data
                    const rawResponse = this.extractRowData(row);

                    // Validate minimum required data
                    if (!this.isValidResponse(rawResponse)) {
                        results.skipped++;
                        console.log(`Skipping row ${actualRowIndex + 2}: insufficient data`);
                        continue;
                    }

                    // Map form response to master database format
                    const mappedData = FormMappingUtils.mapFormResponse(rawResponse, formConfig);

                    // Validate mapped data
                    const validation = FormMappingUtils.validateRequiredFields(mappedData);
                    if (!validation.isValid) {
                        results.errors.push({
                            rowIndex: actualRowIndex + 2,
                            error: 'Missing required fields',
                            missingFields: validation.missingFields,
                            rawData: rawResponse
                        });
                        continue;
                    }

                    // Format for master database
                    const leadData = FormMappingUtils.formatForMasterDatabase(mappedData);

                    // Add to master database
                    const addResult = await this.masterDb.addLead(leadData);

                    if (addResult.isDuplicate) {
                        results.duplicates++;
                        console.log(`Duplicate found: ${leadData.parentEmail} from ${formConfig.sourceTag}`);
                    } else {
                        results.added++;
                        console.log(`Added new lead: ${leadData.parentName} (${leadData.parentEmail}) from ${formConfig.sourceTag}`);
                    }

                    results.processed++;

                } catch (error) {
                    results.errors.push({
                        rowIndex: actualRowIndex + 2,
                        error: error.message,
                        rawData: this.extractRowData(row, true) // Safe extraction
                    });
                    console.error(`Error processing row ${actualRowIndex + 2}:`, error.message);
                }
            }

            // Update last processed row index
            this.lastProcessedRows[formKey] = rows.length;

            console.log(`${formConfig.name} processing completed:`, {
                processed: results.processed,
                added: results.added,
                duplicates: results.duplicates,
                errors: results.errors.length,
                skipped: results.skipped
            });

            return results;

        } catch (error) {
            console.error(`Failed to process form ${formKey}:`, error.message);
            throw error;
        }
    }

    /**
     * Extract data from a spreadsheet row
     * @param {Object} row - Google Sheets row object
     * @param {boolean} safe - Use safe extraction (avoid errors)
     * @returns {Object} Raw response data
     */
    extractRowData(row, safe = false) {
        const data = {};

        try {
            // Get all column headers and their values
            const headers = row._sheet.headerValues;

            headers.forEach(header => {
                try {
                    const value = row.get(header);
                    if (value !== null && value !== undefined && value !== '') {
                        data[header] = value;
                    }
                } catch (error) {
                    if (!safe) {
                        throw error;
                    }
                    // In safe mode, skip problematic fields
                    console.warn(`Warning: Could not extract field "${header}"`);
                }
            });
        } catch (error) {
            if (!safe) {
                throw error;
            }
            console.warn('Warning: Could not extract row data safely');
        }

        return data;
    }

    /**
     * Check if response has minimum required data
     * @param {Object} response - Raw response data
     * @returns {boolean} True if response is valid
     */
    isValidResponse(response) {
        // Must have at least an email or phone number
        const hasEmail = Object.values(response).some(value =>
            typeof value === 'string' && value.includes('@')
        );

        const hasPhone = Object.values(response).some(value =>
            typeof value === 'string' && /[\d\+\-\(\)\s]{8,}/.test(value)
        );

        // Must have some text that could be a name
        const hasName = Object.values(response).some(value =>
            typeof value === 'string' && value.length > 2 && !/^[\d\s\+\-\(\)@\.]+$/.test(value)
        );

        return (hasEmail || hasPhone) && hasName;
    }

    /**
     * Process responses from all configured forms
     * @param {Object} options - Processing options
     * @returns {Object} Combined processing results
     */
    async processAllForms(options = {}) {
        if (!this.serviceAccountAuth) {
            await this.initialize();
        }

        const allResults = {
            totalForms: Object.keys(FORMS_CONFIG).length,
            formsProcessed: 0,
            totalProcessed: 0,
            totalAdded: 0,
            totalDuplicates: 0,
            totalErrors: 0,
            totalSkipped: 0,
            formResults: {},
            errors: []
        };

        console.log('Starting batch processing of all forms...');

        for (const formKey of Object.keys(FORMS_CONFIG)) {
            try {
                const result = await this.pullFormResponses(formKey, options);

                allResults.formResults[formKey] = result;
                allResults.formsProcessed++;
                allResults.totalProcessed += result.processed;
                allResults.totalAdded += result.added;
                allResults.totalDuplicates += result.duplicates;
                allResults.totalErrors += result.errors.length;
                allResults.totalSkipped += result.skipped;

            } catch (error) {
                allResults.errors.push({
                    formKey,
                    formName: FORMS_CONFIG[formKey].name,
                    error: error.message
                });
                console.error(`Failed to process form ${formKey}:`, error.message);
            }

            // Add delay between forms to avoid hitting API limits
            if (options.delay) {
                await new Promise(resolve => setTimeout(resolve, options.delay));
            }
        }

        console.log('Batch processing completed:', {
            formsProcessed: allResults.formsProcessed,
            totalAdded: allResults.totalAdded,
            totalDuplicates: allResults.totalDuplicates,
            totalErrors: allResults.totalErrors,
            totalSkipped: allResults.totalSkipped
        });

        return allResults;
    }

    /**
     * Process responses from a single form by form ID
     * @param {string} formId - Google Form ID
     * @param {Object} options - Processing options
     * @returns {Object} Processing results
     */
    async processFormById(formId, options = {}) {
        const formConfig = FormMappingUtils.getFormConfig(formId);
        if (!formConfig) {
            throw new Error(`No configuration found for form ID: ${formId}`);
        }

        const formKey = Object.keys(FORMS_CONFIG).find(key =>
            FORMS_CONFIG[key].id === formId
        );

        return await this.pullFormResponses(formKey, options);
    }

    /**
     * Get processing statistics
     * @returns {Object} Statistics about processed forms
     */
    getProcessingStats() {
        return {
            lastProcessedRows: { ...this.lastProcessedRows },
            processingErrors: [...this.processingErrors],
            formsConfigured: Object.keys(FORMS_CONFIG).length,
            availableForms: Object.keys(FORMS_CONFIG).map(key => ({
                key,
                name: FORMS_CONFIG[key].name,
                id: FORMS_CONFIG[key].id,
                sourceTag: FORMS_CONFIG[key].sourceTag,
                lastProcessedRow: this.lastProcessedRows[key] || 0
            }))
        };
    }

    /**
     * Reset processing state (useful for testing or reprocessing)
     * @param {string} formKey - Optional form key to reset, or all if not specified
     */
    resetProcessingState(formKey = null) {
        if (formKey) {
            delete this.lastProcessedRows[formKey];
            console.log(`Reset processing state for ${formKey}`);
        } else {
            this.lastProcessedRows = {};
            this.processingErrors = [];
            console.log('Reset processing state for all forms');
        }
    }

    /**
     * Test connection to a specific form
     * @param {string} formKey - Form configuration key
     * @returns {Object} Connection test results
     */
    async testFormConnection(formKey) {
        const formConfig = FORMS_CONFIG[formKey];
        if (!formConfig) {
            throw new Error(`Unknown form configuration: ${formKey}`);
        }

        try {
            if (!this.serviceAccountAuth) {
                await this.initialize();
            }

            const sheet = await this.getFormResponseSheet(formConfig.id);
            const rows = await sheet.getRows({ limit: 1 });

            return {
                success: true,
                formKey,
                formName: formConfig.name,
                formId: formConfig.id,
                sheetTitle: sheet.title,
                headerCount: sheet.headerValues.length,
                headers: sheet.headerValues,
                responseCount: sheet.rowCount - 1, // Subtract header row
                sampleDataAvailable: rows.length > 0,
                sampleHeaders: rows.length > 0 ? Object.keys(this.extractRowData(rows[0], true)) : []
            };

        } catch (error) {
            return {
                success: false,
                formKey,
                formName: formConfig.name,
                formId: formConfig.id,
                error: error.message
            };
        }
    }

    /**
     * Test connections to all forms
     * @returns {Array} Array of connection test results
     */
    async testAllFormConnections() {
        const results = [];

        for (const formKey of Object.keys(FORMS_CONFIG)) {
            try {
                const result = await this.testFormConnection(formKey);
                results.push(result);
            } catch (error) {
                results.push({
                    success: false,
                    formKey,
                    formName: FORMS_CONFIG[formKey].name,
                    error: error.message
                });
            }
        }

        return results;
    }
}

module.exports = FormsIntegration;