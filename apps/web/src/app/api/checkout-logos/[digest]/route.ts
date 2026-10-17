import {database} from "../../../../lib/server/db";
export async function GET(_request:Request,{params}:{params:Promise<{digest:string}>}){
 const {digest}=await params;if(!/^[a-f0-9]{64}$/.test(digest))return new Response(null,{status:404});
 const rows=await database()`SELECT dashboard_checkout_logo(${digest}) AS png`;
 if(!rows[0]?.png)return new Response(null,{status:404});
 return new Response(new Uint8Array(rows[0].png),{headers:{'Content-Type':'image/png','X-Content-Type-Options':'nosniff','Cache-Control':'public,max-age=31536000,immutable'}});
}
