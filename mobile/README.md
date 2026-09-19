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

Local API integration checks: start the web backend, then run
`node scripts/test-mobile-client.mjs` with `TEST_ORIGIN` set to the local backend URL.
The current web application and admin panel remain in the repository root.
