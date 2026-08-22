// Arena rank title derived from real elo_rating — historical-military naming to fit the
// "Tarix" theme. Thresholds are presentation only; ELO itself stays the source of truth.
const TIERS: { min: number; title: string }[] = [
  { min: 1800, title: 'Sarkarda' },
  { min: 1600, title: 'Sipahsolor' },
  { min: 1400, title: 'Mingboshi' },
  { min: 1200, title: 'Yuzboshi' },
  { min: 1000, title: 'Botir' },
  { min: 0, title: 'Navkar' },
];

export function arenaRankTitle(elo: number): string {
  return TIERS.find((t) => elo >= t.min)?.title ?? 'Navkar';
}
