/** Shared by signup, recovery and server validation. Login accepts existing passwords. */
export function passwordChecks(password:string){
 return {length:password.length>=8&&password.length<=256,letter:/\p{L}/u.test(password),number:/\p{N}/u.test(password),symbol:/[^\p{L}\p{N}\s]/u.test(password)};
}
export function validNewPassword(password:string){const c=passwordChecks(password);return c.length&&c.letter&&c.number;}
