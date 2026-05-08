// MSC Meeting - EmailJS Integration

class EmailService {
    constructor() {
        this.isInitialized = false;
    }

    init() {
        if (!CONFIG.EMAILJS_PUBLIC_KEY || CONFIG.EMAILJS_PUBLIC_KEY === 'YOUR_EMAILJS_PUBLIC_KEY_HERE') {
            console.warn('EmailJS not configured - emails will not be sent');
            return false;
        }

        try {
            emailjs.init(CONFIG.EMAILJS_PUBLIC_KEY);
            this.isInitialized = true;
            console.log('EmailJS initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize EmailJS:', error);
            return false;
        }
    }

    // Send confirmation email to candidate
    async sendCandidateConfirmation(booking) {
        if (!this.isInitialized) return { success: false, reason: 'not_initialized' };

        try {
            const templateParams = {
                to_name: booking.candidateName,
                to_email: booking.candidateEmail,
                meeting_date: this.formatDate(booking.date),
                meeting_time: booking.time,
                meeting_duration: booking.duration + ' minutes',
                meeting_type: booking.meetingTypeName || 'Interview',
                notes: booking.notes || 'No additional notes',
                app_name: CONFIG.APP_NAME,
                contact_email: CONFIG.CONTACT_EMAIL
            };

            const response = await emailjs.send(
                CONFIG.EMAILJS_SERVICE_ID,
                CONFIG.EMAILJS_TEMPLATE_CANDIDATE,
                templateParams
            );

            console.log('Candidate confirmation email sent:', response);
            return { success: true, response };
        } catch (error) {
            console.error('Failed to send candidate email:', error);
            return { success: false, error };
        }
    }

    // Send notification ONLY to the host(s) for this booking's meeting type
    // booking.hostEmails is set by the booking page from the fetched meeting type
    async sendHostNotification(booking) {
        if (!this.isInitialized) return { success: false, reason: 'not_initialized' };

        try {
            // Use the host emails passed in the booking (fetched from MeetingTypes sheet)
            const hostEmailStr = booking.hostEmails || CONFIG.HOST_EMAILS;
            const hostEmails = hostEmailStr.split(',').map(e => e.trim()).filter(e => e);

            if (hostEmails.length === 0) {
                console.warn('No host emails for this booking');
                return { success: false, reason: 'no_hosts' };
            }

            const templateParams = {
                to_email: hostEmails.join(', '),
                candidate_name: booking.candidateName,
                candidate_email: booking.candidateEmail,
                meeting_date: this.formatDate(booking.date),
                meeting_time: booking.time,
                meeting_duration: booking.duration + ' minutes',
                meeting_type: booking.meetingTypeName || 'Interview',
                notes: booking.notes || 'No additional notes',
                booked_at: new Date().toLocaleString(),
                app_name: CONFIG.APP_NAME,
                sheet_url: CONFIG.SHEET_URL
            };

            const response = await emailjs.send(
                CONFIG.EMAILJS_SERVICE_ID,
                CONFIG.EMAILJS_TEMPLATE_HOST,
                templateParams
            );

            console.log(`Host notification sent to ${hostEmails.join(', ')}:`, response);
            return { success: true, response };
        } catch (error) {
            console.error('Failed to send host email:', error);
            return { success: false, error };
        }
    }

    async sendBookingEmails(booking) {
        return {
            candidate: await this.sendCandidateConfirmation(booking),
            host: await this.sendHostNotification(booking)
        };
    }

    formatDate(dateStr) {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
        } catch {
            return dateStr;
        }
    }
}

const emailService = new EmailService();
