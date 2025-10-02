// Dashboard API using backend proxy (avoids 403 errors)
class LeadsAPIProxy {
    constructor() {
        // Use the working production API endpoints
        this.API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:3002'
            : 'https://giftedworld.org';

        // Cache settings
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.lastFetch = null;
    }

    /**
     * Get all leads from the proxy API
     * @returns {Promise<Array>} Array of lead objects
     */
    async getAllLeads() {
        // Check cache first
        const cached = this.getFromCache('all_leads');
        if (cached) {
            return cached;
        }

        try {
            console.log('Fetching leads from proxy API...');
            const response = await fetch(`${this.API_URL}/leads.php`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                mode: 'cors'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch leads');
            }

            const leads = this.transformLeads(data.leads);

            // Cache the results
            this.setCache('all_leads', leads);
            this.lastFetch = Date.now();

            console.log(`Successfully fetched ${leads.length} leads`);
            return leads;

        } catch (error) {
            console.error('Error fetching leads:', error);

            // Fallback to cached data if available
            const cachedData = this.cache.get('all_leads');
            if (cachedData) {
                console.warn('Using cached data due to API error');
                return cachedData.data;
            }

            // Final fallback to mock data
            console.warn('Using mock data due to API error');
            return this.getMockData();
        }
    }

    /**
     * Transform raw lead data to dashboard format
     * @param {Array} rawLeads - Raw leads from API
     * @returns {Array} Transformed leads
     */
    transformLeads(rawLeads) {
        return rawLeads.map((lead, index) => {
            // Map the sheet columns to dashboard fields
            return {
                id: lead.id || `lead_${index}`,
                name: lead.child_name || lead.name || '',
                email: lead.parent_email || lead.email || '',
                mobile: lead.parent_mobile || lead.mobile || lead.phone || '',
                status: this.normalizeStatus(lead.status),
                source: lead.source_tag || lead.source || 'Unknown',
                date: this.parseDate(lead.timestamp || lead.date),
                notes: lead.notes || '',
                interest: lead.interest_level || lead.interest || '',
                company: lead.parent_name || lead.company || '',
                city: lead.city || '',
                assigned_to: lead.assigned_owner || lead.assigned_to || 'Unassigned',
                duplicate_flag: lead.duplicate_flag || 'No',
                timestamp: lead.timestamp || new Date().toISOString()
            };
        });
    }

    /**
     * Normalize status values to match dashboard expectations
     * @param {string} status - Raw status value
     * @returns {string} Normalized status
     */
    normalizeStatus(status) {
        if (!status) return 'New Parent';

        const statusMap = {
            'new parent': 'New Parent',
            'new': 'New Parent',
            'contacted': 'Contacted',
            'follow-up': 'Follow-up',
            'follow up': 'Follow-up',
            'enrolled': 'Enrolled',
            'converted': 'Enrolled',
            'not interested': 'Not Interested',
            'lost': 'Not Interested'
        };

        const normalizedKey = status.toLowerCase().trim();
        return statusMap[normalizedKey] || status;
    }

    /**
     * Parse various date formats
     * @param {string} dateStr - Date string
     * @returns {string} Formatted date (YYYY-MM-DD)
     */
    parseDate(dateStr) {
        if (!dateStr) return this.formatDate(new Date());

        try {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                return this.formatDate(date);
            }
        } catch (error) {
            console.warn('Invalid date format:', dateStr);
        }

        return this.formatDate(new Date());
    }

    /**
     * Format date to YYYY-MM-DD
     * @param {Date} date - Date object
     * @returns {string} Formatted date string
     */
    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    /**
     * Get cached data if still valid
     * @param {string} key - Cache key
     * @returns {*} Cached data or null
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;

        if (Date.now() - cached.timestamp > this.cacheTimeout) {
            this.cache.delete(key);
            return null;
        }

        return cached.data;
    }

    /**
     * Set data in cache
     * @param {string} key - Cache key
     * @param {*} data - Data to cache
     */
    setCache(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    /**
     * Clear all cached data
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Test API connection
     * @returns {Promise<Object>} Connection test result
     */
    async testConnection() {
        try {
            const response = await fetch(`${this.API_URL}/health.php`);

            if (response.ok) {
                const data = await response.json();
                return {
                    success: true,
                    message: 'Proxy API connection successful',
                    service: data.service
                };
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            return {
                success: false,
                message: `Proxy API connection failed: ${error.message}`,
                fallbackToMock: true
            };
        }
    }

    /**
     * Get API status information
     * @returns {Object} API status
     */
    getStatus() {
        return {
            apiUrl: this.API_URL,
            cacheSize: this.cache.size,
            lastFetch: this.lastFetch,
            environment: window.location.hostname
        };
    }

    /**
     * Get mock data for development/testing
     * @returns {Array} Mock leads
     */
    getMockData() {
        return [
            {
                id: 'lead_1',
                name: 'Test Child 1',
                email: 'parent1@email.com',
                mobile: '+91-9876543210',
                status: 'New Parent',
                source: 'returning_students',
                date: '2024-01-15',
                notes: 'Interested in program',
                interest: 'High',
                company: 'Parent Name 1',
                city: 'Mumbai',
                assigned_to: 'Rajesh',
                duplicate_flag: 'No',
                timestamp: '2024-01-15T10:30:00Z'
            },
            {
                id: 'lead_2',
                name: 'Test Child 2',
                email: 'parent2@email.com',
                mobile: '+91-8765432109',
                status: 'Contacted',
                source: 'ats_qualifiers',
                date: '2024-01-14',
                notes: 'Follow up scheduled',
                interest: 'Medium',
                company: 'Parent Name 2',
                city: 'Bangalore',
                assigned_to: 'Team Member',
                duplicate_flag: 'No',
                timestamp: '2024-01-14T14:15:00Z'
            }
        ];
    }

    /**
     * Update a lead in the master sheet
     * @param {string} leadId - Lead ID (contains row number)
     * @param {Object} updates - Lead updates
     * @returns {Promise<Object>} Update result
     */
    async updateLead(leadId, updates) {
        try {
            // Extract row number from lead ID (format: lead_123)
            const rowNumber = parseInt(leadId.replace('lead_', '')) + 1; // Convert to 1-based indexing

            if (!rowNumber || rowNumber < 2) {
                throw new Error('Invalid lead ID or row number');
            }

            console.log(`Updating lead ${leadId} (row ${rowNumber}) with:`, updates);

            // Map dashboard field names to master sheet column names
            const fieldMapping = {
                'assignedOwner': 'assigned_owner',
                'interestLevel': 'interest_level',
                'notes': 'notes',
                'status': 'status'
            };

            const mappedUpdates = {};
            Object.keys(updates).forEach(key => {
                const mappedKey = fieldMapping[key] || key;
                mappedUpdates[mappedKey] = updates[key];
            });

            const requestBody = {
                row_number: rowNumber,
                ...mappedUpdates
            };

            const response = await fetch(`${this.API_URL}/update_lead.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody),
                mode: 'cors'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to update lead');
            }

            console.log('Lead updated successfully:', result);

            // Clear cache to force refresh of data
            this.cache.clear();

            return {
                success: true,
                message: result.message,
                updatedCells: result.updated_cells,
                timestamp: result.timestamp
            };

        } catch (error) {
            console.error('Error updating lead:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Update lead status
     * @param {string} leadId - Lead ID
     * @param {string} status - New status
     * @returns {Promise<Object>} Update result
     */
    async updateLeadStatus(leadId, status) {
        return this.updateLead(leadId, { status: status });
    }

    /**
     * Assign lead to owner
     * @param {string} leadId - Lead ID
     * @param {string} owner - Assigned owner
     * @returns {Promise<Object>} Update result
     */
    async assignLead(leadId, owner) {
        return this.updateLead(leadId, { assigned_owner: owner });
    }

    /**
     * Add notes to lead
     * @param {string} leadId - Lead ID
     * @param {string} notes - Notes to add
     * @returns {Promise<Object>} Update result
     */
    async addLeadNotes(leadId, notes) {
        return this.updateLead(leadId, { notes: notes });
    }

    /**
     * Update lead interest level
     * @param {string} leadId - Lead ID
     * @param {string} interest - Interest level
     * @returns {Promise<Object>} Update result
     */
    async updateLeadInterest(leadId, interest) {
        return this.updateLead(leadId, { interest_level: interest });
    }
}

// Create and export global instance
window.LeadsAPI = new LeadsAPIProxy();

// Auto-initialize and test connection on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Dashboard API Proxy Status:', window.LeadsAPI.getStatus());

    // Test the connection
    const testResult = await window.LeadsAPI.testConnection();
    if (testResult.success) {
        console.log('✅ Proxy API connected successfully');
    } else {
        console.warn('⚠️ Proxy API connection failed, will use fallback data');
        console.warn(testResult.message);
    }
});