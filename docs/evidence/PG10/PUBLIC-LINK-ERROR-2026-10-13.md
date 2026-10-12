# Public payment-link error diagnosis

Owner screenshot/reference `wee`: production SQL confirmed active link, no
configured expiry/use limit, and zero ready receipt sources. The intent creation
guard raises `live source unavailable` with SQLSTATE 23514. Generic error mapping
incorrectly labelled it LOCKED_OR_EXPIRED. Financial safeguards remain intact.

Fix: distinguish source unavailable (503), link expiry (410) and use limit (409)
without leaking database messages. Public UI translates safe codes and removes
the unknown-outcome retry state for these explicit rejected transactions.
Payment-link entry excludes invoice-only line items/paid/due and print controls;
standalone merchant identity, amount, support links and form now have dedicated CSS.

Go TestDocumentStateErrorsAreDistinct, TypeScript no-emit and targeted ESLint passed. Device pairing, selected account,
permission and recent heartbeat still needed for real payment-link acceptance.
Do not bypass source readiness or report payment verification passed from this fix.
