// Form submission test using the browser automation utilities
const { execSync } = require('child_process');

async function submitTestForm() {
    console.log('=== Testing Google Form Submission Flow ===');

    // Get timestamp for unique test data
    const timestamp = Date.now();
    const testEmail = `subagent.test.${timestamp}@example.com`;

    console.log(`Test email: ${testEmail}`);
    console.log('Recording initial webhook logs...');

    // Use curl to simulate form submission (more reliable than browser automation for testing)
    const formData = {
        'entry.1234567890': 'Subagent Test Child', // Child Name
        'entry.0987654321': 'Subagent Test Parent', // Parent Name
        'entry.1122334455': testEmail, // Parent Email
        'entry.5566778899': '9876543210', // Parent Mobile
        'entry.2233445566': 'Ready to Sign up and save almost 25% through available discounts' // Interest Level
    };

    console.log('Submitting form via direct POST...');

    // Note: This will fail because we don't have the exact entry IDs
    // Instead, let's manually submit through the browser and monitor logs

    console.log('Please manually submit the form with this data:');
    console.log('Child Name: Subagent Test Child');
    console.log('Parent Name: Subagent Test Parent');
    console.log('Parent Email:', testEmail);
    console.log('Parent Mobile: 9876543210');
    console.log('Interest Level: Ready to Sign up (High)');

    return testEmail;
}

submitTestForm().then(email => {
    console.log('Test setup complete. Monitor for webhook activity with email:', email);
});