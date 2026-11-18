import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

const locales = ["en", "ve", "ts", "nso"] as const;

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const requested = cookieStore.get("NEXT_LOCALE")?.value;
  const locale = locales.includes(requested as (typeof locales)[number]) ? requested as (typeof locales)[number] : "en";
  const messages = locale === "ve"
    ? (await import("../messages/ve.json")).default
    : (await import("../messages/en.json")).default;
  return { locale, messages };
});
