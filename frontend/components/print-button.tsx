"use client";
export function PrintButton() {
  return <button type="button" onClick={() => window.print()} className="rounded-xl bg-forest px-4 py-2 text-sm font-bold text-white print:hidden">Print or save as PDF</button>;
}
