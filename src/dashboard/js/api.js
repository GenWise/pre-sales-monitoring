// Google Sheets API Integration for Pre-Sales Monitoring
class LeadsAPI {
    constructor() {
        // Configuration - Update these with your actual Google Sheets details
        this.SPREADSHEET_ID = '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ'; // Add your Sheet ID from URL
        this.API_KEY = 'AIzaSyDcSU0QHFQmdudhLff3-LQNFCsXArvqXY8'; // Add your Google Cloud API key
        this.SHEET_NAME = 'Sheet1'; // Using sheet name, but GID=0 for first sheet
        this.BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

        // Cache settings
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.lastFetch = null;
    }

    /**
     * Initialize API with configuration
     * @param {Object} config - API configuration
     * @param {string} config.spreadsheetId - Google Sheets spreadsheet ID
     * @param {string} config.apiKey - Google Sheets API key
     * @param {string} config.sheetName - Sheet name (default: 'Leads')
     */
    init(config) {
        this.SPREADSHEET_ID = config.spreadsheetId;
        this.API_KEY = config.apiKey;
        this.SHEET_NAME = config.sheetName || 'Leads';
    }

    /**
     * Check if API is properly configured
     * @returns {boolean} True if configured, false otherwise
     */
    isConfigured() {
        return this.SPREADSHEET_ID !== 'YOUR_SPREADSHEET_ID_HERE' &&
               this.API_KEY !== 'YOUR_API_KEY_HERE';
    }

    /**
     * Get all leads from Google Sheets
     * @returns {Promise<Array>} Array of lead objects
     */
    async getAllLeads() {
        if (!this.isConfigured()) {
            console.warn('Google Sheets API not configured, using mock data');
            return this.getMockData();
        }

        // Check cache first
        const cached = this.getFromCache('all_leads');
        if (cached) {
            return cached;
        }

        try {
            const range = `${this.SHEET_NAME}!A:Z`; // Get all columns
            const url = `${this.BASE_URL}/${this.SPREADSHEET_ID}/values/${range}?key=${this.API_KEY}`;

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (!data.values || data.values.length === 0) {
                console.warn('No data found in spreadsheet');
                return [];
            }

            // Convert rows to objects
            const leads = this.parseSheetData(data.values);

            // Cache the results
            this.setCache('all_leads', leads);
            this.lastFetch = Date.now();

            return leads;
        } catch (error) {
            console.error('Error fetching leads from Google Sheets:', error);

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
     * Parse sheet data rows into lead objects
     * @param {Array} rows - Raw sheet data rows
     * @returns {Array} Array of lead objects
     */
    parseSheetData(rows) {
        if (rows.length === 0) return [];

        // First row should contain headers
        const headers = rows[0].map(header => header.toLowerCase().trim());
        const leads = [];

        // Map common header variations to standard field names
        const fieldMap = {
            'name': ['name', 'full name', 'fullname', 'lead name', 'child name'],
            'email': ['email', 'email address', 'e-mail', 'parent email'],
            'mobile': ['mobile', 'phone', 'mobile number', 'phone number', 'contact', 'parent mobile'],
            'status': ['status', 'lead status', 'current status'],
            'source': ['source', 'lead source', 'form source', 'origin', 'source tag'],
            'date': ['date', 'created date', 'submission date', 'lead date', 'timestamp'],
            'notes': ['notes', 'comments', 'remarks', 'description'],
            'interest': ['interest', 'interest level', 'priority'],
            'company': ['company', 'organization', 'business', 'parent name'],
            'city': ['city', 'location'],
            'assigned_to': ['assigned to', 'owner', 'sales rep', 'assigned owner']
        };

        // Create mapping from sheet headers to our field names
        const headerMapping = {};
        Object.keys(fieldMap).forEach(fieldName => {
            const matchingHeader = headers.find(header =>
                fieldMap[fieldName].includes(header)
            );
            if (matchingHeader) {
                headerMapping[headers.indexOf(matchingHeader)] = fieldName;
            }
        });

        // Process data rows
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;

            const lead = {
                id: this.generateLeadId(i, row),
                name: '',
                email: '',
                mobile: '',
                status: 'New',
                source: 'Unknown',
                date: this.formatDate(new Date()),
                notes: '',
                interest: '',
                company: '',
                city: '',
                assigned_to: '',
                timestamp: new Date().toISOString()
            };

            // Map row data to lead object
            row.forEach((cellValue, colIndex) => {
                const fieldName = headerMapping[colIndex];
                if (fieldName && cellValue) {
                    if (fieldName === 'date') {
                        lead[fieldName] = this.parseDate(cellValue);
                    } else if (fieldName === 'status') {
                        lead[fieldName] = this.normalizeStatus(cellValue);
                    } else {
                        lead[fieldName] = String(cellValue).trim();
                    }
                }
            });

            // Validate required fields
            if (lead.name && lead.email) {
                leads.push(lead);
            }
        }

        return leads;
    }

    /**
     * Generate unique lead ID
     * @param {number} rowIndex - Row index
     * @param {Array} row - Row data
     * @returns {string} Unique lead ID
     */
    generateLeadId(rowIndex, row) {
        const email = row.find(cell => cell && cell.includes('@')) || '';
        return `lead_${rowIndex}_${this.hashCode(email)}`;
    }

    /**
     * Simple hash function for generating consistent IDs
     * @param {string} str - String to hash
     * @returns {number} Hash code
     */
    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }

    /**
     * Parse various date formats
     * @param {string} dateStr - Date string
     * @returns {string} Formatted date (YYYY-MM-DD)
     */
    parseDate(dateStr) {
        if (!dateStr) return this.formatDate(new Date());

        try {
            // Handle common date formats
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
     * Normalize status values
     * @param {string} status - Raw status value
     * @returns {string} Normalized status
     */
    normalizeStatus(status) {
        const statusMap = {
            'new': 'New',
            'fresh': 'New',
            'contacted': 'Contacted',
            'called': 'Contacted',
            'emailed': 'Contacted',
            'qualified': 'Qualified',
            'interested': 'Qualified',
            'converted': 'Converted',
            'closed': 'Converted',
            'won': 'Converted',
            'lost': 'Lost',
            'rejected': 'Lost',
            'dead': 'Lost'
        };

        const normalizedKey = status.toLowerCase().trim();
        return statusMap[normalizedKey] || 'New';
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
     * Update a lead (Note: This requires Google Sheets API v4 with write access)
     * @param {string} leadId - Lead ID
     * @param {Object} updates - Lead updates
     * @returns {Promise<boolean>} Success status
     */
    async updateLead(leadId, updates) {
        if (!this.isConfigured()) {
            console.warn('Google Sheets API not configured, simulating update');
            return this.simulateUpdate(leadId, updates);
        }

        // For now, this is a placeholder since updating requires different API setup
        console.warn('Lead update not implemented - requires Google Sheets API v4 with write permissions');
        return this.simulateUpdate(leadId, updates);
    }

    /**
     * Simulate lead update for demo purposes
     * @param {string} leadId - Lead ID
     * @param {Object} updates - Lead updates
     * @returns {Promise<boolean>} Success status
     */
    async simulateUpdate(leadId, updates) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log(`Simulated update for lead ${leadId}:`, updates);

        // Clear cache to force refresh
        this.cache.clear();

        return true;
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
     * Get mock data for development/demo
     * @returns {Array} Array of mock lead objects
     */
    getMockData() {
        const mockLeads = [
            {
                id: 'lead_1',
                name: 'John Smith',
                email: 'john.smith@email.com',
                mobile: '+91-9876543210',
                status: 'New',
                source: 'returning_students',
                date: '2024-01-15',
                notes: 'Interested in premium package',
                interest: 'High',
                company: 'TechCorp Inc',
                city: 'Mumbai',
                assigned_to: 'Sales Rep 1',
                timestamp: '2024-01-15T10:30:00Z'
            },
            {
                id: 'lead_2',
                name: 'Sarah Johnson',
                email: 'sarah.j@company.com',
                mobile: '+91-8765432109',
                status: 'Contacted',
                source: 'ats_qualifiers',
                date: '2024-01-14',
                notes: 'Follow up scheduled for next week',
                interest: 'Medium',
                company: 'StartupXYZ',
                city: 'Bangalore',
                assigned_to: 'Sales Rep 2',
                timestamp: '2024-01-14T14:15:00Z'
            },
            {
                id: 'lead_3',
                name: 'Michael Chen',
                email: 'mike.chen@business.org',
                mobile: '+91-7654321098',
                status: 'Qualified',
                source: 'website',
                date: '2024-01-13',
                notes: 'Very interested, sent proposal',
                interest: 'High',
                company: 'Chen Enterprises',
                city: 'Delhi',
                assigned_to: 'Sales Rep 1',
                timestamp: '2024-01-13T09:45:00Z'
            },
            {
                id: 'lead_4',
                name: 'Emily Davis',
                email: 'emily.davis@example.com',
                mobile: '+91-6543210987',
                status: 'Converted',
                source: 'returning_students',
                date: '2024-01-12',
                notes: 'Deal closed successfully!',
                interest: 'High',
                company: 'Davis Solutions',
                city: 'Chennai',
                assigned_to: 'Sales Rep 3',
                timestamp: '2024-01-12T16:20:00Z'
            },
            {
                id: 'lead_5',
                name: 'Robert Wilson',
                email: 'r.wilson@firm.com',
                mobile: '+91-5432109876',
                status: 'Lost',
                source: 'early_bird',
                date: '2024-01-11',
                notes: 'Price too high, went with competitor',
                interest: 'Low',
                company: 'Wilson & Associates',
                city: 'Pune',
                assigned_to: 'Sales Rep 2',
                timestamp: '2024-01-11T11:10:00Z'
            },
            {
                id: 'lead_6',
                name: 'Lisa Anderson',
                email: 'lisa.anderson@corp.net',
                mobile: '+91-4321098765',
                status: 'New',
                source: 'ats_qualifiers',
                date: '2024-01-16',
                notes: 'Initial inquiry about services',
                interest: 'Medium',
                company: 'Anderson Corp',
                city: 'Hyderabad',
                assigned_to: '',
                timestamp: '2024-01-16T08:30:00Z'
            },
            {
                id: 'lead_7',
                name: 'David Brown',
                email: 'david.brown@startup.io',
                mobile: '+91-3210987654',
                status: 'Contacted',
                source: 'website',
                date: '2024-01-15',
                notes: 'Demo scheduled for tomorrow',
                interest: 'High',
                company: 'Brown Startup',
                city: 'Kolkata',
                assigned_to: 'Sales Rep 1',
                timestamp: '2024-01-15T13:45:00Z'
            },
            {
                id: 'lead_8',
                name: 'Jennifer Taylor',
                email: 'j.taylor@enterprise.com',
                mobile: '+91-2109876543',
                status: 'Qualified',
                source: 'returning_students',
                date: '2024-01-14',
                notes: 'Ready to proceed with implementation',
                interest: 'High',
                company: 'Taylor Enterprise',
                city: 'Ahmedabad',
                assigned_to: 'Sales Rep 3',
                timestamp: '2024-01-14T10:15:00Z'
            },
            {
                id: 'lead_9',
                name: 'Mark Johnson',
                email: 'mark.j@consulting.biz',
                mobile: '+91-1098765432',
                status: 'New',
                source: 'early_bird',
                date: '2024-01-16',
                notes: 'Needs more information about pricing',
                interest: 'Medium',
                company: 'Johnson Consulting',
                city: 'Jaipur',
                assigned_to: '',
                timestamp: '2024-01-16T15:20:00Z'
            },
            {
                id: 'lead_10',
                name: 'Amanda White',
                email: 'amanda.white@agency.com',
                mobile: '+91-0987654321',
                status: 'Contacted',
                source: 'ats_qualifiers',
                date: '2024-01-13',
                notes: 'Comparing with other solutions',
                interest: 'Medium',
                company: 'White Agency',
                city: 'Surat',
                assigned_to: 'Sales Rep 2',
                timestamp: '2024-01-13T12:00:00Z'
            }
        ];

        // Add more recent leads for better demo
        const additionalLeads = this.generateRecentMockLeads(15);

        return [...mockLeads, ...additionalLeads];
    }

    /**
     * Generate additional mock leads with recent dates
     * @param {number} count - Number of leads to generate
     * @returns {Array} Array of mock leads
     */
    generateRecentMockLeads(count) {
        const names = ['Alex Kumar', 'Priya Sharma', 'Rahul Gupta', 'Neha Patel', 'Amit Singh',
                      'Kavya Reddy', 'Arjun Mehta', 'Sneha Joshi', 'Vikram Agarwal', 'Pooja Nair'];
        const companies = ['Tech Solutions', 'Digital Hub', 'Innovation Labs', 'Smart Systems', 'Future Tech'];
        const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata'];
        const sources = ['returning_students', 'ats_qualifiers', 'website', 'early_bird', 'summer_program_2026'];
        const statuses = ['New', 'Contacted', 'Qualified', 'New', 'Contacted']; // Weighted towards new/contacted

        const leads = [];
        const today = new Date();

        for (let i = 0; i < count; i++) {
            const daysAgo = Math.floor(Math.random() * 7); // Last 7 days
            const leadDate = new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000);

            leads.push({
                id: `lead_${11 + i}`,
                name: names[i % names.length] + ` ${i + 11}`,
                email: `user${11 + i}@example${i % 5}.com`,
                mobile: `+91-${9000000000 + i}`,
                status: statuses[Math.floor(Math.random() * statuses.length)],
                source: sources[Math.floor(Math.random() * sources.length)],
                date: this.formatDate(leadDate),
                notes: i % 3 === 0 ? 'Follow up required' : '',
                interest: ['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)],
                company: `${companies[i % companies.length]} ${i + 1}`,
                city: cities[Math.floor(Math.random() * cities.length)],
                assigned_to: i % 4 === 0 ? '' : `Sales Rep ${(i % 3) + 1}`,
                timestamp: leadDate.toISOString()
            });
        }

        return leads;
    }

    /**
     * Get API status and configuration info
     * @returns {Object} API status information
     */
    getStatus() {
        return {
            configured: this.isConfigured(),
            spreadsheetId: this.SPREADSHEET_ID,
            sheetName: this.SHEET_NAME,
            cacheSize: this.cache.size,
            lastFetch: this.lastFetch,
            mockDataMode: !this.isConfigured()
        };
    }

    /**
     * Test API connection
     * @returns {Promise<Object>} Connection test result
     */
    async testConnection() {
        if (!this.isConfigured()) {
            return {
                success: false,
                message: 'API not configured - using mock data',
                usingMockData: true
            };
        }

        try {
            const url = `${this.BASE_URL}/${this.SPREADSHEET_ID}?key=${this.API_KEY}`;
            const response = await fetch(url);

            if (response.ok) {
                return {
                    success: true,
                    message: 'API connection successful',
                    usingMockData: false
                };
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            return {
                success: false,
                message: `API connection failed: ${error.message}`,
                usingMockData: true
            };
        }
    }
}

// Create and export global instance
window.LeadsAPI = new LeadsAPI();

// Auto-configure from environment or URL parameters if available
document.addEventListener('DOMContentLoaded', () => {
    // Check for configuration in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const spreadsheetId = urlParams.get('spreadsheetId');
    const apiKey = urlParams.get('apiKey');
    const sheetName = urlParams.get('sheetName');

    if (spreadsheetId && apiKey) {
        window.LeadsAPI.init({
            spreadsheetId: spreadsheetId,
            apiKey: apiKey,
            sheetName: sheetName
        });
        console.log('Google Sheets API configured from URL parameters');
    }

    // Log API status
    console.log('Leads API Status:', window.LeadsAPI.getStatus());
});