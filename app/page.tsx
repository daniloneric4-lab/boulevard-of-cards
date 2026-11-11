import Link from 'next/link';
import ProductCard, { type Product } from '@/components/ProductCard';
import LogoIntro from '@/components/LogoIntro';
import RotatingVideo from '@/components/RotatingVideo';
import { date, money, sportLabel, gradeLabel, listingImage } from '@/lib/format';
import { getSessionInfo } from '@/lib/supabase/server';
import CardArt from '@/components/CardArt';
import Countdown from '@/components/Countdown';
import ListingTile from '@/components/ListingTile';
import NewsletterForm from '@/components/NewsletterForm';
import { LISTING_SELECT, one, type ListingRow } from '@/lib/listings';

export const dynamic = 'force-dynamic';

const CATS = [
  { key: 'football', label: 'Fudbal', sub: 'Liga šampiona, Premijer liga, Bundesliga', video: 'fudbal' },
  { key: 'f1', label: 'F1', sub: 'Chrome, Sapphire, Turbo Attax', video: 'f1' },
  { key: 'nba', label: 'NBA', sub: 'Chrome, Flagship, Finest', video: 'nba' },
  { key: 'nfl', label: 'NFL', sub: 'Chrome, Midnight, rookie klasa', video: 'nfl' },
];

const SERVICES = [
  ['Gradiranje PSA', 'Zbirno slanje iz Srbije, bez carinske papirologije. Pratiš svaki korak.', '/usluge?t=grading', 'Pošalji karticu'],
  ['Sef', 'Kartica ostaje kod nas, osigurana. Prodaješ i menjaš bez slanja.', '/usluge?t=vault', 'Otvori sef'],
  ['Konsignacija', 'Mi prodajemo umesto tebe, ti odobravaš cenu i pratiš status.', '/usluge?t=consignment', 'Pošalji na prodaju'],
  ['Otkup', 'Fiksna ponuda za tvoju karticu, novac čim kartica stigne.', '/usluge?t=buyback', 'Dobij ponudu'],
];

export default async function Home({ searchParams }: { searchParams: Promise<{ dobrodosao?: string }> }) {
  const { dobrodosao } = await searchParams;
  const { supabase, user } = await getSessionInfo();
  await supabase.rpc('settle_auctions');
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: products }, { data: releases }, { data: auctions }, { data: draws }, { data: lives }, { data: top }, mine] = await Promise.all([
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
    supabase.from('listings').select(LISTING_SELECT).eq('mode', 'auction').eq('status', 'active').limit(40),
    supabase.from('draws').select('id, status, opens_at, closes_at, draw_at, boxes_available, price_cents, currency, releases(name, sport, box_format, description)').in('status', ['scheduled', 'open']).order('closes_at').limit(1),
    supabase.from('live_events').select('id, title, starts_at, status, description').neq('status', 'ended').gte('starts_at', new Date(Date.now() - 3 * 3600_000).toISOString()).order('starts_at').limit(1),
    supabase.from('listings').select(LISTING_SELECT).eq('status', 'active').in('mode', ['fixed', 'auction']).order('price_cents', { ascending: false, nullsFirst: false }).limit(1),
    user
      ? Promise.all([
          supabase.from('draw_entries').select('status', { count: 'exact' }).eq('user_id', user.id).in('status', ['entered', 'won', 'waitlist']),
          supabase.from('auctions').select('listing_id', { count: 'exact', head: true }).eq('current_bidder_id', user.id),
          supabase.from('orders').select('status', { count: 'exact' }).eq('buyer_id', user.id).in('status', ['pending_payment', 'paid', 'shipped', 'delivered']),
          supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('read_at', null),
        ])
      : Promise.resolve(null),
  ]);
  const nextDraw = (releases ?? []).find((r) => r.sale_type === 'draw');
  const draw = (draws ?? [])[0];
  const drawRel = draw ? one(draw.releases as unknown as { name: string; sport: string; box_format: string | null; description: string | null }) : null;
  const live = (lives ?? [])[0];
  const ending = ((auctions ?? []) as unknown as ListingRow[]).sort((a, b) => +new Date(one(a.auctions)?.ends_at ?? 0) - +new Date(one(b.auctions)?.ends_at ?? 0)).slice(0, 4);
  const feat = ((top ?? []) as unknown as ListingRow[])[0];
  const status = mine
    ? [
        { t: 'Izvlačenja', v: mine[0].count ?? 0, sub: (mine[0].data ?? []).some((x) => x.status === 'won') ? 'Izvučen si! Plati u roku' : 'aktivnih prijava', href: '/profil' },
        { t: 'Vodiš na aukcijama', v: mine[1].count ?? 0, sub: 'trenutno najviša ponuda', href: '/aukcije?view=mine' },
        { t: 'Porudžbine u toku', v: mine[2].count ?? 0, sub: 'plaćanje, slanje, prijem', href: '/profil' },
        { t: 'Obaveštenja', v: mine[3].count ?? 0, sub: 'nepročitanih', href: '/obavestenja' },
      ]
    : null;

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
            {user ? (
              <Link href="/kolekcija" className="btn btn-ghost" style={{ color: '#fff', borderColor: 'var(--bc-line-dk)' }}>
                Moja kolekcija
              </Link>
            ) : (
              <Link href="/prijava?mode=signup" className="btn btn-ghost" style={{ color: '#fff', borderColor: 'var(--bc-line-dk)' }}>
                Sign up
              </Link>
            )}
          </div>
        </div>
        <div className="hero-arc" aria-hidden="true" />
      </section>

      {dobrodosao ? (
        <div className="wrap" style={{ marginTop: 24 }}>
          <div className="alert alert-ok" role="status">
            Dobrodošao na bulevar! Prilagodili smo ti obaveštenja. Sledeći korak: <Link href="/prodaj" className="lnk">dodaj prvu karticu</Link> ili <Link href="/izvlacenja" className="lnk">prijavi se za izvlačenje</Link>.
          </div>
        </div>
      ) : null}

      {status ? (
        <section className="wrap section stack" style={{ paddingBottom: 0 }}>
          <h2>Moj status</h2>
          <div className="kv">
            {status.map((m) => (
              <Link key={m.t} href={m.href} style={{ textDecoration: 'none', background: 'var(--bc-surface)', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className="mono muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em' }}>{m.t}</span>
                <b style={{ fontFamily: 'var(--font-display)', fontSize: 26 }}>{m.v}</b>
                <span className="muted" style={{ fontSize: 13 }}>{m.sub}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {draw || nextDraw ? (
        <section className="wrap section">
          <div className="feature">
            <CardArt seed={draw?.id ?? nextDraw!.id} grade="SEALED" size="lg" label={drawRel?.name ?? nextDraw!.name} />
            <div className="feature-body">
              <span className="kicker">Izvlačenje · {sportLabel(drawRel?.sport ?? nextDraw!.sport)}{drawRel?.box_format ? ' · ' + drawRel.box_format : ''}</span>
              <h2 style={{ fontSize: 'clamp(26px,3.4vw,40px)' }}>{drawRel?.name ?? nextDraw!.name}</h2>
              <p className="muted">
                {drawRel?.description || 'Kutija stiže u maloj količini. Prijava je besplatna, plaćaš samo ako budeš izvučen.'}
              </p>
              {draw ? (
                <>
                  <span className="muted" style={{ fontSize: 13 }}>
                    {draw.status === 'scheduled' ? 'Prijave se otvaraju za' : 'Prijave se zatvaraju za'}
                  </span>
                  <Countdown to={draw.status === 'scheduled' ? draw.opens_at : draw.closes_at} />
                  <div className="row">
                    <Link href={`/izvlacenja/${draw.id}`} className="btn btn-red">
                      Prijavi se besplatno
                    </Link>
                    <span className="mono" style={{ color: 'var(--bc-gray-dk)', fontSize: 13 }}>
                      {draw.boxes_available} kutija · {money(draw.price_cents, draw.currency)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <span className="mono" style={{ color: 'var(--bc-gray-dk)', fontSize: 13 }}>
                    Izlazi {date(nextDraw!.release_date)} · prijave se otvaraju uskoro
                  </span>
                  <NewsletterForm source="draw" dark />
                </>
              )}
            </div>
          </div>
        </section>
      ) : null}

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

      {ending.length ? (
        <section className="wrap section stack" style={{ paddingTop: 0 }}>
          <div className="row between">
            <div className="stack" style={{ gap: 4 }}>
              <span className="kicker">Aukcije pred kraj</span>
              <h2>Poslednja šansa</h2>
            </div>
            <Link href="/aukcije" className="btn btn-ghost btn-sm">
              Sve aukcije
            </Link>
          </div>
          <div className="grid-tiles">
            {ending.map((l) => (
              <ListingTile key={l.id} l={l} />
            ))}
          </div>
        </section>
      ) : null}

      {feat ? (
        <section className="wrap section" style={{ paddingTop: 0 }}>
          <div className="feature">
            <CardArt seed={feat.id} grade={gradeLabel(one(feat.collection_items)?.grader, one(feat.collection_items)?.grade)} image={listingImage((feat.listing_images ?? [])[0]?.storage_path)} size="lg" label={feat.title} />
            <div className="feature-body">
              <span className="kicker">Kartica nedelje · kolekcionarsko tržište Balkana</span>
              <h2 style={{ fontSize: 'clamp(26px,3.4vw,40px)' }}>{feat.title}</h2>
              <p className="muted">Skupljaj ono što voliš. Retke kartice sa poreklom, od kolekcionara iz regiona.</p>
              <span className="price" style={{ fontSize: 28 }}>{money(one(feat.auctions)?.current_bid_cents ?? one(feat.auctions)?.start_price_cents ?? feat.price_cents, feat.currency)}</span>
              <span className="mono" style={{ color: 'var(--bc-gray-dk)', fontSize: 13 }}>
                Prodaje @{one(feat.seller)?.username}
              </span>
              <Link href={`/oglas/${feat.id}`} className="btn btn-red" style={{ alignSelf: 'flex-start' }}>
                Pogledaj karticu
              </Link>
            </div>
          </div>
        </section>
      ) : null}

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

      <section className="wrap stack">
        <div className="feature">
          <div className="feature-body">
            <span className="kicker">Live otvaranja</span>
            <h2 style={{ fontSize: 'clamp(26px,3.4vw,40px)' }}>Otvaramo uživo. Ti licitiraš uživo.</h2>
            <p className="muted">Izvučena kartica se pojavljuje na tvom ekranu u istom trenutku, sa vrednošću i dugmetom za ponudu. Snimak ostaje na sajtu.</p>
            {live ? (
              <>
                <b>{live.title}</b>
                {live.status !== 'live' ? <Countdown to={live.starts_at} /> : <span className="draw-pill"><span className="live-dot" /> UŽIVO SADA</span>}
              </>
            ) : (
              <span className="mono" style={{ color: 'var(--bc-gray-dk)', fontSize: 13 }}>Sledeći live najavljujemo uskoro</span>
            )}
            <Link href="/live" className="btn btn-red" style={{ alignSelf: 'flex-start' }}>
              Raspored i kupovina mesta
            </Link>
          </div>
          <div className="slab-trio" aria-hidden="true">
            <CardArt seed="live-a" grade="AUTO" size="sm" />
            <CardArt seed="live-b" grade="RC" />
            <CardArt seed="live-c" grade="/99" size="sm" />
          </div>
        </div>
      </section>

      <section className="wrap section stack">
        <span className="kicker">Usluge</span>
        <h2>Kartica ne mora nigde da putuje sama</h2>
        <div className="steps">
          {SERVICES.map(([t, x, href, cta], i) => (
            <Link key={t} href={href} className="step" style={{ textDecoration: 'none' }}>
              <span className="step-n">{i + 1}</span>
              <b>{t}</b>
              <span className="muted" style={{ fontSize: 14 }}>{x}</span>
              <span className="lnk" style={{ marginTop: 'auto' }}>{cta} →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="wrap stack">
        <div className="two">
          <div className="card-dark stack">
            <span className="kicker">Pasoš kartice</span>
            <h3>Svaka kartica ima svoju istoriju</h3>
            <ul className="ticks" style={{ color: 'var(--bc-line)' }}>
              <li>Izvučena na live otvaranju</li>
              <li>Prodata na aukciji</li>
              <li>Ocenjena na PSA</li>
              <li>Čuvana u sefu</li>
            </ul>
            <span style={{ color: 'var(--bc-gray-dk)', fontSize: 13 }}>QR nalepnica na toploaderu vodi na pasoš. Kartica sa poreklom se lakše prodaje.</span>
          </div>
          <div className="card stack">
            <span className="kicker">Novac je zaštićen</span>
            <h3>Prodavac dobija novac tek kad potvrdiš prijem</h3>
            <p className="muted">Plaćaš preko platforme, prodavac šalje uz video pakovanja, a ako nešto nije u redu, otvaraš spor i novac ostaje zaključan.</p>
            <div className="row">
              <Link href="/prodaj" className="btn btn-dark">Prodaj karticu</Link>
              <Link href="/pomoc" className="btn btn-ghost">Kako radi</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
