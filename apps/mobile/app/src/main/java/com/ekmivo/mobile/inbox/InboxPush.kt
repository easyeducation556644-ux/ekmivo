package com.ekmivo.mobile.inbox

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import com.ekmivo.mobile.receipt.ReceiptStore
import com.google.firebase.FirebaseApp
import com.google.firebase.messaging.FirebaseMessaging
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/**
 * FCM groundwork only; a Firebase project config and an authenticated inbox
 * token-registration backend are NOT provisioned by Phase 6.
 *
 * Tokens are scoped to the active phone enrollment. They cannot be reused
 * after disconnect/re-pairing with a different enrollment. No token is sent
 * to any API endpoint until a server contract exists.
 */
object InboxPushTokenRegistry {
 private const val prefsName="ekmivo_inbox_push"
 private const val tokenKey="fcm_token"
 private const val phoneKey="paired_phone_id"
 const val channelId="ekmivo_inbox_messages"

 private fun currentPhone(context:Context):String? =
  ReceiptStore(context.applicationContext).use { store ->
   if(!store.enabled() || store.isRevoked())null
   else (store.phone()?:store.enrollment())?.optString("id")?.takeIf { it.isNotBlank() }
  }

 fun capture(context:Context,token:String):Boolean {
  if(!InboxFeatureFlag.inboxEnabled || token.isBlank())return false
  val id=currentPhone(context)?:return false
  return context.applicationContext.getSharedPreferences(prefsName,Context.MODE_PRIVATE).edit()
   .putString(tokenKey,token).putString(phoneKey,id).commit()
 }
 fun currentToken(context:Context):String? {
  if(!InboxFeatureFlag.inboxEnabled)return null
  val id=currentPhone(context)?:return null
  val prefs=context.applicationContext.getSharedPreferences(prefsName,Context.MODE_PRIVATE)
  if(prefs.getString(phoneKey,null)!=id)return null
  return prefs.getString(tokenKey,null)
 }
 fun clear(context:Context){
  context.applicationContext.getSharedPreferences(prefsName,Context.MODE_PRIVATE)
   .edit().clear().apply()
 }

 /** Runs only if a real Firebase app has been configured; no mock token. */
 fun prepare(context:Context) {
  if(!InboxFeatureFlag.inboxEnabled)return
  val app=context.applicationContext
  if(FirebaseApp.getApps(app).isEmpty())return
  ensureChannel(app)
  FirebaseMessaging.getInstance().token.addOnSuccessListener { token -> capture(app,token) }
  // Do not send token to server: no authenticated inbox registration endpoint yet.
 }
 fun ensureChannel(context:Context){
  if(!InboxFeatureFlag.inboxEnabled)return
  val manager=context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
  manager.createNotificationChannel(
   NotificationChannel(channelId,"Inbox messages",NotificationManager.IMPORTANCE_DEFAULT)
    .apply { description="Future Ekmivo inbox notifications" }
  )
 }
}

/** Service entry point for future FCM token refresh. No financial SMS handling. */
class InboxFirebaseService:FirebaseMessagingService() {
 override fun onNewToken(token:String) {
  super.onNewToken(token)
  InboxPushTokenRegistry.capture(applicationContext,token)
 }
 override fun onMessageReceived(message:RemoteMessage) {
  super.onMessageReceived(message)
  // No verified inbox message schema/endpoint exists yet. Do not display
  // untrusted sender or message content, store a fabricated chat, or claim
  // delivery. Real routing is explicitly gated behind inboxEnabled.
 }
}
