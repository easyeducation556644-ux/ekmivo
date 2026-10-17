package com.ekmivo.mobile

import android.os.Bundle
import android.content.Intent
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.core.view.WindowCompat
import com.ekmivo.mobile.data.AppPreferences
import com.ekmivo.mobile.ui.EkmivoApp

class MainActivity : ComponentActivity() {
 private var incomingLink by mutableStateOf<String?>(null)
 override fun onCreate(savedInstanceState: Bundle?) {
  super.onCreate(savedInstanceState)
  WindowCompat.setDecorFitsSystemWindows(window, false)
  incomingLink=intent?.dataString
  val preferences = AppPreferences(applicationContext)
  setContent { EkmivoApp(preferences = preferences, incomingPairingLink = incomingLink) }
 }
 override fun onNewIntent(intent:Intent) {
  super.onNewIntent(intent)
  setIntent(intent)
  incomingLink=intent.dataString
 }
}
