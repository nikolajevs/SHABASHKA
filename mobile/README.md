# Gigs mobile apps

This directory contains the two React Native applications planned for Gigs:

- `client` — the customer app for creating and tracking orders.
- `worker` — the employee app for accepting and completing assigned orders.

The client uses website email/password accounts and stores its session in SecureStore.
The worker app is still a scaffold; invitation-only employee access is planned, not implemented.

## Local setup

Both apps use Expo SDK 57. Use Expo Go for SDK 57 on the phone.
From the repository root, update and run the client in PowerShell:

```bash
git pull --ff-only
cd mobile/client
npm ci
npx expo start --clear
```

Set `EXPO_PUBLIC_API_URL` to the deployed Gigs API before connecting the apps to a backend.
For the worker app, use `mobile/worker` instead. Run each app in its own terminal.
The client supports registration, login, logout, session restoration, private order creation
and order history through `/api/mobile/auth` and `/api/mobile/client/orders`.
Orders are stored privately as `mobile-order` records, separate from public marketplace tasks.
Worker dispatch and the admin order view are not implemented yet.
Password recovery uses the website mail configuration; if mail is unconfigured it reports that honestly.
The current client screens are in Russian.

Orders include website categories, an EUR budget stored in integer cents, a city search
(Russian/Latvian names, with manual entry for villages), street details and an optional map pin.
The map works in Expo Go. Standalone Android builds require a Google Maps SDK key:
set `GOOGLE_MAPS_ANDROID_API_KEY` in the build environment, with restrictions for
`lv.gigs.client` and the build signing certificate. `app.config.js` passes it to the maps plugin.
See https://docs.expo.dev/versions/latest/sdk/map-view/ for certificate and API setup.
No location permission is needed to select a point manually. Foreground location is requested
only when the user taps “Моё местоположение”; background tracking is not enabled.

Local API integration checks: start the web backend, then run
`node scripts/test-mobile-client.mjs` with `TEST_ORIGIN` set to the local backend URL.
The current web application and admin panel remain in the repository root.
