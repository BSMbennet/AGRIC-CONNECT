"use client";
import { animate, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";

/** Animated integer/decimal statistic. Renders the final value immediately for reduced motion. */
export function CountUp({ value, decimals = 0, prefix = "", suffix = "" }: { value: number; decimals?: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const fmt = (n: number) => prefix + n.toLocaleString("en-ZA", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
  useEffect(() => {
    const el = ref.current;
    if (!el || reduce) return;
    const controls = animate(0, value, { duration: 0.8, ease: "easeOut", onUpdate: (n) => { el.textContent = fmt(n); } });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduce, decimals, prefix, suffix]);
  return <span ref={ref}>{fmt(value)}</span>;
}
