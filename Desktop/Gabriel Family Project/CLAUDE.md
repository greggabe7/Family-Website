# Gabriel Family Project

This project contains two apps: the Family Website landing page and the Weekly Allowance Tracker.

## GitHub Repo
https://github.com/greggabe7/Family-Website

---

## 1. Family Website (`index.html`)

### What It Does
Landing page for the Gabriel family with a photo collage hero section and links to family apps.

### Architecture
- **Static HTML** with Tailwind CSS (via CDN)
- **Photos**: Hosted on Imgur
- **No backend** - pure static site

### Key Sections
- Hero with 10-photo grid (6 shown on mobile)
- Family Apps section linking to the Weekly Allowance app

---

## 2. Weekly Allowance Tracker (`kids-money-tracker.html`)

### What It Does
Chore/allowance tracking app for Helena and Maria. Kids and parents can log in, mark completed chores, and track weekly earnings. Includes celebratory fireworks animation when tasks are completed.

### Users
- **Parents**: Mom, Dad (can modify settings, approve tasks)
- **Kids**: Helena, Maria

### Architecture
- **Frontend**: Static HTML with Tailwind CSS and vanilla JavaScript
- **Data Storage**: Firebase Realtime Database (cross-device sync built-in)
- **No server needed** - Firebase SDK handles everything from the browser

### Firebase Project
- Project: `gabriel-family-allowance`
- Database URL: `https://gabriel-family-allowance-default-rtdb.firebaseio.com`

### Features
- Individual login for each family member
- Daily chore tracking
- Weekly totals and history
- Customizable payout amounts (parent only)
- Real-time sync across devices
- Fireworks celebration effect

---

## Deployment Notes
Both files are static HTML and can be hosted on **Netlify** (recommended) or any static hosting platform. No build step required - just upload the files.

The Weekly Allowance app already uses the ideal architecture (static HTML + Firebase), which could serve as a template for future projects.

## Owner Preferences
- Prefers Netlify + Firebase for simple apps
- Most apps don't need heavy security or computation
- When starting new projects, weigh pros/cons of serverless vs server-based
