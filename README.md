# EM Development

Website and client portal for **EM Development**, a web design and development business based in Cebu City, Philippines.

It has three parts in one static site:

1. A **public landing page** with services, portfolio, process, testimonials and a quote request form.
2. An **admin dashboard** where the owner runs the whole business: projects, quotations, invoices, subscriptions, accounting, contracts, customers, chat and backups.
3. A **customer portal** where each client follows their own projects, invoices, subscriptions and source code, and chats with the admin.

The login and both dashboards can be installed as a PWA (phone or desktop app).

---

## Table of contents

- [Features](#features)
- [Demo projects](#demo-projects)
- [Project structure](#project-structure)
- [Tech stack](#tech-stack)
- [Running locally](#running-locally)
- [Firebase setup](#firebase-setup)
- [EmailJS setup](#emailjs-setup)
- [Data layout](#data-layout)
- [PWA](#pwa)
- [Deployment](#deployment)
- [Security notes](#security-notes)

---

## Features

### Landing page (`index.html`)

- Sections: Home, Tech stack, Services, Work, Process, Testimonials and Contact
- Quote request form that saves to the database and appears in the admin's Quotations
- Animated loading screen and light / dark theme toggle
- Not part of the installed app

### Login (`auth/login.html`)

- Email and password sign-in with "Remember me" and password reset by email
- Sends admins and customers to their own dashboard
- Signs out accounts that the admin has disabled
- Installable as a PWA

### Admin dashboard (`components/dashboard.html` + `components/firebase.js`)

| Section | What it does |
|---|---|
| **Overview** | Summary of projects, money and recent activity |
| **Projects** | Create projects with inclusions (checklist), track progress, add features later, archive or delete. Status is Pending, Active or Completed |
| **Quotations** | Quote requests from the website. Reply by email straight from the dashboard (via EmailJS) and track which ones are already answered |
| **Invoices** | Create, edit, mark paid, overdue tracking, export CSV, branded PDF invoices |
| **Subscriptions** | Domain, Hosting, Maintenance and Other recurring items per customer, with paid status. Maintenance plans requested by customers show here too |
| **Accounting** | Income from paid invoices and expenses (developer salary, domain, hosting, software, marketing, office, taxes). Repeating expenses (monthly, every 3 months, yearly) are counted automatically for each billing date |
| **Source Code** | Add a Google Drive link and assign it to a customer. The link stays hidden until you press **Unlock**. Creating one also creates an invoice for the same amount |
| **Customers** | Create customer accounts, share projects with them, post updates, disable, enable or delete |
| **Contracts** | Contract maker (see below) with live preview and PDF download |
| **Chat** | One-to-one chat with each customer, with unread badges |
| **Tracker** | Log of logins, logouts and emails sent, with date, time and who did it. Searchable and filterable (including failed emails) |
| **Backup** | Download the whole database as one JSON file and restore it later |
| **Account** | Edit your name and change your password |

Also included: a notification bell (unread chats, quotations still to email, overdue invoices) and a light / dark theme.

#### Contract maker

- Fill in the client, project, price and schedule and the contract is written for you in a live preview
- Download as a PDF (built in the browser with jsPDF)
- The client's line switches between **Filipino** (Male) and **Filipina** (Female) based on the Gender dropdown
- Payments are fixed at 40% down, 30% when all inclusions are done and 30% on final approval
- Hard-coded sites also get a source code unlock clause
- Includes revision rounds, free support weeks, business days to finish and the city for legal matters
- Every field is required before the PDF can be downloaded, except **Company** and **Additional terms**

### Customer portal (`customers/dashboard.html` + `customers/firebase.js`)

| Section | What the customer sees |
|---|---|
| **Overview** | Their projects and what is due |
| **Projects** | Only the projects the admin shared with them, with progress and updates. Free maintenance period and maintenance plan requests |
| **Invoices** | Their invoices, with branded PDF download |
| **Subscriptions** | Domain, hosting and maintenance items |
| **Source Code** | Locked or unlocked source code links |
| **Messages** | Chat with the EM Development team |
| **Account** | Edit name and change password |

Customers also get a notification bell and a popup that reminds them to change the default password.

---

## Demo projects

Sample client sites kept inside this repo under `projects/`, shown in the landing page portfolio.

| Folder | Pages |
|---|---|
| `architecture/` | Oriel Architects: Home, About, Services, Contact |
| `commute/` | SakayNa Cebu: jeepney and bus tracking site with a live demo |
| `dinkline/` | Dinkline: sign in, admin dashboard and customer dashboard |
| `inventory/` | StockShelf: inventory login and dashboard |
| `KpiHarbor/` | KPIHarbor: business analytics dashboard |

---

## Project structure

```
emdevelopment/
├── index.html              Landing page
├── 404.html                Page not found, with suggestions
├── offline.html            Shown when the device has no connection
├── auth/
│   └── login.html          Login page
├── components/
│   ├── dashboard.html      Admin dashboard (page)
│   └── firebase.js         Admin dashboard (logic, Firebase, PDFs, EmailJS)
├── customers/
│   ├── dashboard.html      Customer portal (page)
│   └── firebase.js         Customer portal (logic, Firebase)
├── projects/               Demo client sites (see above)
├── icons/                  PWA icons (normal, maskable, Apple touch)
├── manifest.json           PWA manifest
├── pwa.js                  PWA registration, install prompt, update notice
├── sw.js                   Service worker
├── version.json            Current version and "What's new" notes
└── vercel.json             Hosting config
```

---

## Tech stack

- Plain HTML, CSS and JavaScript (ES modules), no build step
- [Tailwind CSS](https://tailwindcss.com) via the CDN script
- [Firebase](https://firebase.google.com) Authentication (email / password) and Realtime Database
- [EmailJS](https://www.emailjs.com) for emails sent from the dashboard
- [jsPDF](https://github.com/parallax/jsPDF) (loaded from cdnjs) for invoice and contract PDFs
- Service worker and web app manifest for the PWA
- Deployed as a static site on Vercel

---

## Running locally

The pages use ES modules and a service worker, so they must be served over HTTP, not opened as files.

```bash
cd emdevelopment
npx serve .
# or
python3 -m http.server 3000
```

Open `http://localhost:3000`. Service workers work on `localhost` without HTTPS.

---

## Firebase setup

1. Create a Firebase project and add a **Web app**.
2. Turn on **Authentication → Sign-in method → Email/Password**.
3. Create a **Realtime Database**.
4. Put your Firebase config in `components/firebase.js` and `customers/firebase.js` (the `FB` object at the top), and in `auth/login.html` if it initialises Firebase itself.
5. Create your admin account in **Authentication → Users**, then use that UID as the admin UID in the database rules.
6. Publish the database rules (**Realtime Database → Rules → Publish**).

Every field is validated in the rules. When you add a new field to the app, add it to the rules too, or the write is blocked with *"Blocked by the database rules"*. The dashboards show a hint when a rule is missing for `expenses`, `activity` (tracker) or `chats`.

### Customer accounts

The admin creates customer accounts from the dashboard. Each new customer is created with a temporary password and receives an email telling them to change it. Customers only see projects the admin has shared with them. Disabling a customer signs them out and blocks login. Deleting a customer removes them from the portal, but their login stays in Firebase Authentication until you delete it there.

---

## EmailJS setup

Emails sent from the dashboard use [EmailJS](https://www.emailjs.com). In `components/firebase.js`, edit the `EMAILJS` object:

| Key | Used for |
|---|---|
| `serviceId` | Your EmailJS email service |
| `templateId` | The email sent when a new customer account is created |
| `replyTemplateId` | Replies you send from Quotations |
| `publicKey` | Your EmailJS public key |

---

## Data layout

| Path | Purpose | Who can write |
|---|---|---|
| `users/<adminUid>/projects` | Projects, inclusions and maintenance | Admin |
| `users/<adminUid>/invoices` | Invoices | Admin |
| `users/<adminUid>/customers` | Customer records | Admin |
| `users/<adminUid>/subscriptions` | Domain, hosting, maintenance and other subscriptions | Admin |
| `users/<adminUid>/sourcecodes` | Source code links (real link, hidden while locked) | Admin |
| `users/<adminUid>/expenses` | Accounting expenses | Admin |
| `portal/<customerUid>` | Links a customer login to the admin, plus the customer-safe copy of their projects, subscriptions and source code | Admin |
| `quotes` | Quote requests from the website | Anyone can create, admin manages |
| `maintenance/<customerUid>` | Maintenance plan requests | Customer and admin |
| `chats/<customerUid>` | Admin / customer messages and unread counts | That customer and the admin |
| `activity/<uid>` | Tracker log (logins, logouts, emails) | The signed-in user |

---

## PWA

- **Installable pages:** login, admin dashboard and customer dashboard. `index.html` is not part of the app.
- **Start page:** the installed app opens on `/auth/login.html`.
- **Offline:** app pages are network first with a saved copy as fallback. Every other page always uses the network, and shows `offline.html` when there is no connection.
- **Updates:** the app checks `version.json` and shows a "What's new" notice when an update is ready, then reloads itself.
- **On each release:** edit `version.json`, and bump `VERSION` in `sw.js` if cached files changed. After changing icons, remove and reinstall the app on your phone.

---

## Deployment

The site is static. Connect the repository to Vercel (or any static host) and deploy the `emdevelopment` folder as the project root. `vercel.json` turns on clean URLs and sets no-cache headers for `sw.js`, `version.json` and `/offline`.

After deploying, add your live domain to **Firebase → Authentication → Settings → Authorized domains**.

---

## Security notes

- Firebase web config values and the EmailJS public key are not secrets, but your **database rules** are what protect the data. Review them before going live.
- Every new customer starts with the temporary password set in `TEMP_PW` in `components/firebase.js`. Change it to something harder to guess, or the first login of every account is easy to guess.
- Keep the admin UID in the database rules in sync with the admin account you actually use.
- Back up regularly from the **Backup** page and keep the JSON file somewhere private. It contains customer data.