# AN03 — native Kotlin client foundation (NOT ACCEPTED)

Status: **source in progress**, full AN03 remains blocked by the payment and human-inbox backend sequence. Related S31,S42,S46. Architectural owner decision 2026-10-11: Android is entirely Kotlin + Jetpack Compose; no React Native, Flutter, or JS bridge.

## Implemented source (initial)
- `apps/mobile` Android Gradle 8.9 / AGP 8.7.3 / Kotlin 2.0.21 with Android SDK 35, generated font resources from the existing Hind Siliguri source.
- `MainActivity.kt`, `ui/EkmivoApp.kt`, `ui/EkmivoTheme.kt`, `ui/Copy.kt`, `data/AppPreferences.kt`, `data/Connectivity.kt`.
- Ink & Bone tokens, full BN/EN in current first-level routes, DataStore persisted theme/language, animated navigation and payment/inbox/settings UI with no fake financial records.
- A real timeout-bounded HTTPS check against Go `/healthz` and `/readyz`. The API reports financial readiness separately; no customer-facing paid/verified mutation is possible.
- `.github/workflows/ci.yml` native assemble + unit test + debug APK artifact job.

## Evidence classifications
- **Source/CI:** Android compile/test job must pass; only then mark debug build valid and add its exact run ID here.
- **Android device:** not yet tested; no startup, scroll jank, 60/120fps, accessibility, keyboard, notification permission, offline/resume or OEM evidence.
- **Real receipt/provider:** none. PG06 awaits scoped consent, real samples and authoritative Go APIs.
- **Payment/inbox integration:** none. No client auth, platform device enrollment, actual tenant data or messaging APIs.

## Completion gate still open
AN03 requires real mobile auth, authorized navigation/deep-links, Go API integration, push, failure/offline recovery, integrated receipt collector, and explicit security evidence. AN04/AN05/full Android inbox continue after backend/PG17 sequence.

## First native build verification — 2026-10-11

**PASS (source/CI only).** The full workflow [38115451816](https://github.com/masharzy/ekmivo/actions/runs/38115451816), commit `b8247408f0029a68bbc9cc467964c447f53b5a41`, completed successfully: native `:app:assembleDebug` and `:app:testDebugUnitTest` with JDK 17 / SDK 35 / Gradle 8.9; web lint/TypeScript/build; Go tests, actual HTTP health/503 readiness smoke and API/worker compile; PostgreSQL 17 isolated migration and rollback tests.

The [`ekmivo-kotlin-debug` APK artifact](https://github.com/masharzy/ekmivo/actions/runs/38115451816/artifacts/11693123111) was uploaded (GitHub Actions ZIP, ~17 MB compressed). This is a **debug foundation** build, not a signed production release or proof of smooth animations on device. Android preview devices and all receipt collection/payment/inbox integration acceptance remain OPEN.

Latest Kotlin source/test build also passed after receipt/security helpers: [Actions 38115889313](https://github.com/masharzy/ekmivo/actions/runs/38115889313), [APK artifact 11693770119](https://github.com/masharzy/ekmivo/actions/runs/38115889313/artifacts/11693770119). AN03 remains open: no real session, financial data, messaging API, device performance or store release acceptance.
