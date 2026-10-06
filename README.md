# Lu's Shoe Farm (monorepo)

Next.js storefront + admin CMS (`apps/web`) and FastAPI + PostgreSQL API (`apps/api`), built from PRD V1.0.

## Run locally
```bash
npm install                                   # web deps (workspaces)
cp .env.example apps/api/.env                 # then edit; web vars go in apps/web/.env.local
npm run db:up                                 # Postgres via Docker
cd apps/api && python -m venv .venv && source .venv/Scripts/activate --> source .venv/bin/activate for linusandmacOS
pip install -r requirements.txt
python -m app.seed                            # demo products, slides, collections + admin user
cd ../.. && npm run dev:api                   # http://localhost:8000/docs
npm run dev:web                               # http://localhost:3000   (admin: /admin/login)
```
Seeded admin: `ADMIN_EMAIL` / `ADMIN_PASSWORD` from the API `.env` (defaults in `.env.example`). Change them.

## Paystack
- Placeholders: `PAYSTACK_SECRET_KEY` (API) and `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` (web).
- The API initialises each transaction server-side with `channels: ["bank_transfer"]` and the amount computed on the server; the web app opens the popup with the returned `access_code`.
- **Mock mode** (`PAYSTACK_MOCK=true` or a `*_placeholder` key): checkout auto-confirms payment so you can test the whole flow with no Paystack account. **Set `PAYSTACK_MOCK=false` before going live.**
- In the Paystack dashboard set the webhook URL to `https://<api-host>/api/v1/payments/paystack/webhook`. Signatures are verified (HMAC-SHA512). `GET /api/v1/payments/paystack/verify/{reference}` is the fallback the order page calls while waiting.

## Behaviour worth knowing
- Order lifecycle: `awaiting_payment` (hidden from admin) → **Pending** (blue, paid; stock deducted; receipt email) → **Shipped** (orange; tracking email) → **Received** (green). Transitions are forward-only.
- Stock is validated at order creation and deducted once, idempotently, on confirmed payment. If two buyers race for the last pair, the second order is flagged `OVERSOLD` in its notes for manual refund.
- Pricing is server-authoritative: subtotal, shipping, 7.5% VAT (estimate, added on top), total. Free shipping applies when state is Lagos and subtotal ≥ ₦200,000; pickup is free.
- Collection URLs are slugged from the name and don't change on rename unless you set a custom slug.
- Emails are logged to the API console unless `SMTP_*` is set.

## Migrations
Tables auto-create on API start for dev. For production: `cd apps/api && alembic revision --autogenerate -m init && alembic upgrade head`.
