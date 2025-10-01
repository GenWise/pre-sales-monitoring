# Pre-Sales Monitoring System

A comprehensive automated system for managing pre-sales leads from Google Forms to CRM integration, built with Node.js and modern web technologies.

## 🚀 Features

### Lead Management
- **Unified Lead Capture**: Consolidates leads from 4 Google Forms into a master database
- **Smart Duplicate Detection**: Identifies duplicates by email/phone across all forms
- **Real-time Notifications**: Instant Slack and email alerts for new leads
- **CRM Integration**: Two-way sync with FreshSales CRM
- **Mobile Dashboard**: Responsive web interface for lead monitoring

### Automation
- **Form Integration**: Automatic data sync from Google Forms
- **Status Tracking**: Lead progression through sales funnel
- **Bulk Operations**: Mass update capabilities for efficiency
- **Export Functions**: CSV/PDF export for reporting

## Project Structure

```
pre-sales-monitoring/
├── src/
│   ├── api/           # FreshSales integration modules
│   ├── sheets/        # Google Sheets operations
│   ├── notifications/ # Slack and email notification handlers
│   └── dashboard/     # Static dashboard files
├── config/            # Configuration files
├── scripts/           # Google Apps Script files
├── tests/             # Test suites
├── credentials/       # API credentials (gitignored)
└── logs/              # Application logs (gitignored)
```

## Getting Started

### Prerequisites

- Node.js >= 16.0.0
- Google Cloud Console project with Sheets API enabled
- FreshSales API credentials
- Slack webhook URL (for notifications)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment configuration:
   ```bash
   cp .env.example .env
   ```

4. Add your API credentials to the `.env` file

5. Start the application:
   ```bash
   npm start
   ```

### Development

Run in development mode with auto-reload:
```bash
npm run dev
```

Run tests:
```bash
npm test
```

## Configuration

Environment variables required:
- `GOOGLE_SHEETS_CREDENTIALS_PATH`: Path to Google service account JSON
- `FRESHSALES_API_KEY`: FreshSales API key
- `FRESHSALES_DOMAIN`: FreshSales domain
- `SLACK_WEBHOOK_URL`: Slack webhook for notifications
- `PORT`: Application port (default: 3000)

## Contributing

1. Follow the established code structure
2. Add tests for new features
3. Update documentation as needed
4. Ensure all tests pass before submitting changes

## License

ISC