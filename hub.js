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

// --- Hub initialization ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('Family Hub loaded');
});
