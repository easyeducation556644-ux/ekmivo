import {notFound} from "next/navigation";
import type {Metadata} from "next";
import {PublicPricing} from "../../../components/public-pricing";

export const metadata:Metadata={title:"Payment Gateway Pricing | Ekmivo"};
export default async function Page({params}:{params:Promise<{locale:string}>}){
 const {locale}=await params;
 if(locale!=="en"&&locale!=="bn")notFound();
 return <main><PublicPricing locale={locale}/></main>;
}
