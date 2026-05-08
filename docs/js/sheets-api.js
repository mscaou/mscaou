// MSC Meeting - Google Sheets API Integration

class SheetsAPI {
    constructor() {
        this.baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
        this.isInitialized = false;
        this._meetingTypesCache = null;
    }

    async init() {
        if (!CONFIG.GOOGLE_API_KEY || CONFIG.GOOGLE_API_KEY === 'YOUR_GOOGLE_API_KEY_HERE') {
            console.error('Google API Key not configured');
            return false;
        }
        if (!CONFIG.GOOGLE_SHEET_ID || CONFIG.GOOGLE_SHEET_ID === 'YOUR_GOOGLE_SHEET_ID_HERE') {
            console.error('Google Sheet ID not configured');
            return false;
        }
        this.isInitialized = true;
        return true;
    }

    // ========================================
    // MEETING TYPES
    // ========================================

    // Fetch all meeting types from the MeetingTypes sheet
    // Columns: A=ID, B=Name, C=Icon, D=Description, E=HostEmails, F=Color
    async getMeetingTypes(forceRefresh = false) {
        if (this._meetingTypesCache && !forceRefresh) {
            return this._meetingTypesCache;
        }

        try {
            const range = `${CONFIG.MEETING_TYPES_SHEET}!A:F`;
            const url = `${this.baseUrl}/${CONFIG.GOOGLE_SHEET_ID}/values/${range}?key=${CONFIG.GOOGLE_API_KEY}`;

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch meeting types: ${response.statusText}`);
            }

            const data = await response.json();
            const types = this.parseMeetingTypes(data.values || []);
            this._meetingTypesCache = types;
            return types;
        } catch (error) {
            console.error('Error fetching meeting types:', error);
            // Return empty array on error — pages will show "no types" message
            return [];
        }
    }

    // Parse meeting types from sheet rows
    parseMeetingTypes(rows) {
        if (rows.length < 2) return [];

        const types = [];
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row[0]) continue;

            types.push({
                id: (row[0] || '').toLowerCase().trim(),
                name: row[1] || '',
                icon: row[2] || '📅',
                description: row[3] || '',
                hostEmails: row[4] || '',
                color: row[5] || '#2563eb'
            });
        }
        return types;
    }

    // Get a single meeting type by ID
    async getMeetingTypeById(typeId) {
        const types = await this.getMeetingTypes();
        return types.find(t => t.id === typeId) || null;
    }

    // Get meeting types as a map { id: typeObj }
    async getMeetingTypesMap() {
        const types = await this.getMeetingTypes();
        const map = {};
        types.forEach(t => { map[t.id] = t; });
        return map;
    }

    // Add a new meeting type via Apps Script
    async addMeetingType(typeData) {
        return this._postToAppsScript({
            action: 'addMeetingType',
            ...typeData
        });
    }

    // Update an existing meeting type via Apps Script
    async updateMeetingType(typeId, typeData) {
        return this._postToAppsScript({
            action: 'updateMeetingType',
            typeId,
            ...typeData
        });
    }

    // Delete a meeting type via Apps Script
    async deleteMeetingType(typeId) {
        return this._postToAppsScript({
            action: 'deleteMeetingType',
            typeId
        });
    }

    // Clear meeting types cache (call after add/update/delete)
    clearMeetingTypesCache() {
        this._meetingTypesCache = null;
    }

    // ========================================
    // SLOTS
    // ========================================

    async getSlots(meetingType) {
        try {
            const range = `${CONFIG.SLOTS_SHEET}!A:J`;
            const url = `${this.baseUrl}/${CONFIG.GOOGLE_SHEET_ID}/values/${range}?key=${CONFIG.GOOGLE_API_KEY}`;

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch slots: ${response.statusText}`);
            }

            const data = await response.json();
            let slots = this.parseSlots(data.values || []);

            if (meetingType) {
                slots = slots.filter(slot =>
                    slot.meetingType && slot.meetingType.toLowerCase() === meetingType.toLowerCase()
                );
            }

            return slots;
        } catch (error) {
            console.error('Error fetching slots:', error);
            throw error;
        }
    }

    // Columns: A=ID, B=Date, C=Time, D=Duration, E=Status, F=CandidateName, G=CandidateEmail, H=Notes, I=BookedAt, J=MeetingType
    parseSlots(rows) {
        if (rows.length < 2) return [];

        const slots = [];
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row[0]) continue;

            slots.push({
                id: row[0] || '',
                date: row[1] || '',
                time: row[2] || '',
                duration: parseInt(row[3]) || CONFIG.DEFAULT_DURATION,
                status: (row[4] || 'available').toLowerCase(),
                candidateName: row[5] || '',
                candidateEmail: row[6] || '',
                notes: row[7] || '',
                bookedAt: row[8] || '',
                meetingType: (row[9] || '').toLowerCase(),
                rowIndex: i + 1
            });
        }
        return slots;
    }

    async getAvailableSlots(meetingType) {
        const slots = await this.getSlots(meetingType);
        return slots.filter(slot => slot.status === 'available');
    }

    async getBookedSlots(meetingType) {
        const slots = await this.getSlots(meetingType);
        return slots.filter(slot => slot.status === 'booked');
    }

    async bookSlot(slotId, candidateData) {
        try {
            const slots = await this.getSlots();
            const slot = slots.find(s => s.id === slotId);

            if (!slot) throw new Error('Slot not found');
            if (slot.status !== 'available') throw new Error('Slot is no longer available');

            const bookedAt = new Date().toISOString();
            const bookingData = {
                slotId,
                ...candidateData,
                bookedAt,
                meetingType: candidateData.meetingType || slot.meetingType || ''
            };

            await this._postToAppsScript({ action: 'bookSlot', ...bookingData });

            return { success: true, slot, booking: bookingData };
        } catch (error) {
            console.error('Error booking slot:', error);
            throw error;
        }
    }

    async addSlot(slotData) {
        return this._postToAppsScript({ action: 'addSlot', ...slotData });
    }

    async deleteSlot(slotId) {
        return this._postToAppsScript({ action: 'deleteSlot', slotId });
    }

    async updateSlot(slotId, slotData) {
        return this._postToAppsScript({ action: 'updateSlot', slotId, ...slotData });
    }

    // ========================================
    // CONFIG
    // ========================================

    async getConfig() {
        try {
            const range = `${CONFIG.CONFIG_SHEET}!A:B`;
            const url = `${this.baseUrl}/${CONFIG.GOOGLE_SHEET_ID}/values/${range}?key=${CONFIG.GOOGLE_API_KEY}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch config: ${response.statusText}`);

            const data = await response.json();
            const config = {};
            (data.values || []).forEach(row => {
                if (row[0]) config[row[0]] = row[1] || '';
            });
            return config;
        } catch (error) {
            console.error('Error fetching config:', error);
            return {};
        }
    }

    async verifyPassword(password) {
        const config = await this.getConfig();
        return config.AdminPassword === password;
    }

    // ========================================
    // HELPERS
    // ========================================

    async _postToAppsScript(data) {
        const webAppUrl = CONFIG.APPS_SCRIPT_URL;

        if (!webAppUrl || webAppUrl === 'YOUR_APPS_SCRIPT_URL_HERE') {
            console.warn('Apps Script URL not configured');
            return { success: true, demo: true };
        }

        await fetch(webAppUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        return { success: true };
    }
}

const sheetsAPI = new SheetsAPI();
