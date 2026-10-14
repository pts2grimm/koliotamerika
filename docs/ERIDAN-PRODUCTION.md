# Eridan production rollout — 14 October 2026

Promote the tested Eridan application into the existing Hostinger application for https://koliotamerika.bg using the hostinger-preview branch.

## Production configuration

Set AUCTION_PROVIDER=eridan and provide ERIDAN_API_KEY in the production application's environment. GitHub Actions secrets do not propagate into Hostinger.

Keep NEXT_PUBLIC_SERVER_URL=https://koliotamerika.bg, SITE_INDEXABLE=true, PREVIEW_MODE=false.

Preserve the existing production DATABASE_URI, DATABASE_AUTH_TOKEN, PAYLOAD_SECRET, MEDIA_DIR, customer-account, SMTP and integration settings. Do not use staging database/media/credentials. Do not set ERIDAN_TEST_API_BASE_URL. No DNS change or domain transfer is needed.

The migration list and database fields are unchanged. Startup can import missing editorial drafts, apply the approved future article schedule to eligible drafts, and update the old default €900 delivery to €1000 once; custom edits and published articles are preserved by the existing guards.

## Validation

216 unit/migration tests, build, typecheck and two SEO browser tests passed for the release source. A broader browser run identified an assertion reading streamed results before readiness; it now polls for both actual auction badges instead of asserting an immediate empty snapshot. The complete catalogue/readiness suite and a bounded authenticated read-only Eridan API check run before promotion.

After Hostinger completes the deployment:
- Check home, catalogue cars and motorcycles/ATV, filtering, a current lot and archive.
- Check blog, existing CMS media, calculator and admin login.
- Confirm production robots permits crawling, canonical points to koliotamerika.bg and /sitemap-index.xml discovers the CMS plus four lot feeds.
- Confirm the temporary test domain remains noindex/disallowed.
- Submit https://koliotamerika.bg/sitemap-index.xml in Search Console. Lot feeds remain bounded to up to 48 per section, not the complete historical archive.

## Rollback

The pre-release code is preserved at backup/production-before-eridan-2026-10-14 (8becbbaf0c6c2168e784c2cfb1f428df4a8e005d). If reverting the deployment, restore AUCTION_PROVIDER=apicar together with the previous code and retained ApiCar credential. The old code does not implement Eridan. Startup editorial scheduling and the calculator default are data changes; rolling back code does not undo them.
