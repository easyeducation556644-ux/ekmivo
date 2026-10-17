package com.ekmivo.mobile.inbox

import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.ekmivo.mobile.ui.EkmivoType
import com.ekmivo.mobile.ui.LocalEkmivoPalette

/**
 * Internal route reserved for future inbox. Not in bottom nav; no fake threads.
 * Enabling requires FCM project config, authenticated APIs and design approval.
 */
@Composable
fun InboxRoute(
 destination:InboxDestination=InboxDestination.Threads,
 repository:InboxRepository=DisabledInboxRepository
) {
 if(!InboxFeatureFlag.inboxEnabled)return
 val p=LocalEkmivoPalette.current
 val threads by repository.observeThreads().collectAsState(initial=emptyList())
 Box(Modifier.fillMaxSize(),contentAlignment=Alignment.Center) {
  if(threads.isEmpty()) Text(
   "Inbox is not connected yet",
   color=p.secondary,style=EkmivoType.body
  ) else Text(
   "Inbox integration required",
   color=p.secondary,style=EkmivoType.body
  )
 }
}
