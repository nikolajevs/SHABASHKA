# Privacy and notice-and-action implementation

The public Terms, privacy policy and cookie notice are drafts in Latvian, English and Russian. The user explicitly requested placeholders for the legal operator name, address and registration details. Contact: igors.nikos@gmail.com. Do not represent these drafts as completed GDPR/DSA compliance or a legal certification.

## User controls

- `/privacy`: authenticated JSON export, reversible deactivation and separately confirmed erasure. Blocked users can still exercise these controls.
- Export includes the requesting user's records and conversations already accessible to that user. It excludes other accounts, the moderation audit, reporter identities in complaints about the user, private receipt hashes and quota hashes.
- Deactivation sets `account.data.inactive`, hides public content and prevents writes. Reactivation preserves independent moderation blocks.
- Erasure runs as a D1 transaction. Removes the user's content, related conversations (including both sides), dependent bids/reviews, related reports and moderation snapshots. Resets references from other tasks to a departing provider's bid. Keeps a minimal account tombstone without name, role, email or authored content; an existing block is reduced to empty data rather than bypassed. A stale session cannot silently resurrect the account. Explicit re-registration requires accepting current terms again.
- Tombstones and associated minimal blocks expire at 30 days. Expired tombstones are cleaned during account-state/report/admin accesses. Report/notice records expire at 180 days and are cleaned on report/admin accesses. This is request-driven cleanup, not a hosted scheduled job; configure a monitored periodic cleanup invocation before commercial operation if deadlines must be independent of traffic.
- Erasure covers the primary application database, not independently saved recipient copies, identity-provider accounts, hosting logs or backups. Exact backup/log retention and handling of statutory exceptions must be confirmed by the operator before launch; do not promise deletion from third-party systems without that evidence.

## Reports

- A report link appears on actual task/profile cards and details. `/?item=ID` opens the specific public listing. Demo cards are excluded.
- Anyone can report without sign-in. The server requires a listing, detailed explanation, good-faith confirmation, name and email, with a contact exception for child sexual exploitation reports. No attachment uploads.
- The receipt uses a random 256-bit token in the URL fragment; only its SHA-256 hash is stored. Status requests send it as a header, not a query parameter. Knowing the report ID alone gives no access. The status route has no-referrer/noindex metadata and no-store responses.
- A per-hour network-address hash limits reports to 10 per hour. Raw IP is not saved. Old quota hashes are removed after an hour during cleanup. The quota insert is conditional in SQL to prevent concurrent bypass.
- The Russian admin panel has a report queue, human decision, required explanation and specific legal/rules basis. Decisions atomically update the report, hide content where appropriate, notify its author and append an audit entry. A unique decision audit ID prevents conflicting concurrent decisions. Reporter contacts are never included in author notices.
- Email acknowledgements and decisions are **manual**. The queue provides prepared mailto links and separate sent flags; the operator must actually send the email before marking it sent. No SMTP/transactional email service is connected. The implementation does not claim automatic email delivery.
- Review requests use the published contact email. Administrative moderation outside a report also requires a basis and creates an author notice.

## Cookies and agreement

- Only app preferences and sign-in are currently used; no analytics/ad scripts were added. The banner is informational, not a fabricated consent for nonexistent tracking. It can be reopened from the footer.
- `shabashka_locale`: one year, set on explicit language selection. `shabashka_cookie_notice`: 180 days, stores dismissal. SameSite=Lax; Secure on HTTPS.
- Host/authentication cookies, processing locations, transfer safeguards, processor agreements and backup/log retention are expressly marked as pending verification in the public draft.
- Registration requires unchecked acceptance of Terms and acknowledgement of the privacy policy; server stores `termsVersion` and `acceptedAt`. This is not blanket GDPR consent. Existing accounts without the current version must accept updated terms before marketplace writes; export/deactivation/erasure remain available.

## Verification

Local built-Worker suites: `test-market.mjs`, `test-admin.mjs`, `test-compliance.mjs`. Current passing totals: 38 + 67 + 70. Tests create only local fixture identities. `test-i18n.mjs` checks translations and rendered locale behavior. Never send test notices to a real email or delete production records during verification.

## Sources and operator completion

- [EU GDPR rights](https://commission.europa.eu/law/law-topic/data-protection/information-individuals_en)
- [Processing principles and privacy by design](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/principles-gdpr_en)
- [EU cookie guidance](https://europa.eu/youreurope/business/growing/digitalising/online-privacy/index_en.htm)
- [Digital Services Act, including Articles 14, 16 and 17](https://eur-lex.europa.eu/legal-content/en-fr/TXT/?uri=CELEX%3A32022R2065)

Before public commercial launch: replace operator placeholders, confirm lawful-basis assessments and processor/transfer arrangements, verify actual hosting cookies and retention, establish monitored notice/email and rights-request handling, and review the final Latvian legal text for the actual business. The application's source code alone cannot settle these organisational obligations.
