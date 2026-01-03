<div align="center">

[日本語](README.md) | [English](README_EN.md)

</div>

# Emergency Call System - Web Client (emergency-call-client)

This repository is a **PWA (Progressive Web App)** that receives notifications via Web Push (VAPID) and transitions to a call UI when the notification is tapped.  
It is designed to work in conjunction with the backend (notification API).

- Client (this repository): https://github.com/curionlab/emergency-call-client
- Server (notification API): https://github.com/curionlab/emergency-call-server

---

## Quick Start (Get It Running Fast)

When running "client + server" locally, the server's default `CLIENT_URL` is `http://localhost:5173`, so starting the client on **port 5173** avoids confusion.

### 1) Start the Server
First, start the backend (emergency-call-server).  
For detailed instructions, refer to the server repository README:

https://github.com/curionlab/emergency-call-server

(The server runs on `http://localhost:3000` by default)

### 2) Start the Client (This Repository)
```bash
# Example: Run on port 5173
npx serve -l 5173
# Or (depending on your environment)
python3 -m http.server 5173
```

### 3) Access via Browser
Open `http://localhost:5173` and test as either Sender or Receiver.

---

## Repository Structure (Role Breakdown)

### index.html
The main application (UI + core logic).

- Contains Sender and Receiver screens
- Calls backend server APIs (`/login`, `/register`, `/send-notification`, etc.) using the entered server URL
- Receiver creates a Push subscription (PushSubscription) and registers it with the server
- When opened after a notification tap, reads URL query parameters (`autoAnswer`, `sessionId`, `senderId`) to enter auto-answer flow

### sw.js (Service Worker)
Receives Push notifications in the background, displays notifications, and controls notification click behavior.

- `push` event reads the payload and displays the notification
- `notificationclick` opens the `CLIENT_URL` (from notification payload's `url`) with `autoAnswer=true`, adding `sessionId` / `senderId` to the query so index.html can enter the call flow
- `pushsubscriptionchange` event automatically sends `/update-subscription` to the server when subscription info changes

### manifest.webmanifest
Metadata for PWA "Add to Home Screen" functionality.

- Defines app icon, name, display mode, etc.
- Referenced from `index.html` via `<link rel="manifest" href="manifest.webmanifest">`
- Serves as the definition file for installable PWA behavior

---

## Web Push Operation Notes (Important)

### Localhost Setup Works as an Exception
For development/testing purposes, you can run both client (static hosting) and server (API) on the same PC and receive Push notifications in the same PC's browser (browser support and notification permission required).

### PCs Can Also Receive Web Push
This system is not iPhone-exclusive. Any browser that supports Web Push can receive notifications on PC (desktop).

### External Server Only Needed for iPhone on Mobile Network
If you want notifications to reliably reach an iPhone on mobile network (outside your LAN), a localhost server won't be accessible, so you'll need an internet-accessible server (with fixed URL, HTTPS, CORS configuration, etc.).

---

## Configuration (Backend Server URL)

This client requires configuration of "which server to connect to."

### Basic Configuration
Enter the server URL in the `serverUrl` input field in the UI.

- Local development: `http://localhost:3000`
- Production: `https://your-server.example.com`

### About config.example.js
`config.example.js` is a template showing how to configure the backend URL.

- By default, the server is expected at `http://localhost:3000`
- For production, configure the backend URL according to this template

※Since this repository is primarily static hosting (index.html), you can choose whether to use "UI input" or "build-time embedding" for final configuration based on your project policy.

---

## Usage (With Server)

This section covers the minimal flow from "connecting client+server to receiving notifications."  
Detailed emergency call operations (video/voice calls) are managed in separate documentation.

### Sender Usage
1. Set `serverUrl` (e.g., `http://localhost:3000`)
2. Log in to server (`/login`)
3. Specify receiverId
4. (If needed) Generate auth code (`/generate-auth-code`) ※Valid for 30 minutes
5. Send emergency notification (`/send-notification`)

### Receiver Usage
1. Set `serverUrl` (e.g., `http://localhost:3000`)
2. Grant notification permission
3. Enter receiverId and authCode (**valid for 30 minutes**) and register (`/register`)
4. Upon successful registration, access token (valid 15 minutes) and refresh token (valid 30 days) are issued
5. Receive Push notification and tap to open PWA (sw.js adds URL parameters)
6. Enter auto-answer flow

---

## Subscription Auto-Update (Important)

Push subscription information can be updated or expire due to browser/OS changes.

### Current Implementation
The Service Worker monitors the `pushsubscriptionchange` event and automatically sends subscription updates to the server's `/update-subscription` endpoint when subscription info changes.

### Recommended Practice
Periodically send "health check notifications" to verify that subscriptions are alive.  
If a subscription has completely expired, you may need to re-register as a receiver (regenerate authCode → re-register).

---

## Common Local Setup Issues

### Client Port Mismatches Server's CLIENT_URL
The server's `CLIENT_URL` is used for "CORS permissions" and "notification click destination URL."  
If the server default is `CLIENT_URL=http://localhost:5173`, it's safest to run the client on port 5173.

Recommended setup:
- client: `http://localhost:5173`
- server: `http://localhost:3000`
- server environment variable: `CLIENT_URL=http://localhost:5173`

### Stale Service Worker Cache
If code changes don't reflect during development, Service Worker cache may be the cause.  
In developer tools, go to Application > Service Workers and "Unregister" then reload.

---

## Troubleshooting

### Notifications Not Arriving
1. **Check notification permission**: Is notification permission granted in browser settings?
2. **Is it a PWA**: On iPhone, are you opening the "PWA added to Home Screen" rather than Safari?
3. **Is Service Worker registered**: Check Application > Service Workers in developer tools
4. **Is server URL correct**: Check for typos in `serverUrl` (http/https difference, port number, etc.)
5. **CORS configuration**: Does the server's `CLIENT_URL` match this client's URL?

### Notifications Stopped Suddenly
- Subscription info may have expired. If auto-update failed, re-register.
- Check server logs for send failures (HTTP 410, etc.)

### Notifications Don't Work in Local Development
- `http://localhost` works for notifications, but `http://192.168.x.x` (local IP) may not work in some browsers
- If Service Worker cache is stale, "Unregister" from developer tools and reload

### Auth Code Won't Work
- Auth code validity is **30 minutes**. If expired, regenerate the code.

---

## ICE Server Configuration (WebRTC)

- **Current**: Client function `getIceServers()` returns STUN only
- **Future (planned)**: Retrieve short-term TURN credentials from server's `/ice-config` (not yet implemented)
- Passes `config: { iceServers }` to PeerJS instantiation (propagates to RTCPeerConnection)

---

## Technology Stack

- Web Push API + VAPID (notifications)
- Service Worker (push reception / notification click / subscription auto-update)
- WebRTC (calls)
- PeerJS (WebRTC signaling)

---

## Deployment Notes

### HTTPS Required
For production Push operations on iPhone, serve via HTTPS (required for PWA + Service Worker + Push).

### File Placement
- Verify that `manifest.webmanifest` and icons (`icons/icon-192.png`, etc.) are correctly placed
- Recommend placing `sw.js` in the **root directory** (sets Service Worker scope to root)

### Static Hosting Recommended
This repository is a static site, suitable for Cloudflare Pages, GitHub Pages, Netlify, etc.

---

## Security Notes

- **localStorage usage**: This client stores access tokens and refresh tokens in `localStorage`. To protect against XSS attacks, avoid embedding external scripts or displaying untrusted content.
- **VAPID private key is server-only**: Client handles public key only. Never place the private key on the client side.
- **Auth code management**: Keep auth codes confidential (valid for 30 minutes).

---

## Documentation

Details: https://github.com/curionlab/emergency-call-docs

---

## License

This project is licensed under the MIT License. See `LICENSE` for details.
