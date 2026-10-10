export const sections={
 overview:{en:"Overview",bn:"ওভারভিউ",detail:{en:"Your workspace activity and next steps, as soon as integrations are connected.",bn:"ইন্টিগ্রেশন যুক্ত হলে ব্যবসার কার্যক্রম ও পরবর্তী কাজ এখানে দেখা যাবে।"},group:"common"},
 inbox:{en:"Unified inbox",bn:"এক ইনবক্স",detail:{en:"Incoming conversations and human handover.",bn:"কাস্টমারের মেসেজ ও মানব সহায়তা।"},group:"ai"},
 channels:{en:"Channels",bn:"চ্যানেল",detail:{en:"Connect authorized Messenger, Instagram, WhatsApp, web and Telegram channels.",bn:"অনুমোদিত Messenger, Instagram, WhatsApp, web ও Telegram সংযোগ।"},group:"ai"},
 "ai-agent":{en:"AI agent",bn:"AI এজেন্ট",detail:{en:"Configure and test knowledge-guided assistance before publishing.",bn:"নলেজভিত্তিক সহায়তা প্রকাশের আগে সেটআপ ও পরীক্ষা।"},group:"ai"},
 knowledge:{en:"Knowledge",bn:"নলেজ",detail:{en:"Business knowledge, documents and answer review.",bn:"ব্যবসার তথ্য, ডকুমেন্ট ও উত্তরের পর্যালোচনা।"},group:"ai"},
 leads:{en:"Leads & CRM",bn:"লিড ও CRM",detail:{en:"Customer pipeline, follow-ups and ticket management.",bn:"লিড, ফলো-আপ ও টিকিট পরিচালনা।"},group:"ai"},
 products:{en:"Products",bn:"পণ্য",detail:{en:"Catalog, variations, availability and pricing.",bn:"পণ্যতালিকা, ভ্যারিয়েন্ট, মজুত ও মূল্য।"},group:"commerce"},
 inventory:{en:"Inventory",bn:"মজুত",detail:{en:"Warehouse stock and reservations.",bn:"ওয়্যারহাউস ও স্টক রিজার্ভেশন।"},group:"commerce"},
 orders:{en:"Orders",bn:"অর্ডার",detail:{en:"Confirmed, pending and returned orders.",bn:"নিশ্চিত, অপেক্ষমাণ ও ফেরত অর্ডার।"},group:"commerce"},
 payments:{en:"Transactions",bn:"লেনদেন",detail:{en:"Evidence-based verification, pending items and exceptions.",bn:"প্রমাণভিত্তিক যাচাই, অপেক্ষমাণ ও ব্যতিক্রমী পেমেন্ট।"},group:"commerce"},
 "payment-links":{en:"Payment links",bn:"পেমেন্ট লিংক",detail:{en:"Links and hosted payment requests.",bn:"পেমেন্ট লিংক ও পেমেন্ট রিকোয়েস্ট।"},group:"commerce"},
 invoices:{en:"Invoices",bn:"ইনভয়েস",detail:{en:"Customer invoices, receipts and statements.",bn:"ইনভয়েস, রসিদ ও হিসাবের বিবরণ।"},group:"commerce"},
 gateways:{en:"Payment methods",bn:"পেমেন্ট মাধ্যম",detail:{en:"Configure eligible payment adapters and merchant accounts.",bn:"অনুমোদিত payment adapter ও merchant account সংযুক্ত করুন।"},group:"commerce"},
 devices:{en:"SMS devices",bn:"SMS ডিভাইস",detail:{en:"Android bridge pairing and receipt source health.",bn:"Android bridge সংযোগ ও SMS receipt source health।"},group:"commerce"},
 reconciliation:{en:"Reconciliation",bn:"হিসাব মিলানো",detail:{en:"Unique receipt matching, exceptions and audit trails.",bn:"লেনদেনের একক মিল, সমস্যা ও অডিট হিস্ট্রি।"},group:"commerce"},
 shipping:{en:"Delivery & courier",bn:"ডেলিভারি ও কুরিয়ার",detail:{en:"Courier booking and delivery status.",bn:"কুরিয়ার বুকিং ও ডেলিভারি স্ট্যাটাস।"},group:"commerce"},
 developers:{en:"Developers",bn:"ডেভেলপার",detail:{en:"API keys, signed webhooks and integration docs.",bn:"API key, signed webhook ও integration docs।"},group:"commerce"},
 reports:{en:"Reports",bn:"রিপোর্ট",detail:{en:"Operations analytics and exports once activity begins.",bn:"কার্যক্রম চালু হলে রিপোর্ট ও export এখানে থাকবে।"},group:"common"},
 team:{en:"Team & access",bn:"টিম ও অনুমতি",detail:{en:"Members, roles and workspace membership.",bn:"টিম সদস্য, role ও access control।"},group:"common"},
 settings:{en:"Workspace settings",bn:"সেটিংস",detail:{en:"Profile, security, service configuration and preferences.",bn:"প্রোফাইল, নিরাপত্তা, সেবার ধরন ও পছন্দ।"},group:"common"},
} as const;
export type SectionKey=keyof typeof sections;
export function allowedSection(key:string,mode:"ai"|"commerce"|"both"){
 const data=sections[key as SectionKey];
 return !!data&&(data.group==="common"||data.group===mode||mode==="both");
}
export const groupOrder=["common","ai","commerce"] as const;
