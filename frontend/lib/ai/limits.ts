export type Tier = "free" | "pro";
export const LIMITS: Record<Tier, { perMinute: number; perDay: number }> = {
  free: { perMinute: 5, perDay: 20 },
  pro: { perMinute: 10, perDay: 150 },
};
export type Decision = { allowed: true } | { allowed: false; reason: "minute" | "day"; retryAfterSeconds: number };

/** Pure decision so it can be unit-tested. Counts are requests made in the trailing window. */
export function decide(tier: Tier, inLastMinute: number, inLastDay: number): Decision {
  const l = LIMITS[tier];
  if (inLastMinute >= l.perMinute) return { allowed: false, reason: "minute", retryAfterSeconds: 60 };
  if (inLastDay >= l.perDay) return { allowed: false, reason: "day", retryAfterSeconds: 3600 };
  return { allowed: true };
}
