export const supportedAssistantLanguages = ["en","ve","ts","nso","zu","xh","af","tn","st","ss","nr"] as const;
export type AssistantLanguage = typeof supportedAssistantLanguages[number];
type LanguageMarker = { language: AssistantLanguage; phrases: string[] };

const markers: LanguageMarker[] = [
  { language:"ve", phrases:["ndi khou","vhulimi","zwibveledzwa","ndi toda","nḓi khou","tshifhinga tsha","ḓivha","vhudzani","doda yanga"] },
  { language:"ts", phrases:["ndzi lava","sweswi","vurimi","swibyariwa","tioda ta","xana","ndzi kombela","swi endla","mavonelo ya"] },
  { language:"nso", phrases:["ke nyaka","bjang","temo","ditšweletšwa","diotara tša","mpotše","ga ke","kgopela","tša gago"] },
  { language:"zu", phrases:["ngifuna","ngicela","ngithenge","ngithengisile","ukuthi","ngiyabonga","ezolimo","ama-oda","umkhiqizo wami"] },
  { language:"xh", phrases:["ndifuna","ndicela","ndithengisile","ndiyabulela","ezolimo","ii-odolo","imveliso yam","ndingathanda"] },
  { language:"af", phrases:["asseblief","ek wil","hoeveel","wanneer moet","my bestelling","boerdery","ek het","jy kan","die oes"] },
  { language:"tn", phrases:["ke batla","temothuo","ditlhagiswa","diotara tsa","mpolelele","jang","ke kopa","go rekisa"] },
  { language:"st", phrases:["ke batla","temo","lihlahisoa","liodara tsa","mpolelle","joang","ke kopa","ke rekisitse"] },
  { language:"ss", phrases:["ngifuna","ngicela","kulima","ema-oda","imikhicito","ngiyabonga","ngitjele","kutsi"] },
  { language:"nr", phrases:["ngifuna","ngicela","ukulima","ama-oda","imikhiqizo","ngiyathokoza","ngitjela","ngifuna ukwazi"] },
  { language:"en", phrases:["how much","when should","where is my","my order","i would like","please help","can you","i have","what is","how do"] }
];

export type LanguageDetection = {
  language: AssistantLanguage | null;
  confidence: number;
  ambiguous: boolean;
  scores: Partial<Record<AssistantLanguage, number>>;
};

export function detectAssistantLanguage(input: string): LanguageDetection {
  const text = input.toLocaleLowerCase().normalize("NFKC").replace(/[’']/g,"'");
  const scores: Partial<Record<AssistantLanguage,number>> = {};
  for (const marker of markers) {
    let score = 0;
    for (const phrase of marker.phrases) {
      if (text.includes(phrase)) score += phrase.includes(" ") ? 2 : 1;
    }
    if (score > 0) scores[marker.language] = score;
  }
  const ranked = Object.entries(scores).sort((a,b)=>b[1]-a[1]) as [AssistantLanguage,number][];
  const first = ranked[0], second = ranked[1];
  if (!first || first[1] < 2 || (second && first[1]-second[1] < 2)) {
    return { language:null, confidence:0, ambiguous:true, scores };
  }
  return {
    language:first[0],
    confidence:Math.min(0.95,0.55+first[1]*0.08),
    ambiguous:false,
    scores
  };
}
