import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import ProductCard, { type Product } from '@/components/ProductCard';
import RotatingVideo from '@/components/RotatingVideo';
import { SPORTS } from '@/lib/format';
import ListingTile from '@/components/ListingTile';
import DemoTiles from '@/components/DemoTiles';
import { LISTING_SELECT, type ListingRow } from '@/lib/listings';
import { correctQuery } from '@/lib/spell';

export const metadata: Metadata = { title: 'Prodavnica' };
export const dynamic = 'force-dynamic';

type SP = { sport?: string; q?: string; tacno?: string; nacin?: string; od?: string; do?: string; ocena?: string; sort?: string };

export default async function Shop({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { sport, nacin, ocena, sort = 'new' } = sp;
  const typed = sp.q?.trim() || '';
  const fix = correctQuery(typed);
  const q = sp.tacno ? typed : fix.q;
  const corrected = !sp.tacno && fix.changed;
  const od = sp.od ? Math.round(Number(sp.od) * 100) : null;
  const dO = sp.do ? Math.round(Number(sp.do) * 100) : null;
  const supabase = await createClient();
  let query = supabase
    .from('products')
    .select('id, name, kind, sport, mode, price_cents, currency, stock, low_stock_at, image_path, description')
    .eq('is_visible', true)
    .order('mode', { ascending: true });
  query = sort === 'popular' ? query.order('view_count', { ascending: false }) : sort === 'price_asc' ? query.order('price_cents', { ascending: true }) : sort === 'price_desc' ? query.order('price_cents', { ascending: false }) : query.order('created_at', { ascending: false });
  if (od) query = query.gte('price_cents', od);
  if (dO) query = query.lte('price_cents', dO);
  if (sport && SPORTS.some((s) => s.key === sport)) query = query.eq('sport', sport);
  if (q) query = query.ilike('name', `%${q.replace(/[%_]/g, '')}%`);
  let lq = supabase.from('listings').select(LISTING_SELECT).eq('status', 'active').neq('mode', 'showcase').limit(60);
  lq = sort === 'popular' ? lq.order('view_count', { ascending: false }).order('created_at', { ascending: false }) : sort === 'price_asc' ? lq.order('price_cents', { ascending: true, nullsFirst: false }) : sort === 'price_desc' ? lq.order('price_cents', { ascending: false, nullsFirst: false }) : lq.order('created_at', { ascending: false });
  if (nacin && ['fixed', 'auction', 'offers', 'trade'].includes(nacin)) lq = lq.eq('mode', nacin);
  if (od) lq = lq.gte('price_cents', od);
  if (dO) lq = lq.lte('price_cents', dO);
  if (sport && SPORTS.some((s) => s.key === sport)) lq = lq.eq('sport', sport);
  if (q) lq = lq.ilike('title', `%${q.replace(/[%_]/g, '')}%`);
  const [{ data: products, error }, { data: rawListings }] = await Promise.all([query, lq]);
  const listings = ((rawListings ?? []) as unknown as ListingRow[]).filter((l) => {
    const ci = Array.isArray(l.collection_items) ? l.collection_items[0] : l.collection_items;
    if (ocena === 'raw') return !ci?.grader || ci.grader === 'raw';
    if (ocena === 'graded') return !!ci?.grader && ci.grader !== 'raw';
    if (ocena === '10') return Number(ci?.grade) === 10;
    return true;
  });
  const filtered = !!(nacin || od || dO || ocena);
  const changedView = filtered || sort !== 'new';

  const hero = HERO[sport ?? ''] ?? HERO[''];

  return (
    <>
    <section className="hero hero-shop" aria-label="Prodavnica">
      <RotatingVideo key={sport ?? 'all'} category={sport && HERO[sport] ? sport : 'all'} />
      <div className="hero-in">
        <span className="kicker">Zvanična prodavnica</span>
        <h1>{hero.title}</h1>
        <p className="lead">{hero.tag}</p>
      </div>
    </section>
    <div className="wrap section stack" style={{ gap: 24 }}>

      <form className="row" action="/prodavnica" role="search">
        {sport ? <input type="hidden" name="sport" value={sport} /> : null}
        <label className="fld" style={{ flex: '1 1 260px' }}>
          <span className="sr" style={{ position: 'absolute', left: -9999 }}>
            Pretraga
          </span>
          <input className="inp" name="q" defaultValue={q} placeholder="Traži kutiju, set, igrača…" />
        </label>
        <button className="btn btn-dark">Traži</button>
      </form>
      {corrected ? (
        <p className="muted" style={{ fontSize: 14, marginTop: -12 }} role="status">
          Prikazujem rezultate za <b style={{ color: 'var(--bc-carbon)' }}>{q}</b>.{' '}
          <Link className="lnk" href={`/prodavnica?q=${encodeURIComponent(typed)}&tacno=1${sport ? '&sport=' + sport : ''}`}>
            Traži tačno „{typed}”
          </Link>
        </p>
      ) : null}

      <div className="chips" aria-label="Sport">
        <Link href="/prodavnica" className={'chip' + (!sport ? ' on' : '')}>
          Sve
        </Link>
        {SPORTS.map((s) => (
          <Link key={s.key} href={`/prodavnica?sport=${s.key}`} className={'chip' + (sport === s.key ? ' on' : '')}>
            {s.label}
          </Link>
        ))}
      </div>

      <form action="/prodavnica" className="filters" aria-label="Filteri">
        {sport ? <input type="hidden" name="sport" value={sport} /> : null}
        {q ? <input type="hidden" name="q" value={q} /> : null}
        <label className="fld">
          Način prodaje
          <select className="inp" name="nacin" defaultValue={nacin ?? ''}>
            <option value="">Sve</option>
            <option value="fixed">Kupi odmah</option>
            <option value="auction">Aukcija</option>
            <option value="offers">Primam ponude</option>
            <option value="trade">Za razmenu</option>
          </select>
        </label>
        <label className="fld">
          Ocena
          <select className="inp" name="ocena" defaultValue={ocena ?? ''}>
            <option value="">Sve</option>
            <option value="graded">Samo gradirane</option>
            <option value="10">Ocena 10</option>
            <option value="raw">Bez ocene (RAW)</option>
          </select>
        </label>
        <label className="fld">
          Cena od (RSD)
          <input className="inp" name="od" inputMode="numeric" defaultValue={sp.od ?? ''} placeholder="0" />
        </label>
        <label className="fld">
          do (RSD)
          <input className="inp" name="do" inputMode="numeric" defaultValue={sp.do ?? ''} placeholder="bez limita" />
        </label>
        <label className="fld">
          Sortiraj
          <select className="inp" name="sort" defaultValue={sort}>
            <option value="new">Najnovije</option>
            <option value="popular">Najpopularnije</option>
            <option value="price_asc">Cena: od najniže</option>
            <option value="price_desc">Cena: od najviše</option>
          </select>
        </label>
        <button className="btn btn-dark">Primeni</button>
        {changedView ? (
          <Link href={`/prodavnica${sport ? '?sport=' + sport : ''}`} className="btn btn-ghost">
            Poništi
          </Link>
        ) : null}
      </form>

      {error ? <div className="alert alert-err">Prodavnica trenutno ne može da se učita.</div> : null}
      <h2>Zvanična ponuda</h2>
      {products && products.length ? (
        <div className="grid">
          {(products as Product[]).map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      ) : (
        <div className="alert alert-info">Nema proizvoda za ovaj izbor.</div>
      )}

      <div className="row between" style={{ marginTop: 16 }}>
        <h2>Od kolekcionara</h2>
        <Link href="/aukcije" className="btn btn-ghost btn-sm">
          Aukcije
        </Link>
      </div>
      {listings.length ? (
        <div className="grid-tiles">
          {listings.map((l) => (
            <ListingTile key={l.id} l={l} />
          ))}
        </div>
      ) : (
        filtered ? <div className="alert alert-info">Nema oglasa za ove filtere.</div> : <DemoTiles sport={sport} />
      )}

      <div className="two" style={{ marginTop: 8 }}>
        <div className="card-dark stack">
          <h3>Novac je zaštićen.</h3>
          <p style={{ color: 'var(--bc-line)' }}>Prodavac dobija novac tek kad potvrdiš da je stiglo ono što si kupio.</p>
          <Link href="/pomoc#zastita" className="btn btn-ghost" style={{ alignSelf: 'flex-start', color: '#fff', borderColor: 'var(--bc-line-dk)' }}>
            Kako radi
          </Link>
        </div>
        <div className="card stack">
          <h3>Imaš kartice?</h3>
          <p className="muted">Slikaj ih, popuni podatke i izaberi cenu. Oglas za 30 sekundi.</p>
          <Link href="/prodaj" className="btn btn-red" style={{ alignSelf: 'flex-start' }}>
            Postavi oglas
          </Link>
        </div>
      </div>
    </div>
    </>
  );
}

const HERO: Record<string, { title: string; tag: string; video: string; poster: string }> = {
  '': { title: 'Prodavnica', tag: 'Fudbal, F1, NBA, NFL i oprema. Plaćanje uplatom, IPS-om ili pouzećem.', video: '/hero-kartice.mp4', poster: '/hero-kartice.jpg' },
  football: { title: 'Fudbal', tag: 'Liga šampiona, Premijer liga i Bundesliga. Chrome, Merlin i Stadium Club.', video: '/kat-fudbal.mp4', poster: '/kat-fudbal.jpg' },
  f1: { title: 'F1', tag: 'Topps Chrome F1, Sapphire i Turbo Attax.', video: '/kat-f1.mp4', poster: '/kat-f1.jpg' },
  nba: { title: 'NBA', tag: 'Jokić, Dončić i nova rookie klasa. Chrome, Flagship i Finest.', video: '/kat-nba.mp4', poster: '/kat-nba.jpg' },
  nfl: { title: 'NFL', tag: 'Rookie klasa, Chrome i Midnight. Quarterbackovi i autogrami.', video: '/kat-nfl.mp4', poster: '/kat-nfl.jpg' },
  other: { title: 'Oprema i ostalo', tag: 'Top loaderi, sleeve-ovi, magnetni držači i sve za čuvanje kartica.', video: '/hero-kartice.mp4', poster: '/hero-kartice.jpg' },
};
