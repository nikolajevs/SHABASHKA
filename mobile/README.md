# Gigs mobile apps

This directory contains the two React Native applications planned for Gigs:

- `client` — the customer app for creating and tracking orders.
- `worker` — the employee app for accepting and completing assigned orders.

Both apps share the types and API client in `shared`. The worker app is invite-only;
employee accounts are created by the administrator after the employment contract is signed.

## Local setup

Install Expo and run each app from its directory:

```bash
npx expo start
```

Set `EXPO_PUBLIC_API_URL` to the deployed Gigs API before connecting the apps to a backend.
The current web application and admin panel remain in the repository root.
