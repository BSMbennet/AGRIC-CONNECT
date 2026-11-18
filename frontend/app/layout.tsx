import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { AssistantMount } from "@/components/assistant-mount";

export const metadata:Metadata={
  title:"AgricNorthX | Local harvest. Smarter decisions. Better markets.",
  description:"A farmer-to-buyer and smart farming platform for smallholder farmers in Vhembe, Limpopo.",
  applicationName:"AgricNorthX",manifest:"/manifest.webmanifest",icons:{icon:"/icon.svg"}
};
export const viewport:Viewport={themeColor:"#174B35",width:"device-width",initialScale:1};

export default async function RootLayout({children}:{readonly children:React.ReactNode}){
  const [locale,messages]=await Promise.all([getLocale(),getMessages()]);
  return <html lang={locale}><body><NextIntlClientProvider messages={messages}>{children}<AssistantMount /></NextIntlClientProvider></body></html>;
}
