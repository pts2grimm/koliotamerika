# Titan SMTP notifications

Inquiry persistence and email delivery are independent. The public success response confirms persistence, not inbox delivery. Notifications run in Next.js after() and retain that behavior.

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
