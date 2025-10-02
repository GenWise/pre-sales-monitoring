const fetch = require('node-fetch');

async function testUpdateLead() {
    const baseUrl = 'http://localhost'; // We'll test locally first

    console.log('Testing Update Lead Backend Implementation');
    console.log('==========================================');

    // Test 1: Update status
    console.log('\n1. Testing status update...');
    try {
        const response = await fetch(`${baseUrl}/update_lead.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                row_number: 2, // Update row 2 (first data row)
                status: 'Contacted'
            })
        });

        const result = await response.json();
        console.log('Status update result:', result);
    } catch (error) {
        console.error('Status update error:', error.message);
    }

    // Test 2: Assign owner
    console.log('\n2. Testing owner assignment...');
    try {
        const response = await fetch(`${baseUrl}/update_lead.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                row_number: 2,
                assigned_owner: 'Rajesh'
            })
        });

        const result = await response.json();
        console.log('Owner assignment result:', result);
    } catch (error) {
        console.error('Owner assignment error:', error.message);
    }

    // Test 3: Add notes
    console.log('\n3. Testing notes addition...');
    try {
        const response = await fetch(`${baseUrl}/update_lead.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                row_number: 2,
                notes: 'Test note added via API'
            })
        });

        const result = await response.json();
        console.log('Notes addition result:', result);
    } catch (error) {
        console.error('Notes addition error:', error.message);
    }

    // Test 4: Multiple fields update
    console.log('\n4. Testing multiple fields update...');
    try {
        const response = await fetch(`${baseUrl}/update_lead.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                row_number: 2,
                status: 'Follow-up',
                interest_level: 'High',
                notes: 'Updated multiple fields via API'
            })
        });

        const result = await response.json();
        console.log('Multiple fields update result:', result);
    } catch (error) {
        console.error('Multiple fields update error:', error.message);
    }

    console.log('\n==========================================');
    console.log('Testing completed. Check master sheet for changes.');
}

// Run the test
testUpdateLead().catch(console.error);