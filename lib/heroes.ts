// Ilustrovani likovi u prodavnici, po sportu (kratki videi na beloj pozadini).
// Priča: niz scena niz stranicu, levo rival / desno pobednik (ili obrnuto po sceni).
// at: gde je scena po visini, kao deo visine liste kartica (0 = prvi red, 1/3, 2/3 – uvek na svakoj trećini)
// L / R: videi u toj traci; levi i desni video iste scene kreću zajedno i ostaju na poslednjem kadru
// LA / RA: gde video stoji u traci: 'edge' = uz ivicu ekrana, 'cards' = uz kartice, podrazumevano sredina
export type Align = 'edge' | 'cards' | 'center';
// LD / RD: koliko sekundi ta strana kasni za scenom (da se događaji poklope)
export type Scene = { at: number; L?: string[]; R?: string[]; LA?: Align; RA?: Align; LD?: number; RD?: number };

export const STORIES: Record<string, Scene[]> = {
  f1: [
    { at: 0, L: ['/vizuali/f1/scena/1L.mp4'], R: ['/vizuali/f1/scena/1R.mp4'], LA: 'edge', RA: 'edge' }, // Hunt smoren, Lauda prska šampanjac – izlaze iz ivica
    { at: 1 / 3, L: ['/vizuali/f1/scena/2R.mp4'], R: ['/vizuali/f1/scena/2L.mp4'], LA: 'edge', RA: 'cards', LD: 1 }, // Hunt udari u ogradu baš kad Lauda skrene u kartice (~4 s)
    { at: 2 / 3, L: ['/vizuali/f1/scena/3R.mp4'], R: ['/vizuali/f1/scena/3L.mp4'], LA: 'edge' }, // uporedo: Hunt izlazi iz olupine, Lauda prolazi cilj
  ],
  // za sada samo glavni lik desno
  football: [{ at: 0, R: ['/vizuali/heroji/football.mp4'] }],
  nba: [{ at: 0, R: ['/vizuali/heroji/nba.mp4'] }],
  nfl: [{ at: 0, R: ['/vizuali/heroji/nfl.mp4'] }],
};
export const hasHero = (sport: string | undefined) => !!sport && sport in STORIES;
