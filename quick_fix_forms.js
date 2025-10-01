// Quick fix for ats_qualifiers and website scripts
const fs = require('fs').promises;

async function fixFormScripts() {
    console.log('🔧 FIXING FORM2 AND FORM3 SCRIPTS');
    console.log('==================================\n');

    const fixes = [
        {
            file: './corrected_scripts/ats_qualifiers_bound_script.js',
            formName: 'ats_qualifiers'
        },
        {
            file: './corrected_scripts/website_bound_script.js',
            formName: 'website'
        }
    ];

    for (const fix of fixes) {
        console.log(`🔧 Fixing ${fix.formName}...`);

        try {
            let content = await fs.readFile(fix.file, 'utf8');

            // Fix 1: Update webhook URL to localhost
            content = content.replace(
                'const WEBHOOK_URL = \'https://dashboard.giftedworld.org/webhook\';',
                'const WEBHOOK_URL = \'http://localhost:3001/webhook/form-submission\';'
            );

            // Fix 2: Add proper field mapping function
            const fieldMappingFunction = `
// =============================================================================
// FIELD MAPPING FUNCTIONS
// =============================================================================

/**
 * Map form fields to standard master sheet format
 */
function mapFormFields(responseData) {
  const mappedData = { ...responseData };

  // Field mapping patterns - maps various question formats to standard fields
  const fieldMappings = {
    'Parent Email': ['parent email', 'email address', 'email', 'guardian email', 'contact email'],
    'Parent Name': ['parent name', 'guardian name', 'parent\\'s name', 'father name', 'mother name', 'contact person'],
    'Child Name': ['child name', 'student name', 'child\\'s name', 'name of child', 'student\\'s name'],
    'Parent Mobile': ['parent mobile', 'mobile number', 'phone number', 'contact number', 'mobile', 'phone'],
    'Interest Level': ['interest level', 'level of interest', 'how interested', 'interest', 'priority']
  };

  // Apply field mappings
  Object.keys(responseData).forEach(originalField => {
    const normalizedField = originalField.toLowerCase().trim();

    Object.keys(fieldMappings).forEach(targetField => {
      const patterns = fieldMappings[targetField];
      if (patterns.some(pattern => normalizedField.includes(pattern))) {
        mappedData[targetField] = responseData[originalField];

        // Apply interest level mapping if this is an interest field
        if (targetField === 'Interest Level') {
          mappedData[targetField] = mapInterestLevel(responseData[originalField]);
        }
      }
    });
  });

  return mappedData;
}

/**
 * Map interest level responses to standard values
 */
function mapInterestLevel(response) {
  if (!response) return 'Medium';

  const normalized = response.toLowerCase().trim();

  // ${fix.formName} specific mappings
  const mappings = {
    'urgent': 'High',
    'high priority': 'High',
    'very interested': 'High',
    'definitely': 'High',
    'very likely': 'High',
    'immediately': 'High',
    'asap': 'High',
    'high': 'High',

    'normal': 'Medium',
    'maybe': 'Medium',
    'possibly': 'Medium',
    'soon': 'Medium',
    'medium': 'Medium',
    'moderate': 'Medium',

    'low priority': 'Low',
    'unlikely': 'Low',
    'not sure': 'Low',
    'later': 'Low',
    'low': 'Low'
  };

  return mappings[normalized] || 'Medium';
}`;

            // Fix 3: Update the responseData processing to use field mapping
            content = content.replace(
                `    // Extract form field values
    itemResponses.forEach(itemResponse => {
      const question = itemResponse.getItem().getTitle();
      const answer = itemResponse.getResponse();
      responseData[question] = answer;
    });

    console.log('📋 Form data collected:', responseData);`,
                `    // Extract form field values
    itemResponses.forEach(itemResponse => {
      const question = itemResponse.getItem().getTitle();
      const answer = itemResponse.getResponse();
      responseData[question] = answer;
    });

    // Apply field mapping to ensure compatibility
    const mappedData = mapFormFields(responseData);
    console.log('📋 Original form data:', responseData);
    console.log('📋 Mapped form data:', mappedData);`
            );

            // Fix 4: Update webhook payload to use mapped data
            content = content.replace(
                `    // Send to webhook endpoint
    const webhookPayload = {
      formData: responseData,`,
                `    // Send to webhook endpoint
    const webhookPayload = {
      formData: mappedData,`
            );

            // Fix 5: Insert field mapping functions before webhook functions
            content = content.replace(
                '// =============================================================================\n// WEBHOOK FUNCTIONS\n// =============================================================================',
                fieldMappingFunction + '\n\n// =============================================================================\n// WEBHOOK FUNCTIONS\n// ============================================================================='
            );

            // Save the fixed file
            await fs.writeFile(fix.file, content);
            console.log(`   ✅ ${fix.formName} script fixed and saved`);

        } catch (error) {
            console.log(`   ❌ Error fixing ${fix.formName}: ${error.message}`);
        }
    }

    console.log('\n🎯 FIXES APPLIED');
    console.log('================');
    console.log('✅ Updated webhook URLs to localhost');
    console.log('✅ Added proper field mapping functions');
    console.log('✅ Added interest level mapping');
    console.log('✅ Updated payload to use mapped data');
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Copy the updated scripts to your forms');
    console.log('2. Save the scripts in Google Apps Script editor');
    console.log('3. Test form submissions');
}

if (require.main === module) {
    fixFormScripts().catch(console.error);
}