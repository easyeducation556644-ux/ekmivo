package com.ekmivo.mobile.receipt

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.app.Notification
import org.json.JSONObject
import java.time.Instant

object ReceiptCapture {
 fun accept(context:Context,source:String,binding:String,kind:String,text:String){
  ReceiptStore(context).use{store ->
   val enrollment=store.enrollment()?:return
   if(!store.enabled()||text.toByteArray(Charsets.UTF_8).size>6000||source!=enrollment.optString("source")||binding!=enrollment.optString("binding"))return
   // Filter before persistence: approved incoming whole-message expressions
   // exclude unrelated notifications, personal messages and OTPs.
   val pattern=enrollment.optString("capture_pattern");if(pattern.isEmpty()||!Regex(pattern).matches(text))return
   if(store.enqueue(JSONObject().put("enrollment_id",enrollment.getString("id")).put("environment",enrollment.getString("environment")).put("source",source).put("binding",binding).put("kind",kind).put("evidence",text).put("observed_at",Instant.now().toString()))) ReceiptSyncWorker.schedule(context)
  }
 }
}
class ReceiptSmsReceiver:BroadcastReceiver(){
 override fun onReceive(context:Context,intent:Intent){
  if(intent.action!=Telephony.Sms.Intents.SMS_RECEIVED_ACTION)return
  val messages=Telephony.Sms.Intents.getMessagesFromIntent(intent);if(messages.isEmpty())return
  val sender=messages.first().originatingAddress?:return
  if(messages.any{it.originatingAddress!=sender})return
  // Missing subscription never falls back to an arbitrary receiving account.
  val subscription=intent.getIntExtra("subscription",-1);if(subscription<0)return
  ReceiptCapture.accept(context,sender,"sms:$subscription","device_sms",messages.joinToString(""){it.messageBody?:""})
 }
}
class ReceiptNotificationListener:NotificationListenerService(){
 override fun onListenerConnected(){ReceiptSyncWorker.schedule(this)}
 override fun onNotificationPosted(sbn:StatusBarNotification){
  val extras=sbn.notification.extras
  val text=(extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?:extras.getCharSequence(Notification.EXTRA_TEXT))?.toString()?:return
  ReceiptCapture.accept(this,sbn.packageName,"package:${sbn.packageName}","device_notification",text)
 }
}
