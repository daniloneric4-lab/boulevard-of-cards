import type { Metadata } from 'next';
import Link from 'next/link';
import { getSessionInfo } from '@/lib/supabase/server';
import { ORDER_STATUS, PAYMENT, date, money } from '@/lib/format';
import { signOut } from '@/app/actions';
import SubmitButton from '@/components/SubmitButton';
import ActionForm from '@/components/ActionForm';
import { confirmDelivery, openDispute } from '@/app/_act/market';
import { DRAW_STATUS } from '@/lib/format';

export const metadata: Metadata = { title: 'Porudžbine i prijave' };
export const dynamic = 'force-dynamic';

export default async function Profile({ searchParams }: { searchParams: Promise<{ porudzbina?: string; kupljeno?: string }> }) {
  const { porudzbina, kupljeno } = await searchParams;
  const { supabase, user, profile, isAdmin } = await getSessionInfo();
  const [{ data: orders }, { data: entries }, { data: pre }] = await Promise.all([
    supabase
      .from('orders')
      .select('id, status, amount_cents, shipping_cents, currency, payment_method, pay_deadline, tracking_number, created_at, seller_id, order_items(title, quantity, unit_price_cents), listings(title)')
      .eq('buyer_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase.from('draw_entries').select('id, status, waitlist_position, pay_deadline, created_at, draws(id, status, draw_at, releases(name))').eq('user_id', user!.id).order('created_at', { ascending: false }),
    supabase.from('preorders').select('id, status, quantity, deposit_cents, created_at, releases(name, release_date)').eq('user_id', user!.id).order('created_at', { ascending: false }),
  ]);

  return (
    <div className="wrap section stack" style={{ gap: 32 }}>
      <div className="row between">
        <div className="stack" style={{ gap: 6 }}>
          <span className="kicker">Profil</span>
          <h1 style={{ fontSize: 'clamp(28px,4vw,44px)' }}>{profile?.display_name || profile?.username}</h1>
          <span className="mono muted" style={{ fontSize: 13 }}>
            @{profile?.username} · {user!.email}
            {isAdmin ? ' · ADMIN' : ''}
          </span>
        </div>
        <div className="row">
          {isAdmin ? (
            <Link href="/admin" className="btn btn-red">
              Admin panel
            </Link>
          ) : null}
          <form action={signOut}>
            <button className="btn btn-ghost">Odjavi se</button>
          </form>
        </div>
      </div>

      {kupljeno ? (
        <div className="alert alert-ok" role="status">
          Kartica je rezervisana za tebe 24 sata. Uputstvo za uplatu stiže u obaveštenja, a novac čeka dok ne potvrdiš prijem.
        </div>
      ) : null}
      {porudzbina ? (
        <div className="alert alert-ok" role="status">
          Porudžbina je primljena. Uputstvo za uplatu stiže na e-poštu, a status pratiš ovde.
        </div>
      ) : null}

      <section className="stack">
        <h2>Moje porudžbine</h2>
        {orders && orders.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Stavke</th>
                  <th>Ukupno</th>
                  <th>Plaćanje</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} style={o.id === porudzbina ? { background: '#f7fbf8' } : undefined}>
                    <td className="mono">{date(o.created_at, true)}</td>
                    <td>
                      {!(o.order_items ?? []).length && o.listings ? <div>{(Array.isArray(o.listings) ? o.listings[0] : o.listings)?.title}</div> : null}
                      {(o.order_items ?? []).map((i, k) => (
                        <div key={k}>
                          {i.quantity} × {i.title}
                        </div>
                      ))}
                    </td>
                    <td className="mono">{money(o.amount_cents + o.shipping_cents, o.currency)}</td>
                    <td>{o.payment_method ? PAYMENT[o.payment_method] : '—'}</td>
                    <td>
                      <span className={'pill ' + (o.status === 'pending_payment' ? 'pill-red' : o.status === 'completed' || o.status === 'delivered' ? 'pill-green' : '')}>
                        {ORDER_STATUS[o.status] ?? o.status}
                      </span>
                      {o.status === 'pending_payment' && o.pay_deadline ? (
                        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                          Uplata do {date(o.pay_deadline, true)}
                        </div>
                      ) : null}
                      {o.tracking_number ? (
                        <div className="mono" style={{ fontSize: 12, marginTop: 4 }}>
                          Praćenje: {o.tracking_number}
                        </div>
                      ) : null}
                      {o.status === 'shipped' || o.status === 'delivered' ? (
                        <div className="stack" style={{ gap: 6, marginTop: 8 }}>
                          <form action={confirmDelivery}>
                            <input type="hidden" name="id" value={o.id} />
                            <SubmitButton className="btn btn-sm btn-red">Potvrdi prijem</SubmitButton>
                          </form>
                          {o.seller_id ? (
                            <details>
                              <summary style={{ cursor: 'pointer', fontSize: 13 }}>Nešto nije u redu?</summary>
                              <ActionForm action={openDispute} submit="Otvori spor" btn="btn btn-sm btn-dark" style={{ marginTop: 8, gap: 8 }}>
                                <input type="hidden" name="order_id" value={o.id} />
                                <select className="inp" name="reason" required defaultValue="">
                                  <option value="" disabled>
                                    Razlog
                                  </option>
                                  <option value="not_received">Nije stiglo</option>
                                  <option value="not_as_described">Nije kao u oglasu</option>
                                  <option value="damaged">Oštećeno</option>
                                  <option value="other">Drugo</option>
                                </select>
                                <textarea className="inp" name="description" placeholder="Opiši šta se desilo" />
                              </ActionForm>
                            </details>
                          ) : null}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="alert alert-info">Još nemaš porudžbina.</div>
        )}
      </section>

      <div className="two">
        <section className="stack">
          <h2>Izvlačenja</h2>
          {entries && entries.length ? (
            <div className="list">
              {entries.map((e) => {
                const d = Array.isArray(e.draws) ? e.draws[0] : e.draws;
                const r = d ? (Array.isArray(d.releases) ? d.releases[0] : d.releases) : null;
                const lab: Record<string, string> = { entered: 'Prijavljen', won: 'Izvučen · plati', lost: 'Nije izvučen', waitlist: `Rezervna lista #${e.waitlist_position}`, paid: 'Plaćeno', forfeited: 'Isteklo' };
                return (
                  <Link key={e.id} href={`/izvlacenja/${d?.id}`} className="list-row" style={{ textDecoration: 'none' }}>
                    <b style={{ flex: 1 }}>{r?.name}</b>
                    <span className="muted" style={{ fontSize: 13 }}>{d ? DRAW_STATUS[d.status] : ''}</span>
                    <span className={'pill ' + (e.status === 'won' ? 'pill-red' : e.status === 'paid' ? 'pill-green' : '')}>{lab[e.status]}</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="alert alert-info">
              Nisi prijavljen ni za jedno izvlačenje. <Link href="/izvlacenja" className="lnk">Pogledaj izvlačenja →</Link>
            </div>
          )}
        </section>
        <section className="stack">
          <h2>Preorderi</h2>
          {pre && pre.length ? (
            <div className="list">
              {pre.map((x) => {
                const r = Array.isArray(x.releases) ? x.releases[0] : x.releases;
                return (
                  <div key={x.id} className="list-row">
                    <b style={{ flex: 1 }}>{x.quantity} × {r?.name}</b>
                    <span className="mono muted">{date(r?.release_date)}</span>
                    <span className="pill">{x.status}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="alert alert-info">Nemaš preordera.</div>
          )}
        </section>
      </div>

      <div className="row">
        <Link href="/podesavanja" className="btn btn-dark">
          Podešavanja naloga
        </Link>
        <Link href="/kolekcija" className="btn btn-ghost">
          Moja kolekcija
        </Link>
      </div>
    </div>
  );
}
