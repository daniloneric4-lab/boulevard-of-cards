import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import ProductCard, { type Product } from '@/components/ProductCard';
import { SPORTS, date, money, sportLabel } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = await createClient();
  const [{ data: products }, { data: releases }] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, kind, sport, mode, price_cents, currency, stock, low_stock_at, image_path, description')
      .eq('is_visible', true)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('releases')
      .select('id, name, sport, box_format, release_date, sale_type, us_price_cents, draw_opens_at')
      .eq('is_visible', true)
      .gte('release_date', new Date().toISOString().slice(0, 10))
      .order('release_date', { ascending: true })
      .limit(6),
  ]);

  return (
    <>
      <section className="hero" aria-label="Uvod">
        <video autoPlay muted loop playsInline preload="auto" poster="/hero-stadion.jpg" aria-hidden="true">
          <source src="/hero-stadion.mp4" type="video/mp4" />
        </video>
        <div className="hero-in">
          <span className="kicker">Topps · Balkan</span>
          <h1>
            Kartice, kutije i izvlačenja
            <br />
            na jednom mestu.
          </h1>
          <p className="lead">
            Zvanična prodavnica Topps kutija, preorderi i izvlačenja za nova izdanja. Fudbal, F1, NBA i NFL, sa dostavom
            po regionu.
          </p>
          <div className="row">
            <Link href="/prodavnica" className="btn btn-red">
              Otvori prodavnicu
            </Link>
            <Link href="/prijava" className="btn btn-ghost" style={{ color: '#fff', borderColor: 'var(--bc-line-dk)' }}>
              Napravi nalog
            </Link>
          </div>
        </div>
      </section>

      <section className="wrap section stack">
        <div className="row between">
          <h2>Kategorije</h2>
        </div>
        <div className="chips">
          {SPORTS.map((s) => (
            <Link key={s.key} href={`/prodavnica?sport=${s.key}`} className="chip">
              {s.label}
            </Link>
          ))}
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
          <div className="alert alert-info">Prvi proizvodi stižu uskoro. Admin ih dodaje u admin panelu.</div>
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
