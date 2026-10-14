# Payment operations UX rebuild — 2026-10-14

Scope: Transactions, Incoming Receipts, Requests, Refunds, Invoices, Customers and Payment Links only. No financial SQL, billing or Android code changed in this branch.

## Implemented source
- Canonical /w/{workspaceId}/payments/transactions list and detail URLs. Legacy /payments/payments redirects; global record search also uses Transactions detail.
- Transactions/Incoming use a responsive, filterable, paginated real-data table, explicit original transaction versus received/verified times, Retry, offline, account-bound server API and permission-gated incoming reprocess. Dhaka +06:00 date-time filtering.
- Payment Requests: concise one-time creation, search and statuses, source-document editor collapsed but not deleted.
- Refunds: casework cards, seller decision drawer, expected_version and confirmed seller actions; no automatic transfer claim.
- Invoices/Customers: custom headings, creation CTA, search, clean cards and empty states, advanced CSV import. Invoice is explicitly created/issued; it is not fabricated after standalone payment. Customer is a saved merchant contact, not an inferred SMS sender.
- Payment Links: preserves functional creation/publish/archive/share workflow, with more compact responsive styling.
- EN/BN, semantic light/dark tokens, and mobile reflow remain.

## Safety and verification
- Isolated from main a4712477 onto codex/payment-operations-ux-main. The separate draft PR #50 includes unverified Go/PG57 payer-number changes and is NOT part of this UI-only branch.
- GitHub Actions PR run 38546270136: all four jobs (Go, Next, Kotlin, Docker) failed within four seconds with no recorded steps. Previous run 38541468224 was re-run; same before-step failure. This is NOT a passing build or a diagnosed source error.
- Vercel Ekmivo Hobby team returned 402 api-deployments-free-per-day (>100, retry in 24 hours) for preview. No compile or live browser verification of this new branch is available.
- Second GitHub account cannot access private masharzy/ekmivo (404); its easy-education repository is public and MUST NOT receive a private SaaS source dump.

## Manual / blocked release gates
- [ ] Next typecheck/build/lint via available runtime and actual authenticated screenshot at 320/375/768/1024/1440, EN/BN, Light/Dark/System, 200% zoom, keyboard.
- [ ] Full owner/admin/editor/viewer/cross-workspace, customer PII permission, 401/403/503/offline and expiry scenarios.
- [ ] Verify payment filters, pagination, Dhaka date boundaries, global search, old/new redirects and receipt reprocessing.
- [ ] Verify refund seller transitions with version conflicts, invoice creation/issue/part/full paid and customer create/import, public payment link publish/preview.
- [ ] Record Vercel preview READY and Render backend LIVE with exact SHA before production merge; test real workspace data.
- [ ] Audit and release PR #50 separately after Go security and database checks.

Status: Source implemented in draft PR #51; production acceptance BLOCKED by CI runner failures and Vercel quota. No tests claimed passed.