  Complete FreshSales CRM Field List

  CONTACT FIELDS (Available for our Master Sheet mapping):

  Core Contact Information:

  - first_name - First name (text)
  - last_name - Last name (text)
  - emails - Emails (group field with Work/Personal/Other)
  - mobile_number - Mobile (text)
  - work_number - Work phone (text)
  - work_email - Work email (text)

  Status & Lifecycle:

  - contact_status_id - Status (dropdown) - KEY FIELD
    - New (402000446643), Contacted (402000446644), Interested (402000446645)
    - Hot (402000446647), Warm (402000446648), Tepid (402000769051)
    - Not Interested (402000446646), Cold (402000790072), etc.
  - lifecycle_stage_id - Lifecycle stage (Lead/SQL/Customer)

  Geographic & Contact Info:

  - country - Geography (text) - Maps to our Geography field
  - address, city, state, zipcode - Address fields
  - time_zone - Time zone (dropdown)

  Lead Source & Campaign:

  - lead_source_id - Source (dropdown)
    - Web (402000691518), Email (402000691520), Phone (402000691521), etc.
  - first_source, last_source, latest_source - Source tracking
  - first_campaign, last_campaign, latest_campaign - Campaign tracking
  - first_medium, last_medium, latest_medium - Medium tracking

  Custom Fields (Business-Specific):

  - cf_child_grade - Child Grade (text) - Direct mapping available
  - cf_program - Program (text) - Direct mapping available
  - cf_parent_owner - Parent Owner (dropdown: Agnes/Ashish/Eklavya/Kevin)
  - cf_cust_type - Customer Type (Past_Participant/NA)
  - cf_your_message1 - Your Message (textarea) - NOTES FIELD!
  - cf_webinar_attendance - Webinar Attendance (radio)
  - cf_payment_confimation - Payment Confirmation (dropdown)
  - cf_dnd - DND status (YES/NO)
  - cf_insider_circle_2025 - Insider Circle 2025 (Yes/No)

  Activity & Engagement:

  - tags - Tags (auto_complete, multiple) - Perfect for categorization
  - last_contacted - Last contacted time (date)
  - last_contacted_mode - Last contacted mode (email/call/chat/etc.)
  - last_contacted_sales_activity_mode - Last activity type
  - subscription_status - Email subscription status
  - whatsapp_subscription_status - WhatsApp subscription
  - sms_subscription_status - SMS subscription

  ---
  DEAL/PIPELINE FIELDS (For future pipeline management):

  Deal Basics:

  - name - Full Name (text, required)
  - amount - Deal value (number, required)
  - deal_pipeline_id - Child Pipeline (dropdown)
    - Child Lifecycle (402000049629) - MAIN PIPELINE
  - deal_stage_id - Child Stage (dropdown) - PIPELINE STATUS
    - New (402000347606), GTS Register (402000347607)
    - GTS/ATS Qualified (402000347608), Returning Student (402001270637)
    - Won (402000347611), Lost (402000347612)

  Deal Custom Fields:

  - cf_child_school - Child School (text)
  - cf_city - City (text)
  - cf_grade_as_of_program_edition - Grade (dropdown 1-13)
  - cf_chosen_courses - Chosen Courses (text)
  - cf_current_grade - Current Grade (dropdown)
  - cf_child_owner - Child Owner (Agnes/Ashish/Eklavya/Kevin)
  - recent_note - Recent Note (textarea) - ANOTHER NOTES FIELD!

  ---
  KEY FINDINGS FOR OUR MAPPING:

  ✅ NOTES FIELDS IDENTIFIED:

  1. cf_your_message1 (Contact) - "Your Message" textarea
  2. recent_note (Deal) - "Recent Note" textarea
  3. Activities/Notes - Separate endpoint for activities

  ✅ PIPELINE STATUS AVAILABLE:

  - Contact Level: contact_status_id (Hot/Warm/Tepid/etc.)
  - Deal Level: deal_stage_id (New → GTS Register → Qualified → Won/Lost)

  ✅ ENHANCED MAPPING OPPORTUNITIES:

  - Parent Owner: Direct mapping to cf_parent_owner
  - Child Grade: Direct mapping to cf_child_grade
  - Program: Direct mapping to cf_program
  - Notes/Messages: Map to cf_your_message1
  - Tags: Perfect for source tracking and categorization
  - Geography: Direct mapping to country

  ✅ MISSING FROM CURRENT MAPPER:

  - Notes field mapping - We should map form messages to cf_your_message1
  - Parent Owner assignment - Map to cf_parent_owner
  - Tags utilization - Better categorization with source tags
  - Deal creation - Pipeline management for qualified leads