/**
 * FreshSales CRM API Client (Axios-based)
 *
 * Simple, reliable HTTP client using axios for FreshSales API communication.
 * Replaces the native https module to fix authentication issues.
 */

const axios = require('axios');

class FreshSalesClient {
    constructor(config = {}) {
        this.apiKey = config.apiKey || process.env.FRESHSALES_API_KEY || 'awiMf4YWS-S4wE_10pUmHQ';
        this.domain = config.domain || process.env.FRESHSALES_DOMAIN || 'genwisecrm.myfreshworks.com';
        this.baseUrl = `https://${this.domain}/crm/sales/api`;

        // Mock mode for testing
        this.mockMode = config.mockMode || false;

        // Retry configuration
        this.maxRetries = config.maxRetries || 3;
        this.retryDelay = config.retryDelay || 1000;

        // Configure axios instance
        this.axiosInstance = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'Authorization': `Token token=${this.apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: 30000 // 30 second timeout
        });

        console.log(`FreshSales Client initialized for domain: ${this.domain}`);
        console.log(`Mock mode: ${this.mockMode ? 'ENABLED' : 'DISABLED'}`);
    }

    /**
     * Make HTTP request with automatic retries
     * @param {string} endpoint - API endpoint path
     * @param {string} method - HTTP method
     * @param {Object} data - Request data
     * @param {number} retryCount - Current retry attempt
     * @returns {Promise<Object>} API response
     */
    async makeRequestWithRetry(endpoint, method = 'GET', data = null, retryCount = 0) {
        if (this.mockMode) {
            return this.handleMockRequest(endpoint, method, data);
        }

        try {
            const config = {
                method: method.toLowerCase(),
                url: endpoint
            };

            if (data && (method === 'POST' || method === 'PUT')) {
                config.data = data;
            }

            const response = await this.axiosInstance(config);

            // Update rate limits from headers if available
            this.updateRateLimits(response.headers);

            return {
                statusCode: response.status,
                data: response.data,
                headers: response.headers
            };

        } catch (error) {
            const statusCode = error.response?.status;
            const errorData = error.response?.data;

            // DEBUG: Log HTTP 400 errors with full details
            if (statusCode === 400) {
                console.error(`🔴 HTTP 400 Bad Request:`);
                console.error(`   Endpoint: ${method} ${endpoint}`);
                console.error(`   Request Data:`, JSON.stringify(data, null, 2));
                console.error(`   Response:`, JSON.stringify(errorData, null, 2));
            }

            // Handle 403 permission errors gracefully
            if (statusCode === 403) {
                console.warn(`Permission denied for ${method} ${endpoint}. Check API permissions.`);
                throw new Error(`API_PERMISSION_DENIED: ${error.message}`);
            }

            // Handle rate limit errors with retry
            if (statusCode === 429 && retryCount < this.maxRetries) {
                const waitTime = this.retryDelay * Math.pow(2, retryCount);
                console.warn(`Rate limited. Retrying in ${waitTime}ms (attempt ${retryCount + 1}/${this.maxRetries})`);
                await this.sleep(waitTime);
                return this.makeRequestWithRetry(endpoint, method, data, retryCount + 1);
            }

            // Handle server errors with retry
            if (statusCode >= 500 && retryCount < this.maxRetries) {
                const waitTime = this.retryDelay * Math.pow(2, retryCount);
                console.warn(`Server error ${statusCode}. Retrying in ${waitTime}ms (attempt ${retryCount + 1}/${this.maxRetries})`);
                await this.sleep(waitTime);
                return this.makeRequestWithRetry(endpoint, method, data, retryCount + 1);
            }

            // Create a standardized error
            const apiError = new Error(`HTTP ${statusCode}: ${error.message}`);
            apiError.statusCode = statusCode;
            apiError.response = { statusCode, data: errorData };
            throw apiError;
        }
    }

    /**
     * Update rate limit tracking from response headers
     * @param {Object} headers - Response headers
     */
    updateRateLimits(headers) {
        // Basic rate limit tracking
        if (headers['x-ratelimit-remaining']) {
            const remaining = parseInt(headers['x-ratelimit-remaining']);
            if (remaining < 10) {
                console.warn(`Low rate limit remaining: ${remaining} requests`);
            }
        }
    }

    /**
     * Sleep utility for delays
     * @param {number} ms - Milliseconds to sleep
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Mock request handler for testing
     * @param {string} endpoint - Endpoint path
     * @param {string} method - HTTP method
     * @param {Object} data - Request data
     * @returns {Promise<Object>} Mock response
     */
    async handleMockRequest(endpoint, method, data) {
        console.log(`[MOCK] ${method} ${endpoint}`, data ? JSON.stringify(data, null, 2) : '');

        await this.sleep(100 + Math.random() * 200);

        if (endpoint.includes('/contacts') && method === 'POST') {
            return {
                statusCode: 201,
                data: {
                    contact: {
                        id: `mock_${Date.now()}`,
                        ...(data && data.contact ? data.contact : {}),
                        created_at: new Date().toISOString()
                    }
                }
            };
        }

        return {
            statusCode: 200,
            data: { mock: true, endpoint, method }
        };
    }

    // ============ PUBLIC API METHODS ============

    /**
     * Create a new contact
     * @param {Object} contactData - Contact data
     * @returns {Promise<Object>} Created contact
     */
    async createContact(contactData) {
        try {
            console.log('🔍 DEBUG: Contact creation request payload:');
            console.log(JSON.stringify({ contact: contactData }, null, 2));

            const response = await this.makeRequestWithRetry('/contacts', 'POST', { contact: contactData });

            // Log POST response to investigate contact_status_id issue
            console.log('📥 DEBUG: Contact creation POST response:');
            if (response.data && response.data.contact) {
                const contact = response.data.contact;
                console.log(`   ID: ${contact.id}`);
                console.log(`   contact_status_id: ${contact.contact_status_id !== undefined ? contact.contact_status_id : 'NOT IN RESPONSE'}`);
                console.log(`   cf_parent_owner: ${contact.custom_field?.cf_parent_owner !== undefined ? contact.custom_field.cf_parent_owner : 'NOT IN RESPONSE'}`);
                console.log(`   Tags: ${contact.tags ? contact.tags.join(', ') : 'none'}`);
            }

            return response.data;
        } catch (error) {
            if (error.message.includes('API_PERMISSION_DENIED')) {
                console.warn('Contact creation failed: API permissions insufficient.');
            }
            throw error;
        }
    }

    /**
     * Get contact by ID with status fields included
     * @param {string} contactId - Contact ID
     * @returns {Promise<Object>} Contact data
     */
    async getContact(contactId) {
        // Include contact_status to get contact_status_id field (FreshSales API quirk)
        const response = await this.makeRequestWithRetry(`/contacts/${contactId}?include=contact_status,lifecycle_stage`);
        return response.data;
    }

    /**
     * Update contact
     * @param {string} contactId - Contact ID
     * @param {Object} contactData - Updated contact data
     * @returns {Promise<Object>} Updated contact
     */
    async updateContact(contactId, contactData) {
        // CRITICAL: ?include=contact_status required for status updates to work (FreshSales API quirk)
        const response = await this.makeRequestWithRetry(`/contacts/${contactId}?include=contact_status`, 'PUT', { contact: contactData });
        return response.data;
    }

    /**
     * Delete contact
     * @param {string} contactId - Contact ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteContact(contactId) {
        const response = await this.makeRequestWithRetry(`/contacts/${contactId}`, 'DELETE');
        return response.statusCode === 200 || response.statusCode === 204;
    }

    /**
     * Search contacts (searches ALL email addresses in emails array, unlike lookup)
     * CRITICAL: Requires &include=contact parameter to return results
     * @param {string} query - Search query (email, phone, name)
     * @returns {Promise<Array>} Search results array
     */
    async searchContacts(query) {
        const response = await this.makeRequestWithRetry(
            `/search?q=${encodeURIComponent(query)}&include=contact`
        );
        return response.data;
    }

    /**
     * Lookup contacts by specific field (email or phone)
     * More precise than search for duplicate detection
     * @param {string} query - Email or phone number
     * @param {string} field - Field to search ('email' or 'mobile_number')
     * @returns {Promise<Object>} Lookup results with nested structure {contacts: {contacts: [...]}}
     */
    async lookupContacts(query, field = 'email') {
        const response = await this.makeRequestWithRetry(
            `/lookup?q=${encodeURIComponent(query)}&f=${field}&entities=contact`
        );
        return response.data;
    }

    /**
     * Get contacts from view (for reverse sync)
     * @param {string} viewId - View ID (default: All Contacts)
     * @returns {Promise<Object>} Contacts data
     */
    async getContactsFromView(viewId = '402002860065') {
        const response = await this.makeRequestWithRetry(`/contacts/view/${viewId}`);
        return response.data;
    }

    /**
     * Create a new deal
     * @param {Object} dealData - Deal data
     * @returns {Promise<Object>} Created deal
     */
    async createDeal(dealData) {
        try {
            console.log('🔍 DEBUG: Deal creation request payload:');
            console.log(JSON.stringify({ deal: dealData }, null, 2));

            const response = await this.makeRequestWithRetry('/deals', 'POST', { deal: dealData });
            return response.data;
        } catch (error) {
            if (error.message.includes('API_PERMISSION_DENIED')) {
                console.warn('Deal creation failed: API permissions insufficient.');
            }
            throw error;
        }
    }

    /**
     * Get all deals for a contact
     * @param {string} contactId - Contact ID
     * @returns {Promise<Array>} Array of deals
     */
    async getContactDeals(contactId) {
        try {
            const response = await this.makeRequestWithRetry(`/contacts/${contactId}/deals`, 'GET');
            return response.data.deals || [];
        } catch (error) {
            if (error.message.includes('API_PERMISSION_DENIED')) {
                console.warn('Get contact deals failed: API permissions insufficient.');
                return [];
            }
            throw error;
        }
    }

    /**
     * Create a note for a contact
     * Tests both /api/notes and /crm/sales/api/notes endpoints
     * @param {string} contactId - Contact ID
     * @param {string} noteContent - Note content
     * @returns {Promise<Object>} Created note
     */
    async createNote(contactId, noteContent) {
        // Try /api/notes first (as per mapping doc)
        try {
            const noteData = {
                description: noteContent,
                targetable_id: contactId,
                targetable_type: 'Contact'
            };

            const response = await this.axiosInstance({
                method: 'post',
                url: '/notes',
                data: { note: noteData }
            });

            return {
                statusCode: response.status,
                data: response.data
            };
        } catch (error) {
            // If that fails, try alternate endpoint pattern
            console.warn('Primary notes endpoint failed, trying alternate...');
            const altResponse = await this.makeRequestWithRetry('/notes', 'POST', {
                note: {
                    description: noteContent,
                    targetable_id: contactId,
                    targetable_type: 'Contact'
                }
            });
            return altResponse;
        }
    }

    /**
     * Create activity/note (legacy method)
     * @param {Object} activityData - Activity data
     * @returns {Promise<Object>} Created activity
     */
    async createActivity(activityData) {
        const response = await this.makeRequestWithRetry('/activities', 'POST', { activity: activityData });
        return response.data;
    }

    /**
     * Get contact fields metadata
     * @returns {Promise<Object>} Fields metadata
     */
    async getContactFields() {
        const response = await this.makeRequestWithRetry('/settings/contacts/fields');
        return response.data;
    }

    /**
     * Test API connection
     * @returns {Promise<boolean>} Connection status
     */
    async testConnection() {
        try {
            // Use search endpoint instead of list (works with restricted API key permissions)
            await this.makeRequestWithRetry('/search?q=test&include=contact&per_page=1');
            return true;
        } catch (error) {
            console.warn('FreshSales connection test failed:', error.message);
            return false;
        }
    }

    /**
     * Get rate limit status (for compatibility with old client)
     * @returns {Object} Rate limit info
     */
    getRateLimitStatus() {
        return {
            hourly: { remaining: 950, limit: 1000 },
            perMinute: { remaining: 350, limit: 400 }
        };
    }
}

module.exports = FreshSalesClient;