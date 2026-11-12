import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import SubmitButton from '@/components/SubmitButton';
import { gradingBatch, reviewBoxCheck, updateService } from '../actions';
import { SERVICE, SERVICE_STATUS, date, money } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AdminServices() {
  const supabase = await createClient();
  const [{ data: reqs }, { data: checks }, { data: batches }] = await Promise.all([
    supabase.from('service_requests').select('*, profiles(username), collection_items(title)').order('created_at', { ascending: false }).limit(100),
    supabase.from('box_checks').select('*, profiles!box_checks_requested_by_fkey(username), listings(id, title)').eq('status', 'pending').order('created_at'),
    supabase.from('grading_batches').select('*, service_requests(card_count, status)').order('created_at', { ascending: false }).limit(10),
  ]);
  const BATCH: Record<string, string> = { collecting: 'Skupljamo kartice', sent: 'Poslato u PSA', graded: 'Ocenjeno, vraća se', returned: 'Vraćeno vlasnicima' };
  const one = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? x[0] ?? null : x ?? null);
  return (
    <>
      <div className="stack" style={{ gap: 6 }}>
        <h1 style={{ fontSize: 36 }}>Usluge</h1>
        <p className="muted">PSA gradiranje, sef, konsignacija i otkup. Svaka promena statusa šalje korisniku obaveštenje.</p>
      </div>
      <section className="stack">
        <h2>PSA paketi</h2>
        <p className="muted" style={{ fontSize: 14 }}>
          Kad korisnik donese kartice, u tabeli ispod mu stavi status „Primljeno kod nas” i upiši PSA naknadu. „Pošalji u PSA” šalje samo primljene kartice, a one koje još nisu stigle prelaze u sledeći paket.
        </p>
        {(batches ?? []).length ? (
          <div className="list">
            {(batches ?? []).map((b) => {
              const rs = (b.service_requests ?? []) as { card_count: number; status: string }[];
              const all = rs.filter((r) => r.status !== 'cancelled').reduce((t, r) => t + r.card_count, 0);
              const got = rs.filter((r) => r.status === 'received').reduce((t, r) => t + r.card_count, 0);
              return (
                <div key={b.id} className="card stack" style={{ gap: 10 }}>
                  <div className="row between">
                    <b>
                      {b.code} · {BATCH[b.status] ?? b.status}
                    </b>
                    <span className="mono" style={{ fontSize: 13 }}>
                      {all} / {b.target_cards} prijavljeno · {got} kod nas{b.tracking ? ` · ${b.tracking}` : ''}
                    </span>
                  </div>
                  {b.status === 'collecting' ? (
                    <div className="row" style={{ gap: 8 }}>
                      <form action={gradingBatch} className="row" style={{ gap: 6 }}>
                        <input type="hidden" name="id" value={b.id} />
                        <input type="hidden" name="step" value="target" />
                        <input className="inp" name="target" defaultValue={b.target_cards} inputMode="numeric" style={{ width: 90, minHeight: 36 }} aria-label="Koliko kartica čekamo" />
                        <SubmitButton className="btn btn-sm btn-ghost">Promeni cilj</SubmitButton>
                      </form>
                      <form action={gradingBatch} className="row" style={{ gap: 6 }}>
                        <input type="hidden" name="id" value={b.id} />
                        <input type="hidden" name="step" value="ship" />
                        <input className="inp" name="tracking" placeholder="Broj pošiljke" style={{ width: 160, minHeight: 36 }} />
                        <SubmitButton className="btn btn-sm btn-red" pendingText="Šaljem…">
                          Pošalji u PSA ({got})
                        </SubmitButton>
                      </form>
                    </div>
                  ) : b.status === 'sent' ? (
                    <form action={gradingBatch}>
                      <input type="hidden" name="id" value={b.id} />
                      <input type="hidden" name="step" value="graded" />
                      <SubmitButton className="btn btn-sm btn-dark">Ocenjeno, kreće nazad</SubmitButton>
                    </form>
                  ) : b.status === 'graded' ? (
                    <form action={gradingBatch}>
                      <input type="hidden" name="id" value={b.id} />
                      <input type="hidden" name="step" value="returned" />
                      <SubmitButton className="btn btn-sm btn-dark">Vraćeno vlasnicima</SubmitButton>
                    </form>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="alert alert-info">Još nema PSA paketa. Prvi se otvara sam sa prvom prijavom.</div>
        )}
      </section>
      {(reqs ?? []).length ? (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Korisnik</th>
                <th>Usluga</th>
                <th>Šta</th>
                <th>Status i cena</th>
              </tr>
            </thead>
            <tbody>
              {(reqs ?? []).map((r) => (
                <tr key={r.id}>
                  <td>
                    @{one(r.profiles as { username: string } | null)?.username}
                    <div className="mono muted" style={{ fontSize: 12 }}>
                      {date(r.created_at)}
                    </div>
                  </td>
                  <td>
                    {SERVICE[r.service]}
                    {r.grading_company ? ` · ${String(r.grading_company).toUpperCase()}` : ''}
                    {r.service === 'grading' ? (
                      <div className="mono muted" style={{ fontSize: 12 }}>
                        {r.card_count} kom · {(r.tier ?? 'standard').toUpperCase()}
                        {r.declared_value_cents ? ` · vrednost ${money(r.declared_value_cents)}` : ''}
                      </div>
                    ) : null}
                  </td>
                  <td style={{ maxWidth: 320 }}>
                    {one(r.collection_items as { title: string } | null)?.title ? <b>{one(r.collection_items as { title: string } | null)?.title}</b> : null}
                    <div style={{ fontSize: 13 }}>{r.notes}</div>
                  </td>
                  <td>
                    <form action={updateService} className="row" style={{ gap: 6 }}>
                      <input type="hidden" name="id" value={r.id} />
                      <select className="inp" name="status" defaultValue={r.status} style={{ minHeight: 36, width: 170 }}>
                        {Object.entries(SERVICE_STATUS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                      <input className="inp" name="quote" placeholder={r.quoted_cents ? money(r.quoted_cents) : r.service === 'grading' ? 'PSA naknada RSD' : 'Cena RSD'} style={{ minHeight: 36, width: 110 }} />
                      <input className="inp" name="batch_code" placeholder={r.batch_code ?? 'Pošiljka #'} style={{ minHeight: 36, width: 110 }} />
                      <SubmitButton className="btn btn-sm btn-dark">Sačuvaj</SubmitButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="alert alert-info">Nema prijava za usluge.</div>
      )}
      <section className="stack">
        <h2>Provera kutija</h2>
        {(checks ?? []).length ? (
          <div className="list">
            {(checks ?? []).map((c) => {
              const l = one(c.listings as { id: string; title: string } | null);
              return (
                <div key={c.id} className="list-row">
                  <div className="stack" style={{ gap: 2, flex: 1 }}>
                    <Link href={`/oglas/${l?.id}`} className="lnk">
                      {l?.title}
                    </Link>
                    <span className="muted" style={{ fontSize: 13 }}>
                      @{one(c.profiles as { username: string } | null)?.username} · {date(c.created_at)}
                    </span>
                  </div>
                  <form action={reviewBoxCheck}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="approve" value="1" />
                    <SubmitButton className="btn btn-sm btn-dark">Odobri</SubmitButton>
                  </form>
                  <form action={reviewBoxCheck}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="approve" value="0" />
                    <SubmitButton className="btn btn-sm btn-ghost">Odbij</SubmitButton>
                  </form>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="alert alert-info">Nema kutija koje čekaju proveru.</div>
        )}
      </section>
    </>
  );
}
