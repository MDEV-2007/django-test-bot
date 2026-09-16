// Arena va RPG daraja unvoni (historical-military rank progression)
export type RankTier = {
  min: number;
  title: string;
  badgeTone: 'rose' | 'amber' | 'emerald' | 'indigo' | 'gold';
  icon: string;
};

export const TIERS: RankTier[] = [
  { min: 2000, title: 'Olim (Grandmaster)', badgeTone: 'gold', icon: '👑' },
  { min: 1800, title: 'Sarkarda', badgeTone: 'rose', icon: '⚔️' },
  { min: 1600, title: 'Sipahsolor', badgeTone: 'rose', icon: '🛡️' },
  { min: 1400, title: 'Mingboshi', badgeTone: 'amber', icon: '🏹' },
  { min: 1200, title: 'Yuzboshi', badgeTone: 'indigo', icon: '🗡️' },
  { min: 1000, title: 'Botir', badgeTone: 'emerald', icon: '🐎' },
  { min: 0, title: 'Navkar', badgeTone: 'indigo', icon: '🔰' },
];

export function arenaRankTitle(elo: number): string {
  return TIERS.find((t) => elo >= t.min)?.title ?? 'Navkar';
}

export function getRankInfo(elo: number) {
  const currentIdx = TIERS.findIndex((t) => elo >= t.min);
  const safeIdx = currentIdx >= 0 ? currentIdx : TIERS.length - 1;
  const current = TIERS[safeIdx];
  const next = safeIdx > 0 ? TIERS[safeIdx - 1] : null;

  const minElo = current.min;
  const nextElo = next ? next.min : current.min + 300;
  const span = Math.max(1, nextElo - minElo);
  const gained = Math.max(0, elo - minElo);
  const progressPercent = next ? Math.min(100, Math.round((gained / span) * 100)) : 100;
  const pointsNeeded = next ? Math.max(0, next.min - elo) : 0;

  return {
    title: current.title,
    icon: current.icon,
    badgeTone: current.badgeTone,
    nextTitle: next ? next.title : null,
    nextIcon: next ? next.icon : null,
    pointsNeeded,
    progressPercent,
    currentElo: elo,
    nextElo: next ? next.min : null,
  };
}

