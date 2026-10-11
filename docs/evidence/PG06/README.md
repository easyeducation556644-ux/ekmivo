# PG06 — native receipt collection & signed evidence (NOT ACCEPTED)

**Status:** preliminary source-only security work; all PG06 acceptance gates OPEN. Related S31/S32.

## Implemented
- One Kotlin/Jetpack Compose Android APK, no RN/Flutter or separate receipt bridge.
- `apps/mobile/app/src/main/java/com/ekmivo/mobile/receipt/EvidenceGate.kt`: rejects masked/missing actual payer, absent original transaction time, invalid amount, missing receiving-source binding, absent method, and outbound/reversed direction. Normalizes exact full Bangladesh mobile without guessing masked digits.
- `.../receipt/AndroidKeystoreSigner.kt`: P-256 SHA256withECDSA signing with AndroidKeyStore nonexportable private key when explicitly enrolled; DER/Base64 envelope.
- `.../receipt/DeviceSignature.kt`: method/path/transport timestamp/event-id/raw-body digest canonicalization (UTF-8).
- `backend/internal/deviceevidence/signature.go`: Go raw-body request canonicalization, P-256 X.509 DER signature verification, 5-minute transport signature freshness.
- Negative/unit tests for masked payer, missing original time, outgoing direction, missing source, bad amount, tampered signature input, malformed header, replay timestamp.

## Why this is not a payment test
Only **structural evidence readiness** and cryptographic helper functions have been coded. Nothing is read from SMS/notifications; no permissions requested, no enrolled key registered with Go, no local encryption/queue/replay, no parser verified against actual bKash/Nagad/Rocket receipt samples, no Go ingress endpoint, no DB allocation, no five-field matching, no webhook. The source binding is an untrusted client hint; Go must resolve it securely from enrolled device identity. A valid device ECDSA signature is **not** provider attestation.

## Pending
1. PG01–PG05 backend/authorization/intent dependencies.
2. Consented real samples with original payer/time/account/method; OEM/dual-SIM/notification feasibility G0-6.
3. Keystore pairing/revocation and signed device ingress with actual Go enrollment lookup and event dedup.
4. Real permitted receipt capture with unrelated SMS/OTP suppression and encrypted offline queue.
5. Concurrent matching, invalid/masked/duplicate tests, source replay, real device and webhook E2E; PG07 and PG16 evidence.

## Verification
CI source checks must be linked here after the current Kotlin and Go test run passes. The earlier Kotlin foundation debug APK: [38115451816](https://github.com/masharzy/ekmivo/actions/runs/38115451816) is not a PG06 device test.
