import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import ProductCard, { type Product } from '@/components/ProductCard';
import LogoIntro from '@/components/LogoIntro';
import RotatingVideo from '@/components/RotatingVideo';
import { date, money, sportLabel } from '@/lib/format';

export const dynamic = 'force-dynamic';

const CATS = [
  { key: 'football', label: 'Fudbal', sub: 'Liga šampiona, Premijer liga, Bundesliga', video: 'fudbal' },
  { key: 'f1', label: 'F1', sub: 'Chrome, Sapphire, Turbo Attax', video: 'f1' },
  { key: 'nba', label: 'NBA', sub: 'Chrome, Flagship, Finest', video: 'nba' },
  { key: 'nfl', label: 'NFL', sub: 'Chrome, Midnight, rookie klasa', video: 'nfl' },
];

export default async function Home() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: products }, { data: releases }] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, kind, sport, mode, price_cents, currency, stock, low_stock_at, image_path, description')
      .eq('is_visible', true)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('releases')
      .select('id, name, sport, box_format, release_date, sale_type, us_price_cents')
      .eq('is_visible', true)
      .gte('release_date', today)
      .order('release_date', { ascending: true })
      .limit(8),
  ]);
  const nextDraw = (releases ?? []).find((r) => r.sale_type === 'draw');

  return (
    <>
      <section className="hero hero-home" aria-label="Boulevard of Cards">
        <video autoPlay muted loop playsInline preload="auto" poster="/hero-kartice.jpg" aria-hidden="true">
          <source src="/hero-kartice.mp4" type="video/mp4" />
        </video>
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-in hero-center">
          <div className="hero-meta mono" aria-hidden="true">
            <span>
              Topps · Balkan
              <br />
              RSD · EUR · BAM · MKD
            </span>
            <span style={{ textAlign: 'right' }}>
              Beograd · 2026
              <br />
              Samo Topps proizvodi
            </span>
          </div>
          <h1 className="logo-h1">
            <span className="sr-only">Boulevard of Cards</span>
            <LogoIntro />
          </h1>
          <p className="lead">Kolekcionari Balkana, na jednom bulevaru.</p>
          {nextDraw ? (
            <span className="draw-pill">
              <span className="live-dot" aria-hidden="true" />
              Sledeće izvlačenje: {nextDraw.name.replace(/^20\d\d(-\d\d)? Topps /, '')} · {date(nextDraw.release_date)}
            </span>
          ) : null}
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link href="/prodavnica" className="btn btn-red">
              Otvori prodavnicu
            </Link>
            <Link href="/prijava" className="btn btn-ghost" style={{ color: '#fff', borderColor: 'var(--bc-line-dk)' }}>
              Napravi nalog
            </Link>
          </div>
        </div>
        <div className="hero-arc" aria-hidden="true" />
      </section>

      <section className="wrap section stack">
        <h2>Kategorije</h2>
        <div className="cat-grid">
          {CATS.map((c) => (
            <Link key={c.key} href={`/prodavnica?sport=${c.key}`} className="cat-tile">
              <RotatingVideo category={c.key} preload="metadata" />
              <span className="cat-text">
                <b>{c.label}</b>
                <span>{c.sub}</span>
              </span>
            </Link>
          ))}
        </div>
        <div className="chips">
          <Link href="/prodavnica?sport=other" className="chip">
            Oprema i ostalo
          </Link>
        </div>
      </section>

      <section className="wrap stack">
        <div className="row between">
          <h2>U prodavnici</h2>
          <Link href="/prodavnica" className="btn btn-ghost btn-sm">
            Sve iz prodavnice
          </Link>
        </div>
        {products && products.length ? (
          <div className="grid">
            {(products as Product[]).map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        ) : (
          <div className="alert alert-info">Prvi proizvodi stižu uskoro.</div>
        )}
      </section>

      <section className="wrap section stack">
        <h2>Sledeća izdanja</h2>
        {releases && releases.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Izdanje</th>
                  <th>Sport</th>
                  <th>Format</th>
                  <th>Izlazi</th>
                  <th>Cena u SAD</th>
                </tr>
              </thead>
              <tbody>
                {releases.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.name}</td>
                    <td>{sportLabel(r.sport)}</td>
                    <td>{r.box_format}</td>
                    <td className="mono">{date(r.release_date)}</td>
                    <td className="mono">{r.us_price_cents ? money(r.us_price_cents, 'USD') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="alert alert-info">Kalendar izdanja se popunjava čim admin odobri nova izdanja.</div>
        )}
      </section>
    </>
  );
}
