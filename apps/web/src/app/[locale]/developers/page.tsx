import {notFound} from "next/navigation";
import type {Metadata} from "next";
import {PublicDevelopers} from "../../../components/public-developers";

export const metadata:Metadata={title:"Developers — Ekmivo",description:"API integration guide for hosted checkout and verified payment updates."};
export default async function Page({params}:{params:Promise<{locale:string}>}){
 const {locale}=await params;
 if(locale!=="en"&&locale!=="bn")notFound();
 return <PublicDevelopers locale={locale}/>;
}
