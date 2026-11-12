// Automatsko ispravljanje naziva kartica, kutija i igrača.
// "Chrome Saphire" -> "Chrome Sapphire", "jokic" -> "Jokić", "superfracter" -> "Superfractor".
// Nove reči dodaješ u TERMS (tačan pravopis). Reči iz KEEP se nikad ne menjaju.

const TERMS = [
  // Topps linije i proizvodi
  'Topps', 'Chrome', 'Sapphire', 'Finest', 'Merlin', 'Stadium', 'Club', 'Heritage', 'Bowman', 'Dynasty', 'Inception', 'Museum',
  'Collection', 'Tribute', 'Triple', 'Threads', 'Gold', 'Label', 'Midnight', 'Cosmic', 'Flagship', 'Series', 'Update', 'Turbo',
  'Attax', 'Match', 'Deco', 'Gilded', 'Knockout', 'Sterling', 'Definitive', 'Archives', 'Allen', 'Ginter', 'Gallery', 'Fire',
  'Pristine', 'Transcendent', 'Signature', 'Platinum', 'Eternal', 'Lights', 'Paramount', 'Showcase',
  // takmičenja i sportovi
  'UEFA', 'Champions', 'League', 'Europa', 'Conference', 'Competitions', 'Premier', 'Bundesliga', 'Serie', 'LaLiga', 'Formula',
  'Football', 'Basketball', 'Soccer', 'Superliga', 'Euroleague',
  // paralele i vrste kartica
  'Refractor', 'Superfractor', 'Xfractor', 'Prism', 'Wave', 'Atomic', 'Speckle', 'Mojo', 'Shimmer', 'Lava', 'Sepia', 'Negative',
  'Orange', 'Purple', 'Green', 'Black', 'White', 'Silver', 'Bronze', 'Platinum', 'Rainbow', 'Aqua', 'Magenta', 'Yellow',
  'Rookie', 'Autograph', 'Auto', 'Patch', 'Relic', 'Insert', 'Parallel', 'Variation', 'Image', 'Short', 'Print', 'Numbered',
  'Hobby', 'Jumbo', 'Blaster', 'Mega', 'Hanger', 'Lite', 'Breaker', 'Delight', 'Value', 'Retail', 'Sealed', 'Graded',
  'Beckett', 'Topps Now',
  // igrači i vozači (dopuni po potrebi)
  'Jokić', 'Dončić', 'Wembanyama', 'LeBron', 'James', 'Curry', 'Durant', 'Antetokounmpo', 'Giannis', 'Edwards', 'Tatum',
  'Bogdanović', 'Bogdan', 'Nikola', 'Luka', 'Messi', 'Ronaldo', 'Haaland', 'Mbappé', 'Bellingham', 'Yamal', 'Vinícius',
  'Musiala', 'Wirtz', 'Saka', 'Salah', 'Kane', 'Vlahović', 'Mitrović', 'Tadić', 'Milinković', 'Savić', 'Modrić', 'Pedri',
  'Gavi', 'Lewandowski', 'Verstappen', 'Hamilton', 'Leclerc', 'Norris', 'Piastri', 'Alonso', 'Russell', 'Antonelli',
  'Bearman', 'Colapinto', 'Hadjar', 'Bortoleto', 'Senna', 'Schumacher', 'Mahomes', 'Allen', 'Burrow', 'Jackson', 'Stroud',
  'Daniels', 'Williams', 'Maye', 'Kelce', 'Jefferson', 'Chase', 'Brady', 'Ohtani', 'Judge',
];

const KEEP = [
  'kutija', 'kutije', 'kartica', 'kartice', 'paket', 'paketi', 'kesica', 'ocena', 'ocene', 'zlatna', 'zlatni', 'crvena',
  'plava', 'zelena', 'crna', 'bela', 'srebrna', 'potpis', 'potpisana', 'nova', 'novo', 'stara', 'retka', 'cela', 'celu',
  'komplet', 'set', 'sets', 'hobi', 'oprema', 'sleeve', 'toploader', 'magnet', 'case', 'card', 'cards', 'pack', 'packs',
  'base', 'team', 'with', 'from', 'the', 'and', 'box', 'boxes', 'red', 'blue', 'pink', 'rookie', 'gold', 'auto',
  'real', 'madrid', 'barcelona', 'partizan', 'zvezda', 'crvena', 'denver', 'dallas', 'nuggets', 'mavericks', 'lakers',
  'ferrari', 'mclaren', 'mercedes', 'redbull', 'williams', 'haas', 'alpine', 'sauber', 'audi', 'cadillac', 'racing',
  'arsenal', 'chelsea', 'liverpool', 'united', 'city', 'bayern', 'dortmund', 'milan', 'inter', 'juventus', 'napoli', 'roma',
  'paris', 'mike', 'dave', 'cole', 'lane', 'kobe', 'bird', 'jordan', 'shaq', 'love', 'gale', 'wade',
];

const strip = (s: string) =>
  s
    .toLowerCase()
    .replace(/đ/g, 'dj')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

type Entry = { key: string; canon: string | null };
const DICT: Entry[] = [];
const BY_KEY = new Map<string, Entry>();
for (const t of TERMS.flatMap((x) => x.split(' '))) {
  const k = strip(t);
  if (!BY_KEY.has(k)) {
    const e = { key: k, canon: t };
    BY_KEY.set(k, e);
    DICT.push(e);
  }
}
for (const w of KEEP) {
  const k = strip(w);
  const e = { key: k, canon: null };
  if (!BY_KEY.has(k)) DICT.push(e);
  BY_KEY.set(k, BY_KEY.get(k) ?? e);
}

// Damerau-Levenshtein (zamena susednih slova = 1 greška)
function dist(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      rowMin = Math.min(rowMin, d[i][j]);
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length][b.length];
}

function fixWord(w: string): string {
  if (w.length < 4 || /\d/.test(w)) return w;
  const k = strip(w);
  const hit = BY_KEY.get(k);
  if (hit) {
    if (!hit.canon) return w;
    // ista reč, samo bez kvačica ili sa malim slovima -> tačan oblik
    return hit.canon;
  }
  const max = k.length <= 5 ? 1 : k.length <= 9 ? 2 : 3;
  let best: Entry | null = null;
  let bestD = max + 1;
  let tie = false;
  for (const e of DICT) {
    if (k.length <= 5 && e.key[0] !== k[0]) continue;
    const dd = dist(k, e.key, max);
    if (dd < bestD) {
      best = e;
      bestD = dd;
      tie = false;
    } else if (dd === bestD && best && e.key !== best.key) tie = true;
  }
  if (!best || bestD > max || tie || !best.canon) return w;
  return best.canon;
}

/** Ispravlja ceo tekst, čuva razmake, brojeve i znakove. */
export function autocorrect(text: string): string {
  if (!text) return text;
  return text
    .split(/([^\p{L}\p{N}]+)/u)
    .map((part, i) => (i % 2 ? part : fixWord(part)))
    .join('');
}

/** Isto kao card_norm u bazi: mala slova, bez kvačica, samo slova, brojevi i /. */
export function cardNorm(t: string): string {
  return strip(t || '')
    .replace(/[^a-z0-9/]+/g, ' ')
    .trim();
}

/** Da li upit sa liste želja odgovara naslovu (sve reči iz upita postoje u naslovu). */
const GENERIC = new Set(
  'topps chrome sapphire finest merlin stadium club heritage bowman dynasty inception museum midnight cosmic flagship update series refractor superfractor xfractor prizm prism wave mojo shimmer lava speckle atomic gold silver red blue green orange purple black pink white aqua yellow rookie rc auto autograph patch relic insert parallel numbered ssp sp variation base hobby box kutija jumbo blaster mega hanger pack case card kartica lite delight breaker psa bgs sgc cgc raw ucl uefa f1 formula nba nfl football basketball soccer league champions premier bundesliga competitions attax turbo match'.split(' '),
);
/** Isto kao wish_matches u bazi: dovoljno je da se poklopi ime, a opšte reči (Chrome, /99…) moraju sve da postoje. */
export function wishMatches(query: string, title: string): boolean {
  const t = ' ' + cardNorm(title) + ' ';
  const toks = cardNorm(query).split(' ').filter((x) => x.length >= 2);
  if (!toks.length) return false;
  let named = 0;
  let hit = 0;
  for (const x of toks) {
    if (GENERIC.has(x) || /[0-9]/.test(x)) {
      if (!t.includes(x)) return false;
    } else {
      named++;
      if (t.includes(x)) hit++;
    }
  }
  return named === 0 || hit > 0;
}

/** Za pretragu: vraća ispravljen upit i da li je nešto promenjeno. */
export function correctQuery(q?: string | null): { q: string; changed: boolean } {
  const orig = (q ?? '').trim();
  const fixed = autocorrect(orig);
  return { q: fixed, changed: strip(fixed) !== strip(orig) };
}
