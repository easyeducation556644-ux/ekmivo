import qrcode from "./qr-generator.mjs";
export function pairingPayload(token){
 if(typeof token!=="string"||!/^[A-Za-z0-9_-]{24,160}$/.test(token))throw Error("INVALID_PAIRING_CODE");
 return "ekmivo://pair?token="+encodeURIComponent(token);
}
export function pairingSvg(token){
 const qr=qrcode(0,"M");qr.addData(pairingPayload(token));qr.make();
 // Five quiet-zone modules, explicit square size, opaque light background.
 return qr.createSvgTag({cellSize:5,margin:25,scalable:false});
}
