import {notFound} from "next/navigation";
import {SiteHeader} from "../../../components/site-header";
import {SiteFooter} from "../../../components/site-footer";
import {PaymentServiceStatus} from "../../../components/payment-service-status";
export default async function Status({params}:{params:Promise<{locale:string}>}){const {locale}=await params;if(locale!=="en"&&locale!=="bn")notFound();return <><SiteHeader locale={locale} initialTheme="system"/><main className="pg10-workspace" style={{maxWidth:800,margin:"120px auto 64px",padding:24}}><h1>{locale==="bn"?"সেবার অবস্থা":"Service status"}</h1><PaymentServiceStatus locale={locale}/></main><SiteFooter locale={locale}/></>}
