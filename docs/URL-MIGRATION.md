# WordPress URL compatibility

The 2026-10-11 audit in `reports/url-migration-2026-10-11/` is the historical baseline, not the status after these fixes.

## Preserved URLs

- 28 populated tag/category/author archives (50 URLs including pagination) retain their original paths. Each page has a self-referencing canonical, public article cards, navigation and CollectionPage JSON-LD.
- Membership comes from the live WordPress inventory captured on 2026-10-11 in `content/legacy-archives.json`. Titles, images and links come from current Payload records. Original source URLs preserve membership after a slug edit.
- Draft and scheduled articles are excluded by Payload public access, including archive counts and sitemap entries. Empty and unknown archives return 404; the two originally empty archives are not indexed.
- This inventory preserves historical groupings only. New articles are not automatically attributed to the old author or tagged; an editable taxonomy is separate future work.
- 68 original image URLs are restored under `public/wp-content/uploads/`. The manifest in `content/legacy-media.json` records source, dimensions, byte length and SHA-256. HTTP tests compare every served image with its recorded digest.
- Seven old XML sitemap endpoints permanently redirect to `/sitemap.xml`.
- Existing article/service redirects and trailing-slash normalization remain unchanged. Some old redirect URLs still take two hops.

## Storage

Static imported images are committed to Git and deployed with the application, so redeploy restores them. Turso stores content and media metadata, not image bytes.

New administration uploads use `MEDIA_DIR`, falling back to `public/media`. Before domain cutover, confirm that Hostinger points this at persistent storage outside replaceable build directories, upload a test image, redeploy, and verify that the image remains accessible. This repository cannot confirm Hostinger's actual disk settings. See `docs/HOSTINGER.md`.

No collection/schema migration or live database mutation is needed for these compatibility changes.

## Verification and domain cutover

`playwright.migration.config.ts` runs the production build against an isolated local database. It checks all 50 archive pages and 68 images, XML aliases, invalid routes, canonical URLs, mobile overflow, pagination, draft/scheduled access, and live editorial changes.

Before pointing the original domain to Hostinger:

1. Redeploy `hostinger-preview` and recheck the audit inventory against the deployed build.
2. Confirm persistent uploads as above and back up the current WordPress site and Turso database.
3. Configure the final public origin `https://koliotamerika.bg`, disable preview mode, and enable indexing only for the production domain. Keep preview URLs excluded from indexing.
4. Verify SSL, forms, admin/customer login, robots, sitemap and canonical origin, then switch DNS.
5. Submit the final sitemap in Search Console and monitor crawl errors. The domain remains the same; this is a hosting/platform move, not a Search Console Change of Address.

Do not delete the old hosting backup until the migrated site and uploaded files have been verified.
