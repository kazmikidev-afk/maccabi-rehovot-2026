# Videos API (Cloudflare)

Source of the photo/video API behind https://maccabi-rehovot-api.pages.dev

- `videos-api-worker.js` - the Cloudflare Worker `maccabi-private-highlights` (esbuild bundle, deployed as-is). D1 binding `DB`, files in a private Backblaze B2 bucket.
- The Pages project `maccabi-rehovot-api` is only a thin gateway: a service binding `SERVICE` to this Worker.
- Last deployed: 2026-10-12 (Worker version 7cd91e6c), public viewing.

## Access rules
- Public, no sign-in: `GET /health`, `GET /games`, `GET /videos` (approved items only, no uploader data or storage figures), `POST /videos/:id/play` (approved items only, short-lived download link, counted against the daily transfer budget).
- Google sign-in + approved family: upload, `/me`, `/consent`, own pending items, report.
- Admin: moderate, delete, `/admin/*`.

## Deploy
Cloudflare dashboard > Workers & Pages > maccabi-private-highlights > Edit code, paste the file, Deploy. Bindings and secrets stay on the Worker.
