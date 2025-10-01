const axios = require('axios');

const WEBHOOK_URL = 'http://localhost:3001/webhook/form-submission';

// Test with one of the submissions from today - CORRECTED: This should be website form
const testSubmission = {
    formData: {
        sourceTag: 'website',
        timestamp: '10/1/2025 10:40:58',
        'Timestamp': '10/1/2025 10:40:58',
        'Child Name': 'Test Child',
        'Parent Name': 'Test Parent',
        'Parent Email Id': 'webhook.test@automation.com',
        'Parent Mobile Number': '9876543210',
        'Interested in the Gifted Summer Program ': 'Ready to Sign up and save almost 25% through available discounts'
    },
    source: 'website',
    metadata: {
        formName: 'Website Form',
        processedAt: new Date().toISOString(),
        originalSheet: '14Wj7yZSWq6J0Sbkh3yk26c24JCqvfekWJtGxYbjH-pE'
    }
};

async function runTest() {
    try {
        console.log('Testing single submission...');
        console.log('Payload:', JSON.stringify(testSubmission, null, 2));

        const response = await axios.post(WEBHOOK_URL, testSubmission, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        console.log('✅ Success!');
        console.log('Response status:', response.status);
        console.log('Response data:', response.data);

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

runTest();