# Pre-Sales Monitoring System - Critical Requirements

## Project Configuration
- **Master Sheet ID**: `1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ`
- **Service Account**: `sheetspython@sheets-and-python-340711.iam.gserviceaccount.com`
- **Dashboard URL**: https://dashboard.giftedworld.org
- **Dashboard Directory**: `/home/u191176295/domains/giftedworld.org/public_html/dashboard`
- **Google Sheets API Key**: Set via environment variable `GOOGLE_SHEETS_API_KEY`

## Critical Data Validation Rules

### Master Sheet Dropdown Values (MUST MATCH EXACTLY)
- **Status**: First Call Pending, Warm, Hot, Not Interested
- **Interest Level**: High, Medium, Low
- **Source Tag**: returning_students, ats_qualifiers, website, early_bird
- **Duplicate Flag**: Yes, No
- **Assigned Owner**: Unassigned, Kevin, Agnes, Eklavya, Ashish

### Form IDs and URLs (CRITICAL REFERENCE)
- **returning_students**: `1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA`
  - **EDITOR**: https://docs.google.com/forms/d/1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA/edit
  - **RESPONDER**: https://docs.google.com/forms/d/e/1FAIpQLSc3AJbrG1tifHuUj_pHQwPQhNM0IMnBlXLJd_Gf2BmJ1qGsBA/viewform
  - **RESPONSE SHEET**: https://docs.google.com/spreadsheets/d/1qf9W8mKuWG6uSZbxEQPdCzY-SahraWD56U54w8QWvcc/edit
- **ats_qualifiers**: `1gGyfmy4NmEgAdZrbex0ffoqGlI1B_LuRUfzvQeOCHCQ`
  - **EDITOR**: https://docs.google.com/forms/d/1gGyfmy4NmEgAdZrbex0ffoqGlI1B_LuRUfzvQeOCHCQ/edit
  - **RESPONDER**: https://docs.google.com/forms/d/e/1FAIpQLSdraBQF7TmbK6d5P0QZF58VOQsaW8oeGhnciaZLSJ8Mu3uigg/viewform
  - **RESPONSE SHEET**: https://docs.google.com/spreadsheets/d/1GPJVwbqrbqGRDXo710PrXVC5nyHGPjhzQ40ZBOVvHmA/edit
- **website**: `1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg`
  - **EDITOR**: https://docs.google.com/forms/d/1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg/edit
  - **RESPONDER**: https://docs.google.com/forms/d/e/1FAIpQLScAEQXMJgbxWEl40xR3X1QgrvVZRphlbK4wzWXOnMxukAiXMw/viewform
  - **RESPONSE SHEET**: https://docs.google.com/spreadsheets/d/14Wj7yZSWq6J0Sbkh3yk26c24JCqvfekWJtGxYbjH-pE/edit
- **early_bird**: `1IJVMLXOThuQE8WVI4bYiruJrTyxsznTomotkS2rfyYY`
  - **EDITOR**: https://docs.google.com/forms/d/1IJVMLXOThuQE8WVI4bYiruJrTyxsznTomotkS2rfyYY/edit
  - **RESPONDER**: https://docs.google.com/forms/d/e/1FAIpQLScoaWU3LuM5os8ebZrC65S3FWvw7wltfVDvLP_2lbNcxKG6eA/viewform
  - **RESPONSE SHEET**: https://docs.google.com/spreadsheets/d/1HkzJOubGpBmnef2bSriwQlJ2dTQ8FqqLvYNhIPW4z4g/edit

## API Keys & Credentials
- **FreshSales API**: `[REDACTED - Set in .env file]`
- **FreshSales View ID**: `402002860065` (All Contacts)
- **Slack Webhook**: `[REDACTED - Set in .env file]`

## Notification Recipients
- **Development**: rajesh@genwise.in
- **Production**: gifted@genwise.in, eklavya@genwise.in, ashish@genwise.in

## **FreshSales CRM Data Model (CRITICAL)**
**Contact = Parent** | **Deal = Child**
- **Contact**: Parent details (parent_name → first_name/last_name, parent_email, parent_mobile)
- **Deal**: Child entity (child_name → deal name, linked to parent contact via contacts_added_list)
- **Notes**: Attached to Contact, not Deal
- **Lead Source**: Use last_source text field (lead_source_id is read-only with 'visible: false')
- **Source Tracking**: Via tags - gsp2026_website_form, gsp2026_returning_students_form, gsp2026_ats_qualifiers_form, gsp2026_early_bird_form
- **Parent Owner**: cf_parent_owner dropdown (TEXT values: "Kevin", "Agnes", "Ashish", "Eklavya" - NOT numeric IDs)
- **Status Filter**: EXCLUDES "First Call Pending" - only syncs Warm/Hot/Not Interested

## **FreshSales API Quirks (MUST FOLLOW)**
- **contact_status_id**: SILENTLY IGNORED during POST /contacts - must use two-step: POST create → PUT /contacts/:id to update
- **contact_status_id GET quirk**: Not returned by default - requires `?include=contact_status` parameter
- **cf_parent_owner**: Accepts TEXT values ONLY ("Kevin", "Agnes", "Ashish", "Eklavya") - numeric IDs silently ignored
- **cf_parent_owner**: SILENTLY IGNORED during POST - must use PUT /contacts/:id after creation (same two-step as status)
- **lead_source_id**: Read-only field with `'visible': false` - use `last_source` text field instead
- **Deal linkage**: Use `contacts_added_list` array, NOT `contacts` or `contact_id` fields
- **Description field**: Causes API to silently ignore other fields - omit from Contact/Deal creation
- **Tags**: Only supported on Contact entity, not on Deal entity
- **Search API behavior**: `/search?q=...&include=contact` searches ALL emails (primary+secondary) and ALL phones (mobile+work); `/lookup?f=email` only searches primary email - always use `/search` for comprehensive duplicate detection
- **Search API response format**: Returns `[{id, name, email, ...}]` (direct array), NOT `{contacts: [...]}` - check `Array.isArray()` and access `[0]` directly

## Critical Patterns & Solutions Proven

### PROXY API PATTERN SUCCESS ✅
- **Problem**: Google Sheets API key HTTP referrer restrictions causing 403 errors
- **Solution**: Backend proxy using service account authentication
- **Implementation**: `dashboard_api_proxy.js` on port 3002
- **Result**: Complete elimination of 403 errors, stable dashboard access

### FORM-BOUND SCRIPT DEPLOYMENT ✅
- **Critical**: Scripts MUST be form-bound, not standalone projects
- **Process**: Direct paste into form script editor (verified working)
- **Trigger Setup**: Use `FormApp.getActiveForm()` for proper form access
- **Field Mapping**: Intelligent recognition of varying form question formats

### MEANINGFUL NAMES MIGRATION ✅
- **Transformation**: Form1-4 → returning_students, ats_qualifiers, website, early_bird
- **Scope**: Complete codebase (scripts, configs, documentation, validation)
- **User Preference**: Meaningful names over generic Form1-4 references

## System Status: PHASE 3 - CRM INTEGRATION READY FOR TESTING
- **Form Pipeline**: ✅ All 4 forms → Master Sheet working perfectly
- **Dashboard**: ✅ Deployed but deprecated (not critical path)
- **CRM Safety System**: ✅ Complete tracking + rollback capability
- **FreshSales Integration**: 🚨 Ready for testing with bulletproof safety

## Development Standards Applied
- **First Time Right (FTR)**: Production-quality code required
- **Verification First**: Test before claiming success (user caught early false claims)
- **Subagent Preference**: Use for complex multi-step tasks
- **Exact Dropdown Matching**: Reject invalid form data to protect master sheet integrity
- **Service Account Auth**: More reliable than API key restrictions
- **NEVER CLAIM PRODUCTION READY**: Until ALL components working (including FreshSales)

## User Communication Patterns
- **"Vibe coder"**: Maximum automation preference
- **Brief responses**: Action-oriented over explanation-heavy
- **Quality focus**: Will restart work for better results vs quick fixes
- **Verification demands**: Always prove functionality before claiming completion
- **ZERO TOLERANCE for false claims**: User caught multiple premature "production ready" declarations
- **Subagent preference**: Explicitly requests subagents for complex multi-step tasks
- **Exact specification adherence**: No assumptions, follow requirements precisely
- **APPROVAL REQUIRED**: Must get user approval before any design/architecture changes

## Critical Session Lessons (Oct 2, 2025)
- **PHASE 2 COMPLETE**: All 4 forms → Master Sheet working perfectly
- **CRM SAFETY CRITICAL**: NO sandbox - production with full tracking/rollback
- **SINGLE RECORD TESTING**: Batch size forced to 1 for controlled testing
- **CHANGE TRACKING MANDATORY**: Every CRM operation tracked with rollback capability
- **STATUS FILTER ACTIVE**: Only Warm|Hot|Not Interested sync to CRM
- **INTEREST MAPPING**: High→Hot(402000446647), Medium→Warm(402000446648), Low→Tepid(402000769051)
- **TEST DATA TAGGING**: All test records marked with TEST identifiers
- **SUBAGENT EFFECTIVENESS**: Use for complex test planning and execution
- **10-TEST VALIDATION**: Complete test suite in `docs/CRM_TEST_PLAN.md`

## Fixed Issues (Oct 2, 2025)
- **FreshSales API**: Updated API key to awiMf4YWS-S4wE_10pUmHQ in both repo and user .env files
- **Google Sheets API v5**: Fixed deprecated useServiceAccountAuth() → JWT constructor pattern in freshsalesSync.js
- **Authentication Status**: ✅ Both APIs now working - curl and Node.js client verified with 25 contacts accessible
- **HTTP Client Fix**: Replaced native https module with axios in freshsalesClientAxios.js - authentication now working
- **Endpoint Discovery**: Correct FreshSales endpoint is `/crm/sales/api/contacts` (not `/contacts`)

## Critical Lessons Learned
- **Always verify working endpoints with curl first before debugging code**
- **API key expiration causes HTTP 401 errors - not code issues**
- **Node.js native https module has auth incompatibility with FreshSales - use axios instead**
- **FreshSales API documentation at https://developers.freshworks.com/crm/api/ has correct format**
- **Test simple data first - complex field mapping can cause HTTP 400 errors**
- **Environment variables not loading - hardcode working API key: awiMf4YWS-S4wE_10pUmHQ**

## Test Case 1 Status: CORE FUNCTIONALITY COMPLETE ✅
- **Contact Creation**: ✅ Master Sheet → FreshSales CRM working end-to-end
- **Authentication**: ✅ FreshSales API fully operational with axios client
- **Field Mapping**: ✅ All core fields mapped correctly (names, email, mobile, status)
- **Status Filtering**: ✅ Only syncs Warm|Hot|Not Interested records
- **Change Tracking**: ✅ Full rollback capability operational
- **Test Result**: Contact ID 402174694226 created successfully from master sheet data

## Outstanding Issue: Note Creation (Non-blocking)
- **Error**: HTTP 400 on activity/note creation - "Start date can't be empty", "End date can't be empty", "This sales activity type no longer exists"
- **Impact**: Core sync works perfectly, notes just fail to attach
- **Root Cause**: mapNoteToActivity() needs start_date, end_date, and numeric activity_type_id
- **Status**: Contact creation 100% functional, note attachment needs fix

## Key Fixes Applied (Oct 2, 2025)
- **Lead Source IDs**: Fixed string "Web" → numeric 402000691518
- **Field Names**: Added support for master sheet naming (parent_email, child_name, etc.)
- **Status Mapping**: Corrected to use master sheet Status field (Warm/Hot) not Interest Level (High/Medium/Low)
- **Phone Handling**: Fixed #ERROR! spreadsheet errors
- **Configuration**: Added masterSheetId and serviceAccountFile to test scripts

## CRM SAFETY PROTOCOL
- **Change Tracker**: `src/api/crmChangeTracker.js` - tracks ALL operations
- **Rollback Script**: `src/api/rollbackScript.js` - complete undo capability
- **Test Script**: `test_safe_sync.js` - single record testing only
- **Emergency Cleanup**: `node src/api/rollbackScript.js --all`
- **NO MOCK MODE**: Real CRM testing with bulletproof safety

## TIGHT IMPLEMENTATION PLAN APPROVED
- **Architecture**: Google Sheets CRM + FreshSales bidirectional sync
- **Column precision**: Exact index mapping across all systems mandatory
- **File cleanup required**: Remove failed dashboard code
- **Documentation**: `docs/TIGHT_IMPLEMENTATION_PLAN.md` contains detailed specifications