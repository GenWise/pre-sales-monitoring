/**
 * Integration Example: How to use the Notification System
 * with your lead processing pipeline
 */

require('dotenv').config({ path: '/Users/rajeshpanchanathan/.env' });
const NotificationManager = require('./src/notifications/notificationManager');

class LeadProcessor {
    constructor() {
        this.notificationManager = new NotificationManager();
    }

    /**
     * Process a new lead from webhook or form submission
     * @param {Object} leadData - Raw lead data from source
     * @returns {Promise<Object>} - Processing result
     */
    async processNewLead(leadData) {
        try {
            console.log('Processing new lead:', leadData.email);

            // 1. Clean and validate the data
            const cleanedLead = this.cleanLeadData(leadData);

            // 2. Check for duplicates (you'd implement this based on your storage)
            const duplicateInfo = await this.checkForDuplicates(cleanedLead);

            // 3. Save to your database/sheets (you'd implement this)
            const savedLead = await this.saveLeadToDatabase(cleanedLead);

            // 4. Send appropriate notifications
            let notificationResult;
            if (duplicateInfo) {
                console.log('Duplicate lead detected, sending duplicate notification...');
                notificationResult = await this.notificationManager.sendDuplicateLeadNotifications(
                    cleanedLead,
                    duplicateInfo
                );
            } else {
                console.log('New lead, sending new lead notifications...');
                notificationResult = await this.notificationManager.sendNewLeadNotifications(
                    cleanedLead,
                    {
                        priority: this.determinePriority(cleanedLead)
                    }
                );
            }

            // 5. Log results
            console.log(`Notifications sent: ${notificationResult.summary?.successful || 0}/${notificationResult.summary?.total || 0}`);

            return {
                success: true,
                leadId: savedLead.id,
                notifications: notificationResult,
                isDuplicate: !!duplicateInfo
            };

        } catch (error) {
            console.error('Lead processing failed:', error);

            // Send error notification to admin (optional)
            await this.sendErrorNotification(leadData, error);

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Clean and standardize lead data
     * @private
     */
    cleanLeadData(rawData) {
        return {
            id: rawData.id || `lead-${Date.now()}`,
            name: (rawData.name || rawData.fullName || '').trim(),
            email: (rawData.email || '').toLowerCase().trim(),
            phone: this.cleanPhoneNumber(rawData.phone || rawData.phoneNumber || ''),
            company: (rawData.company || rawData.organization || '').trim(),
            source: rawData.source || rawData.form_source || 'unknown',
            message: rawData.message || rawData.comments || rawData.inquiry || '',
            timestamp: rawData.timestamp || new Date().toISOString(),
            // Additional fields you might have
            budget: rawData.budget || null,
            timeline: rawData.timeline || null,
            industry: rawData.industry || null
        };
    }

    /**
     * Clean phone number format
     * @private
     */
    cleanPhoneNumber(phone) {
        if (!phone) return '';

        // Remove all non-numeric characters except +
        const cleaned = phone.replace(/[^\d+]/g, '');

        // Add country code if missing
        if (cleaned.match(/^\d{10}$/)) {
            return `+1-${cleaned}`;
        }

        return cleaned;
    }

    /**
     * Check for duplicate leads
     * @private
     * Replace this with your actual duplicate detection logic
     */
    async checkForDuplicates(leadData) {
        // This is a mock implementation
        // In reality, you'd query your database/sheets

        // Simulate checking email or phone
        const mockDuplicates = [
            'duplicate@example.com',
            'test@duplicate.com'
        ];

        if (mockDuplicates.includes(leadData.email)) {
            return {
                firstSeen: '2024-01-15',
                lastContact: '2024-02-20',
                count: 3,
                status: 'contacted',
                previousSources: ['website', 'referral']
            };
        }

        return null;
    }

    /**
     * Save lead to database/sheets
     * @private
     * Replace this with your actual storage logic
     */
    async saveLeadToDatabase(leadData) {
        // Mock implementation
        // In reality, you'd save to Google Sheets, database, etc.
        console.log('Saving lead to database...');

        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));

        return {
            ...leadData,
            id: leadData.id,
            savedAt: new Date().toISOString()
        };
    }

    /**
     * Determine lead priority based on data
     * @private
     */
    determinePriority(leadData) {
        // High priority conditions
        if (leadData.source === 'referral') return 'high';
        if (leadData.company && leadData.company.toLowerCase().includes('enterprise')) return 'high';
        if (leadData.budget && parseInt(leadData.budget) > 50000) return 'high';

        // Medium priority conditions
        if (leadData.phone && leadData.email) return 'medium';
        if (leadData.company) return 'medium';

        return 'normal';
    }

    /**
     * Send error notification to admin
     * @private
     */
    async sendErrorNotification(leadData, error) {
        try {
            // You could create a special error notification template
            const errorData = {
                id: 'error-' + Date.now(),
                name: 'System Error',
                email: 'admin@genwise.in',
                source: 'error-handler',
                message: `Lead processing failed for ${leadData.email || 'unknown'}. Error: ${error.message}`
            };

            await this.notificationManager.sendNewLeadNotifications(errorData, {
                customRecipients: ['admin@genwise.in'],
                includeSlack: false // Only email for errors
            });
        } catch (notificationError) {
            console.error('Failed to send error notification:', notificationError);
        }
    }
}

// Example usage for webhook endpoint
async function handleWebhookRequest(req, res) {
    const processor = new LeadProcessor();

    try {
        const leadData = req.body;
        const result = await processor.processNewLead(leadData);

        if (result.success) {
            res.status(200).json({
                success: true,
                message: 'Lead processed successfully',
                leadId: result.leadId,
                notificationsSent: result.notifications.summary?.successful || 0
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Lead processing failed',
                error: result.error
            });
        }
    } catch (error) {
        console.error('Webhook handler error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
}

// Example Express.js integration
/*
const express = require('express');
const app = express();

app.use(express.json());

// Webhook endpoint for form submissions
app.post('/webhook/lead', handleWebhookRequest);

// Test endpoint
app.post('/webhook/test', async (req, res) => {
    const testLead = {
        name: 'Test User',
        email: 'test@example.com',
        phone: '+1-555-123-4567',
        company: 'Test Company',
        source: 'contact-form',
        message: 'This is a test lead submission.'
    };

    await handleWebhookRequest({ body: testLead }, res);
});

app.listen(3000, () => {
    console.log('Webhook server running on port 3000');
});
*/

// Demo function for testing
async function runDemo() {
    console.log('🚀 Running Notification Integration Demo\n');

    const processor = new LeadProcessor();

    // Test with sample leads
    const sampleLeads = [
        {
            name: 'Alice Johnson',
            email: 'alice@techcorp.com',
            phone: '555-123-4567',
            company: 'TechCorp Enterprise',
            source: 'referral',
            message: 'Referred by John Smith. Need enterprise solution for 200+ users.',
            budget: '75000'
        },
        {
            name: 'Bob Smith',
            email: 'duplicate@example.com', // This will trigger duplicate logic
            phone: '555-987-6543',
            company: 'Startup Inc',
            source: 'website',
            message: 'Interested in your services.'
        },
        {
            name: 'Carol Davis',
            email: 'carol@normalcompany.com',
            phone: '555-456-7890',
            company: 'Normal Company',
            source: 'contact-form',
            message: 'Please send me more information.'
        }
    ];

    for (let i = 0; i < sampleLeads.length; i++) {
        const lead = sampleLeads[i];
        console.log(`Processing lead ${i + 1}/${sampleLeads.length}: ${lead.name}`);

        const result = await processor.processNewLead(lead);

        console.log(`Result: ${result.success ? '✅' : '❌'} ${result.isDuplicate ? '(Duplicate)' : '(New)'}`);

        if (result.notifications) {
            console.log(`Notifications: ${result.notifications.summary?.successful || 0} sent`);
        }

        console.log('---');

        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('Demo completed!');
}

// Run demo if called directly
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.includes('--demo')) {
        runDemo().catch(console.error);
    } else {
        console.log('Notification Integration Example');
        console.log('\nUsage:');
        console.log('  node integration_example.js --demo    # Run demo with sample data');
        console.log('\nThis file shows how to integrate the notification system with your lead processing pipeline.');
        console.log('Copy and adapt the LeadProcessor class for your specific needs.');
    }
}

module.exports = { LeadProcessor, handleWebhookRequest };