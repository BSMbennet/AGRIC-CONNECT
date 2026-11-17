"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, ClipboardList, FlaskConical, LockKeyhole, Plus, Sprout } from "lucide-react";

type FieldProfile = {
  id: string;
  field_name: string;
  locality: string;
  soil_texture: string;
  drainage: string;
  soil_ph: number | null;
  soil_ph_source: string;
  soil_test_date: string | null;
  previous_crop: string | null;
  field_notes: string | null;
  created_at: string;
  updated_at: string;
};

const textureLabels: Record<string, string> = {
  sandy: "Sandy", sandy_loam: "Sandy loam", loamy: "Loamy",
  clay_loam: "Clay loam", clay: "Clay", unknown: "Not sure"
};
const drainageLabels: Record<string, string> = {
  well_drained: "Drains well", moderate: "Moderate drainage",
  poor: "Poor drainage", unknown: "Not sure"
};

export function FieldTruthWorkspace({ initialFields }: { initialFields: FieldProfile[] }) {
  const [fields, setFields] = useState(initialFields);
  const [fieldName, setFieldName] = useState("");
  const [locality, setLocality] = useState("");
  const [soilTexture, setSoilTexture] = useState("unknown");
  const [drainage, setDrainage] = useState("unknown");
  const [soilPh, setSoilPh] = useState("");
  const [soilPhSource, setSoilPhSource] = useState("not_tested");
  const [soilTestDate, setSoilTestDate] = useState("");
  const [previousCrop, setPreviousCrop] = useState("");
  const [fieldNotes, setFieldNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field_name: fieldName,
          locality,
          soil_texture: soilTexture,
          drainage,
          soil_ph: soilPh === "" ? null : Number(soilPh),
          soil_ph_source: soilPhSource,
          soil_test_date: soilTestDate || null,
          previous_crop: previousCrop || null,
          field_notes: fieldNotes || null
        })
      });
      const result = await response.json() as { field?: FieldProfile; error?: string };
      if (!response.ok || !result.field) throw new Error(result.error ?? "Could not save this field.");
      setFields(current => [result.field!, ...current].slice(0, 30));
      setFieldName("");
      setLocality("");
      setSoilTexture("unknown");
      setDrainage("unknown");
      setSoilPh("");
      setSoilPhSource("not_tested");
      setSoilTestDate("");
      setPreviousCrop("");
      setFieldNotes("");
      setSuccess("Your private field profile has been saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this field. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-5 py-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,.9fr)]">
      <section className="rounded-3xl border border-emerald-900/10 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-leaf"><Plus size={21}/></span>
          <div><h2 className="font-bold text-forest">Add a field profile</h2><p className="mt-1 text-sm text-slate-600">You can leave soil measurements blank if you have not tested them.</p></div>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-forest">Field name
              <input required minLength={2} maxLength={80} value={fieldName} onChange={e=>setFieldName(e.target.value)} placeholder="e.g. Riverside field" className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-leaf focus:ring-2 focus:ring-emerald-100"/>
            </label>
            <label className="block text-sm font-semibold text-forest">Locality
              <input required minLength={2} maxLength={100} value={locality} onChange={e=>setLocality(e.target.value)} placeholder="e.g. Nzhelele" className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-leaf focus:ring-2 focus:ring-emerald-100"/>
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-forest">Soil texture
              <select value={soilTexture} onChange={e=>setSoilTexture(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal">
                <option value="unknown">I am not sure</option><option value="sandy">Sandy</option><option value="sandy_loam">Sandy loam</option><option value="loamy">Loamy</option><option value="clay_loam">Clay loam</option><option value="clay">Clay</option>
              </select>
            </label>
            <label className="block text-sm font-semibold text-forest">Drainage after rain
              <select value={drainage} onChange={e=>setDrainage(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal">
                <option value="unknown">I am not sure</option><option value="well_drained">Water drains quickly</option><option value="moderate">Water drains at a moderate rate</option><option value="poor">Water remains / pools</option>
              </select>
            </label>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-forest"><FlaskConical size={17}/> Soil pH (optional)</div>
            <p className="mt-1 text-xs leading-5 text-slate-500">Only enter a number if you have a test result or a clearly identified estimate. Do not guess.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-forest">pH value
                <input type="number" min="3" max="10" step="0.1" value={soilPh} onChange={e=>{setSoilPh(e.target.value);if(e.target.value && soilPhSource==="not_tested")setSoilPhSource("farmer_estimate");if(!e.target.value)setSoilPhSource("not_tested");}} placeholder="e.g. 6.2" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal"/>
              </label>
              <label className="block text-sm font-semibold text-forest">How was it obtained?
                <select value={soilPhSource} onChange={e=>setSoilPhSource(e.target.value)} disabled={!soilPh} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal disabled:opacity-60">
                  <option value="not_tested">Not tested</option><option value="lab_tested">Laboratory test</option><option value="farmer_estimate">Farmer estimate</option>
                </select>
              </label>
            </div>
            {soilPhSource==="lab_tested"&&<label className="mt-3 block text-sm font-semibold text-forest">Soil test date
              <input type="date" value={soilTestDate} onChange={e=>setSoilTestDate(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal"/>
            </label>}
          </div>
          <label className="block text-sm font-semibold text-forest">Previous crop (optional)
            <input maxLength={80} value={previousCrop} onChange={e=>setPreviousCrop(e.target.value)} placeholder="What was planted here last season?" className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal"/>
          </label>
          <label className="block text-sm font-semibold text-forest">Field observations (optional)
            <textarea maxLength={2000} rows={3} value={fieldNotes} onChange={e=>setFieldNotes(e.target.value)} placeholder="For example: water collects near the lower end after heavy rain." className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-leaf focus:ring-2 focus:ring-emerald-100"/>
          </label>
          {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {success&&<p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
          <button disabled={saving} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-forest px-5 py-3 text-sm font-bold text-white disabled:opacity-60"><CheckCircle2 size={17}/>{saving?"Saving field…":"Save private field profile"}</button>
        </form>
      </section>

      <div className="space-y-5">
        <section className="rounded-3xl border border-emerald-900/10 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2"><LockKeyhole className="text-leaf" size={19}/><h2 className="font-bold text-forest">Your data stays private</h2></div>
          <p className="mt-2 text-sm leading-6 text-slate-600">Field profiles are visible only to your signed-in farmer account. This version records a locality, not GPS coordinates. Nothing is shared with buyers, traders or other farmers.</p>
          <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-950">A farmer observation is not a laboratory result. AgricNorthX keeps the source of each pH value so future recommendations can weigh the evidence appropriately.</div>
        </section>
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
          <div className="flex items-center gap-2"><Sprout className="text-amber-800" size={19}/><h2 className="font-bold text-amber-950">Building toward crop suitability</h2></div>
          <p className="mt-2 text-sm leading-6 text-amber-950">Your field observations are the first step. AgricNorthX will only calculate crop suitability when locally reviewed crop requirements and reliable soil and climate datasets are connected. This page does not yet generate crop scores or yield predictions.</p>
        </section>
      </div>

      <section className="lg:col-span-2">
        <div className="flex items-center gap-2"><ClipboardList className="text-leaf" size={20}/><h2 className="text-xl font-bold text-forest">My field profiles</h2><span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-leaf">{fields.length}</span></div>
        {fields.length===0?<div className="mt-4 rounded-2xl border border-dashed border-emerald-900/20 bg-white p-8 text-center"><Sprout className="mx-auto text-leaf" size={28}/><p className="mt-3 font-semibold text-forest">No field profiles yet</p><p className="mt-1 text-sm text-slate-500">Add your first field above. You can record more than one field.</p></div>:<div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{fields.map(field=><article key={field.id} className="rounded-2xl border border-emerald-900/10 bg-white p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-forest">{field.field_name}</h3><p className="mt-1 text-xs text-slate-500">{field.locality}</p></div><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-leaf">Private</span></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-slate-500">Soil texture</dt><dd className="mt-1 font-semibold text-forest">{textureLabels[field.soil_texture]??"Unknown"}</dd></div><div><dt className="text-xs text-slate-500">Drainage</dt><dd className="mt-1 font-semibold text-forest">{drainageLabels[field.drainage]??"Unknown"}</dd></div><div><dt className="text-xs text-slate-500">Soil pH</dt><dd className="mt-1 font-semibold text-forest">{field.soil_ph===null?"Not tested":Number(field.soil_ph).toFixed(1)}</dd></div><div><dt className="text-xs text-slate-500">pH evidence</dt><dd className="mt-1 font-semibold text-forest">{field.soil_ph_source==="lab_tested"?"Lab tested":field.soil_ph_source==="farmer_estimate"?"Farmer estimate":"No result"}</dd></div></dl>{field.previous_crop&&<p className="mt-3 text-xs text-slate-600">Previous crop: {field.previous_crop}</p>}{field.field_notes&&<p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-600">{field.field_notes}</p>}<p className="mt-4 text-[10px] text-slate-400">Recorded {new Date(field.created_at).toLocaleDateString("en-ZA")}</p></article>)}</div>}
      </section>
    </div>
  );
}
