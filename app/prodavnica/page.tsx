import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import ProductCard, { type Product } from '@/components/ProductCard';
import { SPORTS } from '@/lib/format';

export const metadata: Metadata = { title: 'Prodavnica' };
export const dynamic = 'force-dynamic';

export default async function Shop({ searchParams }: { searchParams: Promise<{ sport?: string; q?: string }> }) {
  const { sport, q } = await searchParams;
  const supabase = await createClient();
  let query = supabase
    .from('products')
    .select('id, name, kind, sport, mode, price_cents, currency, stock, low_stock_at, image_path, description')
    .eq('is_visible', true)
    .order('mode', { ascending: true })
    .order('created_at', { ascending: false });
  if (sport && SPORTS.some((s) => s.key === sport)) query = query.eq('sport', sport);
  if (q) query = query.ilike('name', `%${q.replace(/[%_]/g, '')}%`);
  const { data: products, error } = await query;

  const hero = HERO[sport ?? ''] ?? HERO[''];

  return (
    <>
    <section className="hero hero-shop" aria-label="Prodavnica">
      <video key={hero.video} autoPlay muted loop playsInline preload="auto" poster={hero.poster} aria-hidden="true">
        <source src={hero.video} type="video/mp4" />
      </video>
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
          <input className="inp" name="q" defaultValue={q ?? ''} placeholder="Traži kutiju, set, igrača…" />
        </label>
        <button className="btn btn-dark">Traži</button>
      </form>

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

      {error ? <div className="alert alert-err">Prodavnica trenutno ne može da se učita.</div> : null}
      {products && products.length ? (
        <div className="grid">
          {(products as Product[]).map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      ) : (
        <div className="alert alert-info">Nema proizvoda za ovaj izbor.</div>
      )}
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
