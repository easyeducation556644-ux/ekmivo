import {redirect} from "next/navigation";
import {currentUser} from "../../../../lib/server/auth";
import {AdminSignInForm} from "../../../../components/admin-sign-in-form";
export const dynamic="force-dynamic";
export default async function AdminSignIn({params}:{params:Promise<{locale:string}>}){
 const {locale:raw}=await params,locale=raw==="bn"?"bn":"en";
 if(await currentUser())redirect("/"+locale+"/admin/verify");
 return <AdminSignInForm locale={locale}/>;
}
