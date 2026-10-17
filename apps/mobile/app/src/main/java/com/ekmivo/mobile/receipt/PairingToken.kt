package com.ekmivo.mobile.receipt

/** QR and dashboard copy use the same 43-character, unpadded base64url capability. */
object PairingToken {
 const val LENGTH = 43
 private val capability = Regex("^[A-Za-z0-9_-]{43}$")
 fun parse(input: String): String? {
  val text = input.trim()
  val token = if (text.startsWith("ekmivo://pair?")) {
   if (!text.startsWith("ekmivo://pair?token=")) return null
   text.removePrefix("ekmivo://pair?token=")
  } else text
  return token.takeIf { capability.matches(it) }
 }
}
