export function encodeBase32(bytes:Uint8Array):string;
export function decodeBase32(secret:string):Buffer;
export function totpAt(secret:string,step:number,digits?:6|8):string;
export function matchTotp(secret:string,code:string,lastUsedStep:number,now?:number):number|null;
