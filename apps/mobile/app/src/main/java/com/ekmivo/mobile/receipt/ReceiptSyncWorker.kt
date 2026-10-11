package com.ekmivo.mobile.receipt

import android.content.Context
import androidx.work.Worker
import androidx.work.WorkerParameters
import androidx.work.WorkManager
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.ExistingWorkPolicy
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.Constraints
import androidx.work.NetworkType
import androidx.work.BackoffPolicy
import android.os.Build
import android.Manifest
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import androidx.core.app.NotificationManagerCompat
import com.ekmivo.mobile.BuildConfig
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.MediaType.Companion.toMediaType
import org.json.JSONObject
import java.util.UUID
import java.util.concurrent.TimeUnit

object ReceiptTransport {
 private val client=OkHttpClient.Builder().followRedirects(false).followSslRedirects(false).callTimeout(12,TimeUnit.SECONDS).build()
 fun post(action:String,deviceID:String,eventID:String,bytes:ByteArray):Pair<Int,String>{
  val base=BuildConfig.API_BASE_URL.trimEnd('/');require(base.startsWith("https://")){"HTTPS API not configured"}
  val path="/v1/device/$action";val timestamp=(System.currentTimeMillis()/1000).toString()
  val signature=AndroidKeystoreSigner("ekmivo-receipt-device").signCanonical(DeviceSignatureCanonicalizer.canonical("POST",path,timestamp,eventID,bytes))
  val request=Request.Builder().url(base+path).header("X-Ekmivo-Device-ID",deviceID).header("X-Ekmivo-Event-ID",eventID).header("X-Ekmivo-Timestamp",timestamp).header("X-Ekmivo-Signature",signature).post(bytes.toRequestBody("application/json".toMediaType())).build()
  return client.newCall(request).execute().use{it.code to (it.body?.string()?:"")}
 }
}
class ReceiptSyncWorker(context:Context,params:WorkerParameters):Worker(context,params){
 override fun doWork():Result {
  return try { ReceiptStore(applicationContext).use{store ->
   val device=store.enrollment()?:return Result.success();if(!store.enabled())return Result.success()
   val permission=if(device.getString("binding").startsWith("sms:"))ContextCompat.checkSelfPermission(applicationContext,Manifest.permission.RECEIVE_SMS)==PackageManager.PERMISSION_GRANTED else NotificationManagerCompat.getEnabledListenerPackages(applicationContext).contains(applicationContext.packageName)
   val health=JSONObject().put("enrollment_id",device.getString("id")).put("environment",device.getString("environment")).put("permission_ok",permission).put("backlog",store.count()).put("model",Build.MODEL).put("app_version",BuildConfig.VERSION_NAME)
   val heartbeat=ReceiptTransport.post("heartbeat",device.getString("id"),UUID.randomUUID().toString(),health.toString().toByteArray())
   if(heartbeat.first==403){store.pause();return Result.failure()};if(heartbeat.first !in 200..299)return Result.retry()
   repeat(5){
    val next=store.next()?:return Result.success()
    val response=ReceiptTransport.post("events",device.getString("id"),next.first,next.second)
    if(response.first==403){store.pause();return Result.failure()}
    if(response.first !in 200..299)return Result.retry()
    if(JSONObject(response.second).optString("ack")!="durable")return Result.retry()
    store.acknowledge(next.first)
   }
   if(store.count()>0)Result.retry() else Result.success()
  }} catch(_:Exception){Result.retry()}
 }
 companion object {
  fun schedule(context:Context){
   val constraints=Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
   val manager=WorkManager.getInstance(context)
   manager.enqueueUniqueWork("receipt-sync",ExistingWorkPolicy.KEEP,OneTimeWorkRequestBuilder<ReceiptSyncWorker>().setConstraints(constraints).setBackoffCriteria(BackoffPolicy.EXPONENTIAL,30,TimeUnit.SECONDS).build())
   manager.enqueueUniquePeriodicWork("receipt-health",ExistingPeriodicWorkPolicy.KEEP,PeriodicWorkRequestBuilder<ReceiptSyncWorker>(15,TimeUnit.MINUTES).setConstraints(constraints).build())
  }
 }
}
