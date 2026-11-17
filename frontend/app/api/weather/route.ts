import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
const locationSchema = z.string().trim().min(2).max(80);
const coordinateSchema = z.coerce.number().finite();

type GeoResult = { id:number; name:string; latitude:number; longitude:number; country_code:string; country:string; admin1?:string; admin2?:string; timezone?:string };
type WeatherPayload = {
  timezone?:string;
  current?:{time?:string;temperature_2m?:number;relative_humidity_2m?:number;wind_speed_10m?:number};
  daily?:{
    time?:string[]; weather_code?:(number|null)[]; temperature_2m_max?:(number|null)[];
    temperature_2m_min?:(number|null)[]; precipitation_sum?:(number|null)[];
    precipitation_probability_max?:(number|null)[]; et0_fao_evapotranspiration?:(number|null)[];
  };
};
const fail=(message:string,status:number)=>NextResponse.json({error:message},{status});

export async function GET(request:NextRequest) {
  const params=request.nextUrl.searchParams;
  const search=params.get("location");
  if(search!==null) {
    const parsed=locationSchema.safeParse(search);
    if(!parsed.success) return fail("Enter a locality with at least two characters.",400);
    const url=new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name",parsed.data);
    url.searchParams.set("count","8");
    url.searchParams.set("language","en");
    url.searchParams.set("format","json");
    url.searchParams.set("countryCode","ZA");
    try {
      const response=await fetch(url,{next:{revalidate:86400}});
      if(!response.ok) return fail("The locality search service is temporarily unavailable.",502);
      const payload=(await response.json()) as {results?:GeoResult[]};
      const locations=(payload.results??[]).filter(p=>p.country_code==="ZA").map(p=>({
        id:p.id,name:p.name,admin1:p.admin1??"",admin2:p.admin2??"",country:p.country,
        latitude:p.latitude,longitude:p.longitude,timezone:p.timezone??"Africa/Johannesburg"
      }));
      return NextResponse.json({locations});
    } catch { return fail("Could not search for that locality. Check your connection and try again.",502); }
  }

  const lat=coordinateSchema.safeParse(params.get("latitude"));
  const lon=coordinateSchema.safeParse(params.get("longitude"));
  const name=locationSchema.safeParse(params.get("name")??"");
  if(!lat.success||!lon.success||!name.success) return fail("Choose a South African locality from the search results first.",400);
  if(lat.data < -35 || lat.data > -22 || lon.data < 16 || lon.data > 33) return fail("The selected coordinates are outside South Africa.",400);

  const url=new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude",String(lat.data));
  url.searchParams.set("longitude",String(lon.data));
  url.searchParams.set("timezone","auto");
  url.searchParams.set("forecast_days","7");
  url.searchParams.set("current","temperature_2m,relative_humidity_2m,wind_speed_10m");
  url.searchParams.set("daily","weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,et0_fao_evapotranspiration");
  try {
    const response=await fetch(url,{next:{revalidate:1800}});
    if(!response.ok) return fail("The weather forecast is temporarily unavailable.",502);
    const payload=(await response.json()) as WeatherPayload;
    if(!payload.daily?.time?.length) return fail("The provider returned no forecast for this locality.",502);
    const daily=payload.daily.time.map((date,i)=>({
      date,weatherCode:payload.daily?.weather_code?.[i]??null,
      maxTemperature:payload.daily?.temperature_2m_max?.[i]??null,
      minTemperature:payload.daily?.temperature_2m_min?.[i]??null,
      precipitation:payload.daily?.precipitation_sum?.[i]??null,
      precipitationProbability:payload.daily?.precipitation_probability_max?.[i]??null,
      referenceEt0:payload.daily?.et0_fao_evapotranspiration?.[i]??null
    }));
    return NextResponse.json({
      place:name.data,timezone:payload.timezone??"Africa/Johannesburg",retrievedAt:new Date().toISOString(),
      current:payload.current?{
        time:payload.current.time??null,temperature:payload.current.temperature_2m??null,
        humidity:payload.current.relative_humidity_2m??null,windSpeed:payload.current.wind_speed_10m??null
      }:null,daily,source:"Open-Meteo"
    });
  } catch { return fail("Could not load the weather forecast. Check your connection and try again.",502); }
}
