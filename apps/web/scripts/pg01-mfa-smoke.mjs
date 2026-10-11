import { randomBytes,createCipheriv,createDecipheriv } from "node:crypto";
import assert from "node:assert/strict";
import {encodeBase32,decodeBase32,totpAt,matchTotp} from "../src/lib/mfa-core.js";

// RFC 6238 SHA-1 eight-digit vectors; 6-digit compatibility and replay rejection.
const secret=encodeBase32(Buffer.from("12345678901234567890","ascii"));
assert.equal(totpAt(secret,1,8),"94287082");
assert.equal(totpAt(secret,Math.floor(1111111109/30),8),"07081804");
assert.equal(totpAt(secret,Math.floor(1111111111/30),8),"14050471");
assert.equal(decodeBase32(secret).toString("ascii"),"12345678901234567890");
const now=59_000,code=totpAt(secret,Math.floor(now/30000));
assert.equal(matchTotp(secret,code,-1,now),1);
assert.equal(matchTotp(secret,code,1,now),null);
assert.equal(matchTotp(secret,"00000x",-1,now),null);
assert.equal(matchTotp(secret,"123", -1,now),null);
const key=randomBytes(32),iv=randomBytes(12);
const c=createCipheriv("aes-256-gcm",key,iv);
const sealed=Buffer.concat([c.update(secret,"utf8"),c.final()]),tag=c.getAuthTag();
const d=createDecipheriv("aes-256-gcm",key,iv);d.setAuthTag(tag);
assert.equal(Buffer.concat([d.update(sealed),d.final()]).toString("utf8"),secret);
console.log("PG01 MFA PASS: RFC6238 SHA1 vectors, base32 roundtrip, replay and AES-GCM primitive");
