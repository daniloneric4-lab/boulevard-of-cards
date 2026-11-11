import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSessionInfo } from '@/lib/supabase/server';
import CardArt from '@/components/CardArt';
import Countdown from '@/components/Countdown';
import Avatar from '@/components/Avatar';
import SubmitButton from '@/components/SubmitButton';
import ListingTile from '@/components/ListingTile';
import { startConversation, toggleWatch, reportContent } from '@/app/_act/market';
import { LISTING_MODE, date, gradeLabel, listingImage, money, sportLabel } from '@/lib/format';
import { LISTING_SELECT, one, type ListingRow } from '@/lib/listings';
import BidForm from './BidForm';
import BuyForm from './BuyForm';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { supabase } = await getSessionInfo();
  const { data } = await supabase.from('listings').select('title').eq('id', id).maybeSingle();
  return { title: data?.title ?? 'Oglas' };
}

const PROTECT = [
  'Plaćaš preko platforme, novac čeka kod platnog procesora.',
  'Prodavac šalje uz video pakovanja i broj za praćenje.',
  'Prodavac dobija novac tek kad potvrdiš prijem.',
  'Ako nešto nije u redu, otvaraš spor i novac ostaje zaključan.',
];

export default async function ListingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ novo?: string }> }) {
  const { id } = await params;
  const { novo } = await searchParams;
  const { supabase, user } = await getSessionInfo();
  await supabase.rpc('settle_auctions');
  const { data } = await supabase.from('listings').select(LISTING_SELECT + ', description').eq('id', id).maybeSingle();
  if (!data) notFound();
  const l = data as unknown as ListingRow & { description: string | null };
  const a = one(l.auctions);
  const ci = one(l.collection_items);
  const seller = one(l.seller);
  const imgs = (l.listing_images ?? []).sort((x, y) => x.position - y.position);
  const mine = user?.id === l.seller_id;
  const [{ data: bids }, watch, { count: sales }, { data: rev }, { data: similar }, { data: ciFull }] = await Promise.all([
    a ? supabase.from('bids').select('amount_cents, created_at, bidder:profiles!bids_bidder_id_fkey(username)').eq('listing_id', id).order('created_at', { ascending: false }).limit(8) : Promise.resolve({ data: [] }),
    user ? supabase.from('listing_watches').select('listing_id').eq('listing_id', id).eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from('listings').select('id', { count: 'exact', head: true }).eq('seller_id', l.seller_id).eq('status', 'sold'),
    supabase.from('reviews').select('rating').eq('reviewee_id', l.seller_id),
    supabase.from('listings').select(LISTING_SELECT).eq('status', 'active').eq('sport', l.sport).neq('id', id).limit(4),
    supabase.from('listings').select('collection_item_id').eq('id', id).single(),
  ]);
  const { data: events } = ciFull?.collection_item_id
    ? await supabase.from('card_events').select('event_type, description, price_cents, currency, occurred_at').eq('collection_item_id', ciFull.collection_item_id).order('occurred_at')
    : { data: [] };
  const watching = !!watch.data;
  const rating = rev && rev.length ? (rev.reduce((s, r) => s + r.rating, 0) / rev.length).toFixed(1) : null;
  const minBid = a ? (a.current_bid_cents == null ? a.start_price_cents : a.current_bid_cents + a.min_increment_cents) : 0;
  const active = l.status === 'active';
  const ended = a ? new Date(a.ends_at).getTime() <= Date.now() : false;

  return (
    <div className="page">
      {novo ? (
        <div className="alert alert-ok" role="status">
          Oglas je objavljen i vidi se u prodavnici. Kartica je dodata u tvoju kolekciju.
        </div>
      ) : null}
      <div className="row" style={{ gap: 6, fontSize: 14 }}>
        <Link href={a ? '/aukcije' : '/prodavnica'} className="lnk">
          ← {a ? 'Aukcije' : 'Prodavnica'}
        </Link>
      </div>
      <div className="two">
        <div className="stack">
          <CardArt seed={l.id} grade={gradeLabel(ci?.grader, ci?.grade)} image={listingImage(imgs[0]?.storage_path)} size="lg" label={l.title} />
          {imgs.length > 1 ? (
            <div className="row">
              {imgs.slice(1).map((im) => (
                <a key={im.storage_path} href={listingImage(im.storage_path)!} target="_blank" rel="noreferrer">
                  <img src={listingImage(im.storage_path)!} alt="" style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 10 }} />
                </a>
              ))}
            </div>
          ) : null}
          {ci?.cert_number ? (
            <span className="mono muted" style={{ fontSize: 12 }}>
              CERT #{ci.cert_number}
            </span>
          ) : null}
        </div>

        <div className="stack" style={{ gap: 18 }}>
          <div className="row" style={{ gap: 8 }}>
            <span className="pill pill-dark">{LISTING_MODE[l.mode]}</span>
            <span className="pill">{sportLabel(l.sport)}</span>
            <span className="pill">{gradeLabel(ci?.grader, ci?.grade)}</span>
            {ci?.passport_code ? <span className="pill">PASOŠ #{ci.passport_code}</span> : null}
            {l.is_checked_box ? <span className="pill pill-green">Proverena kutija</span> : null}
          </div>
          <h1 style={{ fontSize: 'clamp(26px,3.4vw,40px)' }}>{l.title}</h1>
          {l.description ? <p className="muted" style={{ whiteSpace: 'pre-line' }}>{l.description}</p> : null}

          {a ? (
            <div className="card stack light">
              <div className="kv">
                <div>
                  <span>{a.current_bid_cents == null ? 'Početna cena' : 'Trenutna ponuda'}</span>
                  <b>{money(a.current_bid_cents ?? a.start_price_cents, l.currency)}</b>
                </div>
                <div>
                  <span>Ponuda</span>
                  <b>{a.bid_count}</b>
                </div>
              </div>
              <span className="muted" style={{ fontSize: 13 }}>
                {ended || !active ? 'Aukcija je završena' : 'Završava se za'}
              </span>
              {!ended && active ? <Countdown to={a.ends_at} /> : null}
              {user && a.current_bidder_id === user.id && active ? <div className="alert alert-ok">Vodiš. Javićemo ti odmah ako te neko nadmaši.</div> : null}
              {active && !ended ? (
                mine ? (
                  <div className="alert alert-info">Ovo je tvoja aukcija.</div>
                ) : user ? (
                  <BidForm listingId={l.id} min={minBid} step={a.min_increment_cents} />
                ) : (
                  <Link href={`/prijava?next=/oglas/${l.id}`} className="btn btn-red">
                    Prijavi se da licitiraš
                  </Link>
                )
              ) : null}
              <span className="muted" style={{ fontSize: 12 }}>
                Ponuda u poslednja {Math.round(120 / 60)} minuta produžava aukciju. Minimalni korak: {money(a.min_increment_cents, l.currency)}.
              </span>
            </div>
          ) : l.mode === 'fixed' ? (
            <div className="card stack light">
              <span className="muted" style={{ fontSize: 13 }}>
                Cena
              </span>
              <span className="price" style={{ fontSize: 34 }}>
                {money(l.price_cents, l.currency)}
              </span>
              {active ? (
                mine ? (
                  <div className="alert alert-info">Ovo je tvoj oglas.</div>
                ) : user ? (
                  <BuyForm listingId={l.id} label="Kupi · novac zaštićen" />
                ) : (
                  <Link href={`/prijava?next=/oglas/${l.id}`} className="btn btn-red">
                    Prijavi se da kupiš
                  </Link>
                )
              ) : (
                <div className="alert alert-info">{l.status === 'reserved' ? 'Kartica je rezervisana.' : 'Kartica je prodata.'}</div>
              )}
            </div>
          ) : (
            <div className="card stack light">
              <b>{l.mode === 'offers' ? `Prodavac prima ponude${l.price_cents ? ' · okvirno ' + money(l.price_cents, l.currency) : ''}` : l.mode === 'trade' ? 'Prodavac traži razmenu' : 'Kartica je samo izložena u vitrini'}</b>
              <span className="muted" style={{ fontSize: 14 }}>
                Pošalji ponudu ili predlog razmene iz poruke. Kad prodavac prihvati, plaćaš iz istog razgovora, uz zaštitu novca.
              </span>
            </div>
          )}

          <div className="row">
            {!mine && seller ? (
              <form action={startConversation}>
                <input type="hidden" name="user_id" value={l.seller_id} />
                <input type="hidden" name="listing_id" value={l.id} />
                <SubmitButton className="btn btn-dark">{l.mode === 'fixed' || a ? 'Pitaj prodavca' : 'Pošalji ponudu'}</SubmitButton>
              </form>
            ) : null}
            {mine ? (
              <Link href="/prodavac" className="btn btn-dark">
                Upravljaj u panelu prodavca
              </Link>
            ) : null}
            {user && !mine ? (
              <form action={toggleWatch}>
                <input type="hidden" name="listing_id" value={l.id} />
                <input type="hidden" name="on" value={watching ? '1' : '0'} />
                <SubmitButton className="btn btn-ghost">{watching ? '★ Pratiš' : '☆ Prati'}</SubmitButton>
              </form>
            ) : null}
          </div>

          {seller ? (
            <div className="card row" style={{ gap: 14 }}>
              <Avatar name={seller.username} url={seller.avatar_url} size={48} />
              <div className="stack" style={{ gap: 2, flex: 1 }}>
                <Link href={`/u/${seller.username}`} style={{ fontWeight: 700, textDecoration: 'none' }}>
                  @{seller.username}
                </Link>
                <span className="muted" style={{ fontSize: 13 }}>
                  {seller.is_verified ? 'Verifikovan prodavac' : 'Prodavac'}
                  {l.city ? ` · ${l.city}` : ''}
                </span>
              </div>
              <div className="stack" style={{ gap: 0, textAlign: 'right' }}>
                <b className="mono">{sales ?? 0}</b>
                <span className="muted" style={{ fontSize: 12 }}>prodaja</span>
              </div>
              <div className="stack" style={{ gap: 0, textAlign: 'right' }}>
                <b className="mono">{rating ?? '—'}</b>
                <span className="muted" style={{ fontSize: 12 }}>ocena</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="two">
        <section className="card-dark stack">
          <span className="kicker">Pasoš kartice{ci?.passport_code ? ` · #${ci.passport_code}` : ''}</span>
          <h3>Put ove kartice</h3>
          {events && events.length ? (
            <ul className="ticks" style={{ color: 'var(--bc-line)' }}>
              {events.map((e, i) => (
                <li key={i}>
                  <b style={{ color: '#fff' }}>{e.description || e.event_type}</b>
                  <span className="mono" style={{ fontSize: 12 }}> · {date(e.occurred_at)}{e.price_cents ? ' · ' + money(e.price_cents, e.currency) : ''}</span>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="ticks" style={{ color: 'var(--bc-line)' }}>
              <li>Objavljena na Boulevard of Cards · {date(l.created_at)}</li>
            </ul>
          )}
          <span style={{ fontSize: 13, color: 'var(--bc-gray-dk)' }}>QR nalepnica na toploaderu vodi na ovu stranicu. Kartica sa poreklom se lakše prodaje.</span>
        </section>
        <section className="card stack">
          <h3>Novac je zaštićen</h3>
          <ol className="stack" style={{ margin: 0, paddingLeft: 20, gap: 8 }}>
            {PROTECT.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
          <Link href="/pomoc" className="lnk">
            Kako radi zaštita
          </Link>
        </section>
      </div>

      {a && bids && bids.length ? (
        <section className="stack">
          <h2>Istorija ponuda</h2>
          <div className="list">
            {bids.map((b, i) => {
              const who = one(b.bidder as { username: string } | { username: string }[] | null);
              return (
                <div key={i} className="list-row">
                  <b className="mono" style={{ flex: 1 }}>{money(b.amount_cents, l.currency)}</b>
                  <span>@{who?.username ?? '—'}</span>
                  <span className="mono muted">{date(b.created_at, true)}</span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {similar && similar.length ? (
        <section className="stack">
          <h2>Slično u prodaji</h2>
          <div className="grid-tiles">
            {(similar as unknown as ListingRow[]).map((x) => (
              <ListingTile key={x.id} l={x} />
            ))}
          </div>
        </section>
      ) : null}

      {user && !mine ? (
        <form action={reportContent} style={{ alignSelf: 'flex-start' }}>
          <input type="hidden" name="target_type" value="listing" />
          <input type="hidden" name="target_id" value={l.id} />
          <input type="hidden" name="reason" value="suspicious" />
          <input type="hidden" name="back" value={`/oglas/${l.id}`} />
          <SubmitButton className="btn btn-ghost btn-sm" pendingText="Šaljem…">Prijavi oglas</SubmitButton>
        </form>
      ) : null}
    </div>
  );
}
