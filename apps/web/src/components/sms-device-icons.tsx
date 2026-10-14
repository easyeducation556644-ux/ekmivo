export function DeviceIcon({name}:{name:"phone"|"qr"|"copy"|"refresh"|"check"|"clock"|"shield"|"trash"|"arrow"}){
 const paths={phone:"M7 2h10v20H7V2Zm3 17h4",qr:"M3 3h6v6H3V3Zm12 0h6v6h-6V3ZM3 15h6v6H3v-6Zm12 0h3v3h3v3h-6v-6ZM3 12h6m3-9v6m0 3h6m-6 3v6m9-9v3",copy:"M9 9h12v12H9V9ZM15 9V3H3v12h6",refresh:"M20 7a9 9 0 1 0 1 8M20 3v5h-5",check:"m5 12 4 4L19 6",clock:"M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l4 2",shield:"m12 2 8 3v6c0 5-8 11-8 11S4 16 4 11V5l8-3Zm-4 9 3 3 5-6",trash:"M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7",arrow:"M5 12h14m-5-5 5 5-5 5"};
 return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>;
}
