// Formatage identique à la plateforme Web (fr-TN, devise TND, 0 décimales).

export function formatTnd(n: number | null | undefined, maxFractionDigits = 0): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  try {
    return new Intl.NumberFormat("fr-TN", {
      style: "currency",
      currency: "TND",
      maximumFractionDigits: maxFractionDigits,
    }).format(n);
  } catch {
    // Fallback si Intl n'est pas disponible
    return `${Math.round(n).toLocaleString()} TND`;
  }
}

export function formatNumber(n: number | null | undefined, maxFractionDigits = 0): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  try {
    return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: maxFractionDigits }).format(n);
  } catch {
    return String(Math.round(n));
  }
}

export function formatM2(n: number | null | undefined): string {
  return n === null || n === undefined || Number.isNaN(n) ? "—" : `${formatNumber(n)} m²`;
}

export function formatDate(ts: number | string | Date | undefined): string {
  if (!ts) return "—";
  const d = typeof ts === "number" || typeof ts === "string" ? new Date(ts) : ts;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateShort(ts: number | undefined): string {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function initials(name?: string | null, fallback = "U"): string {
  if (!name) return fallback;
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}