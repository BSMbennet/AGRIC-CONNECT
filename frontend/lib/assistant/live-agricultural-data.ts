export type LocalWeatherContext = {
  place:string;
  retrievedAt:string;
  current:{temperature:number|null;humidity:number|null;windSpeed:number|null}|null;
  nextDays:{date:string;rainMm:number|null;rainProbability:number|null;maxC:number|null;minC:number|null}[];
  sourceUrl:string;
};

export async function getLocalWeatherContext(locality:string):Promise<LocalWeatherContext|null>{
  const place=locality.split(",")[0]?.trim();
  if(!place)return null;
  const geoUrl=new URL("https://geocoding-api.open-meteo.com/v1/search");
  geoUrl.searchParams.set("name",place);
  geoUrl.searchParams.set("count","1");
  geoUrl.searchParams.set("language","en");
  geoUrl.searchParams.set("format","json");
  geoUrl.searchParams.set("countryCode","ZA");
  const geoResponse=await fetch(geoUrl,{signal:AbortSignal.timeout(8000),next:{revalidate:86400}});
  if(!geoResponse.ok)return null;
  const geo=await geoResponse.json() as {results?:Array<{name:string;latitude:number;longitude:number;country_code:string;admin1?:string}>};
  const location=geo.results?.find(item=>item.country_code==="ZA");
  if(!location)return null;
  const forecastUrl=new URL("https://api.open-meteo.com/v1/forecast");
  forecastUrl.searchParams.set("latitude",String(location.latitude));
  forecastUrl.searchParams.set("longitude",String(location.longitude));
  forecastUrl.searchParams.set("timezone","Africa/Johannesburg");
  forecastUrl.searchParams.set("forecast_days","3");
  forecastUrl.searchParams.set("current","temperature_2m,relative_humidity_2m,wind_speed_10m");
  forecastUrl.searchParams.set("daily","precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min");
  const response=await fetch(forecastUrl,{signal:AbortSignal.timeout(10000),next:{revalidate:1800}});
  if(!response.ok)return null;
  const data=await response.json() as {
    current?:{temperature_2m?:number;relative_humidity_2m?:number;wind_speed_10m?:number};
    daily?:{time?:string[];precipitation_sum?:(number|null)[];precipitation_probability_max?:(number|null)[];temperature_2m_max?:(number|null)[];temperature_2m_min?:(number|null)[]};
  };
  if(!data.daily?.time?.length)return null;
  return {
    place:[location.name,location.admin1].filter(Boolean).join(", "),
    retrievedAt:new Date().toISOString(),
    current:data.current?{
      temperature:data.current.temperature_2m??null,
      humidity:data.current.relative_humidity_2m??null,
      windSpeed:data.current.wind_speed_10m??null
    }:null,
    nextDays:data.daily.time.map((date,index)=>({
      date,
      rainMm:data.daily?.precipitation_sum?.[index]??null,
      rainProbability:data.daily?.precipitation_probability_max?.[index]??null,
      maxC:data.daily?.temperature_2m_max?.[index]??null,
      minC:data.daily?.temperature_2m_min?.[index]??null
    })),
    sourceUrl:"https://open-meteo.com/"
  };
}

export const marketIntelligenceSource = {
  title:"NAMC Fresh Produce Market Intelligence Report",
  url:"https://www.namc.co.za/output/fresh-produce-market-intelligence-report/",
  numericPricesAvailable:false,
  limitation:"The public NAMC landing page links to market intelligence reports and a Power BI dashboard. AGRIC AI does not yet have a verified structured live price feed, so it must not invent or quote current numeric prices."
};
