// MSC Meeting - Admin Dashboard Logic

// State
let isLoggedIn = false;
let allSlots = [];
let meetingTypes = [];
let meetingTypesMap = {};
let editingSlot = null;
let editingType = null;
let activeFilter = 'all';
let slotToDelete = null;
let typeToDelete = null;

// DOM
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const slotsTableBody = document.getElementById('slotsTableBody');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    const storedSession = sessionStorage.getItem('adminLoggedIn');
    if (storedSession === 'true') {
        isLoggedIn = true;
        showDashboard();
    }

    await sheetsAPI.init();

    loginForm.addEventListener('submit', handleLogin);
    document.getElementById('addSlotForm').addEventListener('submit', handleSaveSlot);
    document.getElementById('addTypeForm').addEventListener('submit', handleSaveType);

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeAllModals();
        });
    });

    // Build color swatches
    buildColorSwatches();
});

// ========================================
// AUTH
// ========================================

async function handleLogin(e) {
    e.preventDefault();
    const password = document.getElementById('adminPassword').value;

    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="spinner spinner-sm"></span> Verifying...';
    loginError.classList.add('hidden');

    try {
        const isValid = await sheetsAPI.verifyPassword(password);
        if (isValid) {
            isLoggedIn = true;
            sessionStorage.setItem('adminLoggedIn', 'true');
            showDashboard();
        } else {
            loginError.textContent = 'Invalid password. Please try again.';
            loginError.classList.remove('hidden');
        }
    } catch (error) {
        loginError.textContent = 'Error verifying password.';
        loginError.classList.remove('hidden');
    }

    loginBtn.disabled = false;
    loginBtn.innerHTML = '🔐 Login';
}

async function showDashboard() {
    loginSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    await loadAllData();
}

function logout() {
    isLoggedIn = false;
    sessionStorage.removeItem('adminLoggedIn');
    dashboardSection.classList.add('hidden');
    loginSection.classList.remove('hidden');
    document.getElementById('adminPassword').value = '';
}

// ========================================
// DATA LOADING
// ========================================

async function loadAllData() {
    await loadMeetingTypes();
    await loadAllSlots();
}

async function loadMeetingTypes() {
    try {
        sheetsAPI.clearMeetingTypesCache();
        meetingTypes = await sheetsAPI.getMeetingTypes(true);
        meetingTypesMap = {};
        meetingTypes.forEach(t => { meetingTypesMap[t.id] = t; });

        renderTypesGrid();
        buildFilterTabs();
        buildSlotTypeSelector();
        buildBookingLinks();
    } catch (error) {
        console.error('Error loading meeting types:', error);
        showToast('Failed to load meeting types', 'error');
    }
}

async function loadAllSlots() {
    try {
        showTableLoading();
        allSlots = await sheetsAPI.getSlots();
        renderSlotsTable();
    } catch (error) {
        console.error('Error loading slots:', error);
        showToast('Failed to load slots', 'error');
    }
}

// ========================================
// MEETING TYPES GRID
// ========================================

function renderTypesGrid() {
    const container = document.getElementById('typesContainer');

    if (meetingTypes.length === 0) {
        container.innerHTML = `
            <div style="padding: 1.5rem; text-align: center; color: var(--text-muted);">
                <p>No booking pages yet. Click <strong>"+ New Type"</strong> to create one.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = meetingTypes.map(mt => `
        <div class="type-card">
            <div class="tc-icon">${mt.icon}</div>
            <div class="tc-info">
                <h4>${mt.name}</h4>
                <div class="tc-desc">${mt.description || '—'}</div>
                <div class="tc-host">📧 ${mt.hostEmails}</div>
            </div>
            <div class="tc-color" style="background: ${mt.color};" title="${mt.color}"></div>
            <div class="tc-actions">
                <button class="btn-icon" onclick="openEditTypeModal('${mt.id}')" title="Edit">✏️</button>
                <button class="btn-icon danger" onclick="openDeleteTypeModal('${mt.id}')" title="Delete">🗑️</button>
            </div>
        </div>
    `).join('');
}

// ========================================
// MEETING TYPE CRUD
// ========================================

function buildColorSwatches() {
    const container = document.getElementById('colorSwatches');
    container.innerHTML = CONFIG.DEFAULT_COLORS.map(c => `
        <div class="color-swatch" style="background: ${c.color};"
             data-color="${c.color}" title="${c.name}"
             onclick="selectColor('${c.color}')">
        </div>
    `).join('');
    // Select first color by default
    selectColor(CONFIG.DEFAULT_COLORS[0].color);
}

function selectColor(color) {
    document.getElementById('typeColor').value = color;
    document.querySelectorAll('.color-swatch').forEach(sw => {
        sw.classList.toggle('selected', sw.dataset.color === color);
    });
}

function openAddTypeModal() {
    editingType = null;
    document.getElementById('typeModalTitle').textContent = 'New Booking Page';
    document.getElementById('saveTypeBtn').textContent = '➕ Create';
    document.getElementById('addTypeForm').reset();
    selectColor(CONFIG.DEFAULT_COLORS[0].color);
    document.getElementById('addTypeModal').classList.add('active');
}

function openEditTypeModal(typeId) {
    const mt = meetingTypesMap[typeId];
    if (!mt) return;

    editingType = mt;
    document.getElementById('typeModalTitle').textContent = 'Edit Booking Page';
    document.getElementById('saveTypeBtn').textContent = '💾 Save Changes';

    document.getElementById('typeName').value = mt.name;
    document.getElementById('typeIcon').value = mt.icon;
    document.getElementById('typeDescription').value = mt.description;
    document.getElementById('typeHostEmails').value = mt.hostEmails;
    selectColor(mt.color);

    document.getElementById('addTypeModal').classList.add('active');
}

function openDeleteTypeModal(typeId) {
    typeToDelete = typeId;
    document.getElementById('deleteTypeModal').classList.add('active');
}

async function confirmDeleteType() {
    if (!typeToDelete) return;

    try {
        await sheetsAPI.deleteMeetingType(typeToDelete);
        showToast('Booking page deleted', 'success');
        closeAllModals();
        await loadMeetingTypes();
    } catch (error) {
        showToast('Failed to delete', 'error');
    }
    typeToDelete = null;
}

async function handleSaveType(e) {
    e.preventDefault();

    const name = document.getElementById('typeName').value.trim();
    const icon = document.getElementById('typeIcon').value.trim();
    const description = document.getElementById('typeDescription').value.trim();
    const hostEmails = document.getElementById('typeHostEmails').value.trim();
    const color = document.getElementById('typeColor').value;

    if (!name || !icon || !hostEmails || !color) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    const saveBtn = document.getElementById('saveTypeBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner spinner-sm"></span> Saving...';

    try {
        if (editingType) {
            // Update existing
            await sheetsAPI.updateMeetingType(editingType.id, {
                id: editingType.id,
                name, icon, description, hostEmails, color
            });
            showToast('Booking page updated', 'success');
        } else {
            // Create new — generate a slug-like ID from the name
            const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            await sheetsAPI.addMeetingType({ id, name, icon, description, hostEmails, color });
            showToast('Booking page created', 'success');
        }

        closeAllModals();
        await loadMeetingTypes();

    } catch (error) {
        showToast('Failed to save', 'error');
    }

    saveBtn.disabled = false;
    saveBtn.innerHTML = editingType ? '💾 Save Changes' : '➕ Create';
}

// ========================================
// FILTER TABS
// ========================================

function buildFilterTabs() {
    const container = document.getElementById('filterTabs');
    // Keep only the "All" button, rebuild the rest
    container.innerHTML = `
        <button class="filter-tab ${activeFilter === 'all' ? 'active' : ''}" data-type="all" onclick="filterByType('all')">
            📋 All <span class="tab-count" id="countAll">0</span>
        </button>
    `;

    meetingTypes.forEach(mt => {
        const btn = document.createElement('button');
        btn.className = `filter-tab ${activeFilter === mt.id ? 'active' : ''}`;
        btn.dataset.type = mt.id;
        btn.onclick = () => filterByType(mt.id);
        btn.innerHTML = `${mt.icon} ${mt.name} <span class="tab-count" id="count_${mt.id}">0</span>`;
        container.appendChild(btn);
    });
}

function filterByType(type) {
    activeFilter = type;
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.type === type);
    });
    renderSlotsTable();
}

// ========================================
// SLOT TYPE SELECTOR (in modal)
// ========================================

function buildSlotTypeSelector() {
    const select = document.getElementById('slotMeetingType');
    select.innerHTML = '';

    if (meetingTypes.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'No types — create one first';
        opt.disabled = true;
        opt.selected = true;
        select.appendChild(opt);
        return;
    }

    meetingTypes.forEach(mt => {
        const opt = document.createElement('option');
        opt.value = mt.id;
        opt.textContent = `${mt.icon} ${mt.name}`;
        select.appendChild(opt);
    });
}

// ========================================
// BOOKING LINKS
// ========================================

function buildBookingLinks() {
    const container = document.getElementById('bookingLinksContainer');

    if (meetingTypes.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted);">Create booking pages to see links here.</p>`;
        return;
    }

    container.innerHTML = meetingTypes.map(mt => `
        <div class="booking-link-card">
            <div class="link-icon">${mt.icon}</div>
            <div class="link-info">
                <h4>${mt.name}</h4>
                <p>📧 ${mt.hostEmails}</p>
            </div>
            <div class="link-actions">
                <a href="booking.html?type=${encodeURIComponent(mt.id)}" target="_blank" class="btn btn-secondary btn-sm">👁️ View</a>
                <button onclick="copyBookingLink('${mt.id}')" class="btn btn-secondary btn-sm">📋 Copy</button>
            </div>
        </div>
    `).join('');
}

function copyBookingLink(type) {
    const base = window.location.origin + window.location.pathname.replace('admin.html', '');
    const link = `${base}booking.html?type=${encodeURIComponent(type)}`;
    navigator.clipboard.writeText(link).then(() => {
        const mt = meetingTypesMap[type];
        showToast(`${mt ? mt.name : type} booking link copied!`, 'success');
    }).catch(() => {
        showToast('Failed to copy link', 'error');
    });
}

// ========================================
// SLOTS TABLE
// ========================================

function getFilteredSlots() {
    if (activeFilter === 'all') return allSlots;
    return allSlots.filter(s => s.meetingType === activeFilter);
}

function getMeetingTypeBadge(type) {
    const mt = meetingTypesMap[type];
    if (mt) {
        return `<span class="type-badge" style="background: ${mt.color}15; color: ${mt.color};">${mt.icon} ${mt.name}</span>`;
    }
    return `<span class="type-badge unknown">—</span>`;
}

function renderSlotsTable() {
    const filtered = getFilteredSlots();

    if (filtered.length === 0) {
        slotsTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center" style="padding: 2rem;">
                    <div class="empty-state">
                        <div class="icon">📅</div>
                        <h3>No Slots</h3>
                        <p>${activeFilter === 'all' ? 'Add your first time slot.' : 'No slots for this type.'}</p>
                    </div>
                </td>
            </tr>
        `;
        updateStats();
        return;
    }

    const sorted = [...filtered].sort((a, b) => {
        const d = new Date(a.date) - new Date(b.date);
        return d !== 0 ? d : a.time.localeCompare(b.time);
    });

    slotsTableBody.innerHTML = sorted.map(slot => `
        <tr>
            <td>${getMeetingTypeBadge(slot.meetingType)}</td>
            <td>${formatDate(slot.date)}</td>
            <td><strong>${slot.time}</strong></td>
            <td>${slot.duration} min</td>
            <td>
                <span class="badge ${slot.status === 'available' ? 'badge-success' : 'badge-warning'}">
                    ${slot.status}
                </span>
            </td>
            <td>${slot.candidateName || '-'}</td>
            <td>${slot.candidateEmail || '-'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon" onclick="editSlot('${slot.id}')" title="Edit">✏️</button>
                    <button class="btn-icon danger" onclick="openDeleteSlotModal('${slot.id}')" title="Delete">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');

    updateStats();
}

function showTableLoading() {
    slotsTableBody.innerHTML = `
        <tr>
            <td colspan="8" class="text-center" style="padding: 2rem;">
                <div class="spinner"></div>
            </td>
        </tr>
    `;
}

function updateStats() {
    const filtered = getFilteredSlots();
    document.getElementById('statTotal').textContent = filtered.length;
    document.getElementById('statAvailable').textContent = filtered.filter(s => s.status === 'available').length;
    document.getElementById('statBooked').textContent = filtered.filter(s => s.status === 'booked').length;

    // Tab counts
    const allEl = document.getElementById('countAll');
    if (allEl) allEl.textContent = allSlots.length;

    meetingTypes.forEach(mt => {
        const el = document.getElementById(`count_${mt.id}`);
        if (el) el.textContent = allSlots.filter(s => s.meetingType === mt.id).length;
    });
}

// ========================================
// SLOT CRUD
// ========================================

function openAddSlotModal() {
    if (meetingTypes.length === 0) {
        showToast('Please create a booking page type first', 'warning');
        return;
    }

    editingSlot = null;
    document.getElementById('slotModalTitle').textContent = 'Add New Slot';
    document.getElementById('saveSlotBtn').textContent = '➕ Add Slot';
    document.getElementById('addSlotForm').reset();

    if (activeFilter !== 'all') {
        document.getElementById('slotMeetingType').value = activeFilter;
    }

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('slotDate').value = today;
    document.getElementById('slotDate').min = today;

    document.getElementById('addSlotModal').classList.add('active');
}

function editSlot(slotId) {
    const slot = allSlots.find(s => s.id === slotId);
    if (!slot) return;

    editingSlot = slot;
    document.getElementById('slotModalTitle').textContent = 'Edit Slot';
    document.getElementById('saveSlotBtn').textContent = '💾 Save Changes';

    document.getElementById('slotMeetingType').value = slot.meetingType || '';
    document.getElementById('slotDate').value = slot.date;
    document.getElementById('slotTime').value = slot.time;
    document.getElementById('slotDuration').value = slot.duration;

    document.getElementById('addSlotModal').classList.add('active');
}

async function handleSaveSlot(e) {
    e.preventDefault();

    const slotData = {
        date: document.getElementById('slotDate').value,
        time: document.getElementById('slotTime').value,
        duration: parseInt(document.getElementById('slotDuration').value),
        meetingType: document.getElementById('slotMeetingType').value
    };

    const saveBtn = document.getElementById('saveSlotBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner spinner-sm"></span> Saving...';

    try {
        if (editingSlot) {
            await sheetsAPI.updateSlot(editingSlot.id, slotData);
            showToast('Slot updated successfully', 'success');
        } else {
            slotData.id = 'slot_' + Date.now();
            slotData.status = 'available';
            await sheetsAPI.addSlot(slotData);
            showToast('Slot added successfully', 'success');
        }
        closeAllModals();
        await loadAllSlots();
    } catch (error) {
        showToast('Failed to save slot', 'error');
    }

    saveBtn.disabled = false;
    saveBtn.innerHTML = editingSlot ? '💾 Save Changes' : '➕ Add Slot';
}

function openDeleteSlotModal(slotId) {
    slotToDelete = slotId;
    document.getElementById('deleteSlotModal').classList.add('active');
}

async function confirmDeleteSlot() {
    if (!slotToDelete) return;

    try {
        await sheetsAPI.deleteSlot(slotToDelete);
        showToast('Slot deleted', 'success');
        closeAllModals();
        await loadAllSlots();
    } catch (error) {
        showToast('Failed to delete slot', 'error');
    }
    slotToDelete = null;
}

// ========================================
// UTILITIES
// ========================================

function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    editingSlot = null;
    editingType = null;
    slotToDelete = null;
    typeToDelete = null;
}

function openGoogleSheet() {
    window.open(CONFIG.SHEET_URL, '_blank');
}

async function refreshData() {
    showToast('Refreshing...', 'info');
    await loadAllData();
    showToast('Data refreshed', 'success');
}

function formatDate(dateStr) {
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch { return dateStr; }
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
    setTimeout(() => { toast.remove(); }, 4000);
}
