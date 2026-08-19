# Pre-Sales Monitoring System - User Manual

**Status: USER TESTING PHASE - Please report all issues on Slack notification channel**

---

## System Overview

**Data Flow:** Google Forms → Master Sheet → FreshSales CRM (automatic sync every 30 minutes at :02 and :32)

**Master Sheet:** https://docs.google.com/spreadsheets/d/1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ

---

## Form Submission Sources

| Form | Editor URL | Public URL |
|------|-----------|------------|
| **Returning Students** | [Edit](https://docs.google.com/forms/d/1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA/edit) | [Submit](https://docs.google.com/forms/d/e/1FAIpQLSc3AJbrG1tifHuUj_pHQwPQhNM0IMnBlXLJd_Gf2BmJ1qGsBA/viewform) |
| **ATS Qualifiers** | [Edit](https://docs.google.com/forms/d/1gGyfmy4NmEgAdZrbex0ffoqGlI1B_LuRUfzvQeOCHCQ/edit) | [Submit](https://docs.google.com/forms/d/e/1FAIpQLSdraBQF7TmbK6d5P0QZF58VOQsaW8oeGhnciaZLSJ8Mu3uigg/viewform) |
| **Website Form** | [Edit](https://docs.google.com/forms/d/1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg/edit) | [Submit](https://docs.google.com/forms/d/e/1FAIpQLScAEQXMJgbxWEl40xR3X1QgrvVZRphlbK4wzWXOnMxukAiXMw/viewform) |
| **Early Bird** | [Edit](https://docs.google.com/forms/d/1IJVMLXOThuQE8WVI4bYiruJrTyxsznTomotkS2rfyYY/edit) | [Submit](https://docs.google.com/forms/d/e/1FAIpQLScoaWU3LuM5os8ebZrC65S3FWvw7wltfVDvLP_2lbNcxKG6eA/viewform) |

---

## Master Sheet Operations

### Status Assignment (Controls CRM Sync)

| Status | Sync Behavior |
|--------|---------------|
| **Hot** | Syncs to CRM immediately (high priority) |
| **Warm** | Syncs to CRM immediately (medium priority) |
| **Not Interested** | Syncs to CRM (marked inactive) |
| **First Call Pending** | Does NOT sync - stays in Master Sheet only |

### Owner Assignment

Use **assigned_owner** column to assign contacts: **Unassigned**, **Kevin**, **Agnes**, **Eklavya**, **Ashish**

### Key Auto-Populated Columns

- **duplicate_flag**: Set by Google Apps Script when duplicate exists in Master Sheet
- **new_existing**: Set by sync ("New Parent" or "Existing Parent" based on CRM check)
- **crm_contact_link**: FreshSales contact URL (populated after first sync)
- **last_synced_at**: Last successful sync timestamp (IST timezone)
- **Light red row background**: Indicates row has been synced to CRM

---

## Sync Process (Runs Every 30 Minutes at :02 and :32)

**Step 1: Duplicate Detection** - Checks if parent email/mobile exists in CRM, updates new_existing and crm_contact_link

**Step 2: Forward Sync to CRM**

**If New Parent:**
- Creates Parent Contact in FreshSales with status and owner
- Creates Child Deal linked to parent
- Adds notes to contact
- Updates Master Sheet with CRM link and light red background

**If Existing Parent:**
- Does NOT create new Contact
- Adds secondary email/mobile if different from existing (additive update)
- Creates new Child Deal (sibling support)
- Updates Master Sheet with existing CRM link

**Step 3: Status Verification** - Runs at :04/:34 to verify contact status set correctly

---

## What Gets Created in FreshSales CRM

**Parent Contact:** name (from parent_name), email (parent_email), mobile (parent_mobile), status (Hot/Warm/Not Interested), owner, tags (form source)

**Child Deal:** child_name linked to parent contact

**Notes:** Submission timestamp, source form, additional notes

---

## Duplicate Handling

**Within Master Sheet:** Google Apps Script sets duplicate_flag = "Yes" when email/mobile already exists in sheet

**With CRM:** Sync system finds existing parent by email/mobile, sets new_existing = "Existing Parent", performs additive update (adds secondary email/mobile without overwriting), creates new Child Deal for sibling

---

## Notifications

**Slack:** Posted to team channel after every sync at :02/:32
- J1: Duplicate detection results
- J2: Forward sync stats (processed/created/updated/skipped/errors) with details of each created contact (name, CRM link, status, owner)
- J3: Status verification schedule

**Email:** Sent to rajesh@genwise.in, eklavya@genwise.in, gifted@genwise.in
- When: New form submissions arrive
- What: Individual lead details for immediate follow-up
- Note: Sync reports sent only via Slack

---

## Valid Dropdown Values (Use Exact Values)

**Status:** First Call Pending, Warm, Hot, Not Interested
**assigned_owner:** Unassigned, Kevin, Agnes, Eklavya, Ashish
**duplicate_flag:** Yes, No
**source_tag:** returning_students, ats_qualifiers, website, early_bird

---

## User Testing Instructions

**Post on Slack notification channel:**
- Description of issue
- Screenshot if applicable
- Timestamp
- Master Sheet row number
- Expected vs actual behavior

**Common Test Scenarios:** Multiple children per parent (siblings), parent with multiple emails/phones, status changes from First Call Pending → Warm/Hot, owner reassignments

---

## Quick Troubleshooting

**Record not syncing?** Check: (1) Status is Warm/Hot/Not Interested, (2) parent_email and child_name filled, (3) Wait 30 min for next sync, (4) Check Slack for errors

**CRM link missing?** Check: (1) last_synced_at timestamp exists, (2) No errors in Slack, (3) Refresh sheet

**Duplicate not detected?** Email/mobile must exactly match existing record (case-insensitive), wait one sync cycle for new_existing update

---

**Contact:** Rajesh (rajesh@genwise.in) for urgent issues or questions
