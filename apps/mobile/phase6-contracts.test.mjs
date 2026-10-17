import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=(name)=>readFileSync(name,"utf8");

test("a single shared brand header is used across both Live and Settings",()=>{
 const app=read("apps/mobile/app/src/main/java/com/ekmivo/mobile/ui/EkmivoApp.kt");
 const settings=read("apps/mobile/app/src/main/java/com/ekmivo/mobile/receipt/EkmivoSettings.kt");
 const home=read("apps/mobile/app/src/main/java/com/ekmivo/mobile/receipt/LiveHome.kt");
 assert.match(app,/topBar=\{\s*EkmivoBrandHeader\(/);
 assert.doesNotMatch(app,/if\(tab==Tab\.SETTINGS\) Row/);
 assert.doesNotMatch(settings,/SettingsHeading[\s\S]{0,350}Text\("e\."/);
 assert.doesNotMatch(home,/item\{HomeHeader\(bn,state\)\}/);
});
test("live state badge overlaps the pulse ring, never duplicates the header",()=>{
 const home=read("apps/mobile/app/src/main/java/com/ekmivo/mobile/receipt/LiveHome.kt");
 assert.match(home,/HeroStatusBadge\(bn,state,[\s\S]{0,110}align\(Alignment.TopEnd\)/);
 assert.match(home,/Forwarded\\nin history/);
 assert.match(home,/Text\(if\(bn\)"সংরক্ষিত SMS\\nপাঠানো"/);
 assert.match(home,/EkmivoPulseRing\(/);
});
test("inbox is hard-disabled with a real data model and token registration seams",()=>{
 const domain=read("apps/mobile/app/src/main/java/com/ekmivo/mobile/inbox/InboxDomain.kt");
 const app=read("apps/mobile/app/src/main/java/com/ekmivo/mobile/ui/EkmivoApp.kt");
 const manifest=read("apps/mobile/app/src/main/AndroidManifest.xml");
 const fcm=read("apps/mobile/app/src/main/java/com/ekmivo/mobile/inbox/InboxPush.kt");
 assert.match(domain,/const val inboxEnabled = false/);
 assert.match(domain,/interface InboxRepository/);
 assert.match(domain,/data class InboxMessage/);
 assert.match(app,/Tab\.INBOX->if\(InboxFeatureFlag\.inboxEnabled\)/);
 assert.match(manifest,/InboxFirebaseService/);
 assert.match(fcm,/override fun onNewToken/);
 assert.match(fcm,/currentPhone\(context\)/);
 assert.match(fcm,/FirebaseApp.getApps\(app\)\.isEmpty\(\)/);
});
