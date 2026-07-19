/**
 * Email Notification Handler
 * Handles sending professional HTML emails via Gmail SMTP
 */

const nodemailer = require('nodemailer');
const winston = require('winston');

class EmailNotifier {
    constructor() {
        this.transporter = null;
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ filename: 'logs/email-notifications.log' }),
                new winston.transports.Console()
            ]
        });

        this.initializeTransporter();
    }

    initializeTransporter() {
        const gmailUsername = process.env.GMAIL_USERNAME || process.env.SMTP_USERNAME;
        const gmailPassword = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASSWORD;

        if (!gmailUsername || !gmailPassword) {
            this.logger.warn('Gmail SMTP credentials not configured. Email notifications disabled.');
            return;
        }

        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: gmailUsername,
                pass: gmailPassword
            }
        });

        this.logger.info('Gmail SMTP transporter initialized successfully');
    }

    /**
     * Send new lead notification email
     * @param {Object} leadData - Lead information
     * @param {Array} recipients - Email addresses to notify
     * @returns {Promise<boolean>} - Success status
     */
    async sendNewLeadNotification(leadData, recipients = null) {
        if (!this.transporter) {
            this.logger.warn('Email transporter not configured. Skipping notification.');
            return false;
        }

        try {
            const emailRecipients = recipients || this.getDefaultRecipients();
            const htmlContent = this.buildNewLeadEmailHTML(leadData);
            const textContent = this.buildNewLeadEmailText(leadData);

            const mailOptions = {
                from: {
                    name: 'GenWise Pre-Sales System',
                    address: process.env.GMAIL_USERNAME || process.env.SMTP_USERNAME
                },
                to: emailRecipients,
                subject: `🚀 New Lead Alert: ${leadData.name || 'Unknown Lead'}`,
                text: textContent,
                html: htmlContent,
                priority: 'high',
                headers: {
                    'X-Priority': '1',
                    'X-MSMail-Priority': 'High',
                    'Importance': 'high'
                }
            };

            const result = await this.transporter.sendMail(mailOptions);
            this.logger.info(`Email notification sent for lead: ${leadData.id || 'unknown'}`, {
                recipients: emailRecipients,
                messageId: result.messageId
            });

            return true;
        } catch (error) {
            this.logger.error('Failed to send email notification:', error);
            return false;
        }
    }

    /**
     * Send duplicate lead notification email
     * @param {Object} leadData - Lead information
     * @param {Object} duplicateInfo - Duplicate information
     * @param {Array} recipients - Email addresses to notify
     * @returns {Promise<boolean>} - Success status
     */
    async sendDuplicateLeadNotification(leadData, duplicateInfo, recipients = null) {
        if (!this.transporter) {
            this.logger.warn('Email transporter not configured. Skipping notification.');
            return false;
        }

        try {
            const emailRecipients = recipients || this.getDefaultRecipients();
            const htmlContent = this.buildDuplicateLeadEmailHTML(leadData, duplicateInfo);
            const textContent = this.buildDuplicateLeadEmailText(leadData, duplicateInfo);

            const mailOptions = {
                from: {
                    name: 'GenWise Pre-Sales System',
                    address: process.env.GMAIL_USERNAME || process.env.SMTP_USERNAME
                },
                to: emailRecipients,
                subject: `⚠️ Duplicate Lead Detected: ${leadData.name || 'Unknown Lead'}`,
                text: textContent,
                html: htmlContent,
                priority: 'normal'
            };

            const result = await this.transporter.sendMail(mailOptions);
            this.logger.info(`Email duplicate notification sent for lead: ${leadData.id || 'unknown'}`, {
                recipients: emailRecipients,
                messageId: result.messageId
            });

            return true;
        } catch (error) {
            this.logger.error('Failed to send duplicate email notification:', error);
            return false;
        }
    }

    /**
     * Build HTML content for new lead email
     * @private
     */
    buildNewLeadEmailHTML(leadData) {
        const timestamp = new Date().toLocaleString();
        const priority = this.determineLeadPriority(leadData);

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Lead Alert</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                .lead-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .field { margin: 10px 0; }
                .label { font-weight: bold; color: #495057; }
                .value { color: #212529; margin-left: 10px; }
                .priority { padding: 5px 15px; border-radius: 20px; font-size: 14px; font-weight: bold; }
                .priority.high { background: #ff6b6b; color: white; }
                .priority.medium { background: #ffd93d; color: #333; }
                .priority.normal { background: #6bcf7f; color: white; }
                .actions { margin: 30px 0; text-align: center; }
                .btn { display: inline-block; padding: 12px 25px; margin: 5px; text-decoration: none; border-radius: 5px; font-weight: bold; }
                .btn-primary { background: #007bff; color: white; }
                .btn-secondary { background: #6c757d; color: white; }
                .footer { text-align: center; margin-top: 30px; color: #6c757d; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🚀 New Lead Alert</h1>
                    <p>A new potential customer has contacted GenWise!</p>
                </div>

                <div class="content">
                    <div class="lead-info">
                        <h2>Lead Information</h2>

                        <div class="field">
                            <span class="label">Name:</span>
                            <span class="value">${leadData.name || 'N/A'}</span>
                        </div>

                        <div class="field">
                            <span class="label">Email:</span>
                            <span class="value"><a href="mailto:${leadData.email || ''}">${leadData.email || 'N/A'}</a></span>
                        </div>

                        <div class="field">
                            <span class="label">Phone:</span>
                            <span class="value"><a href="tel:${leadData.phone || ''}">${leadData.phone || 'N/A'}</a></span>
                        </div>

                        <div class="field">
                            <span class="label">Company:</span>
                            <span class="value">${leadData.company || 'N/A'}</span>
                        </div>

                        <div class="field">
                            <span class="label">Source:</span>
                            <span class="value">${leadData.source || 'Unknown'}</span>
                        </div>

                        <div class="field">
                            <span class="label">Priority:</span>
                            <span class="priority ${priority.class}">${priority.text}</span>
                        </div>

                        <div class="field">
                            <span class="label">Received:</span>
                            <span class="value">${timestamp}</span>
                        </div>

                        ${leadData.message || leadData.notes ? `
                        <div class="field">
                            <span class="label">Message:</span>
                            <div class="value" style="margin-top: 10px; padding: 15px; background: #f1f3f4; border-radius: 5px;">
                                ${(leadData.message || leadData.notes || '').replace(/\n/g, '<br>')}
                            </div>
                        </div>
                        ` : ''}
                    </div>

                    <div class="actions">
                        <a href="tel:${leadData.phone || ''}" class="btn btn-primary">📞 Call Now</a>
                        <a href="mailto:${leadData.email || ''}?subject=Follow-up from GenWise" class="btn btn-secondary">✉️ Send Email</a>
                        <a href="${process.env.DASHBOARD_URL || 'http://localhost:3000'}" class="btn btn-secondary">📊 View Dashboard</a>
                    </div>
                </div>

                <div class="footer">
                    <p>This notification was sent by the GenWise Pre-Sales Monitoring System</p>
                    <p>Lead ID: ${leadData.id || 'TBD'}</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Build HTML content for duplicate lead email
     * @private
     */
    buildDuplicateLeadEmailHTML(leadData, duplicateInfo) {
        const timestamp = new Date().toLocaleString();

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Duplicate Lead Alert</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #ff9a56 0%, #ff6b6b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                .lead-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .field { margin: 10px 0; }
                .label { font-weight: bold; color: #495057; }
                .value { color: #212529; margin-left: 10px; }
                .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .actions { margin: 30px 0; text-align: center; }
                .btn { display: inline-block; padding: 12px 25px; margin: 5px; text-decoration: none; border-radius: 5px; font-weight: bold; }
                .btn-primary { background: #007bff; color: white; }
                .btn-secondary { background: #6c757d; color: white; }
                .footer { text-align: center; margin-top: 30px; color: #6c757d; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>⚠️ Duplicate Lead Detected</h1>
                    <p>This lead has been seen before in our system</p>
                </div>

                <div class="content">
                    <div class="warning">
                        <strong>Duplicate Alert:</strong> This person has previously contacted us. Please check their history before reaching out.
                    </div>

                    <div class="lead-info">
                        <h2>Lead Information</h2>

                        <div class="field">
                            <span class="label">Name:</span>
                            <span class="value">${leadData.name || 'N/A'}</span>
                        </div>

                        <div class="field">
                            <span class="label">Email:</span>
                            <span class="value"><a href="mailto:${leadData.email || ''}">${leadData.email || 'N/A'}</a></span>
                        </div>

                        <div class="field">
                            <span class="label">Phone:</span>
                            <span class="value"><a href="tel:${leadData.phone || ''}">${leadData.phone || 'N/A'}</a></span>
                        </div>

                        <div class="field">
                            <span class="label">Company:</span>
                            <span class="value">${leadData.company || 'N/A'}</span>
                        </div>

                        <div class="field">
                            <span class="label">Source:</span>
                            <span class="value">${leadData.source || 'Unknown'}</span>
                        </div>

                        <div class="field">
                            <span class="label">Current Submission:</span>
                            <span class="value">${timestamp}</span>
                        </div>
                    </div>

                    <div class="lead-info">
                        <h2>Duplicate History</h2>

                        <div class="field">
                            <span class="label">First Seen:</span>
                            <span class="value">${duplicateInfo.firstSeen || 'Unknown'}</span>
                        </div>

                        <div class="field">
                            <span class="label">Last Contact:</span>
                            <span class="value">${duplicateInfo.lastContact || 'Unknown'}</span>
                        </div>

                        <div class="field">
                            <span class="label">Total Submissions:</span>
                            <span class="value">${duplicateInfo.count || 1}</span>
                        </div>

                        <div class="field">
                            <span class="label">Status:</span>
                            <span class="value">${duplicateInfo.status || 'Unknown'}</span>
                        </div>
                    </div>

                    <div class="actions">
                        <a href="${process.env.DASHBOARD_URL || 'http://localhost:3000'}" class="btn btn-primary">📋 View Full History</a>
                        <a href="mailto:${leadData.email || ''}?subject=Follow-up from GenWise" class="btn btn-secondary">✉️ Send Follow-up</a>
                    </div>
                </div>

                <div class="footer">
                    <p>This notification was sent by the GenWise Pre-Sales Monitoring System</p>
                    <p>Lead ID: ${leadData.id || 'TBD'}</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Build plain text content for new lead email
     * @private
     */
    buildNewLeadEmailText(leadData) {
        const timestamp = new Date().toLocaleString();
        const priority = this.determineLeadPriority(leadData);

        return `
🚀 NEW LEAD ALERT

A new potential customer has contacted GenWise!

LEAD INFORMATION:
Name: ${leadData.name || 'N/A'}
Email: ${leadData.email || 'N/A'}
Phone: ${leadData.phone || 'N/A'}
Company: ${leadData.company || 'N/A'}
Source: ${leadData.source || 'Unknown'}
Priority: ${priority.text}
Received: ${timestamp}

${leadData.message || leadData.notes ? `MESSAGE:\n${leadData.message || leadData.notes}\n` : ''}

QUICK ACTIONS:
- Call: ${leadData.phone || 'N/A'}
- Email: ${leadData.email || 'N/A'}
- Dashboard: ${process.env.DASHBOARD_URL || 'http://localhost:3000'}

Lead ID: ${leadData.id || 'TBD'}

This notification was sent by the GenWise Pre-Sales Monitoring System.
        `;
    }

    /**
     * Build plain text content for duplicate lead email
     * @private
     */
    buildDuplicateLeadEmailText(leadData, duplicateInfo) {
        const timestamp = new Date().toLocaleString();

        return `
⚠️ DUPLICATE LEAD DETECTED

This lead has been seen before in our system.

LEAD INFORMATION:
Name: ${leadData.name || 'N/A'}
Email: ${leadData.email || 'N/A'}
Phone: ${leadData.phone || 'N/A'}
Company: ${leadData.company || 'N/A'}
Source: ${leadData.source || 'Unknown'}
Current Submission: ${timestamp}

DUPLICATE HISTORY:
First Seen: ${duplicateInfo.firstSeen || 'Unknown'}
Last Contact: ${duplicateInfo.lastContact || 'Unknown'}
Total Submissions: ${duplicateInfo.count || 1}
Status: ${duplicateInfo.status || 'Unknown'}

Please check their history before reaching out.

Dashboard: ${process.env.DASHBOARD_URL || 'http://localhost:3000'}

Lead ID: ${leadData.id || 'TBD'}

This notification was sent by the GenWise Pre-Sales Monitoring System.
        `;
    }

    /**
     * Determine lead priority
     * @private
     */
    determineLeadPriority(leadData) {
        // High priority conditions
        if (leadData.company && leadData.company.toLowerCase().includes('enterprise')) {
            return { text: '🔥 High', class: 'high' };
        }

        if (leadData.source && ['referral', 'demo-request'].includes(leadData.source.toLowerCase())) {
            return { text: '🔥 High', class: 'high' };
        }

        // Medium priority conditions
        if (leadData.phone && leadData.email) {
            return { text: '⚡ Medium', class: 'medium' };
        }

        // Default to normal
        return { text: '📝 Normal', class: 'normal' };
    }

    /**
     * Get default email recipients
     * @private
     */
    getDefaultRecipients() {
        const recipients = process.env.PRESALES_NOTIFICATION_EMAILS;
        if (recipients) {
            return recipients.split(',').map(email => email.trim());
        }
        return ['gifted@genwise.in', 'eklavya@genwise.in', 'ashish@genwise.in'];
    }

    /**
     * Send sync report email
     * @param {Object} syncReport - Sync report data
     * @param {Array} recipients - Email addresses to notify
     * @returns {Promise<boolean>} - Success status
     */
    async sendSyncReport(syncReport, recipients = ['rajesh@genwise.in']) {
        if (!this.transporter) {
            this.logger.warn('Email transporter not configured. Skipping sync report.');
            return false;
        }

        try {
            const htmlContent = this.buildSyncReportEmailHTML(syncReport);
            const textContent = this.buildSyncReportEmailText(syncReport);

            const statusIcon = syncReport.success ? '✅' : '❌';
            const mailOptions = {
                from: {
                    name: 'GenWise Pre-Sales CRM Sync',
                    address: process.env.GMAIL_USERNAME || process.env.SMTP_USERNAME
                },
                to: recipients,
                subject: `${statusIcon} CRM Sync Report - ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
                text: textContent,
                html: htmlContent,
                priority: syncReport.success ? 'normal' : 'high'
            };

            const result = await this.transporter.sendMail(mailOptions);
            this.logger.info(`Sync report email sent`, {
                recipients: recipients,
                messageId: result.messageId,
                success: syncReport.success
            });

            return true;
        } catch (error) {
            this.logger.error('Failed to send sync report email:', error);
            return false;
        }
    }

    /**
     * Send a plain-text alert email (errors, health alerts)
     * @param {string} subject - Email subject
     * @param {string} textBody - Plain text body
     * @param {Array} recipients - Email addresses to notify
     * @returns {Promise<boolean>} - Success status
     */
    async sendAlertEmail(subject, textBody, recipients = ['rajesh@genwise.in']) {
        if (!this.transporter) {
            this.logger.warn('Email transporter not configured. Skipping alert email.');
            return false;
        }

        try {
            const result = await this.transporter.sendMail({
                from: {
                    name: 'GenWise Pre-Sales CRM Sync',
                    address: process.env.GMAIL_USERNAME || process.env.SMTP_USERNAME
                },
                to: recipients,
                subject: subject,
                text: textBody,
                priority: 'high'
            });

            this.logger.info('Alert email sent', {
                subject: subject,
                recipients: recipients,
                messageId: result.messageId
            });

            return true;
        } catch (error) {
            this.logger.error('Failed to send alert email:', error);
            return false;
        }
    }

    /**
     * Build HTML content for sync report email
     * @private
     */
    buildSyncReportEmailHTML(report) {
        const istTime = new Date().toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            dateStyle: 'full',
            timeStyle: 'medium'
        });

        const statusColor = report.success ? '#28a745' : '#dc3545';
        const statusText = report.success ? 'SUCCESS' : 'FAILED';
        const statusIcon = report.success ? '✅' : '❌';

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 700px; margin: 0 auto; padding: 20px; }
                .header { background: ${statusColor}; color: white; padding: 25px; border-radius: 8px 8px 0 0; }
                .content { background: #f8f9fa; padding: 25px; border-radius: 0 0 8px 8px; }
                .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
                .stat-box { background: white; padding: 15px; border-radius: 6px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
                .stat-value { font-size: 28px; font-weight: bold; color: ${statusColor}; }
                .stat-label { font-size: 12px; color: #6c757d; text-transform: uppercase; margin-top: 5px; }
                .info-box { background: white; padding: 20px; border-radius: 6px; margin: 15px 0; }
                .footer { text-align: center; margin-top: 20px; color: #6c757d; font-size: 13px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>${statusIcon} CRM Sync ${statusText}</h1>
                    <p>${istTime}</p>
                </div>

                <div class="content">
                    <div class="info-box">
                        <h3>Status: ${report.message}</h3>
                    </div>

                    <div class="stats">
                        <div class="stat-box">
                            <div class="stat-value">${report.stats?.processed || 0}</div>
                            <div class="stat-label">Processed</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-value">${report.stats?.created || 0}</div>
                            <div class="stat-label">Created</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-value">${report.stats?.updated || 0}</div>
                            <div class="stat-label">Updated</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-value">${report.stats?.skipped || 0}</div>
                            <div class="stat-label">Skipped</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-value">${report.stats?.duplicates || 0}</div>
                            <div class="stat-label">Duplicates</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-value">${report.stats?.errors || 0}</div>
                            <div class="stat-label">Errors</div>
                        </div>
                    </div>

                    ${report.rateLimits ? `
                    <div class="info-box">
                        <h4>API Rate Limits</h4>
                        <p>Requests: ${report.rateLimits.requestCount || 0} | Limit: ${report.rateLimits.requestLimit || 'Unknown'}</p>
                    </div>
                    ` : ''}
                </div>

                <div class="footer">
                    <p>Pre-Sales Monitoring System | Master Sheet → FreshSales CRM</p>
                    <p>Dashboard: <a href="https://dashboard.giftedworld.org">https://dashboard.giftedworld.org</a></p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Build plain text content for sync report email
     * @private
     */
    buildSyncReportEmailText(report) {
        const istTime = new Date().toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            dateStyle: 'full',
            timeStyle: 'medium'
        });

        const statusText = report.success ? 'SUCCESS' : 'FAILED';
        const statusIcon = report.success ? '✅' : '❌';

        return `
${statusIcon} CRM SYNC ${statusText}
${istTime}

STATUS: ${report.message}

STATISTICS:
- Processed: ${report.stats?.processed || 0}
- Created: ${report.stats?.created || 0}
- Updated: ${report.stats?.updated || 0}
- Skipped: ${report.stats?.skipped || 0}
- Duplicates: ${report.stats?.duplicates || 0}
- Errors: ${report.stats?.errors || 0}

${report.rateLimits ? `API RATE LIMITS:
Requests: ${report.rateLimits.requestCount || 0}
Limit: ${report.rateLimits.requestLimit || 'Unknown'}
` : ''}

Pre-Sales Monitoring System
Master Sheet → FreshSales CRM
Dashboard: https://dashboard.giftedworld.org
        `;
    }

    /**
     * Send test email
     * @returns {Promise<boolean>} - Success status
     */
    async sendTestEmail() {
        const testData = {
            id: 'test-' + Date.now(),
            name: 'Jane Smith',
            email: 'jane.smith@example.com',
            phone: '+1-555-987-6543',
            company: 'Test Enterprise Solutions',
            source: 'contact-form',
            message: 'This is a test email notification to verify Gmail SMTP integration is working properly. Please ignore this test message.',
            timestamp: new Date().toISOString()
        };

        return await this.sendNewLeadNotification(testData);
    }

    /**
     * Verify SMTP connection
     * @returns {Promise<boolean>} - Connection status
     */
    async verifyConnection() {
        if (!this.transporter) {
            return false;
        }

        try {
            await this.transporter.verify();
            this.logger.info('SMTP connection verified successfully');
            return true;
        } catch (error) {
            this.logger.error('SMTP connection verification failed:', error);
            return false;
        }
    }

    /**
     * Check if email notifications are configured
     * @returns {boolean} - Configuration status
     */
    isConfigured() {
        return this.transporter !== null;
    }
}

module.exports = EmailNotifier;