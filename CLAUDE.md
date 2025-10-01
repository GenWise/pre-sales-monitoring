# Pre-Sales Monitoring System - Critical Requirements

## Project Configuration
- **Master Sheet ID**: `1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ`
- **Service Account**: `sheetspython@sheets-and-python-340711.iam.gserviceaccount.com`
- **Dashboard URL**: https://dashboard.giftedworld.org
- **Dashboard Directory**: `/home/u191176295/domains/giftedworld.org/public_html/dashboard`
- **Google Sheets API Key**: Set via environment variable `GOOGLE_SHEETS_API_KEY`

## Critical Data Validation Rules

### Master Sheet Dropdown Values (MUST MATCH EXACTLY)
- **Status**: New Parent, Contacted, Follow-up, Enrolled, Not Interested
- **Interest Level**: High, Medium, Low
- **Source Tag**: returning_students, ats_qualifiers, website, early_bird
- **Duplicate Flag**: Yes, No
- **Assigned Owner**: Unassigned, Rajesh, Team Member

### Form IDs
- returning_students: `1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA`
- ats_qualifiers: `1gGyfmy4NmEgAdZrbex0ffoqGlI1B_LuRUfzvQeOCHCQ`
- website: `1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg`
- early_bird: `1IJVMLXOThuQE8WVI4bYiruJrTyxsznTomotkS2rfyYY`

## API Keys & Credentials
- **FreshSales API**: `[REDACTED - Set in .env file]`
- **FreshSales View ID**: `402002860065` (All Contacts)
- **Slack Webhook**: `[REDACTED - Set in .env file]`

## Notification Recipients
- **Development**: rajesh@genwise.in
- **Production**: gifted@genwise.in, eklavya@genwise.in, ashish@genwise.in

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

## System Status: DASHBOARD DEPLOYED - CRITICAL ISSUES REMAIN ⚠️
- **Dashboard**: https://dashboard.giftedworld.org ✅ (deployed correctly)
- **API endpoints**: Working with real data ✅
- **Form submission pipeline**: BROKEN - new submissions not appearing ❌
- **FreshSales integration**: NOT STARTED ❌

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

## Critical Session Lessons (Oct 1, 2025)
- **WEBHOOK DEPLOYMENT STUCK**: Created webhook.php with composer deps but server has no vendor/autoload
- **SUCCESSFUL LOCAL SETUP**: webhook server + dashboard proxy working on localhost with service account
- **PRODUCTION WEBHOOK BLOCKING**: Google Apps Scripts calling dashboard.giftedworld.org/webhook.php → 404
- **PHP JWT SUCCESS**: leads.php proves service account auth works without composer dependencies
- **USER FRUSTRATION PATTERN**: Asked for Gemini/ChatGPT help when stuck on PHP implementation
- **THREAD CLUTTER INTOLERANCE**: User dislikes doing everything in main thread, prefers subagents
- **SUBAGENT PREFERENCE STRONG**: Explicitly requested subagents for complex multi-step tasks