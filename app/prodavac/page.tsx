import Link from 'next/link';
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import SubmitButton from '@/components/SubmitButton';
import { setListingPrice, setListingStatus, shipOrder } from '@/app/_act/market';
import { LISTING_MODE, ORDER_STATUS, date, money } from '@/lib/format';

export const metadata: Metadata = { title: 'Panel prodavca' };
export const dynamic = 'force-dynamic';

export default async function Seller({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t = 'active' } = await searchParams;
  const { supabase, user, profile } = await requireUser('/prodavac');
  const [{ data: listings }, { data: orders }, { data: offers }, { data: payouts }, { data: reviews }] = await Promise.all([
    supabase.from('listings').select('id, title, mode, status, price_cents, currency, created_at, auctions(current_bid_cents, bid_count, ends_at)').eq('seller_id', user.id).order('created_at', { ascending: false }),
    supabase.from('orders').select('id, status, amount_cents, currency, shipping, tracking_number, created_at, pay_deadline, buyer:profiles!orders_buyer_id_fkey(username), order_items(title), listings(title)').eq('seller_id', user.id).order('created_at', { ascending: false }).limit(50),
    supabase.from('offers').select('id, amount_cents, currency, expires_at, conversation_id, from:profiles!offers_from_user_fkey(username), listings(title)').eq('to_user', user.id).eq('status', 'pending').gt('expires_at', new Date().toISOString()),
    supabase.from('payouts').select('id, amount_cents, fee_cents, currency, status, created_at, paid_at, hold_reason').eq('seller_id', user.id).order('created_at', { ascending: false }),
    supabase.from('reviews').select('rating, comment, created_at, reviewer:profiles!reviews_reviewer_id_fkey(username)').eq('reviewee_id', user.id).order('created_at', { ascending: false }).limit(10),
  ]);
  const L = listings ?? [];
  const O = orders ?? [];
  const P = payouts ?? [];
  const R = reviews ?? [];
  const ready = P.filter((p) => p.status === 'ready').reduce((s, p) => s + p.amount_cents, 0);
  const held = P.filter((p) => p.status === 'held').reduce((s, p) => s + p.amount_cents, 0);
  const paidTotal = P.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount_cents, 0);
  const pendingShip = O.filter((o) => o.status === 'paid');
  const inFlight = O.filter((o) => ['pending_payment', 'shipped', 'delivered', 'disputed'].includes(o.status));
  const rating = R.length ? (R.reduce((s, r) => s + r.rating, 0) / R.length).toFixed(1) : '—';
  const shown = L.filter((l) => (t === 'active' ? l.status === 'active' : t === 'reserved' ? l.status === 'reserved' : t === 'sold' ? l.status === 'sold' : ['cancelled', 'ended', 'draft'].includes(l.status)));
  const one = <T,>(x: T | T[] | null): T | null => (Array.isArray(x) ? x[0] ?? null : x);

  return (
    <div className="page">
      <div className="row between">
        <div className="stack" style={{ gap: 6 }}>
          <span className="kicker">Panel prodavca · @{profile?.username}</span>
          <h1 style={{ fontSize: 'clamp(30px,4vw,48px)' }}>Tvoja prodaja</h1>
        </div>
        <Link href="/prodaj" className="btn btn-red">
          Novi oglas
        </Link>
      </div>
      <div className="kv">
        <div>
          <span>Aktivni oglasi</span>
          <b>{L.filter((l) => l.status === 'active').length}</b>
        </div>
        <div>
          <span>Čeka slanje</span>
          <b style={pendingShip.length ? { color: 'var(--bc-red)' } : undefined}>{pendingShip.length}</b>
        </div>
        <div>
          <span>Prodato</span>
          <b>{L.filter((l) => l.status === 'sold').length}</b>
        </div>
        <div>
          <span>Spremno za isplatu</span>
          <b>{money(ready)}</b>
        </div>
        <div>
          <span>Ocena</span>
          <b>
            {rating} <span className="muted" style={{ fontSize: 13 }}>({R.length})</span>
          </b>
        </div>
      </div>

      <div className="side">
        <div className="stack" style={{ gap: 28 }}>
          <section className="stack">
            <h2>Čeka slanje</h2>
            {pendingShip.length ? (
              <div className="list">
                {pendingShip.map((o) => (
                  <div key={o.id} className="list-row" style={{ flexWrap: 'wrap' }}>
                    <div className="stack" style={{ gap: 2, flex: '1 1 240px' }}>
                      <b>{(o.order_items ?? [])[0]?.title ?? one(o.listings)?.title ?? 'Porudžbina'}</b>
                      <span className="muted" style={{ fontSize: 13 }}>
                        @{one(o.buyer)?.username} · {money(o.amount_cents, o.currency)} · {o.shipping === 'pickup' ? 'lično preuzimanje' : 'kurir'} · plaćeno
                      </span>
                    </div>
                    <form action={shipOrder} className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                      <input type="hidden" name="id" value={o.id} />
                      <input className="inp" name="tracking" placeholder="Broj za praćenje" aria-label="Broj za praćenje" style={{ minHeight: 40, width: 180 }} />
                      <SubmitButton className="btn btn-sm btn-red">Poslato</SubmitButton>
                    </form>
                  </div>
                ))}
              </div>
            ) : (
              <div className="alert alert-info">Nema porudžbina koje čekaju slanje. Snimi video pakovanja pre svakog slanja, to je tvoj dokaz u slučaju spora.</div>
            )}
            {inFlight.length ? (
              <details className="box">
                <summary>U toku ({inFlight.length})</summary>
                <div className="list">
                  {inFlight.map((o) => (
                    <div key={o.id} className="list-row">
                      <span style={{ flex: 1 }}>{(o.order_items ?? [])[0]?.title ?? one(o.listings)?.title ?? 'Porudžbina'}</span>
                      <span className="mono">{money(o.amount_cents, o.currency)}</span>
                      <span className="pill">{ORDER_STATUS[o.status]}</span>
                    </div>
                  ))}
                </div>
              </details>
            ) : null}
          </section>

          <section className="stack">
            <h2>Ponude kupaca</h2>
            {offers && offers.length ? (
              <div className="list">
                {offers.map((o) => (
                  <div key={o.id} className="list-row">
                    <div className="stack" style={{ gap: 2, flex: 1 }}>
                      <b>
                        @{one(o.from)?.username} nudi {money(o.amount_cents, o.currency)}
                      </b>
                      <span className="muted" style={{ fontSize: 13 }}>
                        {one(o.listings)?.title ?? 'Opšta ponuda'} · važi do {date(o.expires_at, true)}
                      </span>
                    </div>
                    <Link href={`/poruke/${o.conversation_id}`} className="btn btn-sm btn-dark">
                      Odgovori
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="alert alert-info">Sve ponude su obrađene.</div>
            )}
          </section>

          <section className="stack">
            <h2>Oglasi</h2>
            <nav className="tabs">
              {[
                ['active', 'Aktivni'],
                ['reserved', 'Rezervisani'],
                ['sold', 'Prodati'],
                ['other', 'Završeni i povučeni'],
              ].map(([k, l]) => (
                <Link key={k} href={`/prodavac?t=${k}`} className={t === k ? 'on' : undefined}>
                  {l}
                </Link>
              ))}
            </nav>
            {shown.length ? (
              <div className="list">
                {shown.map((l) => {
                  const a = one(l.auctions);
                  return (
                    <div key={l.id} className="list-row" style={{ flexWrap: 'wrap' }}>
                      <div className="stack" style={{ gap: 2, flex: '1 1 260px' }}>
                        <Link href={`/oglas/${l.id}`} style={{ fontWeight: 600, textDecoration: 'none' }}>
                          {l.title}
                        </Link>
                        <span className="muted" style={{ fontSize: 13 }}>
                          {LISTING_MODE[l.mode]}
                          {a ? ` · ${a.bid_count} ponuda · do ${date(a.ends_at, true)}` : ''} · od {date(l.created_at)}
                        </span>
                      </div>
                      <b className="mono">{money(a?.current_bid_cents ?? l.price_cents, l.currency)}</b>
                      {l.status === 'active' && l.mode !== 'auction' ? (
                        <form action={setListingPrice} className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                          <input type="hidden" name="id" value={l.id} />
                          <input className="inp" name="price" inputMode="decimal" placeholder="Nova cena" aria-label="Nova cena" style={{ width: 120, minHeight: 36 }} />
                          <SubmitButton className="btn btn-sm btn-ghost">Promeni</SubmitButton>
                        </form>
                      ) : null}
                      {l.status === 'active' && !(a && a.bid_count > 0) ? (
                        <form action={setListingStatus}>
                          <input type="hidden" name="id" value={l.id} />
                          <input type="hidden" name="status" value="cancelled" />
                          <SubmitButton className="btn btn-sm btn-ghost">Povuci</SubmitButton>
                        </form>
                      ) : null}
                      {l.status === 'cancelled' && l.mode !== 'auction' ? (
                        <form action={setListingStatus}>
                          <input type="hidden" name="id" value={l.id} />
                          <input type="hidden" name="status" value="active" />
                          <SubmitButton className="btn btn-sm btn-ghost">Vrati u prodaju</SubmitButton>
                        </form>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="alert alert-info">Nema oglasa u ovoj grupi.</div>
            )}
          </section>
        </div>

        <aside className="stack">
          <section className="card-dark stack">
            <span className="kicker">Isplata</span>
            <div className="kv">
              <div>
                <span>Spremno</span>
                <b>{money(ready)}</b>
              </div>
              <div>
                <span>Zadržano</span>
                <b>{money(held)}</b>
              </div>
            </div>
            <span style={{ color: 'var(--bc-gray-dk)', fontSize: 13 }}>
              Ukupno isplaćeno: {money(paidTotal)}. Isplata stiže sledećeg radnog dana posle potvrde kupca, umanjena za proviziju platforme.
            </span>
            <Link href="/podesavanja#isplata" className="btn btn-ghost" style={{ color: '#fff', borderColor: 'var(--bc-line-dk)', alignSelf: 'flex-start' }}>
              Račun za isplatu
            </Link>
          </section>
          <section className="card stack">
            <h3>Ocene · {rating}</h3>
            {R.length ? (
              R.map((r, i) => (
                <div key={i} className="stack" style={{ gap: 2, borderBottom: '1px solid var(--bc-line)', paddingBottom: 10 }}>
                  <span className="row between">
                    <b>@{one(r.reviewer)?.username}</b>
                    <span className="stars" aria-label={`${r.rating} od 5`}>
                      {'★'.repeat(r.rating)}
                      <span style={{ color: 'var(--bc-line)' }}>{'★'.repeat(5 - r.rating)}</span>
                    </span>
                  </span>
                  {r.comment ? <span style={{ fontSize: 14 }}>{r.comment}</span> : null}
                </div>
              ))
            ) : (
              <span className="muted" style={{ fontSize: 14 }}>
                Ocene stižu posle prvih prodaja.
              </span>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
