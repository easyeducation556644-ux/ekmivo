// RFC 6238-compatible TOTP, no secret storage or UI. Imported server-side only.
import { createHmac, timingSafeEqual } from "node:crypto";
const SYMBOLS="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function encodeBase32(bytes) {
 let bits=0,value=0,output="";
 for(const byte of bytes){
  value=(value<<8)|byte;bits+=8;
  while(bits>=5){output+=SYMBOLS[(value>>>(bits-5))&31];bits-=5;}
 }
 if(bits>0)output+=SYMBOLS[(value<<(5-bits))&31];
 return output;
}
export function decodeBase32(secret) {
 if(typeof secret!=="string" || !/^[A-Z2-7]{16,64}$/.test(secret))throw Error("INVALID_TOTP_SECRET");
 let bits=0,value=0;const result=[];
 for(const ch of secret){
  value=(value<<5)|SYMBOLS.indexOf(ch);bits+=5;
  if(bits>=8){result.push((value>>>(bits-8))&255);bits-=8;}
 }
 return Buffer.from(result);
}
export function totpAt(secret,step,digits=6){
 if(!Number.isSafeInteger(step)||step<0||![6,8].includes(digits))throw Error("INVALID_TOTP_STEP");
 const buf=Buffer.alloc(8);
 buf.writeUInt32BE(Math.floor(step/0x100000000),0);
 buf.writeUInt32BE(step>>>0,4);
 const hmac=createHmac("sha1",decodeBase32(secret)).update(buf).digest();
 const position=hmac[hmac.length-1]&0xf;
 const value=(hmac.readUInt32BE(position)&0x7fffffff)%(10**digits);
 return String(value).padStart(digits,"0");
}
export function matchTotp(secret,code,lastUsedStep,now=Date.now()){
 if(typeof code!=="string"||!/^[0-9]{6}$/.test(code))return null;
 const currentStep=Math.floor(now/30000);
 for(const offset of [-1,0,1]){
  const step=currentStep+offset;
  if(step<=lastUsedStep||step<0)continue;
  const expected=Buffer.from(totpAt(secret,step));
  const supplied=Buffer.from(code);
  if(timingSafeEqual(expected,supplied))return step;
 }
 return null;
}
