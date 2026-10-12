# PG16 release-support source checkpoint — not accepted

Evidence validator distinguishes real cohort days from simulations, checks observed transaction counts and rejects unresolved high/critical incidents. No cohort day or transaction is fabricated.

OPEN code: complete cohort record intake/validation workflow and provider/device evidence matrix. Actual consented devices, real transactions and 7–14 observed days remain mandatory external evidence after source completion.

## Local source continuation — 2026-10-12

`tools/release/compile-cohort.mjs` now assembles only individually recorded, consented operator observations. It rechecks retained evidence hashes and paths, the Bangladesh observation day, seven-day continuity and unresolved high/critical incidents, then emits an explicit `review_ready` flag. Syntax passed; no actual cohort records or devices were supplied, so no PG16 gate is passed.
 One fictional filesystem test passes: a single observed day remains not ready and tampered evidence is rejected. CI now runs this check.
