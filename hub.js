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
    renderCountdown(SAMPLE_TRIPS);
    renderQuickRef(SAMPLE_QUICKREF);
});
