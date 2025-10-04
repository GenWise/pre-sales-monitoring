/**
 * Google Forms Field Mapping Configuration
 * This file defines how each form's fields map to the master database schema
 */

/**
 * Master Database Schema Fields
 * These are the exact column names in the Google Sheet
 */
const MASTER_FIELDS = {
    CHILD_NAME: 'child_name',
    PARENT_NAME: 'parent_name',
    PARENT_EMAIL: 'parent_email',
    PARENT_MOBILE: 'parent_mobile',
    INTEREST_LEVEL: 'interest_level',
    SOURCE_TAG: 'source_tag',
    TIMESTAMP: 'timestamp',
    DUPLICATE_FLAG: 'duplicate_flag',
    STATUS: 'status',
    ASSIGNED_OWNER: 'assigned_owner',
    NOTES: 'notes'
};

/**
 * Form configurations with field mappings
 * Each form has its own mapping structure to handle different field names
 */
const FORMS_CONFIG = {
    // returning_students: https://docs.google.com/forms/d/1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA
    returning_students: {
        id: '1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA',
        name: 'Returning Students Form',
        sourceTag: 'returning_students',
        responseSheetId: null, // Set when response sheet is known
        responseSheetRange: 'Form Responses 1!A:Z',

        // Field mapping from form response headers to master database fields
        fieldMapping: {
            // Common variations of field names that might appear in forms
            'Child Name': MASTER_FIELDS.CHILD_NAME,
            'Child\'s Name': MASTER_FIELDS.CHILD_NAME,
            'Student Name': MASTER_FIELDS.CHILD_NAME,
            'Name of Child': MASTER_FIELDS.CHILD_NAME,
            'Child Full Name': MASTER_FIELDS.CHILD_NAME,

            'Parent Name': MASTER_FIELDS.PARENT_NAME,
            'Parent\'s Name': MASTER_FIELDS.PARENT_NAME,
            'Guardian Name': MASTER_FIELDS.PARENT_NAME,
            'Father\'s Name': MASTER_FIELDS.PARENT_NAME,
            'Mother\'s Name': MASTER_FIELDS.PARENT_NAME,
            'Parent/Guardian Name': MASTER_FIELDS.PARENT_NAME,

            'Parent Email': MASTER_FIELDS.PARENT_EMAIL,
            'Email Address': MASTER_FIELDS.PARENT_EMAIL,
            'Email': MASTER_FIELDS.PARENT_EMAIL,
            'Parent Email Address': MASTER_FIELDS.PARENT_EMAIL,
            'Guardian Email': MASTER_FIELDS.PARENT_EMAIL,

            'Parent Mobile': MASTER_FIELDS.PARENT_MOBILE,
            'Mobile Number': MASTER_FIELDS.PARENT_MOBILE,
            'Phone Number': MASTER_FIELDS.PARENT_MOBILE,
            'Contact Number': MASTER_FIELDS.PARENT_MOBILE,
            'Parent Contact': MASTER_FIELDS.PARENT_MOBILE,
            'Mobile': MASTER_FIELDS.PARENT_MOBILE,
            'Phone': MASTER_FIELDS.PARENT_MOBILE,

            'Interest Level': MASTER_FIELDS.INTEREST_LEVEL,
            'Level of Interest': MASTER_FIELDS.INTEREST_LEVEL,
            'How interested are you?': MASTER_FIELDS.INTEREST_LEVEL,
            'Interest': MASTER_FIELDS.INTEREST_LEVEL,
            'Interested in the Gifted Summer Program': MASTER_FIELDS.INTEREST_LEVEL,
            'Interested in the Gifted Summer Program ': MASTER_FIELDS.INTEREST_LEVEL, // with trailing space

            'Timestamp': MASTER_FIELDS.TIMESTAMP,
            'Response Time': MASTER_FIELDS.TIMESTAMP,
            'Submitted At': MASTER_FIELDS.TIMESTAMP,
        },

        // Default values for fields not present in the form
        defaultValues: {
            [MASTER_FIELDS.INTEREST_LEVEL]: 'Medium',
            [MASTER_FIELDS.STATUS]: 'New Parent',
            [MASTER_FIELDS.DUPLICATE_FLAG]: 'No'
        },

        // Interest level mapping for different form responses
        interestLevelMapping: {
            // Specific mappings for "Interested in the Gifted Summer Program" field
            'Ready to Sign up and save almost 25% through available discounts': 'High',
            'Like to speak to GenWise team to resolve questions on my mind': 'Medium',
            'Not interested in the GenWise Summer Program right now': 'Low',

            // General mappings
            'Very High': 'High',
            'Very Interested': 'High',
            'High': 'High',
            'Interested': 'High',
            'Yes': 'High',
            'Moderate': 'Medium',
            'Medium': 'Medium',
            'Somewhat Interested': 'Medium',
            'Maybe': 'Medium',
            'Low': 'Low',
            'Not Very Interested': 'Low',
            'No': 'Low'
        }
    },

    // ats_qualifiers: https://docs.google.com/forms/d/1gGyfmy4NmEgAdZrbex0ffoqGlI1B_LuRUfzvQeOCHCQ
    ats_qualifiers: {
        id: '1gGyfmy4NmEgAdZrbex0ffoqGlI1B_LuRUfzvQeOCHCQ',
        name: 'ATS Qualifiers Form',
        sourceTag: 'ats_qualifiers',
        responseSheetId: null, // Set when response sheet is known
        responseSheetRange: 'Form Responses 1!A:Z',

        fieldMapping: {
            // Similar mappings but might have different field names
            'Child Name': MASTER_FIELDS.CHILD_NAME,
            'Student Name': MASTER_FIELDS.CHILD_NAME,
            'Name': MASTER_FIELDS.CHILD_NAME,

            'Parent Name': MASTER_FIELDS.PARENT_NAME,
            'Guardian Name': MASTER_FIELDS.PARENT_NAME,
            'Contact Person': MASTER_FIELDS.PARENT_NAME,

            'Email': MASTER_FIELDS.PARENT_EMAIL,
            'Email Address': MASTER_FIELDS.PARENT_EMAIL,
            'Contact Email': MASTER_FIELDS.PARENT_EMAIL,

            'Mobile': MASTER_FIELDS.PARENT_MOBILE,
            'Contact Number': MASTER_FIELDS.PARENT_MOBILE,
            'Phone': MASTER_FIELDS.PARENT_MOBILE,

            'Interest Level': MASTER_FIELDS.INTEREST_LEVEL,
            'Priority': MASTER_FIELDS.INTEREST_LEVEL,

            'Timestamp': MASTER_FIELDS.TIMESTAMP,
        },

        defaultValues: {
            [MASTER_FIELDS.INTEREST_LEVEL]: 'Medium',
            [MASTER_FIELDS.STATUS]: 'New Parent',
            [MASTER_FIELDS.DUPLICATE_FLAG]: 'No'
        },

        interestLevelMapping: {
            // Specific mappings for "Interested in the Gifted Summer Program" field
            'Ready to Sign up and save almost 25% through available discounts': 'High',
            'Like to speak to GenWise team to resolve questions on my mind': 'Medium',
            'Not interested in the GenWise Summer Program right now': 'Low',

            // ATS specific mappings
            'Urgent': 'High',
            'High Priority': 'High',
            'High': 'High',
            'Normal': 'Medium',
            'Medium': 'Medium',
            'Low Priority': 'Low',
            'Low': 'Low',
            'Yes': 'High',
            'No': 'Low'
        }
    },

    // website: https://docs.google.com/forms/d/1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg
    // Response sheet: 14Wj7yZSWq6J0Sbkh3yk26c24JCqvfekWJtGxYbjH-pE
    website: {
        id: '1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg',
        name: 'Website Form',
        sourceTag: 'website',
        responseSheetId: '14Wj7yZSWq6J0Sbkh3yk26c24JCqvfekWJtGxYbjH-pE',
        responseSheetRange: 'Form Responses 1!A:Z',

        fieldMapping: {
            'Child Name': MASTER_FIELDS.CHILD_NAME,
            'Kid Name': MASTER_FIELDS.CHILD_NAME,
            'Student': MASTER_FIELDS.CHILD_NAME,

            'Parent Name': MASTER_FIELDS.PARENT_NAME,
            'Your Name': MASTER_FIELDS.PARENT_NAME,
            'Full Name': MASTER_FIELDS.PARENT_NAME,

            'Email': MASTER_FIELDS.PARENT_EMAIL,
            'Your Email': MASTER_FIELDS.PARENT_EMAIL,

            'Mobile': MASTER_FIELDS.PARENT_MOBILE,
            'Your Mobile': MASTER_FIELDS.PARENT_MOBILE,
            'WhatsApp Number': MASTER_FIELDS.PARENT_MOBILE,

            'Interest': MASTER_FIELDS.INTEREST_LEVEL,
            'How likely are you to enroll?': MASTER_FIELDS.INTEREST_LEVEL,
            'Interested in the Gifted Summer Program': MASTER_FIELDS.INTEREST_LEVEL,
            'Interested in the Gifted Summer Program ': MASTER_FIELDS.INTEREST_LEVEL, // with trailing space

            'Timestamp': MASTER_FIELDS.TIMESTAMP,
        },

        defaultValues: {
            [MASTER_FIELDS.INTEREST_LEVEL]: 'Medium',
            [MASTER_FIELDS.STATUS]: 'New Parent',
            [MASTER_FIELDS.DUPLICATE_FLAG]: 'No'
        },

        interestLevelMapping: {
            // Specific mappings for "Interested in the Gifted Summer Program" field
            'Ready to Sign up and save almost 25% through available discounts': 'High',
            'Like to speak to GenWise team to resolve questions on my mind': 'Medium',
            'Not interested in the GenWise Summer Program right now': 'Low',

            // General mappings for other interest fields
            'Very Likely': 'High',
            'Definitely': 'High',
            'Likely': 'High',
            'Yes': 'High',
            'Maybe': 'Medium',
            'Possibly': 'Medium',
            'Unlikely': 'Low',
            'Not Sure': 'Low',
            'No': 'Low'
        }
    },

    // early_bird: https://docs.google.com/forms/d/1IJVMLXOThuQE8WVI4bYiruJrTyxsznTomotkS2rfyYY
    early_bird: {
        id: '1IJVMLXOThuQE8WVI4bYiruJrTyxsznTomotkS2rfyYY',
        name: 'Early Bird Form',
        sourceTag: 'early_bird',
        responseSheetId: null, // Set when response sheet is known
        responseSheetRange: 'Form Responses 1!A:Z',

        fieldMapping: {
            'Child Name': MASTER_FIELDS.CHILD_NAME,
            'Student Name': MASTER_FIELDS.CHILD_NAME,
            'Learner Name': MASTER_FIELDS.CHILD_NAME,

            'Parent Name': MASTER_FIELDS.PARENT_NAME,
            'Guardian': MASTER_FIELDS.PARENT_NAME,
            'Contact Person Name': MASTER_FIELDS.PARENT_NAME,

            'Email': MASTER_FIELDS.PARENT_EMAIL,
            'Parent Email': MASTER_FIELDS.PARENT_EMAIL,

            'Mobile': MASTER_FIELDS.PARENT_MOBILE,
            'Contact': MASTER_FIELDS.PARENT_MOBILE,
            'Phone Number': MASTER_FIELDS.PARENT_MOBILE,

            'Interest Level': MASTER_FIELDS.INTEREST_LEVEL,
            'Urgency': MASTER_FIELDS.INTEREST_LEVEL,

            'Timestamp': MASTER_FIELDS.TIMESTAMP,
        },

        defaultValues: {
            [MASTER_FIELDS.INTEREST_LEVEL]: 'Medium',
            [MASTER_FIELDS.STATUS]: 'New Parent',
            [MASTER_FIELDS.DUPLICATE_FLAG]: 'No'
        },

        interestLevelMapping: {
            // Specific mappings for "Interested in the Gifted Summer Program" field
            'Ready to Sign up and save almost 25% through available discounts': 'High',
            'Like to speak to GenWise team to resolve questions on my mind': 'Medium',
            'Not interested in the GenWise Summer Program right now': 'Low',

            // Early bird specific mappings
            'Immediate': 'High',
            'ASAP': 'High',
            'High': 'High',
            'Soon': 'Medium',
            'Medium': 'Medium',
            'Later': 'Low',
            'Low': 'Low',
            'Yes': 'High',
            'No': 'Low'
        }
    },

    // NOTE: summer_program_2026 configuration removed as it was incorrectly using
    // response sheet 14Wj7yZSWq6J0Sbkh3yk26c24JCqvfekWJtGxYbjH-pE which belongs to website form
};

/**
 * Helper functions for field mapping
 */
const FormMappingUtils = {
    /**
     * Get form configuration by form ID
     * @param {string} formId - Google Form ID
     * @returns {Object|null} Form configuration or null if not found
     */
    getFormConfig(formId) {
        for (const [key, config] of Object.entries(FORMS_CONFIG)) {
            if (config.id === formId) {
                return config;
            }
        }
        return null;
    },

    /**
     * Get form configuration by response sheet ID
     * @param {string} responseSheetId - Google Sheets response sheet ID
     * @returns {Object|null} Form configuration or null if not found
     */
    getFormConfigByResponseSheetId(responseSheetId) {
        for (const [key, config] of Object.entries(FORMS_CONFIG)) {
            if (config.responseSheetId === responseSheetId) {
                return config;
            }
        }
        return null;
    },

    /**
     * Get form configuration by source tag
     * @param {string} sourceTag - Source tag (returning_students, ats_qualifiers, etc.)
     * @returns {Object|null} Form configuration or null if not found
     */
    getFormConfigBySourceTag(sourceTag) {
        for (const [key, config] of Object.entries(FORMS_CONFIG)) {
            if (config.sourceTag === sourceTag) {
                return config;
            }
        }
        return null;
    },

    /**
     * Map form response data to master database format
     * @param {Object} formResponse - Raw form response data
     * @param {Object} formConfig - Form configuration
     * @returns {Object} Mapped data ready for master database
     */
    mapFormResponse(formResponse, formConfig) {
        const mappedData = {};

        // Apply field mappings
        Object.keys(formResponse).forEach(formField => {
            const masterField = formConfig.fieldMapping[formField];
            if (masterField && formResponse[formField]) {
                mappedData[masterField] = formResponse[formField];
            }
        });

        // Apply default values for missing fields
        Object.keys(formConfig.defaultValues).forEach(field => {
            if (!mappedData[field]) {
                mappedData[field] = formConfig.defaultValues[field];
            }
        });

        // Apply interest level mapping if present
        if (mappedData[MASTER_FIELDS.INTEREST_LEVEL] && formConfig.interestLevelMapping) {
            const originalLevel = mappedData[MASTER_FIELDS.INTEREST_LEVEL];
            const mappedLevel = formConfig.interestLevelMapping[originalLevel];
            if (mappedLevel) {
                mappedData[MASTER_FIELDS.INTEREST_LEVEL] = mappedLevel;
            }
        }

        // Ensure source tag is set
        mappedData[MASTER_FIELDS.SOURCE_TAG] = formConfig.sourceTag;

        // Format timestamp if present
        if (mappedData[MASTER_FIELDS.TIMESTAMP]) {
            mappedData[MASTER_FIELDS.TIMESTAMP] = new Date(mappedData[MASTER_FIELDS.TIMESTAMP]).toISOString();
        } else {
            mappedData[MASTER_FIELDS.TIMESTAMP] = new Date().toISOString();
        }

        return mappedData;
    },

    /**
     * Convert master database field names to the object format expected by masterDatabase.js
     * @param {Object} mappedData - Data with master field names as keys
     * @returns {Object} Data formatted for masterDatabase.js methods
     */
    formatForMasterDatabase(mappedData) {
        const formatted = {};

        // Map from master field names to the snake_case format used by masterDatabase.js
        const fieldNameMapping = {
            [MASTER_FIELDS.CHILD_NAME]: 'child_name',
            [MASTER_FIELDS.PARENT_NAME]: 'parent_name',
            [MASTER_FIELDS.PARENT_EMAIL]: 'parent_email',
            [MASTER_FIELDS.PARENT_MOBILE]: 'parent_mobile',
            [MASTER_FIELDS.INTEREST_LEVEL]: 'interest_level',
            [MASTER_FIELDS.SOURCE_TAG]: 'source_tag',
            [MASTER_FIELDS.TIMESTAMP]: 'timestamp',
            [MASTER_FIELDS.STATUS]: 'status',
            [MASTER_FIELDS.ASSIGNED_OWNER]: 'assigned_owner',
            [MASTER_FIELDS.NOTES]: 'notes'
        };

        Object.keys(mappedData).forEach(masterField => {
            const snakeCaseField = fieldNameMapping[masterField];
            if (snakeCaseField) {
                formatted[snakeCaseField] = mappedData[masterField];
            }
        });

        return formatted;
    },

    /**
     * Validate that essential fields are present
     * @param {Object} data - Mapped data
     * @returns {Object} Validation result with isValid boolean and missing fields array
     */
    validateRequiredFields(data) {
        const requiredFields = [
            MASTER_FIELDS.PARENT_EMAIL,
            MASTER_FIELDS.SOURCE_TAG
        ];

        const missing = requiredFields.filter(field => !data[field] || data[field].trim() === '');

        return {
            isValid: missing.length === 0,
            missingFields: missing,
            hasMinimalData: data[MASTER_FIELDS.PARENT_EMAIL] || data[MASTER_FIELDS.PARENT_MOBILE]
        };
    }
};

module.exports = {
    MASTER_FIELDS,
    FORMS_CONFIG,
    FormMappingUtils
};