import Link from 'next/link';
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

export default async function Home({ searchParams }: { searchParams: Promise<{ dobrodosao?: string }> }) {
  const { dobrodosao } = await searchParams;
  const { supabase, user } = await getSessionInfo();
  await supabase.rpc('settle_auctions');
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: releases }, { data: auctions }, { data: draws }, { data: lives }, { data: top }] = await Promise.all([
    supabase
      .from('releases')
      .select('id, name, sport, box_format, release_date, sale_type, us_price_cents, draws(id, status, closes_at)')
      .eq('is_visible', true)
      .gte('release_date', today)
      .order('release_date', { ascending: true })
      .limit(8),
    supabase.from('listings').select(LISTING_SELECT).eq('mode', 'auction').eq('status', 'active').limit(40),
    supabase.from('draws').select('id, status, opens_at, closes_at, draw_at, boxes_available, price_cents, currency, releases(name, sport, box_format, description)').in('status', ['scheduled', 'open']).order('closes_at').limit(1),
    supabase.from('live_events').select('id, title, starts_at, status, description').neq('status', 'ended').gte('starts_at', new Date(Date.now() - 3 * 3600_000).toISOString()).order('starts_at').limit(1),
    supabase.from('listings').select(LISTING_SELECT).eq('status', 'active').in('mode', ['fixed', 'auction']).order('price_cents', { ascending: false, nullsFirst: false }).limit(1),
  ]);
  const nextDraw = (releases ?? []).find((r) => r.sale_type === 'draw');
  const draw = (draws ?? [])[0];
  const drawRel = draw ? one(draw.releases as unknown as { name: string; sport: string; box_format: string | null; description: string | null }) : null;
  const live = (lives ?? [])[0];
  const ending = ((auctions ?? []) as unknown as ListingRow[]).sort((a, b) => +new Date(one(a.auctions)?.ends_at ?? 0) - +new Date(one(b.auctions)?.ends_at ?? 0)).slice(0, 4);
  const feat = ((top ?? []) as unknown as ListingRow[])[0];

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

      <section className="wrap section stack">
        <div className="row between">
          <div className="stack" style={{ gap: 4 }}>
            <span className="kicker">Preorder kalendar</span>
            <h2>Sledeća izdanja</h2>
          </div>
          <Link href="/izvlacenja" className="btn btn-ghost btn-sm">
            Izvlačenja
          </Link>
        </div>
        {releases && releases.length ? (
          <div className="cal">
            {releases.map((r) => {
              const d = r.release_date ? new Date(r.release_date + 'T12:00:00') : null;
              // izdanje za izvlačenje vodi pravo na svoje izvlačenje na sajtu
              const dr = ((r.draws ?? []) as { id: string; status: string; closes_at: string }[]).find((x) => ['scheduled', 'open', 'closed', 'drawn'].includes(x.status));
              const cta = r.sale_type === 'draw' ? [dr?.status === 'open' ? 'Prijavi se' : 'Izvlačenje', dr ? `/izvlacenja/${dr.id}` : '/izvlacenja'] : r.sale_type === 'preorder' ? ['Preorder', `/prodavnica?q=${encodeURIComponent(r.name)}`] : r.sale_type === 'order' ? ['Poruči', `/prodavnica?q=${encodeURIComponent(r.name)}`] : ['Javi mi', '/podesavanja#obavestenja'];
              return (
                <Link key={r.id} href={cta[1]} className="cal-item">
                  <span className="cal-date">
                    <b>{d ? d.getDate() : '—'}</b>
                    <small>{d ? d.toLocaleDateString('sr-Latn-RS', { month: 'short' }).replace('.', '') : ''}</small>
                  </span>
                  <span className="stack" style={{ gap: 4, flex: 1, minWidth: 0 }}>
                    <span className="mono muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                      {sportLabel(r.sport)}
                      {r.box_format ? ` · ${r.box_format}` : ''}
                    </span>
                    <b style={{ fontSize: 15, lineHeight: 1.3 }}>{r.name}</b>
                    {r.sale_type === 'draw' && dr?.status === 'open' ? (
                      <span className="mono" style={{ fontSize: 12, color: 'var(--bc-red)' }}>Prijave do {new Date(dr.closes_at).toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'short' })}</span>
                    ) : r.us_price_cents ? (
                      <span className="mono muted" style={{ fontSize: 12 }}>U SAD {money(r.us_price_cents, 'USD')}</span>
                    ) : null}
                  </span>
                  <span className={'btn btn-sm ' + (r.sale_type === 'draw' ? 'btn-red' : 'btn-dark')}>{cta[0]}</span>
                </Link>
              );
            })}
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

      <section className="wrap stack" style={{ marginTop: 40 }}>
        <div className="two" style={{ gap: 24 }}>
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
