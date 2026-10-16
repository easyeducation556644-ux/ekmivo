"use client";
import {useRef,useState,type ReactNode} from "react";

export function AdminCopy({value,label="Copy"}:{value:string;label?:string}){
 const [copied,setCopied]=useState(false);
 async function copy(){try{await navigator.clipboard.writeText(value);setCopied(true);}catch{setCopied(false);}}
 return <button className="pa-copy" type="button" onClick={copy} title={copied?"Copied":label} aria-label={copied?"Copied":label}>{copied?"✓":"⧉"}</button>;
}
export function AdminModal({title,label,children}:{title:string;label:string;children:ReactNode}){
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 return <><button type="button" ref={trigger} className="pa-button pa-button-primary" onClick={()=>dialog.current?.showModal()}>{label}</button>
 <dialog ref={dialog} className="pa-dialog" onClose={()=>trigger.current?.focus()} onClick={event=>{if(event.target===dialog.current)dialog.current?.close();}} aria-label={title}>
 <div className="pa-dialog-head"><h2>{title}</h2><button className="pa-icon-button" type="button" aria-label="Close dialog" onClick={()=>dialog.current?.close()}>×</button></div>
 <div className="pa-dialog-body">{children}</div>
 <div className="pa-dialog-foot"><button className="pa-button pa-button-secondary" type="button" onClick={()=>dialog.current?.close()}>Close</button></div>
 </dialog></>;
}
