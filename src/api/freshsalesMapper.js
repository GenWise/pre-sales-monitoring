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

        // TIP Interest Level Mappings (Master Sheet → FreshSales)
        this.interestLevelMap = {
            'High': 402000446647,    // Maps to Hot
            'Medium': 402000446648,  // Maps to Warm
            'Low': 402000769051      // Maps to Tepid
        };

        // Reverse mapping for status display
        this.statusIdToName = Object.fromEntries(
            Object.entries(this.contactStatusMap).map(([name, id]) => [id, name])
        );

        // Lead source mappings (FreshSales requires numeric IDs)
        this.leadSourceMap = {
            'Website': 402000691518,        // Web
            'Google Form': 402000691518,    // Web
            'Contact Form': 402000691518,   // Web
            'website': 402000691518,        // Web
            'returning_students': 402000691518, // Web
            'ats_qualifiers': 402000691518, // Web
            'early_bird': 402000691518,     // Web
            'Email': 402000691520,          // Email
            'Phone': 402000691522,          // Phone (if exists)
            'Referral': 402000691521,       // Referral (if exists)
            'Social Media': 402000691519,   // Organic Search (closest match)
            'Advertisement': 402000691519   // Organic Search (closest match)
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
     * CRITICAL: Contact = Parent entity (parent_name → first_name/last_name)
     * @param {Object} leadData - Lead data from master database
     * @returns {Object} FreshSales contact data
     */
    mapLeadToContact(leadData) {
        try {
            // CONTACT = PARENT: Parse parent name (not child name)
            const { firstName, lastName } = this.parseFullName(
                leadData.parentName || leadData['Parent Name'] || leadData.parent_name || ''
            );

            // Prepare base contact data
            const contactData = {
                // Basic information - PARENT details
                first_name: firstName,
                last_name: lastName,

                // Email - FreshSales expects array format
                emails: this.formatEmailField(
                    leadData.parentEmail || leadData['Parent Email'] || leadData.parent_email
                ),

                // Mobile number
                mobile_number: this.formatPhoneNumber(
                    leadData.parentMobile || leadData['Parent Mobile'] || leadData.parent_mobile
                ),

                // Contact status based on actual status field (not interest level)
                contact_status_id: this.mapStatusToContactStatus(
                    leadData.status || leadData.Status || leadData['Status']
                ),

                // Lead source - use last_source text field (lead_source_id is read-only)
                last_source: 'Web Form',

                // Tags - gsp2026_* format for source tracking
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

            // Parent owner assignment (cf_parent_owner)
            // CRITICAL: FreshSales dropdown accepts text values ONLY, not numeric IDs
            if (leadData.assignedOwner || leadData['Assigned Owner'] || leadData.assigned_owner) {
                const owner = (leadData.assignedOwner || leadData['Assigned Owner'] || leadData.assigned_owner).trim();
                // Validate against exact dropdown values
                if (['Agnes', 'Ashish', 'Eklavya', 'Kevin'].includes(owner)) {
                    contactData.cf_parent_owner = owner;
                }
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
     * Map master database lead data to FreshSales deal format
     * CRITICAL: Deal = Child entity (child_name → deal name)
     * @param {Object} leadData - Lead data from master database
     * @param {string} contactId - Parent contact ID
     * @returns {Object} FreshSales deal data
     */
    mapLeadToDeal(leadData, contactId) {
        try {
            const childName = leadData.childName || leadData['Child Name'] || leadData.child_name || 'Unnamed Child';

            const dealData = {
                // Deal name = child name
                name: childName,

                // Link to parent contact (CRITICAL: use contacts_added_list, not contacts)
                contacts_added_list: [contactId],

                // Deal pipeline - Child Lifecycle (402000049629)
                deal_pipeline_id: 402000049629,

                // Deal stage - default to New (402000347606)
                deal_stage_id: 402000347606
            };

            return dealData;
        } catch (error) {
            console.error('Error mapping lead to deal:', error.message);
            throw new Error(`Deal mapping failed: ${error.message}`);
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

        // Handle spreadsheet errors
        if (phone.includes('#ERROR!') || phone.includes('ERROR')) {
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
     * Map status to FreshSales contact status ID
     * @param {string} status - Status from master database (Warm, Hot, Not Interested)
     * @returns {number} FreshSales contact status ID
     */
    mapStatusToContactStatus(status) {
        if (!status || typeof status !== 'string') {
            return this.contactStatusMap['New']; // Default to New
        }

        const normalized = status.trim();

        // Direct mapping: Status field values → FreshSales contact_status_id
        if (this.contactStatusMap[normalized]) {
            return this.contactStatusMap[normalized];
        }

        // Fuzzy matching for common variations
        const lowerCase = normalized.toLowerCase();

        if (lowerCase.includes('warm')) {
            return this.contactStatusMap['Warm'];
        }
        if (lowerCase.includes('hot')) {
            return this.contactStatusMap['Hot'];
        }
        if (lowerCase.includes('not interested')) {
            return this.contactStatusMap['Not Interested'];
        }

        // Default to New if no match
        return this.contactStatusMap['New'];
    }

    /**
     * Map interest level to FreshSales contact status ID (DEPRECATED - use mapStatusToContactStatus)
     * @param {string} interestLevel - Interest level from master database
     * @returns {number} FreshSales contact status ID
     */
    mapInterestLevel(interestLevel) {
        if (!interestLevel || typeof interestLevel !== 'string') {
            return this.interestLevelMap['Medium']; // Default to Medium
        }

        const normalized = interestLevel.trim();

        // TIP Direct mapping: High|Medium|Low → FreshSales contact_status_id
        if (this.interestLevelMap[normalized]) {
            return this.interestLevelMap[normalized];
        }

        // Fuzzy matching for common variations
        const lowerCase = normalized.toLowerCase();

        if (lowerCase.includes('high') || lowerCase.includes('hot') || lowerCase.includes('very interested')) {
            return this.interestLevelMap['High'];
        }
        if (lowerCase.includes('medium') || lowerCase.includes('warm') || lowerCase.includes('somewhat interested')) {
            return this.interestLevelMap['Medium'];
        }
        if (lowerCase.includes('low') || lowerCase.includes('cold') || lowerCase.includes('not very interested')) {
            return this.interestLevelMap['Low'];
        }

        // Default to New if no match
        return this.contactStatusMap['New'];
    }

    /**
     * Map lead source to FreshSales lead source ID
     * @param {string} source - Source from master database
     * @returns {number} FreshSales lead source ID
     */
    mapLeadSource(source) {
        if (!source || typeof source !== 'string') {
            return 402000691518; // Default to Web
        }

        const normalized = source.trim();
        return this.leadSourceMap[normalized] || 402000691518; // Default to Web
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
     * Uses gsp2026_* format for source tracking
     * @param {Object} leadData - Lead data
     * @returns {Array} Tags array
     */
    buildTags(leadData) {
        const tags = [];

        // Add source tag in gsp2026_* format
        const sourceTag = leadData.sourceTag || leadData['Source Tag'] || leadData.source_tag;
        if (sourceTag) {
            const sourceMap = {
                'website': 'gsp2026_website_form',
                'returning_students': 'gsp2026_returning_students_form',
                'ats_qualifiers': 'gsp2026_ats_qualifiers_form',
                'early_bird': 'gsp2026_early_bird_form'
            };
            tags.push(sourceMap[sourceTag] || `gsp2026_${sourceTag}_form`);
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

        const email = leadData.parentEmail || leadData['Parent Email'] || leadData.parent_email;
        if (email && this.isValidEmail(email.trim())) {
            criteria.email = email.trim().toLowerCase();
        }

        const mobile = leadData.parentMobile || leadData['Parent Mobile'] || leadData.parent_mobile;
        if (mobile) {
            criteria.mobile = this.formatPhoneNumber(mobile);
        }

        const childName = leadData.childName || leadData['Child Name'] || leadData.child_name;
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