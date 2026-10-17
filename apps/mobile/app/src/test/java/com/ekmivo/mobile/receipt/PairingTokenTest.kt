package com.ekmivo.mobile.receipt

import org.junit.Assert.*
import org.junit.Test

class PairingTokenTest {
 private val token = "A".repeat(43)
 @Test fun qrAndCopiedCodeGiveIdenticalCapability() {
  assertEquals(token, PairingToken.parse(token))
  assertEquals(token, PairingToken.parse("ekmivo://pair?token=$token"))
 }
 @Test fun rejectDemoCodesUnknownSchemesAndExtraParameters() {
  assertNull(PairingToken.parse("K7M2-9Q"))
  assertNull(PairingToken.parse("ekmivo://pair?code=$token"))
  assertNull(PairingToken.parse("https://wrong-site.example/?token=$token"))
  assertNull(PairingToken.parse("ekmivo://pair?token=$token&more=1"))
  assertNull(PairingToken.parse("A".repeat(44)))
 }
}
