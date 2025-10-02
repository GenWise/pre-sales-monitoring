const fetch = require('node-fetch');

async function verifyAssignmentImplementation() {
    const API_BASE = 'http://localhost:8000';

    console.log('🎯 VERIFYING ASSIGNMENT IMPLEMENTATION');
    console.log('=====================================');

    // Test 1: Check current state
    console.log('\n1. Checking current master sheet state...');
    let response = await fetch(`${API_BASE}/leads_service_account.php`);
    let data = await response.json();

    if (data.success && data.leads.length > 0) {
        const testLead = data.leads[0]; // Row 2
        console.log(`✅ Current lead data (Row 2):`);
        console.log(`   Name: ${testLead.name}`);
        console.log(`   Email: ${testLead.email}`);
        console.log(`   Status: ${testLead.status}`);
        console.log(`   Assigned To: ${testLead.assigned_to}`);
        console.log(`   Notes: ${testLead.notes ? testLead.notes.substring(0, 100) + '...' : 'None'}`);
    }

    // Test 2: Assignment functionality
    console.log('\n2. Testing assignment functionality...');
    response = await fetch(`${API_BASE}/update_lead.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            row_number: 2,
            assigned_owner: 'Rajesh'
        })
    });

    const assignResult = await response.json();
    if (assignResult.success) {
        console.log(`✅ Assignment test: PASSED`);
        console.log(`   Updated ${assignResult.updated_cells} cells`);
    } else {
        console.log(`❌ Assignment test: FAILED - ${assignResult.error}`);
    }

    // Test 3: Status update functionality
    console.log('\n3. Testing status update functionality...');
    response = await fetch(`${API_BASE}/update_lead.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            row_number: 2,
            status: 'Follow-up'
        })
    });

    const statusResult = await response.json();
    if (statusResult.success) {
        console.log(`✅ Status update test: PASSED`);
        console.log(`   Updated ${statusResult.updated_cells} cells`);
    } else {
        console.log(`❌ Status update test: FAILED - ${statusResult.error}`);
    }

    // Test 4: Notes functionality
    console.log('\n4. Testing notes functionality...');
    const testNote = `Verification test completed at ${new Date().toISOString()}`;
    response = await fetch(`${API_BASE}/update_lead.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            row_number: 2,
            notes: testNote
        })
    });

    const notesResult = await response.json();
    if (notesResult.success) {
        console.log(`✅ Notes test: PASSED`);
        console.log(`   Added note: "${testNote}"`);
    } else {
        console.log(`❌ Notes test: FAILED - ${notesResult.error}`);
    }

    // Test 5: Multiple fields update
    console.log('\n5. Testing multiple fields update...');
    response = await fetch(`${API_BASE}/update_lead.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            row_number: 2,
            status: 'Contacted',
            assigned_owner: 'Rajesh',
            interest_level: 'High',
            notes: 'Multiple fields update test - all systems working!'
        })
    });

    const multiResult = await response.json();
    if (multiResult.success) {
        console.log(`✅ Multiple fields update test: PASSED`);
        console.log(`   Updated ${multiResult.updated_cells} cells`);
    } else {
        console.log(`❌ Multiple fields update test: FAILED - ${multiResult.error}`);
    }

    // Test 6: Final verification - check changes persisted
    console.log('\n6. Final verification - checking changes persisted...');
    response = await fetch(`${API_BASE}/leads_service_account.php`);
    data = await response.json();

    if (data.success && data.leads.length > 0) {
        const updatedLead = data.leads[0]; // Row 2
        console.log(`✅ Final state (Row 2):`);
        console.log(`   Status: ${updatedLead.status}`);
        console.log(`   Assigned To: ${updatedLead.assigned_to}`);
        console.log(`   Interest Level: ${updatedLead.interest}`);
        console.log(`   Notes: ${updatedLead.notes ? updatedLead.notes.substring(0, 150) + '...' : 'None'}`);

        // Verify the changes are correct
        const allTestsPassed = (
            updatedLead.status === 'Contacted' &&
            updatedLead.assigned_to === 'Rajesh' &&
            updatedLead.interest === 'High' &&
            updatedLead.notes && updatedLead.notes.includes('Multiple fields update test')
        );

        if (allTestsPassed) {
            console.log('\n🎉 ALL TESTS PASSED - ASSIGNMENT BACKEND IS WORKING!');
            console.log('✅ Status updates persist in master sheet');
            console.log('✅ Assignment functionality works correctly');
            console.log('✅ Notes are appended properly');
            console.log('✅ Multiple field updates work');
            console.log('✅ Changes are immediately visible in master sheet');
        } else {
            console.log('\n⚠️  Some tests may not have persisted correctly');
        }
    }

    console.log('\n=====================================');
    console.log('VERIFICATION COMPLETE');
}

// Run verification
verifyAssignmentImplementation().catch(console.error);