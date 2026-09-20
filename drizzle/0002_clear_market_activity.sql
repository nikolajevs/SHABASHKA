-- One-time cleanup explicitly requested by the site owner on 2026-09-20.
-- Retain accounts, provider profiles and authentication data needed for login.
DELETE FROM records
WHERE kind NOT IN ('account', 'profile', 'auth-identity', 'auth-session', 'auth-token', 'auth-oauth', 'auth-rate');
