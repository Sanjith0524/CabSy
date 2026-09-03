# Demo deployment

A public, no-login version of CabSy for recruiters / portfolio visitors.
Runs as its **own Vercel project against its own Turso database**, so nothing a
visitor does can touch the real student instance.

## How it behaves

When `NEXT_PUBLIC_DEMO_MODE=true`:

- Visiting the site **skips the login page entirely** — it auto-creates a
  throwaway guest account (no college-email check, no OTP) and lands you on the
  dashboard. A "Setting up your demo…" loader shows while that happens.
- If auto-entry fails, it falls back to the auth screen with an **"Explore the
  demo"** retry button.
- `https://cabsy-demo.vercel.app/?signin=1` bypasses auto-entry and shows the
  real sign-in form (for testing the actual auth flow).
- A **"Demo mode"** badge sits at the bottom of every page.
- The feed is pre-seeded with ~7 sample rides from fake students, some with chat
  and joined members.
- Guests can do everything: post rides, join, chat, get notifications.
- Housekeeping (the existing `/api/cron/sweep` + opportunistic sweep):
  - guest accounts and everything they created are deleted after 24h
  - the sample feed is wiped and reseeded with fresh upcoming dates whenever the
    seeded rides age out

With the flag off (the real deployment) `/api/auth/demo` returns 404 and none of
this renders.

## One-time setup

### 1. Create a separate Turso database

```sh
turso db create cabsy-demo
turso db show cabsy-demo --url            # -> TURSO_DATABASE_URL
turso db tokens create cabsy-demo         # -> TURSO_AUTH_TOKEN
```

(No schema step needed — `initDb()` builds every table on first request.)

### 2. Create a second Vercel project from this repo

- Vercel → Add New → Project → import the same GitHub repo
- Name it `cabsy-demo`
- Environment variables (Production):

  | key | value |
  |---|---|
  | `NEXT_PUBLIC_DEMO_MODE` | `true` |
  | `TURSO_DATABASE_URL` | *(demo db url from step 1)* |
  | `TURSO_AUTH_TOKEN` | *(demo db token from step 1)* |
  | `JWT_SECRET` | *(any fresh 48-char random string)* |
  | `NEXT_PUBLIC_APP_URL` | `https://cabsy-demo.vercel.app` |
  | `SMTP_USER` / `SMTP_PASS` | optional — only needed if you want demo emails to actually send |
  | `CRON_SECRET` | optional |

- Deploy. Both projects track `main`; every push builds both.

### 3. Put the demo URL on your resume / portfolio

`https://cabsy-demo.vercel.app` — no credentials to share.

## Notes

- The seed content lives in `src/lib/demo.ts` (`RESIDENTS`, `SEED_RIDES`) — edit
  there and redeploy.
- To force a reseed, clear the `meta` row `demoSeedAt` (or just wait for the
  seeded rides to expire).
