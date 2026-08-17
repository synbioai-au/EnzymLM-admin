# SynBio Admin — Usage Limits Dashboard

Standalone Next.js admin dashboard for the EnzymeLM platform. Manages per-user,
per-model monthly request caps and shows usage. Deployed separately at
`admin-synbio.atriauniversity.ai`; it talks to the existing EnzymeLM API — this
repo contains **no backend**.

## Run locally

```bash
npm install
# point at the API (default: same-origin /api proxied to BACKEND_ORIGIN)
cp .env.example .env.local   # then edit
npm run dev                  # http://localhost:3002
```

## Configure the API base

- **Local:** leave `NEXT_PUBLIC_API_URL` unset — the browser uses same-origin
  `/api`, proxied by `next.config.ts` to `BACKEND_ORIGIN` (default
  `http://127.0.0.1:5000`).
- **Production:** set `NEXT_PUBLIC_API_URL=https://<your-api-host>/api`.

## Backend requirements

The API must expose the admin usage-limit routes (`/api/admin/models`,
`/api/admin/limits`, `/api/admin/usage`, `/api/admin/users/{id}/usage`) and
allow this origin in `CORS_ORIGINS`. Sign in with an admin account.

## Build

```bash
npm run build
npm start        # serves on :3002
```
