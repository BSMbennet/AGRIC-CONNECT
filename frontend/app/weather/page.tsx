import { redirect } from "next/navigation";
import { CloudSun } from "lucide-react";
import { AppNav } from "@/components/app-nav";
import { WeatherPlanner } from "@/components/weather-planner";
import { createClient } from "@/lib/supabase/server";

export const metadata={title:"Farm Weather Planner | AgricNorthX",description:"A seven-day locality-based weather outlook for farmers in South Africa."};

export default async function WeatherPage(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect("/login");
  return <main className="agri-page scene-irrigation"><AppNav active="weather"/><section className="bg-forest text-white"><div className="mx-auto max-w-6xl px-5 py-10 sm:py-14"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-emerald-200"><CloudSun size={16}/> Farm planning</p><h1 className="mt-3 text-3xl font-bold sm:text-4xl">Plan with the weather in view.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/85">Check a seven-day forecast for your chosen locality, including rainfall, temperature and reference evapotranspiration. Use it alongside observations from your own field.</p></div></section><WeatherPlanner/></main>;
}
