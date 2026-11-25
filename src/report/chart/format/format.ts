const DEFAULT_CURRENCY = "USD";

function numberFormatter(spec: string, locale: string): (v: number) => string {
  if (spec === "integer") {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format;
  }
  if (spec === "percent") {
    return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format;
  }
  if (spec.startsWith("currency")) {
    const code = spec.includes(":") ? spec.split(":")[1] : DEFAULT_CURRENCY;
    return new Intl.NumberFormat(locale, { style: "currency", currency: code }).format;
  }
  if (spec.includes("{value}")) {
    return (v: number) => spec.replace("{value}", String(v));
  }
  // "auto": compact for large magnitudes, 2 decimals otherwise
  return (v: number) => {
    const a = Math.abs(v);
    if (a !== 0 && (a >= 1_000_000 || a < 0.001)) {
      return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(v);
    }
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(v);
  };
}

const DATE_OPTIONS: Record<string, Intl.DateTimeFormatOptions> = {
  auto: { month: "short", day: "numeric" },
  year: { year: "numeric" },
  month: { month: "long" },
  "month short": { month: "short" },
  "month day": { month: "short", day: "numeric" },
  day: { day: "numeric" },
  "hour": { hour: "numeric", minute: "2-digit" },
  "day hour": { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
  full: { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
};

export function makeDateFormatter(spec: string, locale: string): (v: number) => string {
  const options = DATE_OPTIONS[spec] ?? DATE_OPTIONS.auto;
  return new Intl.DateTimeFormat(locale, options).format;
}

export function makeFormatter(spec: string, locale: string): (v: number) => string {
  return numberFormatter(spec || "auto", locale);
}
