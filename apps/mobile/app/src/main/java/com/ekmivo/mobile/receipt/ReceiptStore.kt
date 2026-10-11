package com.ekmivo.mobile.receipt

import android.content.Context
import android.database.sqlite.SQLiteOpenHelper
import android.database.sqlite.SQLiteDatabase
import android.content.ContentValues
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import org.json.JSONObject
import java.util.UUID

/** Private encrypted outbox; no read-SMS permission or inbox enumeration. */
class ReceiptStore(context: Context): SQLiteOpenHelper(context, "receipt-outbox.db", null, 1) {
 private val preferences=context.getSharedPreferences("receipt-enrollment",Context.MODE_PRIVATE)
 override fun onCreate(db:SQLiteDatabase) {
  db.execSQL("CREATE TABLE pending(id TEXT PRIMARY KEY, body BLOB NOT NULL, created INTEGER NOT NULL)")
  db.execSQL("CREATE TABLE sequence_counter(singleton INTEGER PRIMARY KEY CHECK(singleton=1), value INTEGER NOT NULL)")
  db.execSQL("INSERT INTO sequence_counter VALUES(1,0)")
 }
 override fun onUpgrade(db:SQLiteDatabase,oldVersion:Int,newVersion:Int) { error("Explicit receipt migration required") }
 private fun key():SecretKey {
  val store=KeyStore.getInstance("AndroidKeyStore").apply{load(null)}
  (store.getKey("ekmivo-receipt-outbox",null) as? SecretKey)?.let{return it}
  return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore").apply {
   init(KeyGenParameterSpec.Builder("ekmivo-receipt-outbox",KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
  }.generateKey()
 }
 fun enrollment():JSONObject?=preferences.getString("enrollment",null)?.let{JSONObject(it)}
 fun saveEnrollment(value:JSONObject){preferences.edit().putString("enrollment",value.toString()).putBoolean("consented",true).putBoolean("paused",false).commit()}
 fun enabled()=preferences.getBoolean("consented",false)&&!preferences.getBoolean("paused",false)&&enrollment()!=null
 fun pause(){preferences.edit().putBoolean("paused",true).commit()}
 fun disconnect(){preferences.edit().clear().commit();writableDatabase.delete("pending",null,null);AndroidKeystoreSigner("ekmivo-receipt-device").forgetEnrollmentKey()}
 fun count():Int=readableDatabase.rawQuery("SELECT count(*) FROM pending",null).use{it.moveToFirst();it.getInt(0)}
 fun enqueue(body:JSONObject):Boolean {
  if(!enabled()||count()>=500)return false
  val database=writableDatabase;database.beginTransaction()
  try {
   database.execSQL("UPDATE sequence_counter SET value=value+1 WHERE singleton=1")
   val sequence=database.rawQuery("SELECT value FROM sequence_counter WHERE singleton=1",null).use{it.moveToFirst();it.getLong(0)}
   body.put("sequence",sequence)
   val id=UUID.randomUUID().toString();val cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key());cipher.updateAAD(id.toByteArray())
   val encrypted=cipher.iv+cipher.doFinal(body.toString().toByteArray(Charsets.UTF_8))
   val values=ContentValues().apply{put("id",id);put("body",encrypted);put("created",System.currentTimeMillis())}
   val stored=database.insertOrThrow("pending",null,values)>0;database.setTransactionSuccessful();return stored
  }finally{database.endTransaction()}
 }
 fun next():Pair<String,ByteArray>?=readableDatabase.rawQuery("SELECT id,body FROM pending ORDER BY created,id LIMIT 1",null).use {
  if(!it.moveToFirst())return null
  val id=it.getString(0);val encrypted=it.getBlob(1);val cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,key(),GCMParameterSpec(128,encrypted.copyOfRange(0,12)));cipher.updateAAD(id.toByteArray());id to cipher.doFinal(encrypted.copyOfRange(12,encrypted.size))
 }
 fun acknowledge(id:String){writableDatabase.delete("pending","id=?",arrayOf(id))}
}
