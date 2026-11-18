"use client";
import {useTransition} from "react";
import {useRouter} from "next/navigation";
import {updatePreferredLanguage} from "@/actions/preferences";
const languages=[["en","English"],["ve","Tshivenda"],["ts","itsonga"],["nso","Sepedi"],["zu","isiZulu"],["xh","isiXhosa"],["af","Afrikaans"],["tn","Setswana"],["st","Sesotho"],["ss","siSwati"],["nr","isiNdebele"]] as const;
export function LanguageSelector({value="en"}:{value?:string}){
 const [pending,startTransition]=useTransition(),router=useRouter();
 return <label className="inline-flex items-center gap-2 text-xs text-slate-500"><span>Language</span><select aria-label="Language" disabled={pending} value={value} onChange={e=>startTransition(async()=>{await updatePreferredLanguage(e.target.value);router.refresh();})} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-forest">{languages.map(([code,label])=><option key={code} value={code}>{label}</option>)}</select></label>;
}
