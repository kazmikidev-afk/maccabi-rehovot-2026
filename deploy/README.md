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

## Web push (added 2026-10-14)

The gateway (`gateway-worker.js`, deployed as `_worker.js` on Pages project `maccabi-rehovot-api`) also serves:

- `GET /push/key` - public VAPID key for the site's subscribe flow.
- `POST /push/subscribe` / `POST /push/unsubscribe` - stores/removes push subscriptions in D1 table `push_subs(endpoint TEXT PRIMARY KEY, p256dh, auth, ua, created_at)`.
- `POST /push/notify` - sends a notification to all subscribers. Header `x-notify-secret: <NOTIFY_SECRET>`, JSON body `{title, body, url, tag}`. Returns `{total, sent, gone, failed}`. Dead subscriptions (404/410 from the push service) are deleted automatically.

Config on the Pages project: D1 binding `DB` -> `maccabi-highlights`, secrets `VAPID_PRIVATE_JWK` and `NOTIFY_SECRET` (values in the family vault, entries `maccabi-push-vapid-private` and `maccabi-push-notify-secret`; VAPID public key is inlined in the gateway).

The next-game data lives in `data/next-game.json` in this repo; the daily monitoring agent updates it and then calls `/push/notify` if the game changed.

## Deploying the gateway

Dashboard zip upload broke on 2026-10-14 (stuck "Preparing upload", and folder upload renames the file with a counter prefix so `_worker.js` is not picked up). What works: `npx wrangler pages deploy <dir-with-_worker.js> --project-name=maccabi-rehovot-api --branch=main` with `CLOUDFLARE_ACCOUNT_ID=1537fb06002ba8f33a6724f30b913bd3` and a `CLOUDFLARE_API_TOKEN` that has Account.Cloudflare Pages:Edit (create a temp token in My Profile > API Tokens, delete it after). To roll back: Pages project > Deployments > pick an older deployment > Manage deployment > Rollback.
