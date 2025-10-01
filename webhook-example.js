const express = require('express');
const FormsIntegration = require('./src/sheets/formsIntegration');
const { FormMappingUtils } = require('./src/sheets/formsMapping');

/**
 * Example Webhook Server for Google Forms Integration
 * This demonstrates how to set up a webhook endpoint to receive real-time form submissions
 */

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Add CORS headers if needed
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
});

// Initialize forms integration
let formsIntegration;

async function initializeIntegration() {
    try {
        formsIntegration = new FormsIntegration();
        await formsIntegration.initialize();
        console.log('✅ Forms integration initialized');
    } catch (error) {
        console.error('❌ Failed to initialize forms integration:', error.message);
        throw error;
    }
}

/**
 * Main webhook endpoint for form responses
 * This is the URL you'll use in your Google Apps Script WEBHOOK_URL
 */
app.post('/api/webhook/form-response', async (req, res) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substr(2, 9);

    console.log(`\n🔄 [${requestId}] Received webhook request at ${new Date().toISOString()}`);

    try {
        // Validate request
        if (!req.body || !req.body.formData) {
            console.log(`❌ [${requestId}] Invalid request: missing formData`);
            return res.status(400).json({
                success: false,
                error: 'Missing formData in request body',
                requestId
            });
        }

        const { formData, source, version } = req.body;
        console.log(`📋 [${requestId}] Processing form data from ${source} v${version}`);
        console.log(`📊 [${requestId}] Form data:`, {
            sourceTag: formData.sourceTag,
            formId: formData.formId,
            email: getEmailFromFormData(formData),
            name: getNameFromFormData(formData)
        });

        // Get form configuration
        const formConfig = FormMappingUtils.getFormConfig(formData.formId) ||
                          FormMappingUtils.getFormConfigBySourceTag(formData.sourceTag);

        if (!formConfig) {
            console.log(`❌ [${requestId}] No configuration found for form ${formData.formId || formData.sourceTag}`);
            return res.status(400).json({
                success: false,
                error: `No configuration found for form ${formData.formId || formData.sourceTag}`,
                requestId
            });
        }

        console.log(`✅ [${requestId}] Using configuration for ${formConfig.name}`);

        // Map form data to master database format
        const mappedData = FormMappingUtils.mapFormResponse(formData, formConfig);
        console.log(`🔄 [${requestId}] Mapped form data to master format`);

        // Validate required fields
        const validation = FormMappingUtils.validateRequiredFields(mappedData);
        if (!validation.isValid) {
            console.log(`❌ [${requestId}] Validation failed: missing ${validation.missingFields.join(', ')}`);
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                missingFields: validation.missingFields,
                requestId
            });
        }

        // Format for master database
        const leadData = FormMappingUtils.formatForMasterDatabase(mappedData);

        // Add to master database
        const result = await formsIntegration.masterDb.addLead(leadData);

        const processingTime = Date.now() - startTime;
        const status = result.isDuplicate ? 'DUPLICATE' : 'ADDED';

        console.log(`✅ [${requestId}] ${status}: ${leadData.parentName} (${leadData.parentEmail}) from ${leadData.sourceTag} in ${processingTime}ms`);

        // Send successful response
        res.json({
            success: true,
            status: status,
            isDuplicate: result.isDuplicate,
            leadData: {
                parentName: leadData.parentName,
                parentEmail: leadData.parentEmail,
                sourceTag: leadData.sourceTag,
                timestamp: leadData.timestamp
            },
            processingTime,
            requestId
        });

    } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error(`❌ [${requestId}] Error processing webhook:`, error.message);
        console.error(`❌ [${requestId}] Stack trace:`, error.stack);

        // Send error response
        res.status(500).json({
            success: false,
            error: error.message,
            processingTime,
            requestId
        });
    }
});

/**
 * Health check endpoint
 */
app.get('/api/health', async (req, res) => {
    try {
        // Test database connection
        const stats = await formsIntegration.masterDb.getStats();

        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: {
                connected: true,
                totalLeads: stats.totalLeads
            },
            forms: {
                configured: Object.keys(require('./src/sheets/formsMapping').FORMS_CONFIG).length
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Manual processing endpoint
 * Use this to manually pull and process all form responses
 */
app.post('/api/process-all-forms', async (req, res) => {
    try {
        console.log('🔄 Manual processing of all forms requested');

        const options = {
            processAll: req.body.processAll || false,
            delay: req.body.delay || 1000
        };

        const results = await formsIntegration.processAllForms(options);

        console.log('✅ Manual processing completed:', {
            formsProcessed: results.formsProcessed,
            totalAdded: results.totalAdded,
            totalDuplicates: results.totalDuplicates,
            totalErrors: results.totalErrors
        });

        res.json({
            success: true,
            results,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Manual processing failed:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Test form connections endpoint
 */
app.get('/api/test-connections', async (req, res) => {
    try {
        const results = await formsIntegration.testAllFormConnections();

        res.json({
            success: true,
            connections: results,
            summary: {
                total: results.length,
                working: results.filter(r => r.success).length,
                failed: results.filter(r => !r.success).length
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Get processing statistics
 */
app.get('/api/stats', async (req, res) => {
    try {
        const integrationStats = formsIntegration.getProcessingStats();
        const dbStats = await formsIntegration.masterDb.getStats();

        res.json({
            success: true,
            integration: integrationStats,
            database: dbStats,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Reset processing state (useful for testing)
 */
app.post('/api/reset-state', (req, res) => {
    try {
        const { formKey } = req.body;

        formsIntegration.resetProcessingState(formKey);

        res.json({
            success: true,
            message: formKey ? `Reset state for ${formKey}` : 'Reset state for all forms',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Helper functions
 */
function getEmailFromFormData(formData) {
    const emailFields = [
        'Email Address', 'Email', 'Parent Email', 'Parent Email Address',
        'Guardian Email', 'Contact Email', 'Your Email'
    ];

    for (const field of emailFields) {
        if (formData[field] && formData[field].includes('@')) {
            return formData[field];
        }
    }

    for (const [key, value] of Object.entries(formData)) {
        if (typeof value === 'string' && value.includes('@')) {
            return value;
        }
    }

    return 'unknown';
}

function getNameFromFormData(formData) {
    const nameFields = [
        'Parent Name', 'Parent\'s Name', 'Guardian Name', 'Your Name',
        'Full Name', 'Name', 'Contact Person'
    ];

    for (const field of nameFields) {
        if (formData[field]) {
            return formData[field];
        }
    }

    return 'unknown';
}

/**
 * Error handling middleware
 */
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

/**
 * Start the server
 */
async function startServer() {
    try {
        // Initialize forms integration
        await initializeIntegration();

        // Start server
        app.listen(PORT, () => {
            console.log(`\n🚀 Webhook server running on port ${PORT}`);
            console.log(`📡 Webhook URL: http://localhost:${PORT}/api/webhook/form-response`);
            console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
            console.log(`📊 Statistics: http://localhost:${PORT}/api/stats`);
            console.log(`🧪 Test connections: http://localhost:${PORT}/api/test-connections`);
            console.log('\n💡 Use this webhook URL in your Google Apps Scripts');
            console.log('💡 Update WEBHOOK_URL in scripts/gas/formTrigger.gs\n');
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
}

// Start server if this file is run directly
if (require.main === module) {
    startServer();
}

module.exports = app;