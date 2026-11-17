"use client";

import { useState, type FormEvent } from "react";
import { CloudRain, Droplets, MapPin, RefreshCw, Search, Sun, Wind } from "lucide-react";

type Place={id:number;name:string;admin1:string;admin2:string;country:string;latitude:number;longitude:number;timezone:string};
type Day={date:string;weatherCode:number|null;maxTemperature:number|null;minTemperature:number|null;precipitation:number|null;precipitationProbability:number|null;referenceEt0:number|null};
type Forecast={place:string;timezone:string;retrievedAt:string;current:{time:string|null;temperature:number|null;humidity:number|null;windSpeed:number|null}|null;daily:Day[];source:string};

const fmt=(v:number|null,digits=0)=>v===null?"—":v.toFixed(digits);
const dayName=(v:string)=>new Intl.DateTimeFormat("en-ZA",{weekday:"short",day:"numeric",month:"short"}).format(new Date(v+"T12:00:00"));
function condition(code:number|null){
  if(code===null)return "Not available"; if(code===0)return "Clear"; if(code<=2)return "Partly cloudy";
  if(code===3)return "Overcast"; if(code===45||code===48)return "Fog";
  if(code>=51&&code<=57)return "Drizzle"; if(code>=61&&code<=67)return "Rain";
  if(code>=71&&code<=77)return "Snow"; if(code>=80&&code<=82)return "Showers";
  if(code>=95)return "Thunderstorm"; return "Variable";
}

export function WeatherPlanner(){
  const [query,setQuery]=useState("Thohoyandou, Limpopo");
  const [places,setPlaces]=useState<Place[]>([]);
  const [forecast,setForecast]=useState<Forecast|null>(null);
  const [selected,setSelected]=useState<Place|null>(null);
  const [searching,setSearching]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  async function search(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setError("");setForecast(null);setSelected(null);setPlaces([]);setSearching(true);
    try{
      const response=await fetch("/api/weather?location="+encodeURIComponent(query.trim()));
      const data=await response.json() as {locations?:Place[];error?:string};
      if(!response.ok)throw new Error(data.error??"Location search failed.");
      setPlaces(data.locations??[]);
      if(!data.locations?.length)setError("No matching South African locality found. Try adding the province.");
    }catch(e){setError(e instanceof Error?e.message:"Could not search for that locality.");}
    finally{setSearching(false);}
  }

  async function load(place:Place){
    setSelected(place);setPlaces([]);setError("");setLoading(true);
    try{
      const params=new URLSearchParams({latitude:String(place.latitude),longitude:String(place.longitude),name:[place.name,place.admin1,place.country].filter(Boolean).join(", ")});
      const response=await fetch("/api/weather?"+params.toString());
      const data=await response.json() as Forecast&{error?:string};
      if(!response.ok)throw new Error(data.error??"Forecast request failed.");
      setForecast(data);
    }catch(e){setError(e instanceof Error?e.message:"Could not load the forecast.");setForecast(null);}
    finally{setLoading(false);}
  }

  const next=forecast?.daily.slice(0,3)??[];
  const rain=next.reduce((sum,d)=>sum+(d.precipitation??0),0);
  const et0=next.reduce((sum,d)=>sum+(d.referenceEt0??0),0);

  return <div className="mx-auto max-w-6xl px-5 py-8">
    <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-7">
      <div className="flex items-start gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-leaf"><MapPin size={23}/></span><div><h2 className="font-bold text-forest">Choose your farming locality</h2><p className="mt-1 text-sm text-slate-600">Search for a South African town or locality. AgricNorthX does not access your device location.</p></div></div>
      <form onSubmit={search} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="weather-location">Town or locality</label>
        <input id="weather-location" value={query} onChange={e=>setQuery(e.target.value)} minLength={2} maxLength={80} required placeholder="e.g. Thohoyandou, Limpopo" className="h-12 min-w-0 flex-1 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-leaf focus:ring-2 focus:ring-emerald-100"/>
        <button disabled={searching} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-forest px-5 text-sm font-bold text-white disabled:opacity-60"><Search size={17}/>{searching?"Searching…":"Find locality"}</button>
      </form>
      {places.length>0&&<div className="mt-4 grid gap-2" aria-label="Matching localities">{places.map(place=><button key={place.id} onClick={()=>void load(place)} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 text-left hover:border-leaf hover:bg-emerald-50"><span><span className="block font-semibold text-forest">{place.name}</span><span className="mt-1 block text-xs text-slate-500">{[place.admin2,place.admin1,place.country].filter(Boolean).join(" · ")}</span></span><span className="text-xs font-bold text-leaf">View forecast →</span></button>)}</div>}
      {error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </section>
    {loading&&<div role="status" className="mt-6 rounded-2xl bg-white p-8 text-center text-sm text-slate-600"><RefreshCw className="mx-auto mb-3 animate-spin text-leaf" size={22}/>Loading the seven-day forecast…</div>}
    {forecast&&<section className="mt-6">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-leaf">Selected locality</p><h2 className="mt-1 text-2xl font-bold text-forest">{forecast.place}</h2><p className="mt-1 text-xs text-slate-500">Forecast timezone: {forecast.timezone}</p></div><button onClick={()=>selected&&void load(selected)} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-forest"><RefreshCw size={14}/> Refresh forecast</button></div>
      {forecast.current&&<div className="mt-5 grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-emerald-900/10 bg-white p-5"><div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Sun size={15}/> Current air temperature</div><p className="mt-3 text-3xl font-bold text-forest">{fmt(forecast.current.temperature,1)}°C</p></article>
        <article className="rounded-2xl border border-emerald-900/10 bg-white p-5"><div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Droplets size={15}/> Relative humidity</div><p className="mt-3 text-3xl font-bold text-forest">{fmt(forecast.current.humidity)}%</p></article>
        <article className="rounded-2xl border border-emerald-900/10 bg-white p-5"><div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Wind size={15}/> Wind speed</div><p className="mt-3 text-3xl font-bold text-forest">{fmt(forecast.current.windSpeed,1)} km/h</p></article>
      </div>}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <article className="rounded-2xl border border-sky-100 bg-sky-50 p-5"><p className="text-xs font-bold uppercase tracking-wider text-sky-800">Next 3 days · forecast rainfall</p><p className="mt-2 text-3xl font-bold text-forest">{fmt(rain,1)} mm</p><p className="mt-1 text-xs text-slate-600">Forecast precipitation total for the selected locality.</p></article>
        <article className="rounded-2xl border border-amber-100 bg-amber-50 p-5"><p className="text-xs font-bold uppercase tracking-wider text-amber-900">Next 3 days · reference ET₀</p><p className="mt-2 text-3xl font-bold text-forest">{fmt(et0,1)} mm</p><p className="mt-1 text-xs text-slate-600">Estimated atmospheric water demand for a well-watered reference grass surface.</p></article>
      </div>
      <div className="mt-5 overflow-hidden rounded-2xl border border-emerald-900/10 bg-white"><div className="border-b border-slate-100 px-5 py-4"><h3 className="font-bold text-forest">Seven-day outlook</h3><p className="mt-1 text-xs text-slate-500">Forecast values are modelled for the selected area, not measured on an individual farm.</p></div>
        <div className="divide-y divide-slate-100">{forecast.daily.map(day=><article key={day.date} className="grid gap-2 px-5 py-4 sm:grid-cols-[1.1fr_1.2fr_repeat(3,minmax(0,.8fr))] sm:items-center"><div><p className="font-bold text-forest">{dayName(day.date)}</p><p className="text-xs text-slate-500">{condition(day.weatherCode)}</p></div><div><p className="text-xs text-slate-500">Temperature</p><p className="text-sm font-semibold text-forest">{fmt(day.minTemperature)}° / {fmt(day.maxTemperature)}°C</p></div><div><p className="text-xs text-slate-500">Rain</p><p className="text-sm font-semibold text-forest">{fmt(day.precipitation,1)} mm</p></div><div><p className="text-xs text-slate-500">Rain chance</p><p className="text-sm font-semibold text-forest">{fmt(day.precipitationProbability)}%</p></div><div><p className="text-xs text-slate-500">ET₀</p><p className="text-sm font-semibold text-forest">{fmt(day.referenceEt0,1)} mm</p></div></article>)}</div>
      </div>
      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950"><CloudRain size={19} className="mt-0.5 shrink-0"/><div><p className="font-bold">Before deciding to irrigate</p><p className="mt-1">Use rainfall and ET₀ as planning context, then check moisture in the crop root zone, soil type, crop stage and recent rainfall on your actual plot. This forecast does not measure field soil moisture, infiltration or crop-specific water demand and is not an irrigation prescription.</p></div></div>
      <p className="mt-4 text-xs text-slate-500">Weather data: <a className="font-semibold underline" href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a> · CC BY 4.0 attribution · Retrieved {new Date(forecast.retrievedAt).toLocaleString("en-ZA")}. Commercial use requires an appropriate Open-Meteo licence.</p>
    </section>}
  </div>;
}
