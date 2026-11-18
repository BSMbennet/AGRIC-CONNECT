import type {Metadata,Viewport} from "next";
import {NextIntlClientProvider} from "next-intl";
import {getLocale,getMessages,getTranslations} from "next-intl/server";
import {AssistantWidget} from "@/components/assistant-widget";
import {LanguageSelector} from "@/components/language-selector";
import "./globals.css";
export const metadata:Metadata={title:"AgricNorthX | Local harvest. Smarter decisions. Better markets.",description:"A farmer-to-buyer and smart farming platform for smallholder farmers in Vhembe, Limpopo.",applicationName:"AgricNorthX",manifest:"/manifest.webmanifest",icons:{icon:"/icon.svg"}};
export const viewport:Viewport={themeColor:"#174B35",width:"device-width",initialScale:1};
export default async function RootLayout({children}:{readonly children:React.ReactNode}){
 const [locale,messages,t]=await Promise.all([getLocale(),getMessages(),getTranslations("app")]);
 return <html lang={locale}><body><NextIntlClientProvider messages={messages}><div className="sticky top-0 z-[60] flex justify-end border-b border-emerald-900/10 bg-white/95 px-5 py-2 backdrop-blur sm:px-8"><LanguageSelector value={locale} label={t("language")}/></div>{children}<AssistantWidget initialLanguage={locale}/></NextIntlClientProvider></body></html>;
}
