package com.ekmivo.mobile.receipt

import org.junit.Assert.*
import org.junit.Test

class PairingTokenTest {
 private val token = "ABCDEFGH"
 @Test fun qrAndCopiedCodeGiveIdenticalCapability() {
  assertEquals(token, PairingToken.parse(token))
  assertEquals(token, PairingToken.parse("ekmivo://pair?token=$token"))
 }
 @Test fun allEightBoxesFillFromOnePasteAndTyping() {
  assertEquals(token, PairingToken.normalize("abcdefgh"))
  assertEquals(token, PairingToken.normalize("ABCD-EFGH"))
  assertEquals("ABC", PairingToken.normalize("aBc"))
  assertEquals(token, PairingToken.normalize("ABCDEFGHXYZ"))
 }
 @Test fun rejectUnknownSchemesAndExtraParameters() {
  assertNull(PairingToken.parse("K7M2-9Q"))
  assertNull(PairingToken.parse("ekmivo://pair?code=$token"))
  assertNull(PairingToken.parse("https://wrong.example/?token=$token"))
  assertNull(PairingToken.parse("ekmivo://pair?token=$token&more=1"))
  assertNull(PairingToken.parse("A".repeat(43)))
  assertNull(PairingToken.parse("A".repeat(7)))
 }
}
