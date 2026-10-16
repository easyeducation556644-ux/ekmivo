import "server-only";
import {database} from "./db";
import type {PaymentPlan} from "../payment-plans";
export async function publicPaymentPlans():Promise<{plans:PaymentPlan[];unavailable:boolean}>{
 try{const r=await database()`SELECT payment_plan_public() AS plans`;return {plans:r[0].plans as PaymentPlan[],unavailable:false}}
 catch{return {plans:[],unavailable:true}}
}
