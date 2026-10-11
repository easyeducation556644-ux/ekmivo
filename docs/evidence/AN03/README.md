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
