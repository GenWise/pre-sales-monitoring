/**
 * Slack Notification Handler
 * Handles sending rich notifications to Slack channels using webhooks
 */

const { IncomingWebhook } = require('@slack/webhook');
const winston = require('winston');

class SlackNotifier {
    constructor() {
        this.webhook = null;
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ filename: 'logs/slack-notifications.log' }),
                new winston.transports.Console()
            ]
        });

        this.initializeWebhook();
    }

    initializeWebhook() {
        const webhookUrl = process.env.SLACK_WEBHOOK_URL;
        if (!webhookUrl) {
            this.logger.warn('SLACK_WEBHOOK_URL not configured. Slack notifications disabled.');
            return;
        }

        this.webhook = new IncomingWebhook(webhookUrl);
        this.logger.info('Slack webhook initialized successfully');
    }

    /**
     * Send a new lead notification to Slack
     * @param {Object} leadData - Lead information
     * @returns {Promise<boolean>} - Success status
     */
    async sendNewLeadNotification(leadData) {
        if (!this.webhook) {
            this.logger.warn('Slack webhook not configured. Skipping notification.');
            return false;
        }

        try {
            const blocks = this.buildNewLeadBlocks(leadData);

            await this.webhook.send({
                text: `🚀 New Lead Alert: ${leadData.name || 'Unknown'}`,
                blocks: blocks,
                username: 'Pre-Sales Bot',
                icon_emoji: ':rocket:'
            });

            this.logger.info(`Slack notification sent for lead: ${leadData.id || 'unknown'}`);
            return true;
        } catch (error) {
            this.logger.error('Failed to send Slack notification:', error);
            return false;
        }
    }

    /**
     * Send duplicate lead notification to Slack
     * @param {Object} leadData - Lead information
     * @param {Object} duplicateInfo - Information about duplicate
     * @returns {Promise<boolean>} - Success status
     */
    async sendDuplicateLeadNotification(leadData, duplicateInfo) {
        if (!this.webhook) {
            this.logger.warn('Slack webhook not configured. Skipping notification.');
            return false;
        }

        try {
            const blocks = this.buildDuplicateLeadBlocks(leadData, duplicateInfo);

            await this.webhook.send({
                text: `⚠️ Duplicate Lead Detected: ${leadData.name || 'Unknown'}`,
                blocks: blocks,
                username: 'Pre-Sales Bot',
                icon_emoji: ':warning:'
            });

            this.logger.info(`Slack duplicate notification sent for lead: ${leadData.id || 'unknown'}`);
            return true;
        } catch (error) {
            this.logger.error('Failed to send Slack duplicate notification:', error);
            return false;
        }
    }

    /**
     * Build rich blocks for new lead notifications
     * @private
     */
    buildNewLeadBlocks(leadData) {
        const timestamp = new Date().toISOString();
        const priority = this.determineLeadPriority(leadData);

        return [
            // Header
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: '🚀 New Lead Alert',
                    emoji: true
                }
            },

            // Lead Information
            {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*Name:*\n${leadData.name || 'N/A'}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Email:*\n${leadData.email || 'N/A'}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Phone:*\n${leadData.phone || 'N/A'}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Source:*\n${leadData.source || 'Unknown'}`
                    }
                ]
            },

            // Additional Details
            {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*Company:*\n${leadData.company || 'N/A'}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Priority:*\n${priority}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Timestamp:*\n${new Date(timestamp).toLocaleString()}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Lead ID:*\n${leadData.id || 'TBD'}`
                    }
                ]
            }
        ];

        // Add message/notes if available
        if (leadData.message || leadData.notes) {
            blocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*Message:*\n${leadData.message || leadData.notes || 'No message provided'}`
                }
            });
        }

        // Add action buttons
        blocks.push({
            type: 'actions',
            elements: [
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: '📞 Call Now',
                        emoji: true
                    },
                    style: 'primary',
                    url: `tel:${leadData.phone || ''}`
                },
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: '✉️ Send Email',
                        emoji: true
                    },
                    url: `mailto:${leadData.email || ''}?subject=Follow-up from GenWise`
                },
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: '📊 View Dashboard',
                        emoji: true
                    },
                    url: process.env.DASHBOARD_URL || 'http://localhost:3000'
                }
            ]
        });

        // Add divider
        blocks.push({
            type: 'divider'
        });

        return blocks;
    }

    /**
     * Build rich blocks for duplicate lead notifications
     * @private
     */
    buildDuplicateLeadBlocks(leadData, duplicateInfo) {
        return [
            // Header
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: '⚠️ Duplicate Lead Detected',
                    emoji: true
                }
            },

            // Lead Information
            {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*Name:*\n${leadData.name || 'N/A'}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Email:*\n${leadData.email || 'N/A'}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Phone:*\n${leadData.phone || 'N/A'}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Source:*\n${leadData.source || 'Unknown'}`
                    }
                ]
            },

            // Duplicate Information
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*Duplicate Details:*\nFirst seen: ${duplicateInfo.firstSeen || 'Unknown'}\nLast contact: ${duplicateInfo.lastContact || 'Unknown'}\nTotal submissions: ${duplicateInfo.count || 1}`
                }
            },

            // Actions
            {
                type: 'actions',
                elements: [
                    {
                        type: 'button',
                        text: {
                            type: 'plain_text',
                            text: '📋 View History',
                            emoji: true
                        },
                        url: process.env.DASHBOARD_URL || 'http://localhost:3000'
                    },
                    {
                        type: 'button',
                        text: {
                            type: 'plain_text',
                            text: '🔄 Update Status',
                            emoji: true
                        },
                        style: 'primary',
                        url: process.env.DASHBOARD_URL || 'http://localhost:3000'
                    }
                ]
            },

            // Divider
            {
                type: 'divider'
            }
        ];
    }

    /**
     * Determine lead priority based on available data
     * @private
     */
    determineLeadPriority(leadData) {
        // High priority conditions
        if (leadData.company && leadData.company.toLowerCase().includes('enterprise')) {
            return '🔥 High';
        }

        if (leadData.source && ['referral', 'demo-request'].includes(leadData.source.toLowerCase())) {
            return '🔥 High';
        }

        // Medium priority conditions
        if (leadData.phone && leadData.email) {
            return '⚡ Medium';
        }

        // Default to normal
        return '📝 Normal';
    }

    /**
     * Send a test notification
     * @returns {Promise<boolean>} - Success status
     */
    async sendTestNotification() {
        const testData = {
            id: 'test-' + Date.now(),
            name: 'John Doe',
            email: 'john.doe@example.com',
            phone: '+1-555-123-4567',
            company: 'Test Company Ltd',
            source: 'contact-form',
            message: 'This is a test notification to verify Slack integration is working properly.',
            timestamp: new Date().toISOString()
        };

        return await this.sendNewLeadNotification(testData);
    }

    /**
     * Check if Slack notifications are configured
     * @returns {boolean} - Configuration status
     */
    isConfigured() {
        return this.webhook !== null;
    }
}

module.exports = SlackNotifier;