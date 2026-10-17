# Consent analytics and administration

The Eridan application now has an administrator-only overview at /admin. It replaces the default collection tiles, preserves the existing content editors, and uses the site's teal palette in light and dark themes.

## What the report measures

- The local choice in koa-consent remains the authority for enabling analytics/advertising scripts.
- Only an explicit button click sends a small first-party POST to /api/consent-choice. There are no banner impressions or page-view beacons.
- The journal records analytics/marketing booleans, the button action, policy version, server timestamp, and a server-HMACed random browser receipt. Necessary cookies are always enabled.
- If the customer is authenticated when they choose, the server attaches that customer's ID. It never trusts a customer ID from the request body, and never attributes older anonymous choices retrospectively.
- No IP, user agent, browsing path, advertising identifier, or fingerprint is kept in this journal. Profile name/email are read for administrators through the customer relation, not copied into each choice.
- A receipt identifies a browser store, not a person. Shared browsers, storage clearing and blocked localStorage affect the counts. Existing preferences are not backfilled.
- KPI/distribution counts use the last choice for each receipt *within the selected period*. Daily charts and history count actions including changes. These are not consent rates across all site visitors.
- Failed/blocked/rate-limited journal requests are absent. Saving the local choice and withdrawing tracking still work when the journal is unavailable.

## Data and access

The consent-events collection denies public/customer reads, public writes and all updates. The narrow POST uses validated booleans/actions/version, a 2 KiB streamed body limit, same-origin checks, server authentication for the optional customer relation, a unique event key, and atomic write limits (20 per receipt/hour and 5,000 total/hour). Repeat delivery of the same event is idempotent.

Only users-collection administrators can load the overview, collection, or CSV. CSV uses no-store headers, quotes cells, neutralizes spreadsheet formulas, and refuses exports above 10,000 matching rows instead of truncating silently. Date/filter state is included in the export.

The journal is retained for 180 days. Expired rows are deleted on the next successful journal request, authenticated overview or export. This is activity-triggered cleanup, not a wall-clock scheduled deletion job. The public cookie information describes this behavior. Deleting a customer nulls the relation, preserving only the browser receipt and choice until retention expiry.

The report uses Europe/Sofia calendar boundaries, including daylight-saving transitions. The maximum reporting window is 90 days; retained history is 180 days. Comparisons older than retained consent data cannot represent complete historical consent activity.

## Deployment and rollback

1. Deploy the reviewed branch through the normal Hostinger build/preparation process.
2. The registered, idempotent 20261017_120000_consent_events migration adds one table and indexes. It does not edit existing account, content or integration records.
3. The first report is empty. Choose cookies once on the public site and inspect the administrator history.
4. To check client association, sign into the customer garage, reopen cookie settings and make a new choice. Earlier anonymous records must stay anonymous.
5. On rollback, keep the consent table; the down migration deliberately preserves the audit. Old application code does not read it.

No GA/GTM configuration or advertising consent gate is changed. This journal is separate from external analytics. No live customer/account data is used by the tests.
