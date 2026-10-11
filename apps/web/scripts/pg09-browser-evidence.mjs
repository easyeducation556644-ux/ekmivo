import assert from "node:assert/strict";
import {mkdir,writeFile} from "node:fs/promises";

// UI-only Playwright test under REAL logged-in Next sessions. The PG09 Go API
// responses below are deliberately MOCKED. Database correctness is separately
// verified by PostgreSQL in pg04-financial-smoke.mjs. NEVER count this as
// live-provider/merchant or full signed HTTP-to-DB acceptance.
export async function runPG09Browser({origin,browser,tenant,sessions}){
 const uuid="1d7c6c81-987e-4a44-a7a0-51b5a4c81234";
 const paymentID="1d7c6c81-987e-4a44-a7a0-51b5a4c81235";
 const incomingID="1d7c6c81-987e-4a44-a7a0-51b5a4c81236";
 const accountID="1d7c6c81-987e-4a44-a7a0-51b5a4c81237";
 const endpointID="1d7c6c81-987e-4a44-a7a0-51b5a4c81238";
 const recent="2026-10-11T18:02:00Z";
 const root="/en/w/"+tenant+"/payments";
 const calls=[];
 const row={id:paymentID,merchant_reference:"PG09-FAKE-UI-REFERENCE",verified_amount_minor:5500,
  method:"bkash",payer_suffix:"1234",verification_method:"sandbox_fixture",
  original_transaction_at:recent,verified_at:recent,webhook_status:"delivered",
  source_kind:"sandbox_fixture",event_id:uuid,status:"verified"};
 const incoming={id:incomingID,amount_minor:5500,method:"bkash",original_transaction_at:recent,
  received_at:recent,device_source:"device_sms",status:"matched",parse_reason:"",reason:"",
  candidates:[{attempt_id:uuid,intent_id:uuid,payer_matches:true,account_matches:true,method_matches:true,
   amount_matches:true,time_matches:true}]};
 const webhook={id:endpointID,url:"https://example.invalid/receiver",active:true,rotation_pending:false,
  previous_until:null,created_at:recent};
 const data={
  overview:[{verified_minor:5500,pending_requests:2,unmatched_receipts:1,online_devices:1,failed_deliveries:0,
   daily_volume:Array.from({length:7},(_,i)=>({date:"2026-10-"+String(i+5).padStart(2,"0"),verified_minor:i===6?5500:0}))}],
  payments:[row],incoming:[incoming],
  gateways:[{id:accountID,method:"bkash",display_suffix:"7890",source_status:"receiving_source_online"}],
  devices:[{id:uuid,name:"PG09 fake phone",account_id:accountID,source:"device_sms",
   binding:"sms:1",permission_ok:true,backlog:0,overflow_count:0,heartbeat_at:recent}],
  webhooks:[webhook],
  deliveries:[{id:uuid,endpoint_id:endpointID,event_id:uuid,status:"delivered",attempts:1,created_at:recent}],
  events:[{id:uuid,payment_id:paymentID,event_type:"payment.verified",created_at:recent}],
  parsers:[{id:"fictional-v1",source:"device_sms",method:"bkash",version:1}]
 };
 let offlineSource=false;
 const setup=async(context)=>{
  await context.route("**/api/go/workspaces/"+tenant+"/operations/**",async route=>{
   const request=route.request(),url=new URL(request.url());
   const part=url.pathname.split("/operations/")[1]||"";
   const [resource,id,action]=part.split("/");
   calls.push({resource,method:request.method(),status:url.searchParams.get("status"),
    environment:url.searchParams.get("environment"),id,action});
   if(offlineSource&&resource==="payments")return route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({error:{code:"PIPELINE_SOURCE_UNAVAILABLE"}})});
   if(request.method()==="POST"){
    if(resource==="webhooks"&&action==="rotate")webhook.rotation_pending=true;
    return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({updated:true})});
   }
   let records=data[resource]||[];
   if(resource==="deliveries"&&id)records=records.filter(x=>x.endpoint_id===id||x.id===id);
   else if(id)records=records.filter(x=>x.id===id);
   return route.fulfill({status:200,contentType:"application/json",
    body:JSON.stringify({items:records,next_cursor:null})});
  });
 };
 const results=[];
 const passed=(name)=>{results.push(name);console.log("PG09 browser UI-only PASS: "+name)};
 const context=await browser.newContext({viewport:{width:1280,height:900}});
 try{
  await context.addCookies([{name:"ekmivo-session",value:sessions.owner,url:origin,httpOnly:true,sameSite:"Lax"}]);
  await setup(context);
  const page=await context.newPage();
  page.setDefaultTimeout(30000);page.setDefaultNavigationTimeout(90000);
  await page.goto(origin+root+"/payments?env=sandbox");
  await page.getByText("PG09-FAKE-UI-REFERENCE").first().waitFor();
  const status=page.getByLabel("Server status filter");
  await status.selectOption("verified");
  await page.waitForFunction(()=>new URLSearchParams(location.search).get("env")==="sandbox");
  assert.ok(calls.some(c=>c.resource==="payments"&&c.status==="verified"),
   "PG09 server filter was not forwarded to Go gateway");
  assert.equal(await page.getByRole("button",{name:/mark.*paid|approve payment/i}).count(),0);
  passed("authenticated owner UI lists synthetic source data with server filter and no mark-paid");
  await page.getByRole("link",{name:/1d7c6c81/}).first().click();
  await page.getByText("Provenance",{exact:false}).first().waitFor();
  await page.getByText("Webhook",{exact:false}).first().waitFor();
  passed("payment detail exposes source provenance, verification and delivery correlation");
  await page.goto(origin+root+"/incoming/"+incomingID+"?env=sandbox");
  await page.getByRole("heading",{name:"Five-field candidate comparison"}).waitFor();
  passed("incoming detail uses five-field comparison without a manual receipt approval");
  await page.goto(origin+root+"/overview?env=sandbox");
  await page.getByRole("heading",{name:/Verified volume.*last 7 days/}).waitFor();
  await page.getByRole("table",{name:"Accessible daily verified-payment totals"}).waitFor();
  await page.getByText("PG09-FAKE-UI-REFERENCE").first().waitFor();
  passed("overview displays explicit fictional seven-day daily table and correlated recent payments");
  offlineSource=true;
  await page.goto(origin+root+"/payments?env=sandbox");
  await page.getByText(/Source unavailable/).first().waitFor();
  assert.equal(await page.getByText(/No records found in this environment/).count(),0);
  offlineSource=false;
  passed("503 source outage never misrepresented as zero payments");
  await context.close();

  const viewer=await browser.newContext({viewport:{width:768,height:850}});
  try{
   await viewer.addCookies([{name:"ekmivo-session",value:sessions.viewer,url:origin,httpOnly:true,sameSite:"Lax"}]);
   await setup(viewer);
   const p=await viewer.newPage();await p.goto(origin+root+"/webhooks?env=sandbox");
   await p.getByText("https://example.invalid/receiver").first().waitFor();
   assert.equal(await p.getByRole("button",{name:/Rotate|Prepare next secret|Disable/}).count(),0);
   passed("real logged-in viewer receives read-only rendering without endpoint management controls");
  }finally{await viewer.close()}

  for(const width of [320,768,1440])for(const locale of ["en","bn"])for(const theme of ["light","dark"]){
   const c=await browser.newContext({viewport:{width,height:900}});
   try{
    await c.addCookies([{name:"ekmivo-session",value:sessions.owner,url:origin,httpOnly:true,sameSite:"Lax"},
     {name:"ekmivo-theme",value:theme,url:origin}]);
    await setup(c);
    const p=await c.newPage();await p.goto(origin+"/"+locale+"/w/"+tenant+"/payments/payments?env=sandbox");
    await p.getByText("PG09-FAKE-UI-REFERENCE").first().waitFor();
    assert.equal(await p.locator("html").getAttribute("lang"),locale);
    assert.equal(await p.locator("html").getAttribute("data-theme"),theme);
    assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),
     "PG09 operations overflow viewport at "+width+" "+locale+" "+theme);
    assert.equal(await p.getByRole("button",{name:/mark paid|approve payment/i}).count(),0);
    if(width===320&&locale==="bn"&&theme==="dark"){
     await mkdir("test-results/pg09",{recursive:true});
     await p.screenshot({path:"test-results/pg09/payments-bn-dark-320.png",fullPage:true});
    }
    passed(width+"px "+locale+" "+theme+" real authorized shell + mocked payment API, no overflow");
   }finally{await c.close()}
  }
  await mkdir("test-results/pg09",{recursive:true});
  await writeFile("test-results/pg09/browser-results.json",JSON.stringify({
   classification:"UI-ONLY: real owner/viewer sessions and Next.js shell; PG09 operations HTTP responses MOCKED. SQL separately tested in PostgreSQL; not a live/provider test.",
   results,calls
  },null,2));
 }catch(err){
  await mkdir("test-results/pg09",{recursive:true});
  await writeFile("test-results/pg09/failure.txt",String(err));
  throw err;
 }
}
