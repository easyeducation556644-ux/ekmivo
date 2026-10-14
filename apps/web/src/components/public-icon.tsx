export function PublicIcon({name}:{name:"wallet"|"inbox"|"shield"|"business"|"key"|"check"}){
 const paths={wallet:"M3 6h17v14H3V6Zm0 0V3h14v3m-2 6h5v5h-5v-5Z",inbox:"M4 4h16v16H4V4Zm0 9h5l1 3h4l1-3h5",shield:"m12 2 8 3v6c0 5-8 11-8 11S4 16 4 11V5l8-3Zm-4 9 3 3 5-6",business:"M4 21V7h9v14M13 11h7v10M2 21h20M7 10h3m-3 4h3m-3 4h3m6-4h2m-2 4h2",key:"M14 4a5 5 0 1 1-3 9l-8 8v-5l7-7a5 5 0 0 1 4-5Z",check:"m5 12 4 4L19 6"};
 return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>;
}
