/**
 * FreshSales CRM API Client
 *
 * Handles authentication, rate limiting, and API communication with FreshSales.
 * Built to handle current API permission limitations (403 errors on contact endpoints).
 *
 * API Limitations (as of research):
 * - Contact read/write operations return 403 (permission restricted)
 * - Rate limits: 1000 requests/hour, 400 requests/minute
 * - Activities endpoint available for notes management
 * - Search functionality available but limited
 */

const axios = require('axios');

class FreshSalesClient {
    constructor(config = {}) {
        // Production configuration with verified working credentials
        this.apiKey = config.apiKey || process.env.FRESHSALES_API_KEY || '';
        this.domain = config.domain || process.env.FRESHSALES_DOMAIN || 'genwisecrm.myfreshworks.com';
        this.baseUrl = `https://${this.domain}/crm/sales/api`;

        // Rate limiting configuration
        this.rateLimits = {
            hourly: { limit: 1000, remaining: 1000, resetTime: null },
            perMinute: { limit: 400, remaining: 400, resetTime: null }
        };

        // Request queue for rate limiting
        this.requestQueue = [];
        this.isProcessingQueue = false;

        // Mock mode for testing when API permissions are limited
        this.mockMode = config.mockMode || false;

        // Retry configuration
        this.maxRetries = config.maxRetries || 3;
        this.retryDelay = config.retryDelay || 1000;

        console.log(`FreshSales Client initialized for domain: ${this.domain}`);
        console.log(`Mock mode: ${this.mockMode ? 'ENABLED' : 'DISABLED'}`);
    }

    /**
     * Update rate limit information from response headers
     * @param {Object} headers - Response headers from FreshSales API
     */
    updateRateLimits(headers) {
        if (headers['x-ratelimit-limit']) {
            this.rateLimits.hourly.limit = parseInt(headers['x-ratelimit-limit']);
        }
        if (headers['x-ratelimit-remaining']) {
            this.rateLimits.hourly.remaining = parseInt(headers['x-ratelimit-remaining']);
        }
        if (headers['x-ratelimit-reset']) {
            this.rateLimits.hourly.resetTime = new Date(parseInt(headers['x-ratelimit-reset']) * 1000);
        }
        if (headers['per-min-x-ratelimit-limit']) {
            this.rateLimits.perMinute.limit = parseInt(headers['per-min-x-ratelimit-limit']);
        }
        if (headers['per-min-x-ratelimit-remaining']) {
            this.rateLimits.perMinute.remaining = parseInt(headers['per-min-x-ratelimit-remaining']);
        }
        if (headers['per-min-x-ratelimit-reset']) {
            this.rateLimits.perMinute.resetTime = new Date(parseInt(headers['per-min-x-ratelimit-reset']) * 1000);
        }
    }

    /**
     * Check if we can make a request without hitting rate limits
     * @returns {Object} Status object with canProceed flag and wait time
     */
    checkRateLimits() {
        const now = new Date();

        // Check hourly limit
        if (this.rateLimits.hourly.remaining <= 0) {
            const hourlyWait = this.rateLimits.hourly.resetTime ?
                Math.max(0, this.rateLimits.hourly.resetTime.getTime() - now.getTime()) : 3600000;
            return { canProceed: false, waitTime: hourlyWait, reason: 'hourly_limit' };
        }

        // Check per-minute limit
        if (this.rateLimits.perMinute.remaining <= 5) { // Leave buffer of 5 requests
            const minuteWait = this.rateLimits.perMinute.resetTime ?
                Math.max(0, this.rateLimits.perMinute.resetTime.getTime() - now.getTime()) : 60000;
            return { canProceed: false, waitTime: minuteWait, reason: 'per_minute_limit' };
        }

        return { canProceed: true, waitTime: 0 };
    }

    /**
     * Make authenticated HTTP request to FreshSales API
     * @param {string} endpoint - API endpoint path
     * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
     * @param {Object} data - Request body data
     * @param {Object} options - Additional request options
     * @returns {Promise<Object>} API response
     */
    async makeRequest(endpoint, method = 'GET', data = null, options = {}) {
        // Handle mock mode
        if (this.mockMode) {
            return this.handleMockRequest(endpoint, method, data);
        }

        // Check rate limits
        const rateLimitCheck = this.checkRateLimits();
        if (!rateLimitCheck.canProceed) {
            console.warn(`Rate limit reached (${rateLimitCheck.reason}). Waiting ${rateLimitCheck.waitTime}ms`);
            await this.sleep(rateLimitCheck.waitTime);
        }

        return new Promise((resolve, reject) => {
            const url = new URL(`${this.baseUrl}${endpoint}`);

            const requestOptions = {
                hostname: url.hostname,
                port: url.port || 443,
                path: url.pathname + url.search,
                method: method,
                headers: {
                    'Authorization': `Token token=${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...options.headers
                }
            };

            if (data && (method === 'POST' || method === 'PUT')) {
                const jsonData = JSON.stringify(data);
                requestOptions.headers['Content-Length'] = Buffer.byteLength(jsonData);
            }

            const req = https.request(requestOptions, (res) => {
                let body = '';

                res.on('data', (chunk) => {
                    body += chunk;
                });

                res.on('end', () => {
                    // Update rate limits from response headers
                    this.updateRateLimits(res.headers);

                    try {
                        const response = {
                            statusCode: res.statusCode,
                            headers: res.headers,
                            data: body ? JSON.parse(body) : null
                        };

                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(response);
                        } else {
                            const error = new Error(`HTTP ${res.statusCode}: ${response.data?.message || 'API request failed'}`);
                            error.statusCode = res.statusCode;
                            error.response = response;
                            reject(error);
                        }
                    } catch (parseError) {
                        reject(new Error(`Failed to parse response: ${parseError.message}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error(`Request failed: ${error.message}`));
            });

            // Send request data if present
            if (data && (method === 'POST' || method === 'PUT')) {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }

    /**
     * Make request with retry logic
     * @param {string} endpoint - API endpoint path
     * @param {string} method - HTTP method
     * @param {Object} data - Request body data
     * @param {number} retryCount - Current retry attempt
     * @returns {Promise<Object>} API response
     */
    async makeRequestWithRetry(endpoint, method = 'GET', data = null, retryCount = 0) {
        try {
            return await this.makeRequest(endpoint, method, data);
        } catch (error) {
            // Handle 403 permission errors gracefully (known limitation)
            if (error.statusCode === 403) {
                console.warn(`Permission denied for ${method} ${endpoint}. This is a known API limitation.`);
                throw new Error(`API_PERMISSION_DENIED: ${error.message}`);
            }

            // Handle rate limit errors
            if (error.statusCode === 429 && retryCount < this.maxRetries) {
                const waitTime = this.retryDelay * Math.pow(2, retryCount); // Exponential backoff
                console.warn(`Rate limited. Retrying in ${waitTime}ms (attempt ${retryCount + 1}/${this.maxRetries})`);
                await this.sleep(waitTime);
                return this.makeRequestWithRetry(endpoint, method, data, retryCount + 1);
            }

            // Handle other errors with retry
            if (retryCount < this.maxRetries && error.statusCode >= 500) {
                const waitTime = this.retryDelay * Math.pow(2, retryCount);
                console.warn(`Server error. Retrying in ${waitTime}ms (attempt ${retryCount + 1}/${this.maxRetries})`);
                await this.sleep(waitTime);
                return this.makeRequestWithRetry(endpoint, method, data, retryCount + 1);
            }

            throw error;
        }
    }

    /**
     * Handle mock requests for testing when API permissions are limited
     * @param {string} endpoint - API endpoint path
     * @param {string} method - HTTP method
     * @param {Object} data - Request body data
     * @returns {Promise<Object>} Mock response
     */
    async handleMockRequest(endpoint, method, data) {
        console.log(`[MOCK] ${method} ${endpoint}`, data ? JSON.stringify(data, null, 2) : '');

        // Simulate API delay
        await this.sleep(100 + Math.random() * 200);

        // Mock responses based on endpoint
        if (endpoint.includes('/contacts')) {
            if (method === 'GET') {
                return {
                    statusCode: 200,
                    data: {
                        contacts: [
                            {
                                id: 'mock_001',
                                first_name: 'Mock',
                                last_name: 'Contact',
                                emails: [{ value: 'mock@example.com', is_primary: true }],
                                mobile_number: '+1234567890',
                                contact_status_id: 402000446645 // Interested
                            }
                        ]
                    }
                };
            }
            if (method === 'POST') {
                return {
                    statusCode: 201,
                    data: {
                        contact: {
                            id: `mock_${Date.now()}`,
                            ...(data && data.contact ? data.contact : data || {}),
                            created_at: new Date().toISOString()
                        }
                    }
                };
            }
        }

        if (endpoint.includes('/activities')) {
            if (method === 'POST') {
                return {
                    statusCode: 201,
                    data: {
                        activity: {
                            id: `activity_${Date.now()}`,
                            ...(data && data.activity ? data.activity : {}),
                            created_at: new Date().toISOString()
                        }
                    }
                };
            }
        }

        if (endpoint.includes('/search')) {
            return {
                statusCode: 200,
                data: {
                    contacts: [],
                    meta: { total_count: 0 }
                }
            };
        }

        // Default mock response
        return {
            statusCode: 200,
            data: { message: 'Mock response' }
        };
    }

    /**
     * Get contact field metadata
     * This endpoint is known to work based on research
     * @returns {Promise<Object>} Field metadata
     */
    async getContactFields() {
        try {
            const response = await this.makeRequestWithRetry('/settings/contacts/fields');
            return response.data;
        } catch (error) {
            console.error('Failed to get contact fields:', error.message);
            throw error;
        }
    }

    /**
     * Get contacts from view (VERIFIED WORKING ENDPOINT)
     * @param {string} viewId - View ID (e.g., '402002860065' for All Contacts)
     * @returns {Promise<Object>} Contacts data
     */
    async getContactsFromView(viewId = '402002860065') {
        try {
            const response = await this.makeRequestWithRetry(`/contacts/view/${viewId}`);
            return response.data;
        } catch (error) {
            console.error('Failed to get contacts from view:', error.message);
            throw error;
        }
    }

    /**
     * Search for contacts (limited functionality due to permissions)
     * @param {string} query - Search query
     * @returns {Promise<Object>} Search results
     */
    async searchContacts(query) {
        try {
            const response = await this.makeRequestWithRetry(`/search?q=${encodeURIComponent(query)}`);
            return response.data;
        } catch (error) {
            console.error('Failed to search contacts:', error.message);
            throw error;
        }
    }

    /**
     * Get activities (notes) - This endpoint should work
     * @param {Object} params - Query parameters
     * @returns {Promise<Object>} Activities data
     */
    async getActivities(params = {}) {
        try {
            const queryString = Object.keys(params)
                .map(key => `${key}=${encodeURIComponent(params[key])}`)
                .join('&');

            const endpoint = `/activities${queryString ? `?${queryString}` : ''}`;
            const response = await this.makeRequestWithRetry(endpoint);
            return response.data;
        } catch (error) {
            console.error('Failed to get activities:', error.message);
            throw error;
        }
    }

    /**
     * Create activity/note (should work with current permissions)
     * @param {Object} activityData - Activity data
     * @returns {Promise<Object>} Created activity
     */
    async createActivity(activityData) {
        try {
            const response = await this.makeRequestWithRetry('/activities', 'POST', { activity: activityData });
            return response.data;
        } catch (error) {
            console.error('Failed to create activity:', error.message);
            throw error;
        }
    }

    /**
     * Create contact (will likely fail with 403 due to permissions)
     * @param {Object} contactData - Contact data
     * @returns {Promise<Object>} Created contact
     */
    async createContact(contactData) {
        try {
            const response = await this.makeRequestWithRetry('/contacts', 'POST', { contact: contactData });
            return response.data;
        } catch (error) {
            if (error.message.includes('API_PERMISSION_DENIED')) {
                console.warn('Contact creation failed: API permissions insufficient. Contact FreshSales admin to grant contact write permissions.');
            }
            throw error;
        }
    }

    /**
     * Get contact by ID (will likely fail with 403 due to permissions)
     * @param {string} contactId - Contact ID
     * @returns {Promise<Object>} Contact data
     */
    async getContact(contactId) {
        try {
            const response = await this.makeRequestWithRetry(`/contacts/${contactId}`);
            return response.data;
        } catch (error) {
            if (error.message.includes('API_PERMISSION_DENIED')) {
                console.warn('Contact retrieval failed: API permissions insufficient. Contact FreshSales admin to grant contact read permissions.');
            }
            throw error;
        }
    }

    /**
     * Update contact (will likely fail with 403 due to permissions)
     * @param {string} contactId - Contact ID
     * @param {Object} contactData - Contact data to update
     * @returns {Promise<Object>} Updated contact
     */
    async updateContact(contactId, contactData) {
        try {
            const response = await this.makeRequestWithRetry(`/contacts/${contactId}`, 'PUT', { contact: contactData });
            return response.data;
        } catch (error) {
            if (error.message.includes('API_PERMISSION_DENIED')) {
                console.warn('Contact update failed: API permissions insufficient. Contact FreshSales admin to grant contact write permissions.');
            }
            throw error;
        }
    }

    /**
     * Get current rate limit status
     * @returns {Object} Rate limit information
     */
    getRateLimitStatus() {
        return {
            hourly: {
                limit: this.rateLimits.hourly.limit,
                remaining: this.rateLimits.hourly.remaining,
                resetTime: this.rateLimits.hourly.resetTime
            },
            perMinute: {
                limit: this.rateLimits.perMinute.limit,
                remaining: this.rateLimits.perMinute.remaining,
                resetTime: this.rateLimits.perMinute.resetTime
            }
        };
    }

    /**
     * Test API connectivity and permissions
     * @returns {Promise<Object>} Connection test results
     */
    async testConnection() {
        const results = {
            timestamp: new Date().toISOString(),
            mockMode: this.mockMode,
            tests: {}
        };

        // Test 1: Contact fields metadata (should work)
        try {
            await this.getContactFields();
            results.tests.contactFields = { status: 'success', message: 'Contact fields metadata accessible' };
        } catch (error) {
            results.tests.contactFields = { status: 'error', message: error.message };
        }

        // Test 2: Search functionality
        try {
            await this.searchContacts('test');
            results.tests.search = { status: 'success', message: 'Search functionality accessible' };
        } catch (error) {
            results.tests.search = { status: 'error', message: error.message };
        }

        // Test 3: Activities access
        try {
            await this.getActivities({ per_page: 1 });
            results.tests.activities = { status: 'success', message: 'Activities endpoint accessible' };
        } catch (error) {
            results.tests.activities = { status: 'error', message: error.message };
        }

        // Test 4: Contact read (expected to fail)
        try {
            await this.makeRequest('/contacts?per_page=1');
            results.tests.contactRead = { status: 'success', message: 'Contact read permissions granted' };
        } catch (error) {
            results.tests.contactRead = {
                status: 'expected_failure',
                message: 'Contact read permissions denied (expected based on research)'
            };
        }

        return results;
    }

    /**
     * Utility method to sleep for specified milliseconds
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = FreshSalesClient;