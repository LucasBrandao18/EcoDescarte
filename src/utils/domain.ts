import type { AppData, Waste } from '../types';
export const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
export function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const old = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = old;
    }
  }
  return row[b.length];
}
export function searchWastes(wastes: Waste[], term: string) {
  const q = normalize(term);
  return wastes
    .filter((w) => w.active)
    .map((w) => {
      const words = [w.name, ...w.synonyms].map(normalize);
      const score = !q
        ? 1
        : words.some((n) => n === q)
          ? 100
          : words.some((n) => n.includes(q))
            ? 80
            : words.some((n) => q.split(/\s+/).every((t) => n.includes(t)))
              ? 60
              : words.some(
                    (n) =>
                      q.length >= 4 && levenshtein(q, n) <= Math.min(2, Math.floor(q.length / 4)),
                  )
                ? 40
                : 0;
      return { w, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.w.name.localeCompare(b.w.name, 'pt-BR'))
    .map((x) => x.w);
}
export const levels = [
  { min: 0, name: 'Iniciante Sustentável' },
  { min: 50, name: 'Reciclador Consciente' },
  { min: 150, name: 'Guardião Verde' },
  { min: 300, name: 'Defensor do Planeta' },
  { min: 500, name: 'Embaixador Eco' },
];
export function userStats(data: AppData, id: string) {
  const disposals = data.disposals.filter((d) => d.userId === id);
  const suggestions = data.suggestions.filter((s) => s.userId === id);
  const reviews = data.reviews.filter((r) => r.userId === id && r.confirmed);
  const ecoPoints =
    disposals.length * 10 +
    suggestions.filter((s) => s.status === 'APROVADO').length * 30 +
    reviews.length * 5;
  const level = levels.filter((l) => l.min <= ecoPoints).at(-1)!;
  return {
    ecoPoints,
    level: level.name,
    disposals: disposals.length,
    suggestions: suggestions.length,
    materials: new Set(disposals.map((d) => d.wasteId)).size,
    nextLevel: levels.find((l) => l.min > ecoPoints),
  };
}
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (n: number) => (n * Math.PI) / 180;
  const x =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
export const formatDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR').format(
    new Date(value.length === 10 ? value + 'T12:00:00' : value),
  );
export const localDate = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
};
export const routeUrl = (
  point: { lat: number; lng: number },
  origin?: { lat: number; lng: number },
) =>
  `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}${origin ? `&origin=${origin.lat},${origin.lng}` : ''}&travelmode=driving`;
export const safeWebsite = (url: string) => {
  try {
    const u = new URL(url);
    return ['https:', 'http:'].includes(u.protocol) ? u.href : undefined;
  } catch {
    return undefined;
  }
};
