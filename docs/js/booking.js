// MSC Meeting - Booking Page Logic

// State
let selectedSlot = null;
let allSlots = [];
let isLoading = true;
let currentMeetingType = null;
let meetingTypeConfig = null;

// DOM Elements
const slotsContainer = document.getElementById('slotsContainer');
const bookingForm = document.getElementById('bookingForm');
const bookingFormCard = document.getElementById('bookingFormCard');
const successCard = document.getElementById('successCard');
const loadingOverlay = document.getElementById('loadingOverlay');
const submitBtn = document.getElementById('submitBtn');

// Get meeting type from URL params
function getMeetingType() {
    const params = new URLSearchParams(window.location.search);
    return params.get('type');
}

// Darken a hex color by a percentage for gradient
function darkenColor(hex, percent = 15) {
    hex = hex.replace('#', '');
    const r = Math.max(0, parseInt(hex.substring(0, 2), 16) - Math.round(2.55 * percent));
    const g = Math.max(0, parseInt(hex.substring(2, 4), 16) - Math.round(2.55 * percent));
    const b = Math.max(0, parseInt(hex.substring(4, 6), 16) - Math.round(2.55 * percent));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Apply meeting type theming to the page
function applyMeetingTypeTheme(typeConfig) {
    const header = document.getElementById('pageHeader');
    const headerIcon = document.getElementById('headerIcon');
    const headerTitle = document.getElementById('headerTitle');
    const headerSubtitle = document.getElementById('headerSubtitle');

    if (typeConfig) {
        headerIcon.textContent = typeConfig.icon;
        headerTitle.textContent = typeConfig.name;
        headerSubtitle.textContent = typeConfig.description || typeConfig.name;
        document.title = `${typeConfig.name} - MSC Meeting Scheduler`;

        const colorDark = darkenColor(typeConfig.color);
        header.style.background = `linear-gradient(135deg, ${typeConfig.color} 0%, ${colorDark} 100%)`;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    currentMeetingType = getMeetingType();

    if (!currentMeetingType) {
        window.location.href = 'index.html';
        return;
    }

    // Initialize sheets API
    const sheetsReady = await sheetsAPI.init();
    emailService.init();

    if (!sheetsReady) {
        showError('Configuration Error', 'Please check the API configuration.');
        hideLoading();
        return;
    }

    // Fetch meeting type config from sheet
    meetingTypeConfig = await sheetsAPI.getMeetingTypeById(currentMeetingType);

    if (!meetingTypeConfig) {
        showError('Invalid Interview Type', 'This booking page does not exist. Please go back and choose a valid interview type.');
        hideLoading();
        return;
    }

    applyMeetingTypeTheme(meetingTypeConfig);

    // Load slots
    await loadSlots();

    // Setup form handler
    bookingForm.addEventListener('submit', handleBooking);

    hideLoading();
});

// Load available slots (filtered by meeting type)
async function loadSlots() {
    try {
        showLoading('Loading available slots...');
        allSlots = await sheetsAPI.getAvailableSlots(currentMeetingType);
        renderSlots(allSlots);
    } catch (error) {
        console.error('Error loading slots:', error);
        showEmptyState('Unable to load slots. Please try again later.');
    }
}

// Render slots grid
function renderSlots(slots) {
    if (slots.length === 0) {
        showEmptyState('No available slots at the moment. Please check back later.');
        return;
    }

    const grouped = groupSlotsByDate(slots);
    let html = '';

    Object.keys(grouped).sort().forEach(date => {
        const dateSlots = grouped[date];
        const formattedDate = formatDateHeading(date);

        html += `
            <div class="date-group mb-3">
                <h3 class="date-heading">${formattedDate}</h3>
                <div class="slots-grid">
                    ${dateSlots.map(slot => renderSlotCard(slot)).join('')}
                </div>
            </div>
        `;
    });

    slotsContainer.innerHTML = html;

    document.querySelectorAll('.slot-card').forEach(card => {
        card.addEventListener('click', () => selectSlot(card.dataset.id));
    });
}

function renderSlotCard(slot) {
    const isSelected = selectedSlot && selectedSlot.id === slot.id;
    return `
        <div class="slot-card ${isSelected ? 'selected' : ''}" data-id="${slot.id}">
            <div class="slot-date">${formatDayOfWeek(slot.date)}</div>
            <div class="slot-time">${slot.time}</div>
            <div class="slot-duration">
                <span>⏱️</span>
                <span>${slot.duration} minutes</span>
            </div>
        </div>
    `;
}

function groupSlotsByDate(slots) {
    const groups = {};
    slots.forEach(slot => {
        if (!groups[slot.date]) groups[slot.date] = [];
        groups[slot.date].push(slot);
    });
    return groups;
}

function formatDateHeading(dateStr) {
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    } catch { return dateStr; }
}

function formatDayOfWeek(dateStr) {
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch { return dateStr; }
}

function selectSlot(slotId) {
    const slot = allSlots.find(s => s.id === slotId);
    if (!slot) return;

    selectedSlot = slot;

    document.querySelectorAll('.slot-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.id === slotId);
    });

    bookingFormCard.classList.remove('hidden');
    bookingFormCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

    document.getElementById('selectedSlotInfo').innerHTML = `
        <strong>${formatDateHeading(slot.date)}</strong> at <strong>${slot.time}</strong> (${slot.duration} min)
    `;
}

// Handle booking form submission
async function handleBooking(e) {
    e.preventDefault();

    if (!selectedSlot) {
        showToast('Please select a time slot first', 'warning');
        return;
    }

    const name = document.getElementById('candidateName').value.trim();
    const email = document.getElementById('candidateEmail').value.trim();
    const notes = document.getElementById('candidateNotes').value.trim();

    if (!name || !email) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    if (!isValidEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner spinner-sm"></span> Booking...';

    try {
        const bookingData = {
            name, email, notes,
            slotId: selectedSlot.id,
            date: selectedSlot.date,
            time: selectedSlot.time,
            duration: selectedSlot.duration,
            meetingType: currentMeetingType
        };

        const booking = {
            candidateName: name,
            candidateEmail: email,
            notes,
            date: selectedSlot.date,
            time: selectedSlot.time,
            duration: selectedSlot.duration,
            meetingType: currentMeetingType,
            meetingTypeName: meetingTypeConfig ? meetingTypeConfig.name : 'Interview',
            hostEmails: meetingTypeConfig ? meetingTypeConfig.hostEmails : CONFIG.HOST_EMAILS
        };

        showSuccess(booking);

        Promise.all([
            sheetsAPI.bookSlot(selectedSlot.id, bookingData),
            emailService.sendCandidateConfirmation(booking),
            emailService.sendHostNotification(booking)
        ]).then(results => {
            console.log('Booking completed:', results);
        }).catch(error => {
            console.error('Background booking error:', error);
        });

    } catch (error) {
        console.error('Booking error:', error);
        showToast('Failed to complete booking. Please try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '📅 Confirm Booking';
    }
}

function showSuccess(booking) {
    document.getElementById('slotsSection').classList.add('hidden');
    bookingFormCard.classList.add('hidden');
    successCard.classList.remove('hidden');

    document.getElementById('successType').textContent = booking.meetingTypeName;
    document.getElementById('successName').textContent = booking.candidateName;
    document.getElementById('successDate').textContent = formatDateHeading(booking.date);
    document.getElementById('successTime').textContent = booking.time;
    document.getElementById('successDuration').textContent = booking.duration + ' minutes';
    document.getElementById('successEmail').textContent = booking.candidateEmail;

    successCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showEmptyState(message) {
    slotsContainer.innerHTML = `
        <div class="empty-state">
            <div class="icon">📅</div>
            <h3>No Available Slots</h3>
            <p>${message}</p>
        </div>
    `;
}

function showError(title, message) {
    slotsContainer.innerHTML = `
        <div class="empty-state">
            <div class="icon">⚠️</div>
            <h3>${title}</h3>
            <p>${message}</p>
            <a href="index.html" class="btn btn-primary mt-3">← Back to Home</a>
        </div>
    `;
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showLoading(message = 'Loading...') {
    if (loadingOverlay) {
        loadingOverlay.querySelector('p').textContent = message;
        loadingOverlay.classList.remove('hidden');
    }
}

function hideLoading() {
    if (loadingOverlay) loadingOverlay.classList.add('hidden');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 5000);
}

// Injected styles
const style = document.createElement('style');
style.textContent = `
    .date-group { margin-bottom: 2rem; }
    .date-heading {
        font-size: 1rem; font-weight: 600; color: var(--text-secondary);
        margin-bottom: 1rem; padding-bottom: 0.5rem;
        border-bottom: 2px solid var(--border-light);
    }
    .back-to-home {
        display: inline-block; margin-top: 1rem;
        color: rgba(255,255,255,0.8); text-decoration: none; font-size: 0.9rem;
        transition: color 0.2s ease;
    }
    .back-to-home:hover { color: #fff; text-decoration: underline; }
`;
document.head.appendChild(style);
