# Property Inbox — Pencev Capital

Kanban-style property management inbox for Pencev Capital.  
Deployed via Cloudflare Pages, data served from `queue.json` in this repo.

## Live URL

Deployed at: https://property-inbox.pages.dev  
*(Connect via Cloudflare Pages → New Project → Connect Git → tankinsurance/property-inbox)*

## Data flow

```
Pencev Capital Gmail
       ↓
  heartbeat scan
       ↓
 memory/property-inbox/queue.json  (local workspace)
       ↓
 scripts/pencev-sync-queue.js  (runs after each scan)
       ↓
 queue.json  (this repo, main branch)
       ↓
 Cloudflare Pages  →  index.html fetches raw GitHub URL
```

## Data source

The UI fetches:
```
https://raw.githubusercontent.com/tankinsurance/property-inbox/main/queue.json
```

## Sync script

```bash
node scripts/pencev-sync-queue.js
```

Called from the Pencev Capital heartbeat after each email scan.  
Commits the latest `queue.json` to this repo.

## Properties

| ID | Address |
|----|---------|
| camillo-wa | 61 Amanda Drive, Camillo WA |
| west-wodonga-vic | 7 Schultz Ct, West Wodonga VIC |
| wilsonton-qld | 36 Catalina Dr, Wilsonton QLD |
| lavington-nsw | 379 Prune St, Lavington NSW |
| kirwan-qld | 13 President St, Kirwan (Townsville) QLD |

## Cloudflare Pages setup (manual)

1. Go to https://dash.cloudflare.com → Workers & Pages → Create application → Pages
2. Connect to Git → select `tankinsurance/property-inbox`
3. Framework preset: None
4. Build command: (leave blank)
5. Build output directory: `/` (root)
6. Deploy
