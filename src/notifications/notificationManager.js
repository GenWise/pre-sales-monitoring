/**
 * Notification Manager
 * Central coordinator for all notification types with error handling,
 * retry logic, rate limiting, and template management
 */

const SlackNotifier = require('./slackNotifier');
const EmailNotifier = require('./emailNotifier');
const winston = require('winston');

class NotificationManager {
    constructor() {
        this.slackNotifier = new SlackNotifier();
        this.emailNotifier = new EmailNotifier();

        // Rate limiting: track sent notifications
        this.sentNotifications = new Map();
        this.rateLimitWindow = 5 * 60 * 1000; // 5 minutes
        this.maxNotificationsPerWindow = 10;

        // Retry configuration
        this.maxRetries = 3;
        this.retryDelay = 2000; // 2 seconds

        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ filename: 'logs/notification-manager.log' }),
                new winston.transports.Console()
            ]
        });

        this.logger.info('Notification Manager initialized');
    }

    /**
     * Send notifications for a new lead
     * @param {Object} leadData - Lead information
     * @param {Object} options - Notification options
     * @returns {Promise<Object>} - Notification results
     */
    async sendNewLeadNotifications(leadData, options = {}) {
        const {
            includeSlack = true,
            includeEmail = true,
            customRecipients = null,
            priority = 'normal'
        } = options;

        this.logger.info(`Sending new lead notifications for: ${leadData.email || leadData.id || 'unknown'}`);

        // Check rate limiting
        if (!this.checkRateLimit('new-lead')) {
            this.logger.warn('Rate limit exceeded for new lead notifications');
            return {
                success: false,
                error: 'Rate limit exceeded',
                results: {}
            };
        }

        const results = {
            slack: { success: false, error: null },
            email: { success: false, error: null }
        };

        // Send Slack notification
        if (includeSlack && this.slackNotifier.isConfigured()) {
            results.slack = await this.sendWithRetry(
                () => this.slackNotifier.sendNewLeadNotification(leadData),
                'Slack new lead notification',
                leadData
            );
        } else if (includeSlack) {
            results.slack = { success: false, error: 'Slack not configured' };
        }

        // Send Email notification
        if (includeEmail && this.emailNotifier.isConfigured()) {
            results.email = await this.sendWithRetry(
                () => this.emailNotifier.sendNewLeadNotification(leadData, customRecipients),
                'Email new lead notification',
                leadData
            );
        } else if (includeEmail) {
            results.email = { success: false, error: 'Email not configured' };
        }

        // Update rate limiting
        this.updateRateLimit('new-lead');

        // Log overall results
        const successCount = Object.values(results).filter(r => r.success).length;
        const totalCount = Object.values(results).filter(r => r.success !== undefined).length;

        this.logger.info(`New lead notifications completed: ${successCount}/${totalCount} successful`, {
            leadId: leadData.id || 'unknown',
            results: results
        });

        return {
            success: successCount > 0,
            results: results,
            summary: {
                total: totalCount,
                successful: successCount,
                failed: totalCount - successCount
            }
        };
    }

    /**
     * Send notifications for a duplicate lead
     * @param {Object} leadData - Lead information
     * @param {Object} duplicateInfo - Duplicate information
     * @param {Object} options - Notification options
     * @returns {Promise<Object>} - Notification results
     */
    async sendDuplicateLeadNotifications(leadData, duplicateInfo, options = {}) {
        const {
            includeSlack = true,
            includeEmail = true,
            customRecipients = null
        } = options;

        this.logger.info(`Sending duplicate lead notifications for: ${leadData.email || leadData.id || 'unknown'}`);

        // Check rate limiting (less strict for duplicates)
        if (!this.checkRateLimit('duplicate-lead', 20)) {
            this.logger.warn('Rate limit exceeded for duplicate lead notifications');
            return {
                success: false,
                error: 'Rate limit exceeded',
                results: {}
            };
        }

        const results = {
            slack: { success: false, error: null },
            email: { success: false, error: null }
        };

        // Send Slack notification
        if (includeSlack && this.slackNotifier.isConfigured()) {
            results.slack = await this.sendWithRetry(
                () => this.slackNotifier.sendDuplicateLeadNotification(leadData, duplicateInfo),
                'Slack duplicate lead notification',
                leadData
            );
        } else if (includeSlack) {
            results.slack = { success: false, error: 'Slack not configured' };
        }

        // Send Email notification
        if (includeEmail && this.emailNotifier.isConfigured()) {
            results.email = await this.sendWithRetry(
                () => this.emailNotifier.sendDuplicateLeadNotification(leadData, duplicateInfo, customRecipients),
                'Email duplicate lead notification',
                leadData
            );
        } else if (includeEmail) {
            results.email = { success: false, error: 'Email not configured' };
        }

        // Update rate limiting
        this.updateRateLimit('duplicate-lead');

        // Log overall results
        const successCount = Object.values(results).filter(r => r.success).length;
        const totalCount = Object.values(results).filter(r => r.success !== undefined).length;

        this.logger.info(`Duplicate lead notifications completed: ${successCount}/${totalCount} successful`, {
            leadId: leadData.id || 'unknown',
            results: results
        });

        return {
            success: successCount > 0,
            results: results,
            summary: {
                total: totalCount,
                successful: successCount,
                failed: totalCount - successCount
            }
        };
    }

    /**
     * Send custom notification with template
     * @param {string} type - Notification type
     * @param {Object} data - Data for template
     * @param {Object} template - Custom template
     * @param {Object} options - Notification options
     * @returns {Promise<Object>} - Notification results
     */
    async sendCustomNotification(type, data, template, options = {}) {
        const {
            includeSlack = true,
            includeEmail = true,
            customRecipients = null
        } = options;

        this.logger.info(`Sending custom notification: ${type}`);

        // Check rate limiting
        if (!this.checkRateLimit(`custom-${type}`)) {
            this.logger.warn(`Rate limit exceeded for custom notification: ${type}`);
            return {
                success: false,
                error: 'Rate limit exceeded',
                results: {}
            };
        }

        const results = {
            slack: { success: false, error: null },
            email: { success: false, error: null }
        };

        // For custom notifications, we'd need to extend the notifiers
        // This is a placeholder for future template-based notifications

        this.logger.warn('Custom notifications not fully implemented yet');

        return {
            success: false,
            results: results,
            error: 'Custom notifications not implemented'
        };
    }

    /**
     * Send with retry logic
     * @private
     */
    async sendWithRetry(sendFunction, description, leadData) {
        let lastError = null;

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                this.logger.debug(`Attempting ${description}, attempt ${attempt}/${this.maxRetries}`);

                const success = await sendFunction();
                if (success) {
                    if (attempt > 1) {
                        this.logger.info(`${description} succeeded on attempt ${attempt}`);
                    }
                    return { success: true, attempts: attempt };
                } else {
                    throw new Error('Notification function returned false');
                }
            } catch (error) {
                lastError = error;
                this.logger.warn(`${description} failed on attempt ${attempt}:`, error.message);

                // Wait before retry (exponential backoff)
                if (attempt < this.maxRetries) {
                    const delay = this.retryDelay * Math.pow(2, attempt - 1);
                    await this.delay(delay);
                }
            }
        }

        this.logger.error(`${description} failed after ${this.maxRetries} attempts:`, lastError);
        return {
            success: false,
            error: lastError.message,
            attempts: this.maxRetries
        };
    }

    /**
     * Check rate limiting
     * @private
     */
    checkRateLimit(type, maxPerWindow = null) {
        const now = Date.now();
        const windowStart = now - this.rateLimitWindow;
        const maxAllowed = maxPerWindow || this.maxNotificationsPerWindow;

        // Clean old entries
        if (this.sentNotifications.has(type)) {
            const timestamps = this.sentNotifications.get(type).filter(ts => ts > windowStart);
            this.sentNotifications.set(type, timestamps);
        }

        // Check if we're within limits
        const currentCount = this.sentNotifications.get(type)?.length || 0;
        return currentCount < maxAllowed;
    }

    /**
     * Update rate limiting counters
     * @private
     */
    updateRateLimit(type) {
        const now = Date.now();

        if (!this.sentNotifications.has(type)) {
            this.sentNotifications.set(type, []);
        }

        this.sentNotifications.get(type).push(now);
    }

    /**
     * Delay helper
     * @private
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Test all notification systems
     * @returns {Promise<Object>} - Test results
     */
    async testAllSystems() {
        this.logger.info('Testing all notification systems...');

        const results = {
            slack: { success: false, error: null, configured: false },
            email: { success: false, error: null, configured: false }
        };

        // Test Slack
        results.slack.configured = this.slackNotifier.isConfigured();
        if (results.slack.configured) {
            try {
                results.slack.success = await this.slackNotifier.sendTestNotification();
                if (!results.slack.success) {
                    results.slack.error = 'Test notification returned false';
                }
            } catch (error) {
                results.slack.error = error.message;
            }
        } else {
            results.slack.error = 'Slack webhook URL not configured';
        }

        // Test Email
        results.email.configured = this.emailNotifier.isConfigured();
        if (results.email.configured) {
            try {
                // First verify connection
                const connectionOk = await this.emailNotifier.verifyConnection();
                if (connectionOk) {
                    results.email.success = await this.emailNotifier.sendTestEmail();
                    if (!results.email.success) {
                        results.email.error = 'Test email returned false';
                    }
                } else {
                    results.email.error = 'SMTP connection verification failed';
                }
            } catch (error) {
                results.email.error = error.message;
            }
        } else {
            results.email.error = 'Gmail SMTP credentials not configured';
        }

        // Log test results
        this.logger.info('Notification system tests completed', results);

        return {
            success: Object.values(results).some(r => r.success),
            results: results,
            summary: {
                configured: Object.values(results).filter(r => r.configured).length,
                working: Object.values(results).filter(r => r.success).length,
                total: Object.keys(results).length
            }
        };
    }

    /**
     * Get notification configuration status
     * @returns {Object} - Configuration status
     */
    getConfigurationStatus() {
        return {
            slack: {
                configured: this.slackNotifier.isConfigured(),
                webhookUrl: process.env.SLACK_WEBHOOK_URL ? 'Set' : 'Not Set',
                channel: process.env.SLACK_CHANNEL || '#gsp26'
            },
            email: {
                configured: this.emailNotifier.isConfigured(),
                smtpUsername: process.env.GMAIL_USERNAME || process.env.SMTP_USERNAME ? 'Set' : 'Not Set',
                smtpPassword: process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASSWORD ? 'Set' : 'Not Set',
                defaultRecipients: process.env.PRESALES_NOTIFICATION_EMAILS || 'gifted@genwise.in,eklavya@genwise.in,ashish@genwise.in'
            },
            rateLimit: {
                windowMinutes: this.rateLimitWindow / (60 * 1000),
                maxPerWindow: this.maxNotificationsPerWindow,
                currentCounts: Object.fromEntries(this.sentNotifications.entries())
            }
        };
    }

    /**
     * Clear rate limiting counters (for testing)
     */
    clearRateLimits() {
        this.sentNotifications.clear();
        this.logger.info('Rate limit counters cleared');
    }

    /**
     * Get notification statistics
     * @returns {Object} - Statistics
     */
    getStatistics() {
        const stats = {
            totalSent: 0,
            byType: {}
        };

        for (const [type, timestamps] of this.sentNotifications.entries()) {
            stats.byType[type] = timestamps.length;
            stats.totalSent += timestamps.length;
        }

        return stats;
    }
}

module.exports = NotificationManager;