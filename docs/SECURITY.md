# Website security — 2026-10-18

## Implemented controls
- Payload staff access for administrator data, BOS/PDF, inquiries, consent/catalogue history and integration settings. Customer access is separate. GraphQL is disabled.
- Administrator bootstrap via /api/users/first-register requires explicit ALLOW_ADMIN_SETUP=true independently of customer-account enablement. Provisioning through INITIAL_ADMIN_EMAIL/PASSWORD still works. Leave setup disabled on the live site.
- Administrator authentication: 16 KiB streamed JSON limit; credential length/type checks; cross-origin browser rejection; persistent HMAC limits (30 attempts/IP/action/hour, shared fallback 120; email 15/hour, password recovery 5/hour). Existing five failed logins/10-minute lock remains.
- Customer login/registration/reset and inquiries now reserve their limits atomically before the operation. Concurrent requests cannot exceed a key's quota. Existing inquiry quota keys remain valid across deployment.
- submission_limits stores HMAC keys only, expires after one hour, maximum 20,000 active reservations. Capacity/storage failure prevents protected operations. No raw passwords, reset tokens, emails or IPs in this limiter.
- Inquiry honeypot, schema/body bounds, exact Origin and cross-site checks, existing awaited SMTP notifications preserved.
- Early 404 for obsolete PHP/WordPress executable paths and requests for .env/version-control files. Migrated uploads, sitemap redirects and normal catalogue pages remain accessible.
- CSP base-uri/object-src/frame-ancestors/form-action, nosniff, referrer policy, restricted camera/microphone/geolocation; HSTS for configured HTTPS origin only, without includeSubDomains/preload. This is a baseline CSP, not a full script-src XSS policy.
- Existing upstream catalogue caching/concurrency/timeouts remain in place. Cookie consent is not required for security limits. No User-Agent-based exemption.

## Hostinger — outside repository
Owner confirmed CDN enabled with Security=Medium on 2026-10-18. No hPanel changes made by this PR.
Keep Medium for normal operation and verify admin login, reset, inquiry, uploads, catalogue and GSC live URL inspection after deployment.
Under Attack is temporary for an actual attack; it can challenge crawlers and API traffic.
Do not blanket-block USA/Canada or Google/Bing, or trust a Googlebot User-Agent as proof.
For false positives collect path/method/time and x-hcdn-request-id; ask Hostinger for a precise exception, not a global API bypass.
TRUST_PROXY=true is appropriate only behind controlled Hostinger ingress: X-Real-IP or last X-Forwarded-For. Do not expose the Node origin directly or add another proxy without reviewing this assumption.
Do not stack Cloudflare in front of Hostinger CDN casually: this changes the IP trust boundary.
DDoS/network firewall protections must operate at the hosting edge; application checks do not replace them.

## Operational checks
Keep ALLOW_ADMIN_SETUP=false after provisioning; enable MFA on hosting/GitHub/email accounts and review account access. Check Turso and media backup/restore coverage separately (not assumed from a hosting backup).
No secrets or DNS changes are included. This review does not establish that the site is immune to attacks.
Dependency findings and automated checks are recorded in the PR; do not use npm audit fix --force on production.

## Primary references
- https://www.hostinger.com/support/10695636-hostinger-cdn-security-levels/
- https://www.hostinger.com/support/hostinger-cdn-search-engine-crawlers-and-seo/
- https://www.hostinger.com/support/hostinger-cdn-how-to-fix-blocked-legitimate-requests/
- https://www.hostinger.com/support/hostinger-cdn-visitor-ip-addresses-in-logs-and-analytics/
