/**
 * FreshSales Field Mapper
 *
 * Maps fields between the pre-sales monitoring master database and FreshSales CRM.
 * Based on FreshSales API research findings and contact field metadata.
 *
 * Master Database Fields (from Google Sheets):
 * - Timestamp, Child Name, Parent Name, Parent Email, Parent Mobile, Interest Level, etc.
 *
 * FreshSales Contact Fields:
 * - first_name, last_name, emails, mobile_number, contact_status_id, etc.
 */

class FreshSalesMapper {
    constructor() {
        // FreshSales contact status mappings based on API research
        this.contactStatusMap = {
            'Hot': 402000446647,
            'Warm': 402000446648,
            'Interested': 402000446645,
            'Tepid': 402000769051,
            'New': 402000446643,
            'Contacted': 402000446644,
            'Not Interested': 402000446646,
            'Cold': 402000790072,
            'Returning Parent': 402001579233,
            'Payment Link Raised': 402000905665,
            'Full Scholarship GSP\'25': 402001624730,
            'Paid': 402000446650,
            'Lost': 402000446651
        };

        // Reverse mapping for status display
        this.statusIdToName = Object.fromEntries(
            Object.entries(this.contactStatusMap).map(([name, id]) => [id, name])
        );

        // Lead source mappings (based on typical FreshSales configuration)
        this.leadSourceMap = {
            'Website': 'Web',
            'Google Form': 'Web',
            'Contact Form': 'Web',
            'Email': 'Email',
            'Phone': 'Phone',
            'Referral': 'Referral',
            'Social Media': 'Social Media',
            'Advertisement': 'Advertisement'
        };

        // Activity types for notes/follow-ups
        this.activityTypes = {
            'note': 'Note',
            'call': 'Phone',
            'email': 'Email',
            'meeting': 'Meeting',
            'task': 'Task'
        };

        console.log('FreshSales Field Mapper initialized with contact status mappings');
    }

    /**
     * Map master database lead data to FreshSales contact format
     * @param {Object} leadData - Lead data from master database
     * @returns {Object} FreshSales contact data
     */
    mapLeadToContact(leadData) {
        try {
            // Parse child name if it's in a single field
            const { firstName, lastName } = this.parseFullName(leadData.childName || leadData['Child Name'] || '');

            // Prepare base contact data
            const contactData = {
                // Basic information
                first_name: firstName,
                last_name: lastName,

                // Email - FreshSales expects array format
                emails: this.formatEmailField(leadData.parentEmail || leadData['Parent Email']),

                // Mobile number
                mobile_number: this.formatPhoneNumber(leadData.parentMobile || leadData['Parent Mobile']),

                // Contact status based on interest level
                contact_status_id: this.mapInterestLevel(leadData.interestLevel || leadData['Interest Level']),

                // Lead source
                lead_source_id: this.mapLeadSource(leadData.source || 'Website'),

                // Description/notes
                description: this.buildDescription(leadData),

                // Tags
                tags: this.buildTags(leadData)
            };

            // Add custom fields if available
            if (leadData.childGrade || leadData['Child Grade']) {
                contactData.cf_child_grade = leadData.childGrade || leadData['Child Grade'];
            }

            if (leadData.program || leadData['Program']) {
                contactData.cf_program = leadData.program || leadData['Program'];
            }

            if (leadData.geography || leadData['Geography']) {
                contactData.country = leadData.geography || leadData['Geography'];
            }

            // Remove null/undefined values
            Object.keys(contactData).forEach(key => {
                if (contactData[key] === null || contactData[key] === undefined || contactData[key] === '') {
                    delete contactData[key];
                }
            });

            return contactData;
        } catch (error) {
            console.error('Error mapping lead to contact:', error.message);
            throw new Error(`Field mapping failed: ${error.message}`);
        }
    }

    /**
     * Map FreshSales contact data back to master database format
     * @param {Object} contactData - FreshSales contact data
     * @returns {Object} Master database format
     */
    mapContactToLead(contactData) {
        try {
            return {
                freshsalesId: contactData.id,
                childName: `${contactData.first_name || ''} ${contactData.last_name || ''}`.trim(),
                parentName: `${contactData.first_name || ''} ${contactData.last_name || ''}`.trim(),
                parentEmail: this.extractPrimaryEmail(contactData.emails),
                parentMobile: contactData.mobile_number,
                interestLevel: this.statusIdToName[contactData.contact_status_id] || 'New',
                childGrade: contactData.cf_child_grade,
                program: contactData.cf_program,
                geography: contactData.country,
                tags: Array.isArray(contactData.tags) ? contactData.tags.join(', ') : '',
                lastUpdated: contactData.updated_at,
                createdAt: contactData.created_at
            };
        } catch (error) {
            console.error('Error mapping contact to lead:', error.message);
            throw new Error(`Reverse field mapping failed: ${error.message}`);
        }
    }

    /**
     * Create activity/note data for FreshSales
     * @param {string} contactId - FreshSales contact ID
     * @param {Object} noteData - Note/activity data
     * @returns {Object} FreshSales activity data
     */
    mapNoteToActivity(contactId, noteData) {
        return {
            activity_type_id: this.getActivityTypeId(noteData.type || 'note'),
            title: noteData.title || 'Pre-sales Follow-up',
            description: noteData.description || noteData.content,
            targetable_id: contactId,
            targetable_type: 'Contact',
            owner_id: noteData.ownerId, // If available
            due_date: noteData.dueDate, // If it's a task
            completed: noteData.completed || false
        };
    }

    /**
     * Parse full name into first and last name
     * @param {string} fullName - Full name string
     * @returns {Object} Object with firstName and lastName
     */
    parseFullName(fullName) {
        if (!fullName || typeof fullName !== 'string') {
            return { firstName: '', lastName: '' };
        }

        const parts = fullName.trim().split(/\s+/);

        if (parts.length === 0) {
            return { firstName: '', lastName: '' };
        } else if (parts.length === 1) {
            return { firstName: parts[0], lastName: '' };
        } else {
            return {
                firstName: parts[0],
                lastName: parts.slice(1).join(' ')
            };
        }
    }

    /**
     * Format email field for FreshSales
     * @param {string} email - Email address
     * @returns {Array} FreshSales email format
     */
    formatEmailField(email) {
        if (!email || typeof email !== 'string') {
            return [];
        }

        // Clean and validate email
        const cleanEmail = email.trim().toLowerCase();
        if (!this.isValidEmail(cleanEmail)) {
            console.warn(`Invalid email format: ${email}`);
            return [];
        }

        return [{
            value: cleanEmail,
            is_primary: true,
            label: 'work'
        }];
    }

    /**
     * Format phone number for FreshSales
     * @param {string} phone - Phone number
     * @returns {string} Formatted phone number
     */
    formatPhoneNumber(phone) {
        if (!phone || typeof phone !== 'string') {
            return '';
        }

        // Remove all non-digit characters except +
        let cleaned = phone.replace(/[^\d+]/g, '');

        // Add + prefix if not present and starts with country code
        if (!cleaned.startsWith('+') && cleaned.length > 10) {
            cleaned = '+' + cleaned;
        }

        return cleaned;
    }

    /**
     * Map interest level to FreshSales contact status ID
     * @param {string} interestLevel - Interest level from master database
     * @returns {number} FreshSales contact status ID
     */
    mapInterestLevel(interestLevel) {
        if (!interestLevel || typeof interestLevel !== 'string') {
            return this.contactStatusMap['New']; // Default to New
        }

        const normalized = interestLevel.trim();

        // Direct mapping
        if (this.contactStatusMap[normalized]) {
            return this.contactStatusMap[normalized];
        }

        // Fuzzy matching for common variations
        const lowerCase = normalized.toLowerCase();

        if (lowerCase.includes('hot') || lowerCase.includes('very interested')) {
            return this.contactStatusMap['Hot'];
        }
        if (lowerCase.includes('warm') || lowerCase.includes('somewhat interested')) {
            return this.contactStatusMap['Warm'];
        }
        if (lowerCase.includes('interested')) {
            return this.contactStatusMap['Interested'];
        }
        if (lowerCase.includes('not interested') || lowerCase.includes('no')) {
            return this.contactStatusMap['Not Interested'];
        }
        if (lowerCase.includes('cold')) {
            return this.contactStatusMap['Cold'];
        }

        // Default to New if no match
        return this.contactStatusMap['New'];
    }

    /**
     * Map lead source to FreshSales lead source
     * @param {string} source - Source from master database
     * @returns {string} FreshSales lead source
     */
    mapLeadSource(source) {
        if (!source || typeof source !== 'string') {
            return 'Web'; // Default
        }

        const normalized = source.trim();
        return this.leadSourceMap[normalized] || 'Web';
    }

    /**
     * Build description field combining available data
     * @param {Object} leadData - Lead data
     * @returns {string} Description text
     */
    buildDescription(leadData) {
        const parts = [];

        if (leadData.parentName || leadData['Parent Name']) {
            parts.push(`Parent: ${leadData.parentName || leadData['Parent Name']}`);
        }

        if (leadData.childGrade || leadData['Child Grade']) {
            parts.push(`Child Grade: ${leadData.childGrade || leadData['Child Grade']}`);
        }

        if (leadData.program || leadData['Program']) {
            parts.push(`Program Interest: ${leadData.program || leadData['Program']}`);
        }

        if (leadData.timestamp || leadData['Timestamp']) {
            parts.push(`Initial Contact: ${leadData.timestamp || leadData['Timestamp']}`);
        }

        if (leadData.notes || leadData['Notes']) {
            parts.push(`Notes: ${leadData.notes || leadData['Notes']}`);
        }

        return parts.join(' | ');
    }

    /**
     * Build tags array from lead data
     * @param {Object} leadData - Lead data
     * @returns {Array} Tags array
     */
    buildTags(leadData) {
        const tags = [];

        // Add source as tag
        if (leadData.source) {
            tags.push(`source:${leadData.source.toLowerCase().replace(/\s+/g, '_')}`);
        }

        // Add program as tag
        if (leadData.program || leadData['Program']) {
            tags.push(`program:${(leadData.program || leadData['Program']).toLowerCase().replace(/\s+/g, '_')}`);
        }

        // Add grade as tag
        if (leadData.childGrade || leadData['Child Grade']) {
            tags.push(`grade:${(leadData.childGrade || leadData['Child Grade']).toLowerCase().replace(/\s+/g, '_')}`);
        }

        // Add pre-sales tag
        tags.push('pre_sales_lead');

        return tags;
    }

    /**
     * Extract primary email from FreshSales email array
     * @param {Array} emails - FreshSales emails array
     * @returns {string} Primary email address
     */
    extractPrimaryEmail(emails) {
        if (!Array.isArray(emails) || emails.length === 0) {
            return '';
        }

        // Find primary email
        const primary = emails.find(email => email.is_primary);
        if (primary) {
            return primary.value;
        }

        // Return first email if no primary
        return emails[0]?.value || '';
    }

    /**
     * Get activity type ID for FreshSales
     * @param {string} type - Activity type
     * @returns {string} FreshSales activity type
     */
    getActivityTypeId(type) {
        return this.activityTypes[type] || this.activityTypes['note'];
    }

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} Is valid email
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Create search criteria for finding existing contacts
     * @param {Object} leadData - Lead data
     * @returns {Object} Search criteria
     */
    createSearchCriteria(leadData) {
        const criteria = {};

        const email = leadData.parentEmail || leadData['Parent Email'];
        if (email && this.isValidEmail(email.trim())) {
            criteria.email = email.trim().toLowerCase();
        }

        const mobile = leadData.parentMobile || leadData['Parent Mobile'];
        if (mobile) {
            criteria.mobile = this.formatPhoneNumber(mobile);
        }

        const childName = leadData.childName || leadData['Child Name'];
        if (childName) {
            const { firstName, lastName } = this.parseFullName(childName);
            if (firstName) criteria.firstName = firstName;
            if (lastName) criteria.lastName = lastName;
        }

        return criteria;
    }

    /**
     * Generate sync metadata for tracking
     * @param {Object} leadData - Original lead data
     * @param {Object} contactData - FreshSales contact data
     * @returns {Object} Sync metadata
     */
    generateSyncMetadata(leadData, contactData) {
        return {
            syncTimestamp: new Date().toISOString(),
            leadDataHash: this.generateDataHash(leadData),
            contactDataHash: this.generateDataHash(contactData),
            mappingVersion: '1.0',
            fieldsMapped: Object.keys(contactData),
            sourceFields: Object.keys(leadData)
        };
    }

    /**
     * Generate hash for data comparison
     * @param {Object} data - Data to hash
     * @returns {string} Simple hash string
     */
    generateDataHash(data) {
        // Simple hash for change detection
        const str = JSON.stringify(data, Object.keys(data).sort());
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString();
    }

    /**
     * Get available contact status options
     * @returns {Array} Array of status options
     */
    getContactStatusOptions() {
        return Object.entries(this.contactStatusMap).map(([name, id]) => ({
            name,
            id,
            category: this.getStatusCategory(id)
        }));
    }

    /**
     * Get status category for UI grouping
     * @param {number} statusId - Status ID
     * @returns {string} Category name
     */
    getStatusCategory(statusId) {
        const openStatuses = [
            402000446643, // New
            402000446644, // Contacted
            402000446645, // Interested
            402000769051, // Tepid
            402000446648, // Warm
            402000446647, // Hot
            402001579233, // Returning Parent
            402000905665, // Payment Link Raised
            402001624730  // Full Scholarship GSP'25
        ];

        const closedWonStatuses = [402000446650]; // Paid
        const closedLostStatuses = [402000446646, 402000790072, 402000446651]; // Not Interested, Cold, Lost

        if (openStatuses.includes(statusId)) return 'Open';
        if (closedWonStatuses.includes(statusId)) return 'Closed Won';
        if (closedLostStatuses.includes(statusId)) return 'Closed Lost';
        return 'Unknown';
    }
}

module.exports = FreshSalesMapper;