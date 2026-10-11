# Native Android working rules

Read the root AGENTS.md, canonical payment-first plan and docs/adr/0001-native-android.md before changing this app.

- **Only Kotlin + Jetpack Compose** for Android. No React Native/Flutter UI, no JS/WebView bridge for payment operations, no separate receipt companion APK.
- PG06 native receipt collection is an opt-in module inside this APK, gated by real receipt/device authorization and provider/sample capability. Never read unrelated SMS, 2FA or OTP messages; no unconsented capture.
- Money, payment confirmation, matching of all five fields and webhook enqueue remain Go/PostgreSQL responsibilities. The Android client cannot mark a payment verified.
- Reuse canonical Ink & Bone tokens and Hind Siliguri. Keep EN/BN copy complete and system/light/dark accessible, no fabricated records. No duplicate financial logic in Compose.
- For new UI, check navigation/recomposition, minimum 320dp width, font-scale, screen readers, keyboard, offline state, explicit errors, reduced motion, and test high/low-refresh devices before making performance claims.
- Run Gradle debug assemble and unit tests through active GitHub CI. Device UI/E2E/Macrobenchmark evidence and actual phone receipt tests remain separate gates.
