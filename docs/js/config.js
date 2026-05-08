// MSC Meeting - Configuration

const CONFIG = {
    // ============================================
    // GOOGLE SHEETS CONFIGURATION
    // ============================================
    GOOGLE_API_KEY: 'AIzaSyDOdMl7ideCwHs4xF8wyACIDCxkITL1ub8',
    GOOGLE_SHEET_ID: '1K77_ChWkiVwwZ4VwZIAs-yr4dqY7HIk9NAsZR1Jggdk',
    SLOTS_SHEET: 'Slots',
    CONFIG_SHEET: 'Config',
    MEETING_TYPES_SHEET: 'MeetingTypes',
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzdFnhlHP6hDWDTtHPuVkEy70GFuNJlodan09VWMQ9OyJ-SHzmP6tw-xcPg2Pc7w0Aigw/exec',

    // ============================================
    // EMAILJS CONFIGURATION
    // ============================================
    EMAILJS_PUBLIC_KEY: 'vpEXBalcm--T7huOE',
    EMAILJS_SERVICE_ID: 'service_6qy1lqg',
    EMAILJS_TEMPLATE_CANDIDATE: 'candidate_confirmation',
    EMAILJS_TEMPLATE_HOST: 'host_notification',

    // ============================================
    // APP SETTINGS
    // ============================================
    APP_NAME: 'MSC Meeting Scheduler',
    APP_SUBTITLE: 'Book your interview slot',
    CONTACT_EMAIL: 'mansourengy63@gmail.com',
    CONTACT_PHONE: '+201204913444',
    CONTACT_NOTE: 'Having trouble booking? Contact us and we\'ll help you find a slot.',

    // Fallback host emails (used when no meeting type matches)
    HOST_EMAILS: 'moazeldegwy@gmail.com, mansourengy63@gmail.com',

    DEFAULT_DURATION: 30,

    // Default color palette for new meeting types
    DEFAULT_COLORS: [
        { color: '#8b5cf6', name: 'Purple' },
        { color: '#0ea5e9', name: 'Blue' },
        { color: '#10b981', name: 'Green' },
        { color: '#f59e0b', name: 'Amber' },
        { color: '#ef4444', name: 'Red' },
        { color: '#ec4899', name: 'Pink' },
        { color: '#6366f1', name: 'Indigo' },
        { color: '#14b8a6', name: 'Teal' }
    ],

    get SHEET_URL() {
        return `https://docs.google.com/spreadsheets/d/${this.GOOGLE_SHEET_ID}/edit`;
    }
};

// Freeze config
Object.freeze(CONFIG);
Object.freeze(CONFIG.DEFAULT_COLORS);
