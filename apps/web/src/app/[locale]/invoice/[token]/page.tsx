import {notFound} from "next/navigation";
import {HostedInvoice} from "../../../../components/hosted-invoice";
export const metadata={robots:{index:false,follow:false},referrer:"no-referrer" as const};
export default async function Page({params}:{params:Promise<{locale:string;token:string}>}){
 const {locale,token}=await params;
 if((locale!=="en"&&locale!=="bn")||!/^[A-Za-z0-9_-]{43}$/.test(token))notFound();
 return <HostedInvoice locale={locale} token={token}/>;
}
