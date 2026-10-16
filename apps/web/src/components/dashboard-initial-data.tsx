"use client";
import {createContext,useContext,type ReactNode} from "react";
export type InitialRead={data:unknown;error:string;at:number};
export type InitialReads=Record<string,InitialRead>;
const Context=createContext<InitialReads>({});
export function DashboardInitialData({reads,children}:{reads:InitialReads;children:ReactNode}){return <Context.Provider value={reads}>{children}</Context.Provider>}
export function useDashboardInitialData<T>(key:string){return useContext(Context)[key] as {data:T|null;error:string;at:number}|undefined}
