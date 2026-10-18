# Website security — 2026-10-18

## Implemented controls
- Payload staff access for administrator data, BOS/PDF, inquiries, consent/catalogue history and integration settings. Customer access is separate. GraphQL is disabled.
- Administrator bootstrap via /api/users/first-register requires explicit ALLOW_ADMIN_SETUP=true independently of customer-account enablement. Provisioning through INITIAL_ADMIN_EMAIL/PASSWORD still works. Leave setup disabled on the live site.
- Administrator authentication: 16 KiB streamed limit for JSON and Payload's native multipart authentication forms (one _payload field, no files); credential length/type checks; cross-origin browser rejection; persistent HMAC limits (30 attempts/IP/action/hour, shared fallback 120; email 15/hour, password recovery 5/hour). Existing five failed logins/10-minute lock remains.
- Customer login/registration/reset and inquiries now reserve their limits atomically before the operation. Concurrent requests cannot exceed a key's quota. Existing inquiry quota keys remain valid across deployment.
- submission_limits stores HMAC keys only, expires after one hour, maximum 20,000 active reservations. Capacity/storage failure prevents protected operations. No raw passwords, reset tokens, emails or IPs in this limiter.
- Inquiry honeypot, schema/body bounds, exact Origin and cross-site checks, existing awaited SMTP notifications preserved.
- Early 404 for obsolete PHP/WordPress executable paths and requests for .env/version-control files. Migrated uploads, sitemap redirects and normal catalogue pages remain accessible.
- CSP base-uri/object-src/frame-ancestors/form-action, nosniff, referrer policy, restricted camera/microphone/geolocation; HSTS for configured HTTPS origin only, without includeSubDomains/preload. This is a baseline CSP, not a full script-src XSS policy.
- Upstream catalogue caching, two-request concurrency and the shared 15-second deadline remain in place; the pending Eridan queue is now capped at 32 per process to bound memory during bursts. Cookie consent is not required for security limits. No User-Agent-based exemption.

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
The 2026-10-18 audit initially found 9 affected dependency entries (1 high, 6 moderate, 2 low, including inherited findings). Patched overrides: Nodemailer 10.0.9, DOMPurify 3.4.16 and esbuild 0.28.1 specifically under @esbuild-kit/core-utils. The resolved lockfile audit reports zero known vulnerabilities. Production build, migrations and SMTP regressions validate compatibility; do not use npm audit fix --force on production.

## Primary references
- https://www.hostinger.com/support/10695636-hostinger-cdn-security-levels/
- https://www.hostinger.com/support/hostinger-cdn-search-engine-crawlers-and-seo/
- https://www.hostinger.com/support/hostinger-cdn-how-to-fix-blocked-legitimate-requests/
- https://www.hostinger.com/support/hostinger-cdn-visitor-ip-addresses-in-logs-and-analytics/

## Catalogue anti-scraping controls — 2026-10-18
- Count GET/HEAD at Next Proxy for /targove (including archives, motorcycles/ATV and vehicle details) and /api/auction-models. One boundary request, not every internal service call. Prefetch/RSC requests consume quota; spoofing prefetch headers does not bypass protection. Requests served entirely by the CDN are not seen.
- Default 120 requests per fixed minute and 1200 per fixed hour, shared across these routes for a trusted IPv4 or IPv6 /64. Counts include rejected attempts. Fixed windows allow bursts at the boundary. Shared NAT users share a quota; these conservative starting limits must be reviewed using real traffic.
- CATALOG_RATE_PER_MINUTE (30–1000) / CATALOG_RATE_PER_HOUR (300–20000) customize quotas. CATALOG_GUARD_MODE=observe records would-block decisions, off bypasses it; default enforce returns 429 with Retry-After/private no-store. No noindex added to temporary rate-limit responses.
- Requires TRUST_PROXY=true behind controlled ingress. Missing/invalid trusted IP skips the per-IP guard rather than blocking every user under a shared identity. Never enable it on a directly exposed origin that accepts arbitrary X-Real-IP.
- Atomic shared SQLite/Turso hourly counters survive restarts and multiple instances. Up to 50,000 hourly IP groups, retained 7 days; expiry cleanup on traffic (hourly) and admin reports. At full capacity existing groups continue updating; new groups get temporary 503. The private table has no public REST collection.
- Staff-only report under API log → Anti-scraping protection: hourly request totals, over-quota counts, most recent IP, claimed User-Agent (300-character maximum), route category and verified crawler. No raw URL/query, VIN, cookies or customer linkage. Over-quota totals mean blocked only in enforce mode; historical mode switches should be considered. Infrastructure failures/concurrency rejection may not be in this report.
- Googlebot/Google-InspectionTool/Bingbot exemptions require a provider-owned PTR hostname AND matching forward resolution. Generic Google Cloud or Amazon hostnames and spoofed User-Agent do not qualify. DNS verification has a 1.8s deadline, eight simultaneous lookups, single-flight by IP/claim, 2,000-entry cache (positive 1 hour, negative 5 minutes). A failed verification uses ordinary quota, not an unconditional block.
- At most 32 concurrent guard operations per process; 4s response deadline, retain occupied slots until actual operations settle. Unavailable protection storage returns 503 for catalogue routes; home/blog/robots/sitemaps/admin remain available. Edge rate limits are still needed for distributed DDoS and volumetric floods; DB cost and latency should be monitored.
- ClaudeBot and Claude-SearchBot get Crawl-delay:5 while retaining existing private-path exclusions. This is a cooperative robots directive, not a firewall or a guaranteed global request rate. Google/Bing robots rules and sitemaps are unchanged.
- No CAPTCHA provider, country blacklist, IP blacklist, DNS, secret, or CDN configuration change. No guarantee against copying public data. Preview mode stays isolated and disallows admin/API as before.
References:
https://developers.google.com/crawling/docs/crawlers-fetchers/verify-google-requests
https://www.bing.com/webmasters/help/how-to-verify-bingbot-3905dc26
https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler
