export type FormErrorState = {status:"idle"|"error";message:string;fields?:Record<string,string>};
export const emptyState:FormErrorState={status:"idle",message:""};
export function asText(value: FormDataEntryValue|null):string {
 return typeof value==="string"?value.trim():"";
}
export const locales = ["bn","en"] as const;
export function safeLocale(value:string):"bn"|"en"{return value==="en"?"en":"bn";}
export function validEmail(email:string){return email.length<=254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);}
export function validatedName(name:string){return name.length>=2 && name.length<=100;}
export {validNewPassword as strongPassword} from "../password-policy";
