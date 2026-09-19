# Gigs mobile apps

This directory contains the two React Native applications planned for Gigs:

- `client` — the customer app for creating and tracking orders.
- `worker` — the employee app for accepting and completing assigned orders.

Both apps share the types and API client in `shared`. The worker app is invite-only;
employee accounts are created by the administrator after the employment contract is signed.

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
The mobile API routes are still pending; launching the interface does not yet enable real orders.
The current web application and admin panel remain in the repository root.
