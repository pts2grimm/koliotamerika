#!/usr/bin/env python3
"""Encrypted Payload schema backup; restores only to an isolated localhost database."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone
from urllib.parse import urlsplit, unquote

PROJECT = "jiyjkhdcngzpvdxbiprs"
IMAGE = "postgres:17"
STAGE = "configuration"

def run(args, env=None, data=None):
    # Capture subprocess errors: pg_restore can include private SQL row values.
    p = subprocess.run(args, input=data, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                       env=env, timeout=600)
    if p.returncode:
        raise RuntimeError("subprocess exit " + str(p.returncode))
    return p.stdout

def pg(work, connection, command, args, data=None):
    env = dict(os.environ)
    env.update(connection)
    keys = sorted(connection)
    return run(["docker", "run", "--rm", "--network", "host", "-i", "--user", str(os.getuid()) + ":" + str(os.getgid()),
                "-v", str(work) + ":/backup"] +
               [part for key in keys for part in ("-e", key)] +
               [IMAGE, command] + args, env=env, data=data)

def local(database):
    return dict(PGHOST="127.0.0.1", PGPORT="5433", PGUSER="postgres",
                PGPASSWORD="local-backup-test-only", PGDATABASE=database,
                PGSSLMODE="disable", PGCONNECT_TIMEOUT="15")

def sql(work, connection, query):
    return pg(work, connection, "psql", ["-X", "-v", "ON_ERROR_STOP=1", "-At"],
              query.encode())

def source_config(uri):
    u = urlsplit(uri)
    if u.scheme not in ("postgres", "postgresql"):
        raise ValueError("PostgreSQL URI required")
    host = u.hostname or ""
    username = unquote(u.username or "")
    allowed = (host == "db." + PROJECT + ".supabase.co" and username == "postgres") or (
        host.endswith(".pooler.supabase.com") and username == "postgres." + PROJECT)
    if not allowed or u.port != 5432 or u.path != "/postgres" or not u.password:
        raise ValueError("Expected project Session pooler or direct connection on port 5432")
    return dict(PGHOST=host, PGPORT="5432", PGUSER=username,
                PGPASSWORD=unquote(u.password), PGDATABASE="postgres",
                PGSSLMODE="verify-full", PGSSLROOTCERT="/backup/ca.crt",
                PGCONNECT_TIMEOUT="15",
                PGOPTIONS="-c default_transaction_read_only=on -c statement_timeout=300000")

def main():
    global STAGE
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    options = parser.parse_args()
    os.umask(0o077)
    key = secrets.token_hex(32) if options.self_test else os.environ.get("BACKUP_ENCRYPTION_KEY", "")
    if len(key) < 32 or "\n" in key or "\r" in key:
        raise ValueError("BACKUP_ENCRYPTION_KEY must contain at least 32 characters, without newlines")
    source = local("backup_fixture") if options.self_test else source_config(
        os.environ.get("SUPABASE_DATABASE_URL", ""))
    if not options.self_test and os.environ.get("GITHUB_REF") != "refs/heads/eridan-staging":
        raise ValueError("Production backups run only from eridan-staging")
    with tempfile.TemporaryDirectory(prefix="koa-backup-") as temp:
        work = Path(temp)
        ca_source = Path("src/lib/supabase-ca.ts").read_text()
        (work / "ca.crt").write_text(json.loads(ca_source.split("export const supabaseCA = ", 1)[1]))
        if options.self_test:
            STAGE = "fixture"
            sql(work, local("postgres"), "CREATE DATABASE backup_fixture;")
            sql(work, source, """
CREATE SCHEMA payload;
CREATE TYPE payload.state AS ENUM ('draft', 'done');
CREATE TABLE payload.users (id serial PRIMARY KEY, email text, settings jsonb, enabled boolean, created_at timestamptz);
INSERT INTO payload.users VALUES (7, 'private-fixture@example.invalid', '{"language":"bg"}', true, '2026-10-22T12:00:00Z');
SELECT setval('payload.users_id_seq', 7);
CREATE TABLE payload.bills_of_sale (id serial PRIMARY KEY, buyer integer REFERENCES payload.users(id), amount numeric(12,2), state payload.state);
INSERT INTO payload.bills_of_sale (buyer, amount, state) VALUES (7, 1269.25, 'done');
CREATE TABLE payload.invoices (id serial PRIMARY KEY, buyer integer REFERENCES payload.users(id));
INSERT INTO payload.invoices (buyer) VALUES (7);
""")
        STAGE = "isolated restore database preflight"
        # Never restore into a configured remote target. This destination is fixed.
        sql(work, local("postgres"), "CREATE DATABASE backup_verify;")
        STAGE = "read-only source dump"
        pg(work, source, "pg_dump", ["--format=custom", "--schema=payload", "--no-owner",
                                    "--no-privileges", "--lock-wait-timeout=10000",
                                    "--file=/backup/payload.dump"])
        STAGE = "encrypt"
        gpg_home = work / "gnupg"
        gpg_home.mkdir(mode=0o700)
        gpg = ["gpg", "--batch", "--yes", "--no-symkey-cache", "--homedir", str(gpg_home),
               "--pinentry-mode", "loopback", "--passphrase-fd", "0"]
        passphrase = (key + "\n").encode()
        run(gpg + ["--symmetric", "--cipher-algo", "AES256", "--s2k-mode", "3",
                   "--s2k-count", "65011712", "--output", str(work / "payload.dump.gpg"),
                   str(work / "payload.dump")], data=passphrase)
        STAGE = "decrypt round trip"
        run(gpg + ["--output", str(work / "verified.dump"), "--decrypt",
                   str(work / "payload.dump.gpg")], data=passphrase)
        digest = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
        if digest(work / "payload.dump") != digest(work / "verified.dump"):
            raise ValueError("Encryption round trip mismatch")
        STAGE = "isolated restore"
        pg(work, local("backup_verify"), "pg_restore", ["--dbname=backup_verify",
            "--exit-on-error", "--single-transaction", "--no-owner", "--no-privileges",
            "/backup/verified.dump"])
        STAGE = "restored data checks"
        sql(work, local("backup_verify"), """
DO $$ BEGIN
 IF to_regclass('payload.users') IS NULL OR to_regclass('payload.bills_of_sale') IS NULL
    OR to_regclass('payload.invoices') IS NULL THEN RAISE EXCEPTION 'Missing application tables'; END IF;
 IF NOT EXISTS (SELECT 1 FROM payload.users) THEN RAISE EXCEPTION 'Missing administrators'; END IF;
END $$;
""")
        if options.self_test:
            sql(work, local("backup_verify"), """
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM payload.users WHERE id=7 AND enabled AND settings->>'language'='bg'
   AND created_at='2026-10-22T12:00:00Z') THEN RAISE EXCEPTION 'Value mismatch'; END IF;
 IF NOT EXISTS (SELECT 1 FROM payload.bills_of_sale WHERE buyer=7 AND amount=1269.25 AND state='done')
   THEN RAISE EXCEPTION 'Relation mismatch'; END IF;
 IF nextval('payload.users_id_seq')<>8 THEN RAISE EXCEPTION 'Sequence mismatch'; END IF;
END $$;
""")
        else:
            STAGE = "publish encrypted files locally"
            out = Path("backup-output")
            out.mkdir(mode=0o700, exist_ok=False)
            timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
            filename = "payload-" + timestamp + ".dump.gpg"
            shutil.copyfile(work / "payload.dump.gpg", out / filename)
            manifest = dict(createdAt=timestamp, schema="payload", format="pg_dump custom + GPG AES256",
                            encryptedFile=filename, sha256=digest(out / filename),
                            restoredSuccessfully=True, commit=os.environ.get("GITHUB_SHA"))
            (out / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
        print("PASS: encrypted backup decrypted identically and restored into isolated PostgreSQL.")
        if options.self_test:
            print("PASS: JSON, timestamps, booleans, decimal amounts, relations and sequences preserved.")

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        # Never log exception text: URI parsing / SQL tools may include credentials or data.
        print("Backup failed at stage: " + STAGE + " (" + type(error).__name__ + ")", flush=True)
        raise SystemExit(1)
