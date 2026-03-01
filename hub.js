/* ============================================
   Pizzo Family Hub — JavaScript
   ============================================ */

// --- Configuration ---
const GOOGLE_CALENDAR_ID = 'YOUR_CALENDAR_ID_HERE';
const GOOGLE_API_KEY = 'YOUR_API_KEY_HERE';

const firebaseConfig = {
    apiKey: "AIzaSyARiateAk1EJggk09iMDdCvNZDPDNcu7EU",
    authDomain: "gabriel-family-allowance.firebaseapp.com",
    databaseURL: "https://gabriel-family-allowance-default-rtdb.firebaseio.com",
    projectId: "gabriel-family-allowance",
    storageBucket: "gabriel-family-allowance.firebasestorage.app",
    messagingSenderId: "351490113717",
    appId: "1:351490113717:web:01af4592fa8f08039dfefc"
};

// --- Firebase Init ---
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// --- Google Calendar Widget ---
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW_SHORT = ['Su','Mo','Tu','We','Th','Fr','Sa'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

let calendarEvents = [];
let calDisplayMonth = new Date().getMonth();
let calDisplayYear = new Date().getFullYear();

async function fetchCalendarEvents() {
    if (GOOGLE_CALENDAR_ID === 'YOUR_CALENDAR_ID_HERE') {
        showCalError();
        return;
    }
    try {
        const now = new Date().toISOString();
        const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events?key=${GOOGLE_API_KEY}&timeMin=${now}&maxResults=20&singleEvents=true&orderBy=startTime`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        calendarEvents = (data.items || []).map(e => ({
            name: e.summary || 'Untitled',
            date: e.start.date || e.start.dateTime.split('T')[0]
        }));
        renderCalendar();
    } catch (err) {
        console.error('Calendar fetch failed:', err);
        showCalError();
    }
}

function showCalError() {
    document.getElementById('cal-mini').style.display = 'none';
    document.getElementById('cal-events').style.display = 'none';
    document.getElementById('cal-error').style.display = '';
}

function renderMiniCal() {
    const container = document.getElementById('cal-mini');
    const year = calDisplayYear;
    const month = calDisplayMonth;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Event dates for dot indicators
    const eventDates = new Set(calendarEvents.map(e => e.date));

    // First day of month and total days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    let html = `
        <div class="cal-mini-header">
            <button class="cal-mini-nav" onclick="calNav(-1)">&lsaquo;</button>
            <span class="cal-mini-title">${MONTH_NAMES[month]} ${year}</span>
            <button class="cal-mini-nav" onclick="calNav(1)">&rsaquo;</button>
        </div>
        <div class="cal-mini-grid">
    `;

    // Day-of-week headers
    DOW_SHORT.forEach(d => { html += `<span class="cal-mini-dow">${d}</span>`; });

    // Leading days from previous month
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        html += `<span class="cal-mini-day other-month">${day}</span>`;
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
        const hasEvent = eventDates.has(dateStr);
        const classes = ['cal-mini-day'];
        if (isToday) classes.push('today');
        if (hasEvent) classes.push('has-event');
        html += `<span class="${classes.join(' ')}">${d}</span>`;
    }

    // Trailing days to fill last row
    const totalCells = firstDay + daysInMonth;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let d = 1; d <= remaining; d++) {
        html += `<span class="cal-mini-day other-month">${d}</span>`;
    }

    html += '</div>';
    container.innerHTML = html;
}

function renderCalEvents() {
    const container = document.getElementById('cal-events');
    const upcoming = calendarEvents.slice(0, 4);

    if (upcoming.length === 0) {
        container.innerHTML = '<div class="cal-error">No upcoming events</div>';
        return;
    }

    container.innerHTML = upcoming.map(e => {
        const d = new Date(e.date + 'T00:00:00');
        return `
            <div class="cal-event-card">
                <div class="cal-event-date">
                    <div class="cal-event-month">${MONTH_SHORT[d.getMonth()]}</div>
                    <div class="cal-event-day">${d.getDate()}</div>
                </div>
                <div class="cal-event-name">${e.name}</div>
            </div>
        `;
    }).join('');
}

function renderCalendar() {
    renderMiniCal();
    renderCalEvents();
}

function calNav(dir) {
    calDisplayMonth += dir;
    if (calDisplayMonth > 11) { calDisplayMonth = 0; calDisplayYear++; }
    if (calDisplayMonth < 0) { calDisplayMonth = 11; calDisplayYear--; }
    renderMiniCal();
}

// --- Meal Planner Widget ---
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const mealsRef = db.ref('hub/meals');
let currentMeals = {};

function initMeals() {
    const gridEl = document.getElementById('meals-grid');
    const clearBtn = document.getElementById('meals-clear-btn');

    mealsRef.on('value', (snapshot) => {
        currentMeals = snapshot.val() || {};
        renderMeals();
    });

    clearBtn.addEventListener('click', () => {
        const empty = {};
        DAYS.forEach(d => { empty[d] = ''; });
        mealsRef.set(empty);
    });

    // Event delegation for click-to-edit
    gridEl.addEventListener('click', (e) => {
        const tile = e.target.closest('.meal-tile');
        if (!tile || tile.querySelector('.meal-tile-input')) return;
        const day = tile.dataset.day;
        startMealEdit(tile, day);
    });
}

function renderMeals() {
    const gridEl = document.getElementById('meals-grid');
    gridEl.innerHTML = DAYS.map((day, i) => {
        const meal = currentMeals[day] || '';
        return `
            <div class="meal-tile" data-day="${day}">
                <div class="meal-tile-day">${DAY_LABELS[i]}</div>
                ${meal
                    ? `<div class="meal-tile-meal">${escapeHtml(meal)}</div>`
                    : `<div class="meal-tile-empty">— tap to add —</div>`
                }
            </div>
        `;
    }).join('');
}

function startMealEdit(tile, day) {
    const current = currentMeals[day] || '';
    const dayLabel = tile.querySelector('.meal-tile-day').outerHTML;
    tile.innerHTML = `
        ${dayLabel}
        <input type="text" class="meal-tile-input" value="${escapeHtml(current)}" data-day="${day}">
    `;
    const input = tile.querySelector('.meal-tile-input');
    input.focus();
    input.select();

    function save() {
        const val = input.value.trim();
        mealsRef.child(day).set(val);
    }

    input.addEventListener('blur', save);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
        if (e.key === 'Escape') {
            input.removeEventListener('blur', save);
            renderMeals();
        }
    });
}

// --- Shopping Lists Widget ---
let currentStore = 'traderjoes';
let shopListeners = {};

function initShopping() {
    const tabs = document.querySelectorAll('.shop-tab');
    const input = document.getElementById('shop-input');
    const addBtn = document.getElementById('shop-add-btn');

    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentStore = tab.dataset.store;
            listenToStore(currentStore);
        });
    });

    // Add item
    function addItem() {
        const text = input.value.trim();
        if (!text) return;
        db.ref(`hub/shopping/${currentStore}`).push({
            item: text,
            checked: false,
            timestamp: Date.now()
        });
        input.value = '';
    }

    addBtn.addEventListener('click', addItem);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addItem();
    });

    // Start listening to first store
    listenToStore(currentStore);
}

function listenToStore(store) {
    // Detach previous listeners for other stores to avoid stacking
    Object.keys(shopListeners).forEach(s => {
        if (s !== store && shopListeners[s]) {
            db.ref(`hub/shopping/${s}`).off('value', shopListeners[s]);
            delete shopListeners[s];
        }
    });

    if (shopListeners[store]) return; // already listening

    const ref = db.ref(`hub/shopping/${store}`);
    const callback = (snapshot) => {
        if (store !== currentStore) return;
        const data = snapshot.val();
        renderShopList(data);
    };
    ref.on('value', callback);
    shopListeners[store] = callback;
}

function renderShopList(data) {
    const listEl = document.getElementById('shop-list');
    const footerEl = document.getElementById('shop-footer');

    if (!data) {
        listEl.innerHTML = '<div class="shop-empty">All done!</div>';
        footerEl.innerHTML = '';
        return;
    }

    const items = Object.entries(data)
        .map(([id, item]) => ({ id, ...item }))
        .sort((a, b) => {
            if (a.checked !== b.checked) return a.checked ? 1 : -1;
            return a.timestamp - b.timestamp;
        });

    const remaining = items.filter(i => !i.checked).length;
    const checked = items.filter(i => i.checked).length;

    listEl.innerHTML = items.map(item => `
        <div class="shop-item ${item.checked ? 'checked' : ''}">
            <input type="checkbox" ${item.checked ? 'checked' : ''} data-id="${item.id}" data-store="${currentStore}">
            <span class="shop-item-name">${escapeHtml(item.item)}</span>
        </div>
    `).join('');

    let footerHtml = `<span>${remaining} item${remaining !== 1 ? 's' : ''} remaining`;
    if (checked > 0) footerHtml += ` &middot; ${checked} checked off`;
    footerHtml += '</span>';
    if (checked > 0) {
        footerHtml += `<button class="shop-clear-btn" id="shop-clear-checked">Clear checked</button>`;
    }
    footerEl.innerHTML = footerHtml;

    // Clear checked handler
    const clearBtn = document.getElementById('shop-clear-checked');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            items.filter(i => i.checked).forEach(i => {
                db.ref(`hub/shopping/${currentStore}/${i.id}`).remove();
            });
        });
    }
}

// Event delegation for checkbox toggles
document.addEventListener('change', (e) => {
    if (e.target.matches('.shop-item input[type="checkbox"]')) {
        const id = e.target.dataset.id;
        const store = e.target.dataset.store;
        db.ref(`hub/shopping/${store}/${id}/checked`).set(e.target.checked);
    }
});

// --- Notes Widget ---
const notesRef = db.ref('hub/notes');

function formatRelativeTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) {
        const d = new Date(timestamp);
        return `Today ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    }
    if (days === 1) return 'Yesterday';
    const d = new Date(timestamp);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function initNotes() {
    const textInput = document.getElementById('notes-text');
    const authorSelect = document.getElementById('notes-author');
    const postBtn = document.getElementById('notes-post-btn');

    // Post note
    function postNote() {
        const text = textInput.value.trim();
        if (!text) return;
        notesRef.push({
            author: authorSelect.value,
            text: text,
            timestamp: Date.now()
        });
        textInput.value = '';
    }

    postBtn.addEventListener('click', postNote);
    textInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') postNote();
    });

    // Listen for real-time updates
    notesRef.orderByChild('timestamp').on('value', (snapshot) => {
        const listEl = document.getElementById('notes-list');
        const data = snapshot.val();
        if (!data) {
            listEl.innerHTML = '<div class="widget-placeholder" style="height:40px;">No notes yet</div>';
            return;
        }

        const notes = Object.entries(data)
            .map(([id, note]) => ({ id, ...note }))
            .sort((a, b) => b.timestamp - a.timestamp);

        // Auto-delete notes older than 14 days
        const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
        notes.forEach(note => {
            if (note.timestamp < cutoff) {
                notesRef.child(note.id).remove();
            }
        });

        const current = notes.filter(n => n.timestamp >= cutoff);
        if (current.length === 0) {
            listEl.innerHTML = '<div class="widget-placeholder" style="height:40px;">No notes yet</div>';
            return;
        }

        listEl.innerHTML = current.map(note => `
            <div class="note-item">
                <span class="note-author" data-author="${escapeHtml(note.author)}">${escapeHtml(note.author)}</span>
                <div class="note-content">
                    <div class="note-text">${escapeHtml(note.text)}</div>
                    <div class="note-time">${formatRelativeTime(note.timestamp)}</div>
                </div>
                <button class="note-delete" data-id="${note.id}" title="Delete">&times;</button>
            </div>
        `).join('');
    });

    // Delete note via event delegation
    document.getElementById('notes-list').addEventListener('click', (e) => {
        const btn = e.target.closest('.note-delete');
        if (btn) notesRef.child(btn.dataset.id).remove();
    });
}

// --- Hardcoded data (will be replaced by Firebase in later phases) ---
const SAMPLE_TRIPS = [
    { name: 'Palm Springs Spring Break', emoji: '🌴', date: '2026-04-05' },
    { name: 'Hawaii Summer', emoji: '🌺', date: '2026-06-20' },
    { name: 'Thanksgiving in Denver', emoji: '🦃', date: '2026-11-26' }
];

const SAMPLE_QUICKREF = [
    { label: 'WiFi', value: 'PizzoHome5G' },
    { label: 'Vet', value: '(949) 555-0182' },
    { label: 'Pediatrician', value: '(949) 555-0234' },
    { label: 'Neighbor (Sue)', value: '(949) 555-0156' },
    { label: 'Alarm Code', value: '****' },
    { label: 'Trash Day', value: 'Tuesday' }
];

// --- Utility: days between today and a date ---
function daysUntil(dateStr) {
    const target = new Date(dateStr + 'T00:00:00');
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

// --- Trip Countdown Widget ---
function renderCountdown(trips) {
    const heroEl = document.getElementById('countdown-hero');
    const listEl = document.getElementById('countdown-list');
    const emptyEl = document.getElementById('countdown-empty');

    // Filter to future trips and sort by date
    const upcoming = trips
        .map(t => ({ ...t, daysAway: daysUntil(t.date) }))
        .filter(t => t.daysAway >= 0)
        .sort((a, b) => a.daysAway - b.daysAway);

    if (upcoming.length === 0) {
        heroEl.style.display = 'none';
        listEl.style.display = 'none';
        emptyEl.style.display = '';
        return;
    }

    emptyEl.style.display = 'none';

    // Hero = closest trip
    const hero = upcoming[0];
    heroEl.style.display = '';
    heroEl.innerHTML = `
        <div class="countdown-hero-emoji">${hero.emoji}</div>
        <div class="countdown-hero-name">${hero.name}</div>
        <div class="countdown-hero-days">${hero.daysAway}</div>
        <div class="countdown-hero-label">days to go</div>
    `;

    // Rest of the trips
    const rest = upcoming.slice(1);
    if (rest.length === 0) {
        listEl.style.display = 'none';
    } else {
        listEl.style.display = '';
        listEl.innerHTML = rest.map(t => `
            <div class="countdown-list-item">
                <span class="countdown-list-item-name">${t.emoji} ${t.name}</span>
                <span class="countdown-list-item-days">${t.daysAway} days</span>
            </div>
        `).join('');
    }
}

// --- Quick Reference Widget ---
function renderQuickRef(items) {
    const listEl = document.getElementById('quickref-list');
    listEl.innerHTML = items.map(item => `
        <div class="quickref-row">
            <span class="quickref-label">${item.label}</span>
            <span class="quickref-value">${item.value}</span>
        </div>
    `).join('');
}

// --- Hub initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Calendar
    fetchCalendarEvents();
    setInterval(fetchCalendarEvents, 30 * 60 * 1000); // refresh every 30 min

    // Firebase widgets
    initNotes();
    initShopping();
    initMeals();

    // Static widgets
    renderCountdown(SAMPLE_TRIPS);
    renderQuickRef(SAMPLE_QUICKREF);
});
