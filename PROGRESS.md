# Ekmivo Android rebuild — execution ledger

Current phase: **3 (permissions, Setup Health, Done)**.
Acceptance: **OPEN** until Android build, unit tests and preview verification are evidenced.
Date: 2026-10-17
Scope: Phase 1 data-only implementation; phases 2–6 NOT started. Phase 0 evidence gates remain OPEN.

## Initial source audit
Read: apps/mobile/AGENTS.md, AndroidManifest.xml, MainActivity.kt, EkmivoApp.kt,
EkmivoTheme.kt, ForwarderScreen.kt, ReceiptStore.kt, ReceiptSyncWorker.kt,
ReceiptCapture.kt, ReceiptForwardPolicy.kt, ReceiptInboxRecovery.kt,
ReceiptBootReceiver.kt, AppPreferences.kt, apps/mobile/README.md,
docs/design/tokens.css, apps/web/src/components/sms-devices.tsx,
apps/web/src/lib/pairing-qr.mjs, apps/web/src/lib/dashboard-navigation.ts,
backend/internal/checkout/physical_devices.go,
backend/internal/checkout/phone_forward.go, receipt_pipeline.go,
infra/migrations/0045_pg06_physical_phone_multi_account.sql,
docs/adr/0001-native-android.md. See docs/design/ANDROID-PHASE0-AUDIT.md.

## Phase 0 planned/staged changes
- Canonical uploaded HTML, final prompt, exact Compose spec, phase prompts and resolved CLAUDE.md.
- Web-sourced EkmivoTokens.kt and EkmivoTypography.kt.
- Neutral full light/dark EkmivoTheme.kt.
- Custom reference primitives EkmivoComponents.kt.
- Non-shipping EkmivoTokenPreview.kt showing colours, type and primitives.
- Phase 0 root-cause audit.

## Explicit decisions
- Preserve original signed receipt path and encrypted queue; Phase 0 has no capture, permission, pairing, Go or web behaviour changes.
- The screenshot geometry comes from the spec; web dashboard controls semantic theme colours/typography and global radii.
- Keep current QR token contract (43-char token, expires in 5 minutes). Do not ship mock eight-character codes.
- Separate "server forwarded" from "payment verified". Server ACK does not verify funds.
- Do not show a shop name until the server supplies an authenticated name.
- Keep existing current /w/{workspaceId}/payments/devices path; do not invent /en or /bn routes.
- New copy overrides in final prompt §0a. Source HTML is never production data.

## Needs-web-change / backend dependencies
- Web: real "Open in app" pairing deep link; code copy already exists.
- Go: a pre-consent validation endpoint returning shop name, without consuming token; structured claim errors.
- Go: sender profile and verified/forwarded metrics; distinguish revocation vs projection-stale cases.
- Android Phase 1/3: Room migration and Setup Health require queue-safe rollout.
- Play-distribution/SMS permission exception cannot be confirmed.
See audit for exact files and evidence.


## Phase 0 source-of-truth token mapping (web -> Compose)
- Source: docs/design/tokens.css, operational dashboard roles (not screenshot demo palette).
- Light: canvas #F5F5F1, surface #FFFEFB, raised #FFFFFF, subtle #EEEFEA, border #E2E5DE, text #203148, secondary #5C6874; functional success #285D42, warning #77511D, danger #9C3134.
- Dark: canvas #181C20, surface #20262B, raised #293138, subtle #252C31, border #333D44, text #E6EAE7, secondary #ACB7BF; functional success #B2DEC1, warning #F0D092, danger #F5B4AE.
- Radii: control 6dp, panel 10dp, dialog 12dp (from web). Reference-only fixed primitives preserve their geometry. Font: existing web Hind Siliguri regular 400 and medium 500.
- Composable role type table: EkmivoTypography.kt matches reference line-height ratios; no 600/700 text.
- Material plumbing overrides neutral light/dark surface containers; prevents default tonal fallback.

## Actual QR/code + web/API handoff (later phases must NOT guess)
- Web route: /w/{workspaceId}/payments/devices; managing phones requires authorized workspace owner/admin. Web SMS devices -> Connect phone -> phone name -> Create pairing QR.
- Proxy POST /api/go/workspaces/{workspaceId}/phones?environment=live|sandbox -> Go POST /v1/workspaces/{workspaceID}/phones; request has name, response id/pairing_token/expires_at.
- Go randomCapability() generates 32 random bytes as unpadded base64url: 43 characters. Regex accepts 24–160 as a range, but emitted token is 43 characters; valid 5 minutes per migration 0045.
- Web QR payload: ekmivo://pair?token={token}, created by apps/web/src/lib/pairing-qr.mjs. Android deep-link VIEW intent not yet registered. UI offers full-token copy but no "Open in app" action.
- Android scan currently only fills input field. Signed POST /v1/device/claim sends pairing_token + public_key. Response gives id/physical_device/workspace_id/environment, not shop display name. No non-consuming code validation identified; claim consumes token. Do not invent shop name.
- Device configuration endpoint /v1/device/configuration, signed SMS intake /v1/device/phone-events. Durable receipt ACK is not financial verification.
- Required later web/Go: pre-consent display-name validation, structured invalid/expired/revoked errors, server-managed sender profiles/real totals, dashboard app-opening link.

## Checks
- Design docs, theme and components: committed on draft PR #72. Screenshot JPG attachments have not been added to docs/design/screenshots/; setup incomplete.
- Gradle assembleDebug: NOT RUN successfully (no local Gradle/Android SDK; GitHub CI stopped before steps).
- Unit tests: NOT RUN (CI did not execute steps).
- CI: Actions run 39018411221 FAILED. All four jobs stopped after ~3 seconds with zero steps. Android job log returned 404 BlobNotFound. This is not evidence of a Kotlin compile/test failure or success; runner/account blocker unconfirmed.
- Emulator 360dp/412dp: NOT RUN; reference side-by-side match table pending.
- Screenshots side-by-side/match table: NOT RUN; no production screens touched.
- Real device screen-off 30min: NOT RUN (Phase 6).
- Backend / DB / migrations: UNCHANGED.


## Phase 1 — implementation (2026-10-17)
- ConnectionState.kt: sealed Unpaired, Pairing, Active, Degraded(reason), PermissionsIncomplete(missing), Revoked with deterministic reducer. ReceiptRepository exposes a StateFlow to later UI phases. No view is wired to the new state yet: that is intentionally deferred to Phase 4.
- ReceiptAuthInterceptor in ReceiptRepository.kt: **central** treatment of 401/403 on signed authenticated requests (claim explicitly excluded); sets Revoked and clears active pairing/Keystore signing key. HTTP 5xx/network errors set Degraded without requesting re-pair. Non-consuming QR validation API remains absent.
- ReceiptStore.kt: explicit revoke quarantine, retained original legacy encrypted outbox, server-configured forward_sources, and deterministic enrollment ownership gate. Revocation does NOT erase staged or pending SMS. Future re-pair to a different store does NOT retarget held evidence. A new pairing clears revoked state but never rebinds old receipts.
- ReceivedSmsRoom.kt + ReceiptStageRepository.kt: new Room SQLite staging database with Keystore AES-GCM encrypted SMS and stable UUID before original encrypted SQLite outbox upload. Explicit **two-stage, idempotent** mirroring and crash recovery, not a destructive conversion of historical receipt-outbox.db v2. Per-message received/mirrored/sending/failed/sent state, attempts and safe reason code. Room staging uses a separate Keystore alias. Existing outbox remains immutable authority for device-signed ACKed upload.
- ReceiptCapture.kt: enqueue staged data first and schedule existing expedited network-constrained WorkManager. SMS and notification callback work executes off main thread. No consent scope expansion.
- ReceiptSyncWorker.kt: recover Room stage before sending, keep original event ID/enrollment, exponential retry and stable durable-ACK semantics, quarantine cross-shop evidence, update Room status only after server durable ACK. Select eligible queue entries rather than blocking a newly paired workspace on another shop's held rows. No payment confirmation inferred from forwarding ACK.
- ReceiptForwardPolicy.kt + ReceiptInboxRecovery.kt: sender allowlist supplied by server config; no provider hardcoding in collection/recovery; OTP and unrelated messages rejected.
- Existing ForwarderScreen.kt touched **only to supply context to centralized transport interceptor**; no layout/copy/interaction or new app screen was changed. Go/web/backend unchanged.
- Gradle app module: Room runtime + kapt compiler added; Kotlin 2.0.21 and Room 2.6.1. New JVM unit tests: ConnectionStateTest, ReceiptAuthInterceptorTest, updated ReceiptForwardPolicyTest.

### Phase 1 tests & known manual gates
- JVM tests authored but **not executed successfully** (local Android SDK/Gradle not installed; GitHub workflow runs 39022485840 and 39022772191 ended before steps in all four jobs, as with Phase 0).
- Room database schema creation / Keystore encryption / preexisting outbox v2 preservation need actual Android emulator instrumentation. No screenshots required for this no-UI phase.
- 401/403 from an authenticated device quarantines credentials. Distinguish transport 403 and temporary 503. Finer-grained legacy-binding 403 vs physical-device revocation remains a **backend contract question**.
- Worker process death at Room insert/mirror/ACK boundaries and >500-receipt backpressure require simulated/device stress tests.
- A Room staged or pending message from a revoked/different seller is **held and never re-signed under another identity**. Restoring the same original enrollment requires explicit authenticated operator recovery; no untrusted automatic replay.
- Notifications/battery/OEM health checks intentionally wait for Phase 3; only RECEIVE_SMS state is currently evaluated, with no invented permission claims.
- Next steps Phase 2 only after acceptance decision. No UI changes this phase.

## Phase 1 latest verification
- Implementation commits: b0be7d9, 9a48133, f6ae7bb (draft stacked PR #73).
- Last CI: https://github.com/masharzy/ekmivo/actions/runs/39022772191 — **FAILED before jobs executed steps** (all 4 jobs had 0 steps; ~2–3 seconds each). Cannot assert Kotlin compile, Room schema generation or JVM tests have passed.
- No emulator instrumentation evidence; no binary release, deployment or production migration.
- Phase 1 implementation is on a review branch, NOT merged to main and NOT accepted.
- Phase 2/3/4/5/6 remain not started.

## Next
Phase 0 follow-up: full typography-scale preview, Section 5 topHairline, exact type line heights, neutral Material surface roles and a static reduced-motion pulse. No new shipping screen.
Close Phase 0 acceptance only after the Android CI build/test and preview validation.
Then **Phase 1** (connection state/data layer) in a new deliberate phase,
following docs/design/ekmivo-phase-prompts.md; no UI changes in Phase 1.


## Phase 0+1 fork CI evidence (2026-10-17)
- EC Education fork base was identical to upstream main `25f1163f` at test branch creation.
- Run 39031955533: Android `gradle --no-daemon :app:assembleDebug :app:testDebugUnitTest` **PASSED** (BUILD SUCCESSFUL in 3m 40s), Go **PASSED**, Docker **PASSED**; Web lint failed on existing hosted-invoice source.
- Run 39032346329: Android **PASSED**, Go **PASSED**, Docker **PASSED**, Web lint **PASSED** after targeted hosted-invoice fix. Broader source-assertion release gate then reported six outdated patterns.
- Run 39033193573: only `tools/testing/pg06-physical-phone-contract.test.mjs` and `tools/testing/public-pay-design.test.mjs` executed: **10 tests / 10 passed / 0 failed**. Android, Go, Docker, full web explicitly **skipped** in this final targeted run to save CI usage.
- Source-assertion checks now reference the actual central device-signature transport context, Room queue guard, dashboard SMS-device module and normalized payer/locale-neutral route contracts. No payment/backend logic was changed to satisfy outdated literal assertions.
- The fork-only CI skip workflow is NOT promoted to upstream; original full CI remains unchanged. A new upstream full CI green run is **not** claimed.
- Phase 0 preview image comparison (360dp/412dp), Room/Keystore device instrumentation, and 30-minute Samsung background checks remain **PENDING**. User approved promotion after passing Android plus targeted contract checks; passing unit tests is not evidence of on-device production validation.

## Phase 2 — Pairing screens implementation, pending device visual acceptance (2026-10-17)
- Added Welcome, Camera permission, in-app CameraX/ML Kit scanner with 150dp bracket overlay + torch, consent Confirm sheet, Connecting, and complete token code entry. No Phase 3 permission wizard, Phase 4 Home, or backend rewrite.
- Added Android ACTION_VIEW deep link for `ekmivo://pair?token=`; token is validated for exactly 43 unpadded base64url characters (the current actual emitted format), and never consumed before the user presses Confirm and connect. A copyable full code and explicit clipboard Paste are supported for one-device merchants.
- User authorized generic workspace wording in place of a server-verified shop name; real identity is established by one-time signed POST /v1/device/claim. No invented shop name/avatar. QR success goes immediately to Confirm and only button action consumes the token.
- UI text is loaded from separate BN and EN resources using the selected Ekmivo app language, not Android system locale. Demo payment providers and guarantee claims are not shipped. Copy identifies SMS forwarding, not payment settlement.
- Successful claim stores original backend enrollment, consent timestamp/version, schedules WorkManager, then hands control to the preexisting permissions/Forwarder flow. Phase 3 will replace those legacy permissions screens.
- Camera uses CameraX PreviewView and local ML Kit analysis only after CAMERA grant; no frame/photo is persisted/uploaded; scanner releases use cases on disposal.
- Code entry represents a real 43-character capability across eight grouped visual cells instead of fake eight-character demo value; long tokens necessarily differ from reference's 8-cell single-character placeholder. 'Paste code' link was required by Final Prompt §3.3c.
- Phase 2 icon tile and screen hierarchy follow spec 3.3/3.3a/3.3b and web-derived theme tokens. Real-camera device photos/screenshot match table at 360dp and 412dp still NOT VERIFIED; user will review generated APK.
- Fork Android-only CI will build `:app:assembleDebug :app:testDebugUnitTest`; its debug APK is for testing, not a release signing/distribution claim. Do not copy fork CI-skip workflow upstream.

### Fork Android CI result (2026-10-17)
- Phase 2 validation: https://github.com/easyeducation556644-ux/ekmivo/actions/runs/39035147227: **SUCCESS**, `:app:assembleDebug :app:testDebugUnitTest` both passed (BUILD SUCCESSFUL in 2m 37s); debug APK `ekmivo-kotlin-debug` (artifact #12101587617).
- Web, Go and Docker deliberately **skipped** for this phase on the fork to conserve CI usage; the upstream CI YAML stays unmodified.
- Original reference screenshot comparison at 360dp and 412dp is **NOT DONE**; APK sent to owner for visual and device pairing acceptance. The generic copy for shop name was explicitly approved by the owner.

## Eight-character pairing polish — 2026-10-17
- Freshly generated physical-phone pairing capability is 8 uppercase non-confusable symbols from a 32-character crypto/rand alphabet; 40 bits of random entropy. Existing digest, database-enforced 5-minute expiry, single-claim consumption and server validation preserved. Legacy longer claim tokens remain briefly valid for compatibility; no database migration.
- SMS devices modal shows 8 individual cells with Copy button; QR uses the same token. Android eight-cell input accepts typing/paste via a single backing editor and automatically opens Confirm after 8 characters; server claim still requires explicit consent.
- EN/BN switcher at top right, new installs default English; dark palette uses reference #0F0F0E, #181817, #222220 and theme follows system setting unless explicitly changed. Steps shortened per owner feedback.
- Fork targeted CI https://github.com/easyeducation556644-ux/ekmivo/actions/runs/39037292999 **SUCCESS**: Go TestPhysicalPairingCodeShape PASS, focused Node QR/web contract tests 4/4 PASS, Android :app:assembleDebug and :app:testDebugUnitTest PASS. Full unrelated web/Go/Docker jobs were intentionally skipped. Fork-only CI workflow not promoted.
- Debug artifact #12103270511; locally extracted APK SHA-256 5f19c1ab6a95ef76f2af7a9bd91131951cbe98924fc92bc319ac30e9f2fb8f9d (43,092,147 bytes). Device screenshot acceptance pending. Backend deployment required to issue the new codes in production.

## Phase 3 — Setup Health, permission wizard and Done (2026-10-17)
- Flow correction: Welcome step 3 is now “Scan the pairing QR code shown on your dashboard.” (BN equivalent). No separate build made solely for copy.
- SetupHealth.kt: re-evaluate on each activity RESUME: RECEIVE_SMS, POST_NOTIFICATIONS on API 33+, PowerManager battery exemption, manufacturer detection and existing encrypted queue error/backlog. OK/MISSING/UNKNOWN are explicit; a Samsung sleeping-app setting is never falsely shown OS-verified.
- SetupPlan and SetupPlanTest: ordered SMS → notification → battery → Samsung OEM (Samsung only). Already granted steps skipped; Samsung guide completion is an honest manual acknowledgement, **not** a verified OS state. Re-surface when a delivery backlog/error appears.
- SetupWizard.kt: same spec-sized header, 4 progress bars (22×4dp), centered 76dp icon tile, 19sp title, 13sp body, live status tags, primary system dialog/settings action, why-needed disclosure. Denied and don't-ask-again handled via app settings, no silent skip, callback/resume recheck. Done screen uses generic copy (user approved not showing unverifiable workspace name), Start goes to current app.
- EkmivoApp.kt: after claim, show wizard, not old Forwarder screen; existing paired phones with missing setup re-enter wizard. Home fix card only when health requires attention; Settings reliability card shows real status and Fix link. No Phase 4 Home redesign.
- Foreground service: low-importance channel with notification returning to app, started only from a visible Activity following completed setup; network delivery still handled by WorkManager with encrypted Room/legacy outbox retries. Does not start from BOOT_COMPLETED. Android 15+ may impose a dataSync FGS time limit; **never** claim guaranteed always-on operation.
- AndroidManifest: narrowly required POST_NOTIFICATIONS, REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, FOREGROUND_SERVICE, FOREGROUND_SERVICE_DATA_SYNC, and non-exported dataSync service. Camera still only requested by explicit scanner action; READ_SMS remains opt-in for recovery, not part of setup wizard.
- Existing paired credentials and unsent receipt database are preserved. No Go or Web API changes in Phase 3.
- Distribution observed in this workflow: sideloaded test APK. Google Play's restricted SMS/FGS declarations would require separate review before Play submission.
- CI: build + unit tests on EC Education fork; do not run unrelated backend/web/Docker jobs; do not promote fork-only workflow gating to upstream.
- User explicitly owns live SMS/API device tests and device screenshot checks; these are NOT counted toward code/architecture/CI implementation acceptance. Their absence must still be disclosed honestly.

### Phase 3 CI evidence and hardening
- First fork Android run 39042607345: `assembleDebug` + `testDebugUnitTest` **PASSED**; unrelated Go/Web/Docker skipped.
- Final refinements: language switch also on the wizard, revoke/permissions change stop running forwarding FGS, on Android 15 `Service.onTimeout` stops the dataSync service and requeues background work instead of promising limitless FGS runtime.
- Owner will verify the real on-device flow and appearance; real live payment SMS and API delivery are excluded by request from the code-completion gate.

### Delayed forwarding detection
- A pending encrypted receipt older than 10 minutes triggers Setup Health warning even without a transport error, based on the existing SQLite pending table's creation timestamp. No SMS plaintext is read; the existing WorkManager transport and outbox are untouched.

### Final Phase 3 Android validation
- Fork CI https://github.com/easyeducation556644-ux/ekmivo/actions/runs/39043254003 passed :app:assembleDebug and :app:testDebugUnitTest (other unrelated Web, Go, Docker jobs deliberately skipped).
- Debug APK size 43,125,139 bytes, sha256 fbc9a69669f573852d0c5eda7178429e879ae8848acbb8f65b8877cf4c5e55b1.
- Live device SMS/API and screenshot QA are owner-run; not verified in this session and intentionally excluded from user-defined code-completion acceptance.

## Phase 4 — Home, Disconnected and two-tab nav (2026-10-17)
- Exact reference structure targeted: 34dp logo header with state-derived chip, 136dp two-ring pulse and 112dp hero core, 3 equal stats, 30dp neutral sender tile, hairline feed rows, detail bottom sheet, and 2-item slim navigation bar (Live + Settings, no empty Inbox tab). Navigation leaves Phase 5 Settings presentation unchanged.
- The repository StateFlow drives Live/Syncing/Offline/Needs attention/Revoked. Revoked displays a no-retry Disconnected screen with a Reconnect entry and a *conditional* link for real queued receipts; original revoked receipt evidence stays encrypted.
- Stats and feed are sourced off-main-thread from the existing Keystore encrypted SQLite outbox and encrypted Room staging. Rows include real source, SMS amount if parsed, masked sender, actual intake time, attempts, safe delivery status and retry scheduling. No demo transactions, provider names/colours, or fictional balances.
- **Honest semantic limits:** financial verification totals are NOT available from the Android server contract. The hero shows retained forwarded SMS amount only when every retained forwarded SMS has a parsable amount, labelled "Forwarded in history", never "Verified today". The forwarded stat counts retained history (last 60 ACKs + unsent rows), not an authoritative all-time count. Unknown sender uses neutral brand tile. Shop name is "Ekmivo", because the pairing API has no verified display name.
- No API, financial, auth, migration or SMS ingestion changes. Existing Phase 3 setup and permissions stay in place.
- Build and unit tests to run only for Android on the EC Education validation fork; fork-only workflow skip conditions must not be promoted upstream.
- Still pending: emulator screenshots at 360dp/412dp (both themes), pixel comparison against HTML, real-device revoked/re-pairing and SMS evidence tests. Do not claim screenshot-perfect or fully accepted until those checks are complete.

### Phase 4 correctness refinements
- CI run 39046527537 passed Android `assembleDebug` + `testDebugUnitTest` on initial implementation.
- CI run 39046974983 passed Android `assembleDebug` + `testDebugUnitTest` on real durable Room `sent_at` query. Intake timestamp is no longer mislabelled as forwarding timestamp; when unknown UI says so. Room failed-state records provide the failed count rather than the limited feed slice. An unavailable data source is explicitly shown as unavailable, not zero transactions.
- Final ring colour reflects state: green when Active, amber when degraded; reduced motion remains respected.
- No owner screenshot QA claim. Payment verification totals remain unavailable; all visible figures refer only to locally retained forwarded SMS.
