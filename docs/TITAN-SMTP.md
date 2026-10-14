# Titan SMTP notifications

Inquiry persistence and email delivery are independent. The public success response confirms persistence, not inbox delivery. Notifications now start and are awaited in the request, after persistence and before HTTP 201. The wait is capped at 12 seconds; the form still confirms the saved inquiry after an SMTP error or deadline. Analytics alone remain in Next.js after(). Fixed diagnostic messages go directly to stdout/stderr instead of Payload's buffered logger.

Nodemailer's interface detection may report "Failed to resolve IPv4 addresses with current network" in constrained runtimes. allowInternalNetworkInterfaces permits DNS resolution when only loopback interfaces are visible; it does not invent an IP, disable TLS validation, fix a firewall, or guarantee delivery. The installed transport support is checked in CI. SMTP on port 587 now requires STARTTLS. Connection/DNS/greeting/idle timeouts are bounded.

After deploying, submit one new test inquiry. Look for:
- Inquiry notification started.
- skipped: SMTP_HOST or SMTP_FROM is missing at runtime.
- skipped: configure the site contact email.
- failed: dns / authentication / timeout / connection / tls / recipient_rejected / message_rejected / unknown.
- accepted by SMTP; inbox delivery is not confirmed.

Only fixed categories are logged. Never enable raw SMTP debug in production or paste credentials, error response bodies, or customer details. SMTP acceptance does not prove inbox delivery; check recipient/spam if accepted.

SMTP_HOST=smtp.titan.email, SMTP_PORT=465, SMTP_FROM and SMTP_USER must match the Titan mailbox, SMTP_PASSWORD is that mailbox's secret. Enable Titan on Other Apps. Recipient is Site Settings -> contact email. Hostinger runtime values and outbound access cannot be verified from GitHub CI. No live mail is sent by these tests. Already-saved inquiries are not automatically resent.

References:
- https://nodemailer.com/smtp
- https://support.titan.email/hc/en-us/articles/4405162224665-Configuring-Titan-on-Email-Scripts
- https://nextjs.org/docs/app/api-reference/functions/after

A wait_timeout means the result is unknown, not definitively failed: an already-started SMTP transaction may finish later. No automatic retries are performed. A recipient lookup that finishes after the deadline cannot initiate a new send. This is bounded best-effort delivery, not a durable queue.

GET /api/inquiry remains non-mutating and returns 405 with X-Inquiry-Handler: smtp-awaited-v1 (also present on successful POST). This marker verifies deployment without exposing configuration or creating an inquiry. Production HTTP tests use only a loopback SMTP sink and an isolated temporary SQLite database; they verify actual SMTP acknowledgement before HTTP success, preservation on refusal/timeout, and privacy-safe logs.
