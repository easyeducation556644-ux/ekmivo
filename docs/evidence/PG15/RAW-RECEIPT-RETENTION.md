# Raw receipt retention source — no execution evidence

Migration 0040 is unapplied. The default policy is **disabled**, with the documented 30-day proposal stored for operator review. No existing receipt has been erased by this work.

After the financial/business retention policy is reviewed, the database operator records its policy version, period and non-secret review reference. Only the database owner can change policy/holds; application readers and workers cannot edit those tables. Production release evidence must identify the approved policy and the backup expiry/restore procedure. Do not enable the proposal merely to obtain a green health check.

The bounded maintenance worker can destroy expired **raw ciphertext** for resolved normalized receipt observations. Pending unparsed observations are excluded and need their own resolution/retention decision. Per-workspace or per-evidence holds block erasure until their recorded expiry. Operators use `pg15_hold_evidence` to serialize holds with the cleanup job.

Erasure records old/new ciphertext hashes and policy version in an immutable, tenant/realm-bound redaction ledger. The original source digest, transaction time, payer/account hashes, amounts, allocations, payment status and domain events remain unchanged. The financial history trigger accepts only that exact pre-recorded ciphertext transition; later arbitrary ciphertext edits and all financial field changes still fail. The destroyed ciphertext cannot be re-parsed or decrypted; the UI must never imply the raw receipt remains available.

Required disposable PostgreSQL checks are in `pg10-extension-smoke.mjs`: disabled policy, reviewed expiry, preserved source digest, arbitrary second edit rejected and an active hold. They are **written, not executed**. Wrong realm, concurrency, backup restore after erasure and explicit policy/hold audit checks remain required before production approval.

This is one retention store, not a complete workspace privacy/deletion implementation. Documents, versions, customer/refund contacts, queues, private files, logs, devices, control-plane data and backup copies must be covered by the full registry and request execution before that gate closes.
