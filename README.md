# EM Development

Website and client portal for **EM Development**: a public landing page, a secure login, and dashboards where the admin manages projects, invoices, quotes and customers, and customers follow their own projects. The login and dashboards can be installed as a PWA.

## Features

**Landing page (`index.html`)**
- Services, portfolio, process, testimonials and a quote request form
- Animated loading screen with the EM logo, light / dark theme toggle
- Not part of the installed app

**Login (`auth/login.html`)**
- Email and password sign-in with "Remember me" and password reset by email
- Sends admins and customers to their own dashboard, and signs out disabled accounts
- Messages appear as a pop-up in the bottom-right corner
- When opened as an installed PWA, the "Back to home" button is hidden and the logo no longer links home

**Admin dashboard (`components/dashboard.html`)**
- Projects with inclusions, progress and archive
- Quote requests from the website
- Invoices (create, edit, mark paid, export CSV)
- Customers: create accounts, share projects, post updates, disable / enable / delete
- Chat with customers

**Customer portal (`customers/dashboard.html`)**
- Read-only view of the projects shared with the customer, plus chat with the admin

## Project structure

```
website/
├── index.html            Landing page
├── auth/
│   └── login.html        Login page
├── components/
│   └── dashboard.html    Admin dashboard
├── customers/
│   └── dashboard.html    Customer portal
├── icons/                PWA icons
│   ├── apple-touch-icon.png
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-maskable-192.png
│   └── icon-maskable-512.png
├── manifest.json         PWA manifest
├── pwa.js                PWA registration / install logic
├── sw.js                 Service worker
├── offline.html          Offline fallback page
└── vercel.json           Hosting config
```

## Tech stack

- Plain HTML, CSS and JavaScript (no build step)
- [Tailwind CSS](https://tailwindcss.com) via the CDN script, with Plus Jakarta Sans from Google Fonts
- [Firebase](https://firebase.google.com) Authentication (email / password) and Realtime Database
- Service worker + web app manifest for the PWA
- Deployed as a static site (`vercel.json`)

## Running locally

The pages use ES modules and a service worker, so they must be served over HTTP, not opened as files.

```bash
cd website
npx serve .
# or
python3 -m http.server 3000
```

Open `http://localhost:3000`. Service workers work on `localhost` without HTTPS.

## Firebase setup

1. Create a Firebase project and add a **Web app**.
2. Turn on **Authentication → Sign-in method → Email/Password**. Google and GitHub sign-in are no longer used by the login page and can stay off.
3. Create a **Realtime Database**.
4. Put your Firebase config in the pages that initialise Firebase (`auth/login.html` and both dashboards).
5. Create your admin account in **Authentication → Users**, then use that account's UID as the admin UID in the database rules.
6. Publish the database rules (**Realtime Database → Rules → Publish**).

### Data layout

| Path | Purpose | Who can write |
|---|---|---|
| `users/<adminUid>/projects` | Projects | Admin |
| `users/<adminUid>/invoices` | Invoices | Admin |
| `users/<adminUid>/customers` | Customer records | Admin |
| `portal/<customerUid>` | Links a customer login to the admin and the projects shared with them | Admin |
| `quotes` | Quote requests from the website | Anyone can create, admin manages |
| `chats/<customerUid>` | Admin / customer messages | That customer and the admin |

Every field is validated in the rules, so adding a new field to the app (for example `disabled` on a customer) also means adding it to the rules, or the write is blocked with *"Blocked by the database rules"*.

### Customer accounts

The admin creates customer accounts from the dashboard. Each new customer receives a Firebase password-reset email to set their own password. Customers can only see projects the admin has shared with them. Disabling a customer signs them out and blocks login; deleting a customer removes them from the portal (their login stays in Firebase Authentication until deleted there).

## PWA

- **Installable pages:** login, admin dashboard and customer dashboard. `index.html` is not part of the app.
- **Start page:** set `"start_url": "/auth/login.html"` in `manifest.json` so the installed app always opens on the login page, with `"scope": "/"` so it can reach the dashboard folders.
- **Icons:** the five files in `icons/` are the EM logo on a dark background. The two `maskable` icons keep the logo inside the safe zone so Android can crop them to any shape.
- **Updating:** after changing icons or cached files, bump the cache version in `sw.js`, then remove and reinstall the app on your phone so the new files are picked up.

## Theming and responsiveness

- Light and dark themes share one storage key (`theme`) across all pages.
- The layout works from small phones to large desktops. The login page scrolls instead of clipping on short screens, and respects phone notches and home bars.

## Deployment

The site is static. Connect the repository to Vercel (or any static host) and deploy the `website` folder as the project root. After deploying, add your live domain to **Firebase → Authentication → Settings → Authorized domains**.

## Notes

- Keep the admin UID in the database rules in sync with the admin account you actually use.
- Customer accounts are created with a temporary password that the app sets, followed by a reset email. Change the temporary password in the dashboard code if you don't want a shared default.
- Firebase web config values are not secrets, but your database rules are what protect the data. Review them before going live.
