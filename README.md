# MSC Meeting Scheduler

A professional meeting slot booking system for GitHub Pages with multi-host support, Google Sheets backend, and email notifications.

![Status](https://img.shields.io/badge/status-ready-green)

## Features

✅ **Candidate Booking Page** - Clean interface to select and book available slots  
✅ **Admin Dashboard** - Manage time slots, view bookings, access Google Sheet  
✅ **Multi-Host Support** - Notify all hosts when a slot is booked  
✅ **Email Notifications** - Confirmation emails for candidates, alerts for hosts  
✅ **Google Sheets Backend** - Easy to manage, view all data in one place  
✅ **Mobile Responsive** - Works on all devices  

## Quick Links

- **Booking Page**: `booking.html` 
- **Admin Dashboard**: `admin.html`
- **Setup Guide**: [SETUP.md](SETUP.md)

## Tech Stack

- HTML/CSS/JavaScript (Vanilla)
- Google Sheets (Database)
- Google Apps Script (Backend API)
- EmailJS (Email notifications)
- GitHub Pages (Hosting)

## Setup

See [SETUP.md](SETUP.md) for complete setup instructions.

### Quick Overview:
1. Create a Google Sheet with Slots and Config sheets
2. Set up Google Apps Script for write operations
3. Create EmailJS account and templates
4. Update `js/config.js` with your credentials
5. Deploy to GitHub Pages

## Project Structure

```
MSC Meeting/
├── booking.html        # Candidate booking page
├── admin.html          # Admin dashboard
├── css/
│   └── styles.css      # Professional styling
├── js/
│   ├── config.js       # Configuration (API keys, etc.)
│   ├── sheets-api.js   # Google Sheets integration
│   ├── email.js        # EmailJS integration
│   ├── booking.js      # Booking page logic
│   └── admin.js        # Admin dashboard logic
├── SETUP.md            # Setup instructions
└── README.md           # This file
```

## License

MIT License
