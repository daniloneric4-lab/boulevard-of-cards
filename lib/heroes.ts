// Glavni lik (pobednik) po sportu: kratak ilustrovani video u bočnoj traci prodavnice.
// Fajlovi: /public/vizuali/heroji/<sport>.mp4
export const HERO_SPORTS = ['f1', 'football', 'nba', 'nfl'];
export const hasHero = (sport: string | undefined) => !!sport && HERO_SPORTS.includes(sport);
