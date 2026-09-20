-- The web marketplace no longer collects structured financial terms.
UPDATE records SET data = json_remove(data, '$.price', '$.budget', '$.budgetCents', '$.currency')
WHERE kind IN ('task', 'profile', 'bid');
