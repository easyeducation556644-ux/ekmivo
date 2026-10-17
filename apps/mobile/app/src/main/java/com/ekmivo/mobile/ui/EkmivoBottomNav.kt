package com.ekmivo.mobile.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.unit.dp

/** Exactly two tabs: Live and Settings; no empty Inbox entry. */
enum class EkmivoPage { LIVE, SETTINGS }

@Composable
fun EkmivoBottomNav(bn:Boolean,page:EkmivoPage,onSelect:(EkmivoPage)->Unit) {
 val p=LocalEkmivoPalette.current
 Row(
  Modifier.fillMaxWidth().topHairline(p.border).background(p.canvas)
   .navigationBarsPadding().padding(start=24.dp,end=24.dp,top=8.dp,bottom=14.dp),
  horizontalArrangement=Arrangement.SpaceAround,
  verticalAlignment=Alignment.CenterVertically
 ) {
  EkmivoNavItem(if(bn)"লাইভ" else "Live",page==EkmivoPage.LIVE,
   onClick={onSelect(EkmivoPage.LIVE)},icon={
    EkmivoNavLineIcon(EkmivoPage.LIVE,if(page==EkmivoPage.LIVE)p.text else p.secondary)
   })
  EkmivoNavItem(if(bn)"সেটিংস" else "Settings",page==EkmivoPage.SETTINGS,
   onClick={onSelect(EkmivoPage.SETTINGS)},icon={
    EkmivoNavLineIcon(EkmivoPage.SETTINGS,if(page==EkmivoPage.SETTINGS)p.text else p.secondary)
   })
 }
}

@Composable
private fun EkmivoNavLineIcon(page:EkmivoPage,ink:Color) {
 Canvas(Modifier.size(20.dp)){
  val st=1.8.dp.toPx()
  val w=size.width
  if(page==EkmivoPage.LIVE) {
   val coords=listOf(
    Offset(0f,w*.55f),Offset(w*.24f,w*.55f),Offset(w*.38f,w*.17f),
    Offset(w*.58f,w*.84f),Offset(w*.73f,w*.42f),Offset(w,w*.42f)
   )
   coords.zipWithNext{a,b->drawLine(ink,a,b,st,cap=StrokeCap.Round)}
  } else {
   for(y in listOf(.23f,.5f,.77f)){
    drawLine(ink,Offset(w*.08f,w*y),Offset(w*.92f,w*y),st,cap=StrokeCap.Round)
   }
   drawCircle(ink,radius=3.0.dp.toPx(),
    center=Offset(w*.40f,w*.23f))
   drawCircle(ink,radius=3.0.dp.toPx(),center=Offset(w*.67f,w*.50f))
   drawCircle(ink,radius=3.0.dp.toPx(),center=Offset(w*.31f,w*.77f))
  }
 }
}
