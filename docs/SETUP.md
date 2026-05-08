# MSC Meeting Scheduler - Setup Guide

This guide will walk you through setting up the MSC Meeting Scheduler for GitHub Pages.

## Table of Contents
1. [Google Sheet Setup](#1-google-sheet-setup)
2. [Google Apps Script Setup](#2-google-apps-script-setup)
3. [EmailJS Setup](#3-emailjs-setup)
4. [Configuration](#4-configuration)
5. [GitHub Pages Deployment](#5-github-pages-deployment)

---

## 1. Google Sheet Setup

### Step 1: Create a New Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new blank spreadsheet
3. Name it **"MSC Meeting Slots"**

### Step 2: Create the "Slots" Sheet

The first sheet should be named **"Slots"** (rename "Sheet1" if needed).

Add these headers in row 1:

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| SlotID | Date | Time | Duration | Status | CandidateName | CandidateEmail | Notes | BookedAt |

**Example data (add a few test slots):**

| SlotID | Date | Time | Duration | Status | CandidateName | CandidateEmail | Notes | BookedAt |
|--------|------|------|----------|--------|---------------|----------------|-------|----------|
| slot_001 | 2026-02-10 | 09:00 | 30 | available | | | | |
| slot_002 | 2026-02-10 | 09:30 | 30 | available | | | | |
| slot_003 | 2026-02-10 | 10:00 | 30 | available | | | | |

### Step 3: Create the "Config" Sheet

Add a second sheet named **"Config"** with these settings:

| A | B |
|---|---|
| AdminPassword | your-secure-password |
| HostEmails | host1@email.com, host2@email.com |
| ContactEmail | contact@email.com |
| ContactPhone | +1234567890 |

### Step 4: Get Your Sheet ID

1. Look at your spreadsheet URL: `https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit`
2. Copy the **SHEET_ID_HERE** part - you'll need this later

### Step 5: Make the Sheet Public (Read-Only)

1. Click **Share** button (top right)
2. Click **Change to anyone with the link**
3. Set permission to **Viewer**
4. Click **Done**

---

## 2. Google Apps Script Setup

We need a Google Apps Script to handle write operations (booking slots, adding/editing/deleting slots).

### Step 1: Open Apps Script

1. In your Google Sheet, go to **Extensions → Apps Script**
2. Delete any existing code in `Code.gs`

### Step 2: Add the Script Code

Paste this code:

```javascript
// MSC Meeting Scheduler - Apps Script Backend

// Your sheet ID (same as the one in your URL)
const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const SLOTS_SHEET = 'Slots';
const CONFIG_SHEET = 'Config';

// Handle POST requests
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    let result;
    
    switch(data.action) {
      case 'bookSlot':
        result = bookSlot(data);
        break;
      case 'addSlot':
        result = addSlot(data);
        break;
      case 'updateSlot':
        result = updateSlot(data);
        break;
      case 'deleteSlot':
        result = deleteSlot(data);
        break;
      default:
        result = { success: false, error: 'Unknown action' };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle GET requests (for testing)
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    message: 'MSC Meeting Scheduler API is running'
  })).setMimeType(ContentService.MimeType.JSON);
}

// Book a slot
function bookSlot(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SLOTS_SHEET);
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  // Find the slot row
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === data.slotId) {
      // Check if still available
      if (values[i][4].toLowerCase() !== 'available') {
        return { success: false, error: 'Slot is no longer available' };
      }
      
      // Update the row
      const row = i + 1;
      sheet.getRange(row, 5).setValue('booked');           // Status
      sheet.getRange(row, 6).setValue(data.name);          // CandidateName
      sheet.getRange(row, 7).setValue(data.email);         // CandidateEmail
      sheet.getRange(row, 8).setValue(data.notes || '');   // Notes
      sheet.getRange(row, 9).setValue(new Date().toISOString()); // BookedAt
      
      return { success: true, message: 'Slot booked successfully' };
    }
  }
  
  return { success: false, error: 'Slot not found' };
}

// Add a new slot
function addSlot(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SLOTS_SHEET);
  
  const newRow = [
    data.id || 'slot_' + Date.now(),
    data.date,
    data.time,
    data.duration || 30,
    'available',
    '', // CandidateName
    '', // CandidateEmail
    '', // Notes
    ''  // BookedAt
  ];
  
  sheet.appendRow(newRow);
  return { success: true, message: 'Slot added successfully' };
}

// Update a slot
function updateSlot(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SLOTS_SHEET);
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === data.slotId) {
      const row = i + 1;
      if (data.date) sheet.getRange(row, 2).setValue(data.date);
      if (data.time) sheet.getRange(row, 3).setValue(data.time);
      if (data.duration) sheet.getRange(row, 4).setValue(data.duration);
      
      return { success: true, message: 'Slot updated successfully' };
    }
  }
  
  return { success: false, error: 'Slot not found' };
}

// Delete a slot
function deleteSlot(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SLOTS_SHEET);
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === data.slotId) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Slot deleted successfully' };
    }
  }
  
  return { success: false, error: 'Slot not found' };
}
```

### Step 3: Deploy as Web App

1. Click **Deploy → New deployment**
2. Click the gear icon next to "Select type" → choose **Web app**
3. Configure:
   - **Description**: MSC Meeting API
   - **Execute as**: Me
   - **Who has access**: Anyone
4. Click **Deploy**
5. Authorize the app when prompted
6. **Copy the Web app URL** - you'll need this for configuration!

> ⚠️ The URL looks like: `https://script.google.com/macros/s/ABC123.../exec`

---

## 3. EmailJS Setup

### Step 1: Create EmailJS Account

1. Go to [EmailJS.com](https://www.emailjs.com/) and sign up (free)
2. Verify your email

### Step 2: Add an Email Service

1. Go to **Email Services** in your dashboard
2. Click **Add New Service**
3. Choose your email provider (Gmail recommended)
4. Follow the connection instructions
5. Note down your **Service ID** (e.g., `service_abc123`)

### Step 3: Create Email Templates

You need **two templates**:

#### Template 1: Candidate Confirmation

1. Go to **Email Templates → Create New Template**
2. Name it: `candidate_confirmation`
3. Use this template:

**Subject:**
```
Meeting Confirmed - {{meeting_date}} at {{meeting_time}}
```

**Content:**
```html
Hi {{to_name}},

Your meeting has been successfully booked!

📅 Date: {{meeting_date}}
🕐 Time: {{meeting_time}}
⏱️ Duration: {{meeting_duration}}

Notes: {{notes}}

If you need to reschedule, please contact us at {{contact_email}}.

Best regards,
{{app_name}}
```

4. Save and note the **Template ID**

#### Template 2: Host Notification

1. Create another template named: `host_notification`

**Subject:**
```
New Meeting Booked - {{candidate_name}} on {{meeting_date}}
```

**Content:**
```html
A new meeting has been booked!

👤 Candidate: {{candidate_name}}
📧 Email: {{candidate_email}}
📅 Date: {{meeting_date}}
🕐 Time: {{meeting_time}}
⏱️ Duration: {{meeting_duration}}

Notes: {{notes}}

Booked at: {{booked_at}}

View all bookings: {{sheet_url}}
```

2. Save and note the **Template ID**

### Step 4: Get Your Public Key

1. Go to **Account → General**
2. Copy your **Public Key**

---

## 4. Configuration

Open `js/config.js` and update these values:

```javascript
const CONFIG = {
    // Google Sheets
    GOOGLE_API_KEY: 'YOUR_GOOGLE_API_KEY_HERE',  // From Google Cloud Console
    GOOGLE_SHEET_ID: 'YOUR_SHEET_ID_FROM_URL',
    
    // Apps Script Web App URL
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
    
    // EmailJS
    EMAILJS_PUBLIC_KEY: 'YOUR_EMAILJS_PUBLIC_KEY',
    EMAILJS_SERVICE_ID: 'YOUR_SERVICE_ID',
    EMAILJS_TEMPLATE_CANDIDATE: 'YOUR_CANDIDATE_TEMPLATE_ID',
    EMAILJS_TEMPLATE_HOST: 'YOUR_HOST_TEMPLATE_ID',
    
    // App Settings
    CONTACT_EMAIL: 'your-email@example.com',
    CONTACT_PHONE: '+1234567890',
    HOST_EMAILS: 'host1@email.com, host2@email.com',
    
    // ... rest of config
};
```

### Getting a Google API Key (for reading sheets)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable **Google Sheets API**
4. Go to **Credentials → Create Credentials → API Key**
5. Copy the API key
6. (Optional) Restrict the key to Sheets API only

---

## 5. GitHub Pages Deployment

### Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com) and create a new repository
2. Name it something like `msc-meeting-scheduler`

### Step 2: Push Your Code

```bash
cd "MSC Meeting"
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/msc-meeting-scheduler.git
git push -u origin main
```

### Step 3: Enable GitHub Pages

1. Go to your repository **Settings**
2. Click **Pages** in the sidebar
3. Under "Source", select **main** branch
4. Click **Save**
5. Your site will be live at: `https://YOUR_USERNAME.github.io/msc-meeting-scheduler/`

---

## 🎉 You're Done!

Your meeting scheduler is now live!

- **Booking Page**: `https://YOUR_USERNAME.github.io/msc-meeting-scheduler/`
- **Admin Dashboard**: `https://YOUR_USERNAME.github.io/msc-meeting-scheduler/admin.html`

### Test It:
1. Open the booking page
2. Verify slots load from your Google Sheet
3. Book a test slot
4. Check that emails are sent
5. Login to admin and manage slots

---

## Troubleshooting

### Slots not loading?
- Check that the Google Sheet is shared as "Anyone with the link"
- Verify the Sheet ID in config.js
- Check browser console for errors

### Emails not sending?
- Verify EmailJS credentials
- Check EmailJS dashboard for logs
- Ensure templates have correct variable names

### Can't book/edit slots?
- Make sure Apps Script is deployed correctly
- Check the Apps Script URL in config.js
- Test the Apps Script URL in browser (should return status: ok)
