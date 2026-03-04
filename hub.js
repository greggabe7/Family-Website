/* ============================================
   Gabriel Family Hub — JavaScript
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
    appId: "1:351490113717:web:6e5a3e96b8e36e84e49486"
};

// --- Firebase Init ---
let app, db, storage;
try {
    app = firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    storage = firebase.storage();
} catch (err) {
    console.error('[Hub] Firebase init failed:', err);
}

// --- Default photo URLs ---
const DEFAULT_IMAGES = [
    'https://i.imgur.com/hs554rRl.jpeg',
    'https://i.imgur.com/UxW60hxl.jpeg',
    'https://i.imgur.com/bVp8I7ul.jpeg',
    'https://i.imgur.com/3QiGgLal.jpeg',
    'https://i.imgur.com/uPMRhnFl.jpeg',
    'https://i.imgur.com/1Nb2UMsl.jpeg',
    'https://i.imgur.com/p9E9lail.jpeg',
    'https://i.imgur.com/K3nSDpTl.jpeg',
    'https://i.imgur.com/9d0xZscl.jpeg',
    'https://i.imgur.com/GFf8aZel.jpeg',
    'https://i.imgur.com/hs554rRl.jpeg',
    'https://i.imgur.com/UxW60hxl.jpeg',
    'https://i.imgur.com/bVp8I7ul.jpeg',
    'https://i.imgur.com/3QiGgLal.jpeg',
    'https://i.imgur.com/uPMRhnFl.jpeg',
    'https://i.imgur.com/1Nb2UMsl.jpeg',
    'https://i.imgur.com/p9E9lail.jpeg',
    'https://i.imgur.com/K3nSDpTl.jpeg'
];

// --- Photo Management System ---
let editMode = false;
let activeSlot = null;

const photoGrid = document.getElementById('photoGrid');
const editToggleBtn = document.getElementById('editToggleBtn');
const photoFileInput = document.getElementById('photoFileInput');

function enhancePhotoGrid() {
    const items = photoGrid.querySelectorAll('.photo-grid-item');
    items.forEach((wrapper, i) => {
        const img = wrapper.querySelector('img');
        wrapper.dataset.slot = i;

        // Overlay for edit mode
        const overlay = document.createElement('div');
        overlay.className = 'photo-overlay';
        overlay.innerHTML = `
            <div class="overlay-buttons">
                <div class="overlay-btn" data-action="replace">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    <span>Replace</span>
                </div>
                <div class="overlay-btn" data-action="move">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/>
                    </svg>
                    <span>Move</span>
                </div>
                <div class="overlay-btn" data-action="restore">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                    <span>Restore</span>
                </div>
            </div>
        `;

        // Upload progress indicator
        const progress = document.createElement('div');
        progress.className = 'upload-progress';
        progress.textContent = '0%';

        // Reposition hint
        const hint = document.createElement('div');
        hint.className = 'reposition-hint';
        hint.textContent = 'Drag to move \u2022 Pinch or scroll to resize \u2022 Click outside to save';

        wrapper.appendChild(overlay);
        wrapper.appendChild(progress);
        wrapper.appendChild(hint);

        // Error fallback for images
        img.onerror = function () {
            this.src = DEFAULT_IMAGES[i];
        };

        // Fade in when loaded
        img.onload = function () {
            this.classList.add('loaded');
        };
        if (img.complete) img.classList.add('loaded');

        // Click handlers for replace/move/restore
        overlay.addEventListener('click', (e) => {
            if (!editMode || wrapper.classList.contains('uploading')) return;
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            if (btn.dataset.action === 'replace') {
                handleSlotClick(i);
            } else if (btn.dataset.action === 'move') {
                startReposition(i);
            } else if (btn.dataset.action === 'restore') {
                restoreDefault(i);
            }
        });
    });
}

// Load image URLs from Firebase, fall back to defaults
function loadImageUrls() {
    const imgsRef = db.ref('landingPage/images');
    imgsRef.on('value', (snapshot) => {
        const data = snapshot.val() || {};
        const items = photoGrid.querySelectorAll('.photo-grid-item');
        items.forEach((item, i) => {
            const img = item.querySelector('img');
            const key = 'slot_' + i;
            if (data[key] && img.src !== data[key]) {
                img.classList.remove('loaded');
                img.src = data[key];
            }
        });
        // Show edit button once Firebase has loaded
        editToggleBtn.style.display = 'flex';
    });
}

// Edit mode toggle
editToggleBtn.addEventListener('click', () => {
    if (editMode) {
        exitEditMode();
    } else {
        enterEditMode();
    }
});

function enterEditMode() {
    editMode = true;
    photoGrid.classList.add('edit-mode');
    editToggleBtn.classList.add('active');
    const heroText = document.querySelector('.photo-hero-text');
    if (heroText) heroText.style.display = 'none';
}

function exitEditMode() {
    editMode = false;
    photoGrid.classList.remove('edit-mode');
    editToggleBtn.classList.remove('active');
    const heroText = document.querySelector('.photo-hero-text');
    if (heroText) heroText.style.display = '';
}

// Restore a slot to its default imgur image
async function restoreDefault(slotIndex) {
    const wrapper = photoGrid.querySelectorAll('.photo-grid-item')[slotIndex];
    const imgEl = wrapper.querySelector('img');
    await db.ref('landingPage/images/slot_' + slotIndex).remove();
    await db.ref('landingPage/positions/slot_' + slotIndex).remove();
    imgEl.src = DEFAULT_IMAGES[slotIndex];
    applyPosition(imgEl, null);
}

// File selection
function handleSlotClick(slotIndex) {
    activeSlot = slotIndex;
    photoFileInput.value = '';
    photoFileInput.click();
}

photoFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file || activeSlot === null) return;
    resizeAndUpload(file, activeSlot);
});

// Resize image client-side before upload
function resizeImage(file, maxDim, quality) {
    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            let w = img.width;
            let h = img.height;
            if (w > maxDim || h > maxDim) {
                if (w > h) {
                    h = Math.round(h * maxDim / w);
                    w = maxDim;
                } else {
                    w = Math.round(w * maxDim / h);
                    h = maxDim;
                }
            }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
        };
        img.src = url;
    });
}

async function resizeAndUpload(file, slotIndex) {
    const wrapper = photoGrid.querySelectorAll('.photo-grid-item')[slotIndex];
    const imgEl = wrapper.querySelector('img');
    const progressEl = wrapper.querySelector('.upload-progress');

    wrapper.classList.add('uploading');
    progressEl.textContent = 'Resizing...';

    try {
        const blob = await resizeImage(file, 600, 0.75);
        const storageRef = storage.ref('landingPage/slot_' + slotIndex + '.jpg');
        const uploadTask = storageRef.put(blob, { contentType: 'image/jpeg' });

        uploadTask.on('state_changed',
            (snapshot) => {
                const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                progressEl.textContent = pct + '%';
            },
            (error) => {
                console.error('Upload error:', error);
                progressEl.textContent = 'Error!';
                setTimeout(() => wrapper.classList.remove('uploading'), 2000);
            },
            async () => {
                const downloadUrl = await uploadTask.snapshot.ref.getDownloadURL();
                await db.ref('landingPage/images/slot_' + slotIndex).set(downloadUrl);
                imgEl.src = downloadUrl;
                wrapper.classList.remove('uploading');
            }
        );
    } catch (err) {
        console.error('Resize/upload error:', err);
        progressEl.textContent = 'Error!';
        setTimeout(() => wrapper.classList.remove('uploading'), 2000);
    }
}

// --- Drag to Reposition ---
let repositionSlot = null;
let dragState = null;

function applyPosition(img, pos) {
    if (pos) {
        const ox = pos.ox !== undefined ? pos.ox : 50;
        const oy = pos.oy !== undefined ? pos.oy : 50;
        img.style.objectPosition = ox + '% ' + oy + '%';
        if (pos.s && pos.s > 1) {
            img.style.transform = 'scale(' + pos.s + ')';
        } else {
            img.style.transform = '';
        }
    } else {
        img.style.objectPosition = '';
        img.style.transform = '';
    }
}

function getCurrentPos(img) {
    const op = img.style.objectPosition || '';
    const opMatch = op.match(/([\d.]+)%\s+([\d.]+)%/);
    const ox = opMatch ? parseFloat(opMatch[1]) : 50;
    const oy = opMatch ? parseFloat(opMatch[2]) : 50;
    const t = img.style.transform || '';
    const scaleMatch = t.match(/scale\(([\d.]+)\)/);
    const s = scaleMatch ? parseFloat(scaleMatch[1]) : 1.0;
    return { s, ox, oy };
}

function startReposition(slotIndex) {
    if (repositionSlot !== null) finishReposition(repositionSlot);
    repositionSlot = slotIndex;
    const wrapper = photoGrid.querySelectorAll('.photo-grid-item')[slotIndex];
    const img = wrapper.querySelector('img');
    img.draggable = false;
    wrapper.classList.add('repositioning');

    const pos = getCurrentPos(img);
    applyPosition(img, pos);

    wrapper._onPointerDown = (e) => {
        const cur = getCurrentPos(img);
        dragState = {
            startX: e.clientX,
            startY: e.clientY,
            startOx: cur.ox,
            startOy: cur.oy,
            img: img,
            wrapper: wrapper,
            pointerId: e.pointerId
        };
        e.preventDefault();
        e.stopPropagation();
        wrapper.setPointerCapture(e.pointerId);
    };

    wrapper._onPointerMove = (e) => {
        if (!dragState) return;
        e.preventDefault();
        const rect = wrapper.getBoundingClientRect();
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        let ox = dragState.startOx - (dx / rect.width) * 100;
        let oy = dragState.startOy - (dy / rect.height) * 100;
        ox = Math.max(0, Math.min(100, ox));
        oy = Math.max(0, Math.min(100, oy));
        const cur = getCurrentPos(img);
        applyPosition(img, { s: cur.s, ox, oy });
    };

    wrapper._onPointerUp = (e) => {
        if (!dragState) return;
        wrapper.releasePointerCapture(dragState.pointerId);
        dragState = null;
    };

    // Scroll wheel to zoom
    wrapper._onWheel = (e) => {
        e.preventDefault();
        const cur = getCurrentPos(img);
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        const newScale = Math.max(1.0, Math.min(2.0, cur.s + delta));
        applyPosition(img, { s: newScale, ox: cur.ox, oy: cur.oy });
    };

    // Pinch to zoom (touch)
    wrapper._onTouchStart = (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            wrapper._pinchStartDist = Math.hypot(dx, dy);
            wrapper._pinchStartScale = getCurrentPos(img).s;
        }
    };

    wrapper._onTouchMove = (e) => {
        if (e.touches.length === 2 && wrapper._pinchStartDist) {
            e.preventDefault();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.hypot(dx, dy);
            const ratio = dist / wrapper._pinchStartDist;
            const newScale = Math.max(1.0, Math.min(2.0, wrapper._pinchStartScale * ratio));
            const cur = getCurrentPos(img);
            applyPosition(img, { s: newScale, ox: cur.ox, oy: cur.oy });
        }
    };

    wrapper._onTouchEnd = (e) => {
        if (e.touches.length < 2) {
            wrapper._pinchStartDist = null;
            wrapper._pinchStartScale = null;
        }
    };

    wrapper.addEventListener('pointerdown', wrapper._onPointerDown);
    wrapper.addEventListener('pointermove', wrapper._onPointerMove);
    wrapper.addEventListener('pointerup', wrapper._onPointerUp);
    wrapper.addEventListener('wheel', wrapper._onWheel, { passive: false });
    wrapper.addEventListener('touchstart', wrapper._onTouchStart, { passive: false });
    wrapper.addEventListener('touchmove', wrapper._onTouchMove, { passive: false });
    wrapper.addEventListener('touchend', wrapper._onTouchEnd);
}

function finishReposition(slotIndex) {
    const wrapper = photoGrid.querySelectorAll('.photo-grid-item')[slotIndex];
    const img = wrapper.querySelector('img');
    wrapper.classList.remove('repositioning');
    if (wrapper._onPointerDown) {
        wrapper.removeEventListener('pointerdown', wrapper._onPointerDown);
        wrapper.removeEventListener('pointermove', wrapper._onPointerMove);
        wrapper.removeEventListener('pointerup', wrapper._onPointerUp);
        wrapper.removeEventListener('wheel', wrapper._onWheel);
        wrapper.removeEventListener('touchstart', wrapper._onTouchStart);
        wrapper.removeEventListener('touchmove', wrapper._onTouchMove);
        wrapper.removeEventListener('touchend', wrapper._onTouchEnd);
        delete wrapper._onPointerDown;
        delete wrapper._onPointerMove;
        delete wrapper._onPointerUp;
        delete wrapper._onWheel;
        delete wrapper._onTouchStart;
        delete wrapper._onTouchMove;
        delete wrapper._onTouchEnd;
    }
    repositionSlot = null;
    dragState = null;
    const pos = getCurrentPos(img);
    db.ref('landingPage/positions/slot_' + slotIndex).set(pos);
}

// Click outside to finish repositioning
document.addEventListener('click', (e) => {
    if (repositionSlot === null) return;
    const wrapper = photoGrid.querySelectorAll('.photo-grid-item')[repositionSlot];
    if (!wrapper.contains(e.target)) {
        finishReposition(repositionSlot);
    }
});

// Load saved positions from Firebase
function loadPositions() {
    db.ref('landingPage/positions').on('value', (snapshot) => {
        const data = snapshot.val() || {};
        const items = photoGrid.querySelectorAll('.photo-grid-item');
        items.forEach((item, i) => {
            const img = item.querySelector('img');
            const key = 'slot_' + i;
            if (data[key] && typeof data[key] === 'object') {
                const pos = data[key];
                // Old {s, x, y} translate format — ignore it, reset to default
                if (pos.x !== undefined && pos.ox === undefined) {
                    return;
                }
                applyPosition(img, pos);
            }
        });
    });
}

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

    const eventDates = new Set(calendarEvents.map(e => e.date));

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

    DOW_SHORT.forEach(d => { html += `<span class="cal-mini-dow">${d}</span>`; });

    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        html += `<span class="cal-mini-day other-month">${day}</span>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
        const hasEvent = eventDates.has(dateStr);
        const classes = ['cal-mini-day'];
        if (isToday) classes.push('today');
        if (hasEvent) classes.push('has-event');
        html += `<span class="${classes.join(' ')}">${d}</span>`;
    }

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

// --- Utility Functions ---
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

// --- Notes Widget ---
const notesRef = db.ref('hub/notes');

function initNotes() {
    const textInput = document.getElementById('notes-text');
    const authorSelect = document.getElementById('notes-author');
    const postBtn = document.getElementById('notes-post-btn');

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

    document.getElementById('notes-list').addEventListener('click', (e) => {
        const btn = e.target.closest('.note-delete');
        if (btn) notesRef.child(btn.dataset.id).remove();
    });
}

// --- Shopping Lists Widget ---
let currentStore = 'traderjoes';
let shopListeners = {};

function initShopping() {
    const tabs = document.querySelectorAll('.shop-tab');
    const input = document.getElementById('shop-input');
    const addBtn = document.getElementById('shop-add-btn');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentStore = tab.dataset.store;
            listenToStore(currentStore);
        });
    });

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

    listenToStore(currentStore);
}

function listenToStore(store) {
    Object.keys(shopListeners).forEach(s => {
        if (s !== store && shopListeners[s]) {
            db.ref(`hub/shopping/${s}`).off('value', shopListeners[s]);
            delete shopListeners[s];
        }
    });

    if (shopListeners[store]) return;

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

// --- Allowance Widget (read-only) ---
function initAllowance() {
    db.ref('allowanceData').on('value', (snapshot) => {
        const el = document.getElementById('allowance-summary');
        const data = snapshot.val();
        if (!data || !data.earnings) {
            el.innerHTML = '<div class="widget-placeholder" style="height:40px;">No balance data available</div>';
            return;
        }

        const currentYear = new Date().getFullYear().toString();
        const kids = [
            { key: 'helena', name: 'Helena' },
            { key: 'maria', name: 'Maria' }
        ];

        el.innerHTML = kids.map(kid => {
            const weekTotal = (data.earnings[kid.key] && data.earnings[kid.key].weekTotal) || 0;
            const yearPaid = (data.yearlyEarnings && data.yearlyEarnings[kid.key] && data.yearlyEarnings[kid.key][currentYear]) || 0;
            const yearTotal = Math.round((yearPaid + weekTotal) * 100) / 100;
            return `
                <div class="allowance-kid-row">
                    <div class="allowance-kid-name">${kid.name}</div>
                    <div class="allowance-kid-amounts">
                        <div class="allowance-week">This week: <strong>$${weekTotal.toFixed(2)}</strong></div>
                        <div class="allowance-year">${currentYear} total: $${yearTotal.toFixed(2)}</div>
                    </div>
                </div>
            `;
        }).join('');
    });
}

// --- Quick Reference Widget ---
const SAMPLE_QUICKREF = [
    { label: 'WiFi', value: 'GabrielHome5G' },
    { label: 'Vet', value: '(949) 555-0182' },
    { label: 'Pediatrician', value: '(949) 555-0234' },
    { label: 'Neighbor (Sue)', value: '(949) 555-0156' },
    { label: 'Alarm Code', value: '****' },
    { label: 'Trash Day', value: 'Tuesday' }
];

const quickrefRef = db.ref('hub/quickref');
let quickrefItems = [];
let quickrefEditMode = false;

function initQuickRef() {
    const titleEl = document.querySelector('#widget-quickref .widget-title');
    if (!titleEl) return;

    titleEl.addEventListener('dblclick', () => {
        if (!quickrefEditMode) enterQuickRefEdit();
    });

    quickrefRef.once('value', (snapshot) => {
        if (!snapshot.val()) {
            quickrefRef.set({ items: SAMPLE_QUICKREF });
        }
    });

    quickrefRef.on('value', (snapshot) => {
        const data = snapshot.val();
        quickrefItems = (data && data.items) ? data.items : [];
        if (!quickrefEditMode) renderQuickRef();
    });
}

function renderQuickRef() {
    const listEl = document.getElementById('quickref-list');
    if (quickrefItems.length === 0) {
        listEl.innerHTML = '<div class="widget-placeholder" style="height:40px;">No info yet — double-click title to edit</div>';
        return;
    }
    listEl.innerHTML = quickrefItems.map(item => `
        <div class="quickref-row">
            <span class="quickref-label">${escapeHtml(item.label)}</span>
            <span class="quickref-value">${escapeHtml(item.value)}</span>
        </div>
    `).join('');
}

function enterQuickRefEdit() {
    quickrefEditMode = true;
    const listEl = document.getElementById('quickref-list');
    const items = quickrefItems.length > 0 ? quickrefItems : [{ label: '', value: '' }];

    let html = '<div class="quickref-edit">';
    items.forEach((item, i) => {
        html += `
            <div class="quickref-edit-row" data-index="${i}">
                <input type="text" class="quickref-edit-label" value="${escapeHtml(item.label)}" placeholder="Label">
                <input type="text" class="quickref-edit-value" value="${escapeHtml(item.value)}" placeholder="Value">
                <button class="quickref-remove-btn" data-index="${i}">&times;</button>
            </div>
        `;
    });
    html += `
        <div class="quickref-edit-actions">
            <button class="quickref-add-row-btn" id="quickref-add-row">+ Add row</button>
            <div class="quickref-edit-btns">
                <button class="quickref-cancel-btn" id="quickref-cancel">Cancel</button>
                <button class="quickref-save-btn" id="quickref-save">Save</button>
            </div>
        </div>
    </div>`;
    listEl.innerHTML = html;

    document.getElementById('quickref-add-row').addEventListener('click', () => {
        const editEl = listEl.querySelector('.quickref-edit');
        const actionsEl = editEl.querySelector('.quickref-edit-actions');
        const idx = editEl.querySelectorAll('.quickref-edit-row').length;
        const row = document.createElement('div');
        row.className = 'quickref-edit-row';
        row.dataset.index = idx;
        row.innerHTML = `
            <input type="text" class="quickref-edit-label" value="" placeholder="Label">
            <input type="text" class="quickref-edit-value" value="" placeholder="Value">
            <button class="quickref-remove-btn" data-index="${idx}">&times;</button>
        `;
        editEl.insertBefore(row, actionsEl);
    });

    listEl.addEventListener('click', (e) => {
        const rmBtn = e.target.closest('.quickref-remove-btn');
        if (rmBtn) rmBtn.closest('.quickref-edit-row').remove();
    });

    document.getElementById('quickref-cancel').addEventListener('click', () => {
        quickrefEditMode = false;
        renderQuickRef();
    });

    document.getElementById('quickref-save').addEventListener('click', () => {
        const rows = listEl.querySelectorAll('.quickref-edit-row');
        const newItems = [];
        rows.forEach(row => {
            const label = row.querySelector('.quickref-edit-label').value.trim();
            const value = row.querySelector('.quickref-edit-value').value.trim();
            if (label || value) newItems.push({ label, value });
        });
        quickrefRef.set({ items: newItems });
        quickrefEditMode = false;
    });
}

// --- Hub initialization ---
document.addEventListener('DOMContentLoaded', () => {
    enhancePhotoGrid();

    db.ref('landingPage/images').once('value').then((snapshot) => {
        const data = snapshot.val();
        if (data) {
            const items = photoGrid.querySelectorAll('.photo-grid-item');
            items.forEach((item, i) => {
                const img = item.querySelector('img');
                const key = 'slot_' + i;
                if (data[key]) { img.src = data[key]; }
            });
        }
        editToggleBtn.style.display = 'flex';
    }).catch((err) => {
        console.error('[Hub] Firebase image load failed:', err);
    });

    loadPositions();

    // Calendar
    fetchCalendarEvents();
    setInterval(fetchCalendarEvents, 30 * 60 * 1000);

    // Firebase widgets (public paths — no auth needed)
    initNotes();
    initShopping();
    initQuickRef();

    // Allowance needs auth (allowanceData requires auth != null)
    firebase.auth().signInAnonymously().then(() => {
        initAllowance();
    }).catch(err => {
        console.error('[Hub] Auth failed:', err);
        document.getElementById('allowance-summary').innerHTML =
            '<div class="widget-placeholder">Could not load allowance data</div>';
    });
});
