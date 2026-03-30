<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

## Description

NestJS backend for the stealth blockchain payment system.

## Installation

```bash
npm install
```

## Database setup (PostgreSQL for Prisma)

The API uses PostgreSQL at `localhost:5432` as configured in `.env`:

```env
DATABASE_URL="postgresql://apple@localhost:5432/crypto_gateway"
```

Start PostgreSQL and run Prisma:

```bash
# start local postgres (requires docker)
npm run db:up

# apply schema migrations
npm run prisma:migrate:deploy

# regenerate prisma client
npm run prisma:generate
```

If PostgreSQL is not running, Prisma will fail with `P1001`.

For customer AI chat (RAG), set:

```env
OPENAI_API_KEY="sk-..."
OPENAI_CHAT_MODEL="gpt-4.1-mini"
OPENAI_EMBEDDING_MODEL="text-embedding-3-small"
SUPPORT_WEBSITE_BASE_URL="https://your-customer-frontend.com"
SUPPORT_WEBSITE_AUTO_SYNC="true"
CHAT_DEBUG_LOGS="false"
# optional: comma-separated pages if you don't want sitemap/default auto-discovery
# SUPPORT_WEBSITE_URLS="/,/faq,/help,/support,/checkout"
```

`OPENAI_EMBEDDING_MODEL` is optional but recommended for better semantic retrieval from support knowledge pages/FAQs.
`SUPPORT_WEBSITE_BASE_URL` enables automatic website-to-RAG sync with no admin actions.

## Running the app

```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run start:prod
```

## Test

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# test coverage
npm run test:cov
```

## Crypto Gateway API (Mainnet + Testnet)

All merchant-facing routes require `x-api-key` header.

### 1) Bootstrap supported networks

```bash
curl -X POST http://localhost:3000/blockchain/networks/bootstrap
```

### 2) Register merchant and get API key

```bash
curl -X POST http://localhost:3000/merchant/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "merchant@example.com",
    "name": "My Store",
    "password": "Pass12345"
  }'
```

### 3) Generate invoice

```bash
curl -X POST http://localhost:3000/invoice \
  -H "Content-Type: application/json" \
  -H "x-api-key: <MERCHANT_API_KEY>" \
  -d '{
    "amount": "0.001",
    "currency": "ETH",
    "network": "BASE",
    "expiresInMinutes": 15
  }'
```

Merchant login:

```bash
curl -X POST http://localhost:3000/merchant/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "merchant@example.com",
    "password": "Pass12345"
  }'
```

### 4) Get invoices

```bash
curl -X GET "http://localhost:3000/invoice?status=PENDING&limit=20" \
  -H "x-api-key: <MERCHANT_API_KEY>"
```

### 5) Get one invoice

```bash
curl -X GET http://localhost:3000/invoice/<INVOICE_ID> \
  -H "x-api-key: <MERCHANT_API_KEY>"
```

### 6) Validate payment manually by tx hash

```bash
curl -X POST http://localhost:3000/payment/validate \
  -H "Content-Type: application/json" \
  -H "x-api-key: <MERCHANT_API_KEY>" \
  -d '{
    "txHash": "0x<64_hex_chars>",
    "network": "BASE",
    "invoiceId": "<INVOICE_ID>",
    "requiredConfirmations": 1
  }'
```

### 7) Get payments for an invoice

```bash
curl -X GET http://localhost:3000/payment/invoice/<INVOICE_ID> \
  -H "x-api-key: <MERCHANT_API_KEY>"
```

### 8) Merchant dashboard

```bash
curl -X GET "http://localhost:3000/merchant/dashboard?days=30" \
  -H "x-api-key: <MERCHANT_API_KEY>"
```

### 9) Super admin login

```bash
curl -X POST http://localhost:3000/super-admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@stealth.local",
    "password": "Admin12345"
  }'
```

### 10) Super admin dashboard

```bash
curl -X GET "http://localhost:3000/super-admin/dashboard?days=30" \
  -H "Authorization: Bearer <SUPER_ADMIN_JWT>"
```

### 11) Super admin wallet management (Gas + Fee)

```bash
# list wallets
curl -X GET http://localhost:3000/super-admin/wallets \
  -H "Authorization: Bearer <SUPER_ADMIN_JWT>"

# gas wallets
curl -X GET http://localhost:3000/super-admin/gas-wallets \
  -H "Authorization: Bearer <SUPER_ADMIN_JWT>"

# fee wallets
curl -X GET http://localhost:3000/super-admin/fee-wallets \
  -H "Authorization: Bearer <SUPER_ADMIN_JWT>"
```

Notes:
- Supported network codes:
  - Mainnet: `ETH`, `POLYGON`, `BINANCE`, `BASE`, `OP`
  - Testnet: `ETH_TESTNET`, `POLYGON_TESTNET`, `BINANCE_TESTNET`, `BASE_TESTNET`, `OP_TESTNET`
- Token flow is fully admin-managed from DB:
  - Add/edit tokens with `PUT /super-admin/networks/:networkId/tokens/:symbol`
  - Payment is accepted only for tokens configured on that network
  - Native token is auto-kept per network (`ETH`/`TRX`/etc), non-native tokens must be added by super-admin
- Network management for super-admin:
  - `GET /super-admin/networks`
  - `POST /super-admin/networks`
  - `PATCH /super-admin/networks/:networkId`
  - `DELETE /super-admin/networks/:networkId`
  - `POST /super-admin/networks/:networkId/activate`
- Only EVM and TRON network families are supported right now.
- Webhooks are intentionally not implemented yet.

## Customer AI Chat API (RAG over customer DB data)

Customer auth token is required (`Authorization: Bearer <CUSTOMER_JWT>`).

### Send message

```bash
curl -X POST http://localhost:3000/customer/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <CUSTOMER_JWT>" \
  -d '{
    "message": "What is the payment status of my last order?"
  }'
```

Continue same conversation:

```bash
curl -X POST http://localhost:3000/customer/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <CUSTOMER_JWT>" \
  -d '{
    "sessionId": "<CHAT_SESSION_ID>",
    "message": "Show me the related transaction hash also."
  }'
```

### List chat sessions

```bash
curl -X GET "http://localhost:3000/customer/chat/sessions?limit=20" \
  -H "Authorization: Bearer <CUSTOMER_JWT>"
```

### List messages in a session

```bash
curl -X GET "http://localhost:3000/customer/chat/sessions/<CHAT_SESSION_ID>/messages?limit=50" \
  -H "Authorization: Bearer <CUSTOMER_JWT>"
```

### Chat diagnostics (OpenAI + sync status)

```bash
curl -X GET "http://localhost:3000/customer/chat/diagnostics?liveCheck=true" \
  -H "Authorization: Bearer <CUSTOMER_JWT>"
```

## Support Knowledge Base APIs (Super Admin)

Use these APIs to push customer-frontend page content, FAQs, policies, and troubleshooting notes into chat RAG.

All routes require `Authorization: Bearer <SUPER_ADMIN_JWT>`.

### List knowledge entries

```bash
curl -X GET "http://localhost:3000/super-admin/chat-knowledge?limit=50&includeInactive=false" \
  -H "Authorization: Bearer <SUPER_ADMIN_JWT>"
```

### Create one knowledge entry

```bash
curl -X POST "http://localhost:3000/super-admin/chat-knowledge" \
  -H "Authorization: Bearer <SUPER_ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Checkout Payment FAQ",
    "sourceType": "FAQ",
    "sourcePath": "/help/checkout",
    "keywords": ["checkout", "payment", "invoice"],
    "content": "Order status moves from CREATED to PENDING_PAYMENT and then PAID after confirmations."
  }'
```

### Bulk import frontend/support pages

```bash
curl -X POST "http://localhost:3000/super-admin/chat-knowledge/import-batch" \
  -H "Authorization: Bearer <SUPER_ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "replaceBySlug": true,
    "items": [
      {
        "slug": "faq-payment-tracking",
        "title": "Payment Tracking FAQ",
        "sourceType": "FAQ",
        "sourcePath": "/faq/payment-tracking",
        "keywords": ["tx hash", "confirmations", "pending"],
        "content": "Ask customer for tx hash when payment is pending and verify network confirmation progress."
      },
      {
        "slug": "page-delivery-address",
        "title": "Delivery Address Help",
        "sourceType": "PAGE",
        "sourcePath": "/profile/addresses",
        "keywords": ["address", "default", "shipping"],
        "content": "Address must be active and belong to the authenticated customer."
      }
    ]
  }'
```

### Update one knowledge entry

```bash
curl -X PATCH "http://localhost:3000/super-admin/chat-knowledge/<ENTRY_ID>" \
  -H "Authorization: Bearer <SUPER_ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Updated support text..."
  }'
```

### Deactivate one knowledge entry

```bash
curl -X DELETE "http://localhost:3000/super-admin/chat-knowledge/<ENTRY_ID>" \
  -H "Authorization: Bearer <SUPER_ADMIN_JWT>"
```

## Automatic Website-to-RAG Sync (No Admin Action)

If `SUPPORT_WEBSITE_BASE_URL` is set, backend auto-ingests website pages into `SupportKnowledgeEntry`:

- Runs once on startup
- Runs periodically (`SUPPORT_WEBSITE_SYNC_INTERVAL_MS`, default 30 minutes)
- Also triggers background refresh when customer sends chat message

Optional tuning envs:

```env
SUPPORT_WEBSITE_SYNC_INTERVAL_MS="1800000"
SUPPORT_WEBSITE_MIN_SYNC_GAP_MS="300000"
SUPPORT_WEBSITE_FETCH_TIMEOUT_MS="12000"
SUPPORT_WEBSITE_MAX_PAGES="25"
SUPPORT_WEBSITE_MAX_CONTENT_CHARS="14000"
```
