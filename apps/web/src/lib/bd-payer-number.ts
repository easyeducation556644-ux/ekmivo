/** Mirror backend checkout.NormalizePayer and deviceevidence.NormalizeNumber.
 * The backend always remains authoritative and rechecks the submitted number.
 * Normalized canonical form is +8801[3-9]xxxxxxxx (14 characters). */
const digits:Record<string,string>={
 "০":"0","১":"1","২":"2","৩":"3","৪":"4","৫":"5","৬":"6","৭":"7","৮":"8","৯":"9",
 "٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9",
 "۰":"0","۱":"1","۲":"2","۳":"3","۴":"4","۵":"5","۶":"6","۷":"7","۸":"8","۹":"9"
};
function asciiNumber(value:string){
 return [...value.trim()].map(char=>digits[char]??char).join("");
}
export function normalizeBangladeshPayer(value:string):string|null{
 let s=asciiNumber(value).replace(/[ -]/g,"");
 if(s.startsWith("01"))s="+88"+s;
 else if(s.startsWith("8801"))s="+"+s;
 return /^\+8801[3-9][0-9]{8}$/.test(s)?s:null;
}
/** Visual Nagad tiles display the local eleven digits; international input
 * can be pasted into the single accessible input, never stored as 14 tiles. */
export function payerLocalDigits(value:string):string{
 const s=asciiNumber(value).replace(/[^0-9]/g,"");
 return (s.startsWith("8801")?"0"+s.slice(3):s).slice(0,11);
}
