import {notFound} from "next/navigation";
import {InviteAcceptance} from "../../../../components/invite-acceptance";
import {SiteHeader} from "../../../../components/site-header";
export const metadata={robots:{index:false,follow:false},referrer:"no-referrer" as const};
export default async function Page({params}:{params:Promise<{locale:string;token:string}>}){const {locale,token}=await params;if((locale!=="en"&&locale!=="bn")||!/^[A-Za-z0-9_-]{43}$/.test(token))notFound();return <><SiteHeader locale={locale} initialTheme="system"/><main style={{margin:"120px auto",maxWidth:640,padding:24}}><InviteAcceptance locale={locale} token={token}/></main></>}
