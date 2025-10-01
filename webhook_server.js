
const express = require('express');
const cors = require('cors');
const FormsIntegration = require('./src/sheets/formsIntegration');
const { FormMappingUtils, FORMS_CONFIG } = require('./src/sheets/formsMapping');
const FreshSalesSync = require('./src/api/freshsalesSync');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize forms integration and FreshSales sync
const formsIntegration = new FormsIntegration();
const freshSalesSync = new FreshSalesSync({
    mockMode: process.env.FRESHSALES_MOCK_MODE === 'true'
});

// Webhook endpoint for form submissions
app.post('/webhook/form-submission', async (req, res) => {
    console.log('📝 Webhook received form submission');

    try {
        const { formData, source, metadata } = req.body;

        if (!formData || !formData.sourceTag) {
            return res.status(400).json({
                success: false,
                error: 'Missing required formData or sourceTag'
            });
        }

        console.log(`📋 Processing ${metadata?.formName || 'Unknown Form'} submission:`, {
            sourceTag: formData.sourceTag,
            email: formData['Parent Email'] || formData['Email'],
            timestamp: formData.timestamp
        });

        // Process the form submission
        await formsIntegration.initialize();

        // Get form configuration by sourceTag
        const formConfig = FormMappingUtils.getFormConfigBySourceTag(formData.sourceTag);
        if (!formConfig) {
            throw new Error(`No configuration found for source tag: ${formData.sourceTag}`);
        }

        // Map form response to master database format
        const mappedData = FormMappingUtils.mapFormResponse(formData, formConfig);
        const formatted = FormMappingUtils.formatForMasterDatabase(mappedData);

        // Add to master database using MasterDatabase
        const result = await formsIntegration.masterDb.addLead(formatted);

        console.log('✅ Form submission processed successfully:', result);

        res.json({
            success: true,
            message: 'Form submission processed successfully',
            data: result
        });

    } catch (error) {
        console.error('❌ Error processing webhook:', error);

        res.status(500).json({
            success: false,
            error: error.message,
            details: 'Check server logs for more information'
        });
    }
});

// Health check endpoint
app.get('/webhook/health', (req, res) => {
    res.json({
        success: true,
        message: 'Webhook endpoint is healthy',
        timestamp: new Date().toISOString()
    });
});

// Status endpoint
app.get('/webhook/status', async (req, res) => {
    try {
        await formsIntegration.initialize();
        const stats = formsIntegration.getProcessingStats();

        res.json({
            success: true,
            stats: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.listen(port, () => {
    console.log(`🚀 Webhook server running on port ${port}`);
    console.log(`📡 Endpoint: http://localhost:${port}/webhook/form-submission`);
    console.log(`🏥 Health check: http://localhost:${port}/webhook/health`);
});

module.exports = app;
