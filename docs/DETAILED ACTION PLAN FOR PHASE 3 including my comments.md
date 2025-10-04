  🎯 DETAILED ACTION PLAN FOR PHASE 3

  1. Configure Bidirectional Sync (Priority 1)

  Current Gap: TIP specifies sync only when status changes to "Warm|Hot|Not Interested", but current code syncs
  all records.

  Actions Required:
  - Modify freshsalesSync.js:syncFromMasterToFreshSales() to filter by status criteria
  - Add status change detection logic
  - Test with actual master sheet data
  - Verify field mappings match TIP requirements (High→402000446647, Medium→402000446648, Low→402000769051)

  2. Google Apps Script Scheduler (Priority 1)

  Current Gap: No Google Apps Script triggers deployed for 5-minute sync jobs.

  Actions Required:
  - Create new Google Apps Script project for sync scheduling
  - Deploy FreshSales sync modules to Google Apps Script environment
  - Configure time-driven triggers (every 5 minutes) - can happen even once a day, if a manual refresh option is available on the master sheet?
  - Handle Google Apps Script limitations (execution time, memory)
  - Test sync execution within Google's runtime constraints

  3. Monitoring & Error Alerting (Priority 2)

  Current Gap: Basic error handling exists but no production monitoring system.

  Actions Required:
  - Enhance error logging in all sync modules
  - Configure email alerts for sync failures
  - Add Slack notifications for critical errors (will go to rajesh@genwise.in)
  - Implement sync success/failure metrics tracking
  - Create daily sync summary reports

  4. Slack Notifications (Priority 2)

  Current Gap: Slack webhook configured (.env:12) but not integrated with sync operations.

  Actions Required:
  - Test webhook URL validity
  - Add Slack notifications to sync workflow
  - Configure different message types (success, warning, error)
  - Implement rate limiting for notification frequency
  - Test notification delivery and formatting
I actually want a Slack Notification to rajesh@genwise.in whenever there's a new submission reflected in the master sheet.

  5. Production Deployment & Testing (Priority 3)

  Actions Required:
  - Deploy Google Apps Script with production credentials
  - Test end-to-end: Form submission → Master Sheet → FreshSales sync
  - Verify conflict resolution (last-modified-wins strategy)
  - Monitor sync performance and success rates
  - Switch from development to production notification emails

  IMPLEMENTATION SEQUENCE

  Week 1: Core Sync Configuration

  1. Day 1-2: Modify sync logic for status-based triggers
  2. Day 3-4: Deploy to Google Apps Script with 5-minute triggers
  3. Day 5: Test bidirectional sync with small dataset

  Week 2: Monitoring & Production

  1. Day 1-2: Implement monitoring and alerting
  2. Day 3-4: Configure Slack notifications
  3. Day 5: Production deployment and validation

  RISK MITIGATION

  - API Rate Limits: Current code handles 1000/hour limit well
  - Google Apps Script Limits: 6-minute execution limit may require batch processing
  - Data Conflicts: Last-modified-wins strategy already implemented
  - Sync Failures: Retry logic and error queuing already built-in
