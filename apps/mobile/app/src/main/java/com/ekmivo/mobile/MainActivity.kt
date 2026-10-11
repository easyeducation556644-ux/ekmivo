package com.ekmivo.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.core.view.WindowCompat
import com.ekmivo.mobile.data.AppPreferences
import com.ekmivo.mobile.ui.EkmivoApp

class MainActivity : ComponentActivity() {
 override fun onCreate(savedInstanceState: Bundle?) {
  super.onCreate(savedInstanceState)
  WindowCompat.setDecorFitsSystemWindows(window, false)
  val preferences = AppPreferences(applicationContext)
  setContent { EkmivoApp(preferences = preferences) }
 }
}
