package com.ekmivo.mobile.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.Typography
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.ekmivo.mobile.R

private val Hind = FontFamily(
 Font(R.font.hind_siliguri_regular,FontWeight.Normal),
 Font(R.font.hind_siliguri_medium,FontWeight.Medium),
 Font(R.font.hind_siliguri_semibold,FontWeight.SemiBold),
 Font(R.font.hind_siliguri_bold,FontWeight.Bold)
)
private val Light=lightColorScheme(
 background=Color(0xFFFAFAF8),surface=Color(0xFFFFFFFF),
 surfaceVariant=Color(0xFFF2F2EF),primary=Color(0xFF262626),onPrimary=Color.White,
 onBackground=Color(0xFF222222),onSurface=Color(0xFF222222),
 onSurfaceVariant=Color(0xFF565650),outline=Color(0xFF77766E),outlineVariant=Color(0xFFE6E5DF),
 secondary=Color(0xFF565650),onSecondary=Color.White,error=Color(0xFF9C3134)
)
private val Dark=darkColorScheme(
 background=Color(0xFF141414),surface=Color(0xFF242424),
 surfaceVariant=Color(0xFF2D2D2B),primary=Color(0xFFF1F1E9),onPrimary=Color(0xFF222222),
 onBackground=Color(0xFFF5F5F1),onSurface=Color(0xFFF5F5F1),
 onSurfaceVariant=Color(0xFFCAC9C2),outline=Color(0xFFA4A29B),outlineVariant=Color(0xFF40403D),
 secondary=Color(0xFFCAC9C2),onSecondary=Color(0xFF222222),error=Color(0xFFF5B4AE)
)
private val AppTypography=Typography(
 displaySmall=TextStyle(fontFamily=Hind,fontSize=33.sp,lineHeight=43.sp,fontWeight=FontWeight.Bold),
 headlineMedium=TextStyle(fontFamily=Hind,fontSize=25.sp,lineHeight=34.sp,fontWeight=FontWeight.Bold),
 titleLarge=TextStyle(fontFamily=Hind,fontSize=20.sp,lineHeight=28.sp,fontWeight=FontWeight.SemiBold),
 titleMedium=TextStyle(fontFamily=Hind,fontSize=16.sp,lineHeight=24.sp,fontWeight=FontWeight.SemiBold),
 bodyLarge=TextStyle(fontFamily=Hind,fontSize=16.sp,lineHeight=25.sp,fontWeight=FontWeight.Normal),
 bodyMedium=TextStyle(fontFamily=Hind,fontSize=14.sp,lineHeight=22.sp,fontWeight=FontWeight.Normal),
 labelLarge=TextStyle(fontFamily=Hind,fontSize=13.sp,lineHeight=21.sp,fontWeight=FontWeight.Medium),
 labelMedium=TextStyle(fontFamily=Hind,fontSize=12.sp,lineHeight=18.sp,fontWeight=FontWeight.Medium)
)

@Composable
fun EkmivoTheme(dark:Boolean,content:@Composable ()->Unit) {
 MaterialTheme(colorScheme=if(dark)Dark else Light,typography=AppTypography,content=content)
}
