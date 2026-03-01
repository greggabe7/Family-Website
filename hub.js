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

    // Static widgets
    renderCountdown(SAMPLE_TRIPS);
    renderQuickRef(SAMPLE_QUICKREF);
});
