# Supabase backups

The workflow `.github/workflows/supabase-backup.yml` exports the application's complete `payload` schema using PostgreSQL 17 pg_dump, encrypts it with GPG AES256, verifies decryption byte-for-byte, and restores it into an isolated disposable PostgreSQL service before uploading the encrypted artifact. Production is read-only throughout. No production restore is implemented.

## Activation

1. Set GitHub Actions secret `SUPABASE_DATABASE_URL` to the current verified Session pooler URI for project `jiyjkhdcngzpvdxbiprs`, port 5432.
2. Add `BACKUP_ENCRYPTION_KEY`: a password-manager-generated random password of at least 32 characters without line breaks. Keep an independent copy in a password manager. GitHub cannot reveal a saved secret. Losing this key makes the encrypted archives unusable.
3. Make `eridan-staging` the repository default branch. GitHub schedules only run on the default branch. Do not merge the old hostinger-preview application into it.
4. Merge the backup PR into eridan-staging. The push starts the first backup. Confirm both jobs pass and an artifact exists. Later runs can be started from Actions → Encrypted Supabase backup → Run workflow.
5. Enable GitHub Actions failure notifications in your GitHub notification settings. Check the latest successful artifact regularly; an enabled schedule alone is not proof of a backup.

Schedule: daily at 02:23 UTC (04:23 Bulgarian winter time / 05:23 summer time). GitHub may delay scheduled jobs and disables public-repository schedules after 60 days without repository activity. This is best-effort daily protection, not guaranteed point-in-time recovery.

Retention: 14 days in GitHub Actions artifacts. The repository is public, so artifact encryption is mandatory. Only ciphertext and a non-sensitive manifest are uploaded. Download periodic encrypted copies to independent storage if longer retention is required. Store the encryption password separately. If rotating it, retain old keys for old archives.

## Scope

Includes tables, rows, indexes, constraints, enums and sequences in `payload`, including administrators, password hashes, BOS/invoices, CMS settings, consent and catalogue logs. PostgreSQL roles/ownership/grants are intentionally excluded for portable restoration.

Does **not** include Hostinger media files, environment secrets (especially PAYLOAD_SECRET), Supabase Auth/Storage schemas, storage objects, roles or provider settings. Media and secrets need separate backups. Preserve existing Turso export and database during the transition.

Source TLS is verified with the bundled Supabase CA. The script accepts only the configured project and port 5432; credentials are passed to pg tools through environment variables, not command-line URLs. Subprocess output is captured to keep private SQL out of logs. Plaintext exists only in a private temporary directory on the disposable runner and is removed even on handled failure; no plaintext artifacts are uploaded.

## Recovery procedure

Do not restore over the live database as a first step.

1. Download the encrypted artifact from a successful run. Verify the ciphertext SHA-256 against `manifest.json`.
2. On a trusted machine with GnuPG, decrypt with an interactive password prompt:
   `gpg --output payload.dump --decrypt payload-YYYYMMDDTHHMMSSZ.dump.gpg`
3. Create an empty isolated PostgreSQL 17 database. Use local protected connection settings / a permission-0600 pgpass file, not passwords in shell history.
4. Restore: `pg_restore --exit-on-error --single-transaction --no-owner --no-privileges --dbname=restore_test payload.dump`
5. Before exposing it, reapply the application's private-schema access restrictions: deny PUBLIC, anon and authenticated access to schema payload (where those roles exist); use the reviewed operational migration as the reference.
6. Check admin login with the original PAYLOAD_SECRET, CMS content, invoice/BOS PDFs, relations and row counts. Restore matching media files separately.
7. Plan the production switch with writes paused and reconcile any records created since the backup. Retain the current database for rollback. Delete temporary plaintext copies securely according to the machine's storage policy.

Reference: [Supabase backups](https://supabase.com/docs/guides/platform/backups), [pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html), [GitHub schedules](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).
