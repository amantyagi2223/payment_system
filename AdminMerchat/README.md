## Crypto Gateway Dashboard

Next.js frontend for:
- Super admin dashboard
- Merchant dashboard

## Port setup

Run frontend and backend on different ports:
- Backend (`stealth_blockchain_paument_system`): `http://127.0.0.1:3000`
- Frontend (`crypto-gateway-dashboard`): `http://127.0.0.1:3001`

`package.json` is already configured for frontend port `3001`.

## Configure API URL

Create `.env.local` in this project:

```bash
cp .env.example .env.local
```

Default value points to backend on port `3000`.

## Run both projects

1. Start backend (in `stealth_blockchain_paument_system`):

```bash
npm run start:dev
```

2. Start frontend (in `crypto-gateway-dashboard`):

```bash
npm run dev
```

3. Open frontend:

```text
http://127.0.0.1:3001
```

## Current API integrations

- `POST /super-admin/login` from `/admin-login`
- `POST /merchant/register` from `/login`
- `GET /` health check shown on dashboard cards

## Payment currency management

- Admin page: `/admin/payment-currencies`
- Default core currencies (always active): `USDT`, `USDC`, `ETH`
- Merchants can only select currencies from admin-managed active list when creating/updating products.
- Each currency stores `USDT` rate.
- Manual sync button is available on admin page.

### Auto sync (every minute)

- Sync endpoint: `GET/POST /api/internal/payment-currencies/sync`
- Rates source: CoinGecko free API (`/api/v3/simple/price`)
- If `PAYMENT_RATES_SYNC_SECRET` (or `CRON_SECRET`) is set, include it in one of:
  - header `x-sync-secret`
  - `Authorization: Bearer <secret>`
  - query `?secret=<secret>`
- `vercel.json` includes a cron entry to run this endpoint every minute.

## Notes

- Merchant backend currently exposes register endpoint, not login endpoint.
- Middleware-based route protection is enabled for `/admin/*` and `/merchant/*`.
