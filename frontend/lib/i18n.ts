import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import en from "../messages/en.json";

const locales = ["en", "ve", "tsh", "ts", "nso", "zu", "xh", "af", "tn", "st", "ss", "nr"] as const;
type Messages = Record<string, unknown>;

/** Missing keys in a locale fall back to English, so a partly translated language never shows raw keys. */
function merge(base: Messages, over: Messages): Messages {
  const out: Messages = { ...base };
  for (const [k, v] of Object.entries(over)) {
    if (k === "_reviewed") continue;
    const b = out[k];
    out[k] = v && typeof v === "object" && !Array.isArray(v) && b && typeof b === "object" ? merge(b as Messages, v as Messages) : v;
  }
  return out;
}

async function load(locale: (typeof locales)[number]): Promise<Messages> {
  switch (locale) {
    case "ve": case "tsh": return (await import("../messages/ve.json")).default as Messages;
    case "ts": return (await import("../messages/ts.json")).default as Messages;
    case "nso": return (await import("../messages/nso.json")).default as Messages;
    case "zu": return (await import("../messages/zu.json")).default as Messages;
    case "xh": return (await import("../messages/xh.json")).default as Messages;
    case "af": return (await import("../messages/af.json")).default as Messages;
    case "tn": return (await import("../messages/tn.json")).default as Messages;
    case "st": return (await import("../messages/st.json")).default as Messages;
    case "ss": return (await import("../messages/ss.json")).default as Messages;
    case "nr": return (await import("../messages/nr.json")).default as Messages;
    default: return en as Messages;
  }
}

export default getRequestConfig(async () => {
  const requested = (await cookies()).get("NEXT_LOCALE")?.value;
  const locale = locales.includes(requested as (typeof locales)[number]) ? (requested as (typeof locales)[number]) : "en";
  const messages = locale === "en" ? (en as Messages) : merge(en as Messages, await load(locale));
  return { locale, messages };
});
