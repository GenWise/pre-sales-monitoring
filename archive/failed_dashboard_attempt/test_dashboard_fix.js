// Test script to verify dashboard 403 fix
const puppeteer = require('puppeteer');

async function testDashboard() {
    console.log('Testing dashboard 403 fix...\n');

    // Test 1: Direct API proxy test
    console.log('1. Testing API proxy endpoint...');
    try {
        const response = await fetch('http://localhost:3002/api/leads');
        const data = await response.json();

        if (data.success) {
            console.log('✅ API proxy working! Found', data.total, 'leads');
        } else {
            console.log('❌ API proxy error:', data.error);
        }
    } catch (error) {
        console.log('❌ API proxy connection failed:', error.message);
    }

    // Test 2: Browser dashboard test
    console.log('\n2. Testing dashboard in browser...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();

        // Listen for console messages
        const consoleMessages = [];
        page.on('console', msg => {
            consoleMessages.push({
                type: msg.type(),
                text: msg.text()
            });
        });

        // Listen for errors
        const errors = [];
        page.on('error', err => errors.push(err.message));
        page.on('pageerror', err => errors.push(err.message));

        // Navigate to dashboard
        await page.goto('http://localhost:8080', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Wait for dashboard to load
        await page.waitForTimeout(3000);

        // Check for 403 errors in console
        const has403Error = consoleMessages.some(msg =>
            msg.text.includes('403') ||
            msg.text.includes('PERMISSION_DENIED') ||
            msg.text.includes('API_KEY_HTTP_REFERRER_BLOCKED')
        );

        // Check if proxy connected successfully
        const proxyConnected = consoleMessages.some(msg =>
            msg.text.includes('Proxy API connected successfully')
        );

        // Check if leads loaded
        const totalLeadsElement = await page.$('#totalLeads');
        const totalLeads = totalLeadsElement ?
            await page.evaluate(el => el.textContent, totalLeadsElement) :
            '-';

        // Get table rows
        const tableRows = await page.$$eval('#leadsTableBody tr', rows => rows.length);

        console.log('\nDashboard Test Results:');
        console.log('------------------------');

        if (has403Error) {
            console.log('❌ 403 errors still present in console');
            consoleMessages.filter(msg =>
                msg.text.includes('403') ||
                msg.text.includes('PERMISSION')
            ).forEach(msg => {
                console.log('   Error:', msg.text);
            });
        } else {
            console.log('✅ No 403 errors detected');
        }

        if (proxyConnected) {
            console.log('✅ Proxy API connected successfully');
        } else {
            console.log('⚠️  Proxy connection not confirmed');
        }

        if (totalLeads !== '-' && totalLeads !== '0') {
            console.log('✅ Total leads displayed:', totalLeads);
        } else {
            console.log('⚠️  No leads displayed (Total:', totalLeads, ')');
        }

        if (tableRows > 0) {
            console.log('✅ Table has', tableRows, 'rows');
        } else {
            console.log('⚠️  Table is empty');
        }

        if (errors.length > 0) {
            console.log('\n❌ Page errors detected:');
            errors.forEach(err => console.log('   -', err));
        }

        // Print relevant console messages
        console.log('\n📋 Console messages:');
        consoleMessages.slice(0, 10).forEach(msg => {
            if (msg.text.includes('API') ||
                msg.text.includes('Proxy') ||
                msg.text.includes('error') ||
                msg.text.includes('success') ||
                msg.text.includes('leads')) {
                console.log(`   [${msg.type}] ${msg.text}`);
            }
        });

        // Final verdict
        console.log('\n🎯 FINAL VERDICT:');
        if (!has403Error && (proxyConnected || tableRows > 0)) {
            console.log('✅ DASHBOARD 403 ERROR FIXED! Data loading successfully.');
        } else {
            console.log('❌ Dashboard still has issues. Check console messages above.');
        }

    } catch (error) {
        console.log('❌ Dashboard test failed:', error.message);
    } finally {
        await browser.close();
    }
}

// Run tests
testDashboard().catch(console.error);