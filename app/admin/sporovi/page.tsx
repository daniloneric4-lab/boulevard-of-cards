import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import ActionForm from '@/components/ActionForm';
import SubmitButton from '@/components/SubmitButton';
import { handleReport, resolveDispute } from '../actions';
import { date, money } from '@/lib/format';

export const dynamic = 'force-dynamic';

const REASON: Record<string, string> = { not_received: 'Nije stiglo', not_as_described: 'Nije kao u oglasu', damaged: 'Oštećeno', other: 'Drugo' };
const TARGET: Record<string, string> = { listing: 'Oglas', message: 'Poruka', profile: 'Profil', review: 'Recenzija' };

export default async function AdminDisputes() {
  const supabase = await createClient();
  const [{ data: disputes }, { data: reports }, { data: flagged }] = await Promise.all([
    supabase.from('disputes').select('*, opener:profiles!disputes_opened_by_fkey(username), orders(id, amount_cents, currency, status, buyer:profiles!orders_buyer_id_fkey(username), seller:profiles!orders_seller_id_fkey(username), order_items(title))').order('created_at', { ascending: false }).limit(50),
    supabase.from('reports').select('*, reporter:profiles!reports_reporter_id_fkey(username)').order('created_at', { ascending: false }).limit(50),
    supabase.from('messages').select('id, body, created_at, conversation_id, sender:profiles!messages_sender_id_fkey(username)').eq('flagged', true).order('created_at', { ascending: false }).limit(20),
  ]);
  const one = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? x[0] ?? null : x ?? null);
  const openD = (disputes ?? []).filter((d) => d.status === 'open');
  const doneD = (disputes ?? []).filter((d) => d.status !== 'open');
  const openR = (reports ?? []).filter((r) => r.status === 'open');
  return (
    <>
      <div className="stack" style={{ gap: 6 }}>
        <h1 style={{ fontSize: 36 }}>Sporovi i prijave</h1>
        <p className="muted">Odluka se donosi na osnovu poruka, fotografija i videa pakovanja. Do odluke novac ostaje zaključan.</p>
      </div>
      <section className="stack">
        <h2>Otvoreni sporovi ({openD.length})</h2>
        {openD.length ? (
          openD.map((d) => {
            const o = one(d.orders as unknown as { id: string; amount_cents: number; currency: string; status: string; buyer: unknown; seller: unknown; order_items: { title: string }[] });
            return (
              <div key={d.id} className="card stack">
                <div className="row between">
                  <b>{o?.order_items?.[0]?.title ?? 'Porudžbina'} · {money(o?.amount_cents, o?.currency)}</b>
                  <span className="pill pill-red">{REASON[d.reason] ?? d.reason}</span>
                </div>
                <span className="muted" style={{ fontSize: 13 }}>
                  Otvorio @{one(d.opener as { username: string } | null)?.username} · kupac @{one(o?.buyer as { username: string } | null)?.username} · prodavac @{one(o?.seller as { username: string } | null)?.username} · {date(d.created_at, true)}
                </span>
                {d.description ? <p>{d.description}</p> : null}
                <div className="row">
                  {['refund', 'release'].map((a) => (
                    <ActionForm key={a} action={resolveDispute} submit={a === 'refund' ? 'Vrati novac kupcu' : 'Isplati prodavcu'} btn={'btn btn-sm ' + (a === 'refund' ? 'btn-red' : 'btn-dark')} className="row">
                      <input type="hidden" name="id" value={d.id} />
                      <input type="hidden" name="action" value={a} />
                      <input className="inp" name="note" placeholder="Obrazloženje" style={{ minHeight: 36, width: 200 }} />
                    </ActionForm>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="alert alert-info">Nema otvorenih sporova.</div>
        )}
        {doneD.length ? (
          <details className="box">
            <summary>Rešeni ({doneD.length})</summary>
            <div className="list">
              {doneD.map((d) => (
                <div key={d.id} className="list-row">
                  <span style={{ flex: 1 }}>{REASON[d.reason] ?? d.reason}</span>
                  <span className="pill">{d.status === 'refunded' ? 'Vraćen novac' : d.status === 'released' ? 'Isplaćeno prodavcu' : d.status}</span>
                  <span className="mono muted">{date(d.resolved_at)}</span>
                </div>
              ))}
            </div>
          </details>
        ) : null}
      </section>
      <section className="stack">
        <h2>Prijave sadržaja ({openR.length})</h2>
        {openR.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Šta</th>
                  <th>Razlog</th>
                  <th>Prijavio</th>
                  <th>Kada</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {openR.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.target_type === 'listing' ? (
                        <Link href={`/oglas/${r.target_id}`} className="lnk">
                          {TARGET[r.target_type]}
                        </Link>
                      ) : (
                        TARGET[r.target_type]
                      )}
                    </td>
                    <td>{r.reason}</td>
                    <td>@{one(r.reporter as { username: string } | null)?.username}</td>
                    <td className="mono">{date(r.created_at, true)}</td>
                    <td className="row" style={{ gap: 6 }}>
                      <form action={handleReport}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="status" value="actioned" />
                        <SubmitButton className="btn btn-sm btn-red">Ukloni / reaguj</SubmitButton>
                      </form>
                      <form action={handleReport}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="status" value="dismissed" />
                        <SubmitButton className="btn btn-sm btn-ghost">Odbaci</SubmitButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="alert alert-info">Nema otvorenih prijava.</div>
        )}
      </section>
      <section className="stack">
        <h2>Poruke označene kao dogovor van platforme</h2>
        {flagged && flagged.length ? (
          <div className="list">
            {flagged.map((m) => (
              <div key={m.id} className="list-row">
                <b>@{one(m.sender as unknown as { username: string } | null)?.username}</b>
                <span style={{ flex: 1, fontSize: 14 }}>{m.body}</span>
                <span className="mono muted">{date(m.created_at, true)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="alert alert-info">Nema označenih poruka.</div>
        )}
      </section>
    </>
  );
}
