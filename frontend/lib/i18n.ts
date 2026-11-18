import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

const locales = ["en", "ve", "tsh", "ts", "nso"] as const;

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const requested = cookieStore.get("NEXT_LOCALE")?.value;
  const locale = locales.includes(requested as (typeof locales)[number]) ? requested as (typeof locales)[number] : "en";
  const messages = locale === "ve" || locale === "tsh"
    ? (await import("../messages/ve.json")).default
    : locale === "ts"
      ? (await import("../messages/ts.json")).default
      : locale === "nso"
        ? (await import("../messages/nso.json")).default
        : (await import("../messages/en.json")).default;
  return { locale, messages };
});
