import {PlatformAdminConsole} from "../../../components/platform-admin-console";
import {notFound} from "next/navigation";
export const dynamic="force-dynamic";
export default async function AdminHome({params}:{params:Promise<{locale:string}>}){
 const {locale}=await params;if(locale!=="en"&&locale!=="bn")notFound();
 return <PlatformAdminConsole locale={locale}/>;
}
