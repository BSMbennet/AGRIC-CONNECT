import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
const locales=["en","ve","tsh","ts","nso","zu","xh","af","tn","st","ss","nr"] as const;
export default getRequestConfig(async()=>{
 const cookieStore=await cookies(),requested=cookieStore.get("NEXT_LOCALE")?.value;
 const locale=locales.includes(requested as (typeof locales)[number])?requested as (typeof locales)[number]:"en";
 const messages=locale==="ve"||locale==="tsh"?(await import("../messages/ve.json")).default:locale==="ts"?(await import("../messages/ts.json")).default:locale==="nso"?(await import("../messages/nso.json")).default:locale==="zu"?(await import("../messages/zu.json")).default:locale==="xh"?(await import("../messages/xh.json")).default:locale==="af"?(await import("../messages/af.json")).default:locale==="tn"?(await import("../messages/tn.json")).default:locale==="st"?(await import("../messages/st.json")).default:locale==="ss"?(await import("../messages/ss.json")).default:locale==="nr"?(await import("../messages/nr.json")).default:(await import("../messages/en.json")).default;
 return {locale,messages};
});
