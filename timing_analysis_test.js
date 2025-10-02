#!/usr/bin/env node

/**
 * Comprehensive Timing Analysis for Form Submission Pipeline
 * Tests complete flow: Form → Google Apps Script → Webhook → Master Sheet → Dashboard API
 */

const axios = require('axios');
const { google } = require('googleapis');
require('dotenv').config();

// Configuration
const WEBHOOK_URL = 'http://localhost:3001/webhook/form-submission';
const DASHBOARD_API_URL = 'http://localhost:3002/api/leads';
const MASTER_SHEET_ID = '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ';

class TimingAnalyzer {
    constructor() {
        this.startTime = Date.now();
        this.measurements = [];
        this.testEmail = `timing.test.${Date.now()}@example.com`;
    }

    recordTime(step, status = 'success', details = '') {
        const timestamp = Date.now();
        const elapsed = timestamp - this.startTime;

        const measurement = {
            step,
            status,
            timestamp: new Date(timestamp).toISOString(),
            elapsedMs: elapsed,
            elapsedSeconds: (elapsed / 1000).toFixed(2),
            details
        };

        this.measurements.push(measurement);
        console.log(`[${measurement.elapsedSeconds}s] ${step}: ${status} ${details ? '- ' + details : ''}`);

        return measurement;
    }

    async testWebhookTiming() {
        console.log('\n🔥 STARTING WEBHOOK TIMING TEST');
        console.log(`Test email: ${this.testEmail}`);
        console.log('=' * 60);

        this.recordTime('Test Started');

        // Step 1: Submit to webhook (simulating Google Apps Script call)
        const testData = {
            formData: {
                childName: 'Timing Test Child',
                parentName: 'Timing Test Parent',
                parentEmail: this.testEmail,
                parentMobile: '9876543210',
                'Interested in the Gifted Summer Program ': 'Ready to Sign up and save almost 25% through available discounts',
                sourceTag: 'website',
                formId: '1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg',
                timestamp: new Date().toISOString()
            },
            metadata: {
                formName: 'website',
                testType: 'timing_analysis'
            }
        };

        try {
            const webhookStart = Date.now();
            const response = await axios.post(WEBHOOK_URL, testData, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 15000
            });
            const webhookEnd = Date.now();

            this.recordTime('Webhook Response', 'success', `${webhookEnd - webhookStart}ms`);

            if (response.status === 200) {
                this.recordTime('Webhook Accepted', 'success', JSON.stringify(response.data));
            } else {
                this.recordTime('Webhook Error', 'failed', `Status: ${response.status}`);
                return false;
            }
        } catch (error) {
            this.recordTime('Webhook Failed', 'error', error.message);
            return false;
        }

        return true;
    }

    async checkMasterSheetTiming() {
        console.log('\n📊 CHECKING MASTER SHEET UPDATE TIMING');

        try {
            const auth = new google.auth.GoogleAuth({
                keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_FILE,
                scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
            });

            const sheets = google.sheets({ version: 'v4', auth });

            // Check multiple times with delays
            const checkTimes = [0, 1000, 2000, 5000, 10000]; // 0s, 1s, 2s, 5s, 10s

            for (const delay of checkTimes) {
                if (delay > 0) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }

                const checkStart = Date.now();
                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId: MASTER_SHEET_ID,
                    range: 'Sheet1!A:K'
                });
                const checkEnd = Date.now();

                const rows = response.data.values;
                const apiTime = checkEnd - checkStart;

                if (rows && rows.length > 1) {
                    const testEntry = rows.find(row =>
                        row.some(cell => cell && cell.includes && cell.includes(this.testEmail))
                    );

                    if (testEntry) {
                        this.recordTime('Master Sheet Found', 'success',
                            `After ${delay}ms delay, API: ${apiTime}ms, Total rows: ${rows.length - 1}`);
                        return { found: true, delay, apiTime, totalRows: rows.length - 1 };
                    } else {
                        this.recordTime('Master Sheet Check', 'waiting',
                            `After ${delay}ms delay, API: ${apiTime}ms, Not found yet`);
                    }
                } else {
                    this.recordTime('Master Sheet Error', 'error', 'No data returned');
                }
            }

            this.recordTime('Master Sheet Timeout', 'failed', 'Entry not found within 10 seconds');
            return { found: false };

        } catch (error) {
            this.recordTime('Master Sheet Error', 'error', error.message);
            return { found: false, error: error.message };
        }
    }

    async checkDashboardTiming() {
        console.log('\n🖥️ CHECKING DASHBOARD API TIMING');

        const checkTimes = [0, 1000, 2000, 5000, 10000]; // 0s, 1s, 2s, 5s, 10s

        for (const delay of checkTimes) {
            if (delay > 0) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            try {
                const apiStart = Date.now();
                const response = await axios.get(DASHBOARD_API_URL, { timeout: 10000 });
                const apiEnd = Date.now();

                const apiTime = apiEnd - apiStart;

                if (response.data.success && response.data.leads) {
                    const testLead = response.data.leads.find(lead =>
                        lead.parent_email === this.testEmail
                    );

                    if (testLead) {
                        this.recordTime('Dashboard Found', 'success',
                            `After ${delay}ms delay, API: ${apiTime}ms, Lead ID: ${testLead.id || 'unknown'}`);
                        return { found: true, delay, apiTime, leadCount: response.data.leads.length };
                    } else {
                        this.recordTime('Dashboard Check', 'waiting',
                            `After ${delay}ms delay, API: ${apiTime}ms, Not found yet, ${response.data.leads.length} total leads`);
                    }
                } else {
                    this.recordTime('Dashboard Error', 'error', 'Invalid API response');
                }
            } catch (error) {
                this.recordTime('Dashboard API Error', 'error', error.message);
            }
        }

        this.recordTime('Dashboard Timeout', 'failed', 'Entry not found within 10 seconds');
        return { found: false };
    }

    generateReport() {
        console.log('\n' + '=' * 80);
        console.log('⏱️  COMPLETE TIMING ANALYSIS REPORT');
        console.log('=' * 80);

        // Summary table
        console.log('\nTIMING SUMMARY:');
        console.log('-'.repeat(80));
        console.log('Step'.padEnd(30) + 'Status'.padEnd(12) + 'Time'.padEnd(12) + 'Details');
        console.log('-'.repeat(80));

        this.measurements.forEach(m => {
            const statusIcon = m.status === 'success' ? '✅' :
                             m.status === 'failed' ? '❌' :
                             m.status === 'error' ? '🚨' : '⏳';

            console.log(
                `${statusIcon} ${m.step}`.padEnd(30) +
                m.status.padEnd(12) +
                `${m.elapsedSeconds}s`.padEnd(12) +
                (m.details || '')
            );
        });

        // Analysis
        console.log('\n' + '=' * 80);
        console.log('📈 ANALYSIS');
        console.log('=' * 80);

        const successfulSteps = this.measurements.filter(m => m.status === 'success');
        const failedSteps = this.measurements.filter(m => m.status === 'failed' || m.status === 'error');

        console.log(`✅ Successful steps: ${successfulSteps.length}`);
        console.log(`❌ Failed steps: ${failedSteps.length}`);

        // Calculate timings
        const webhookStep = this.measurements.find(m => m.step === 'Webhook Response');
        const masterSheetStep = this.measurements.find(m => m.step === 'Master Sheet Found');
        const dashboardStep = this.measurements.find(m => m.step === 'Dashboard Found');

        if (webhookStep) {
            console.log(`\n⚡ Webhook response time: ${webhookStep.details}`);
        }

        if (masterSheetStep) {
            console.log(`📊 Master sheet propagation: ${masterSheetStep.elapsedSeconds}s`);
        }

        if (dashboardStep) {
            console.log(`🖥️ Dashboard visibility: ${dashboardStep.elapsedSeconds}s`);
        }

        // Issues and recommendations
        console.log('\n🔧 ISSUES & RECOMMENDATIONS:');

        if (failedSteps.length > 0) {
            console.log('\n❌ CRITICAL ISSUES:');
            failedSteps.forEach(step => {
                console.log(`   • ${step.step}: ${step.details}`);
            });
        }

        const totalTime = this.measurements[this.measurements.length - 1]?.elapsedMs || 0;
        if (totalTime > 30000) {
            console.log('\n⚠️  PERFORMANCE ISSUES:');
            console.log('   • Total pipeline time > 30 seconds (too slow)');
            console.log('   • Consider optimizing Google Apps Script triggers');
            console.log('   • Check for manual intervention requirements');
        }

        console.log('\n✨ EXPECTED PERFORMANCE:');
        console.log('   • Webhook response: < 2 seconds');
        console.log('   • Master sheet update: < 5 seconds');
        console.log('   • Dashboard visibility: < 10 seconds');
        console.log('   • Total end-to-end: < 15 seconds');

        return {
            totalSteps: this.measurements.length,
            successfulSteps: successfulSteps.length,
            failedSteps: failedSteps.length,
            totalTimeMs: totalTime,
            measurements: this.measurements
        };
    }
}

async function runCompleteTimingAnalysis() {
    const analyzer = new TimingAnalyzer();

    console.log('🚀 STARTING COMPLETE TIMING ANALYSIS');
    console.log('Testing form submission pipeline from webhook to dashboard...');

    // Test webhook
    const webhookSuccess = await analyzer.testWebhookTiming();

    if (!webhookSuccess) {
        console.log('\n❌ Webhook test failed - stopping analysis');
        analyzer.generateReport();
        return;
    }

    // Test master sheet timing
    await analyzer.checkMasterSheetTiming();

    // Test dashboard timing
    await analyzer.checkDashboardTiming();

    // Generate final report
    const report = analyzer.generateReport();

    console.log('\n📋 TEST COMPLETE');
    console.log(`Total analysis time: ${(report.totalTimeMs / 1000).toFixed(2)} seconds`);

    return report;
}

// Run the analysis if called directly
if (require.main === module) {
    runCompleteTimingAnalysis().catch(console.error);
}

module.exports = { TimingAnalyzer, runCompleteTimingAnalysis };