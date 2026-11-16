// Glavni lik (pobednik) po sportu: kratak ilustrovani video koji se nasumično pojavljuje sa strane prodavnice.
// Fajlovi: /public/vizuali/heroji/<sport>.mp4
// from: sa koje strane lik ulazi u originalnom videu; top: uvek zalepljen za gornji ugao (npr. koš)
export const HEROES: Record<string, { from: 'L' | 'R'; top?: boolean }> = {
  f1: { from: 'R' },
  football: { from: 'L' },
  nba: { from: 'L', top: true },
  nfl: { from: 'R' },
};
export const HERO_SPORTS = Object.keys(HEROES);
export const hasHero = (sport: string | undefined) => !!sport && sport in HEROES;
