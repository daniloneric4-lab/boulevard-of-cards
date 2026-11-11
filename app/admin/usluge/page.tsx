import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import SubmitButton from '@/components/SubmitButton';
import { reviewBoxCheck, updateService } from '../actions';
import { SERVICE, SERVICE_STATUS, date, money } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AdminServices() {
  const supabase = await createClient();
  const [{ data: reqs }, { data: checks }] = await Promise.all([
    supabase.from('service_requests').select('*, profiles(username), collection_items(title)').order('created_at', { ascending: false }).limit(100),
    supabase.from('box_checks').select('*, profiles!box_checks_requested_by_fkey(username), listings(id, title)').eq('status', 'pending').order('created_at'),
  ]);
  const one = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? x[0] ?? null : x ?? null);
  return (
    <>
      <div className="stack" style={{ gap: 6 }}>
        <h1 style={{ fontSize: 36 }}>Usluge</h1>
        <p className="muted">Sef, konsignacija i otkup. Upiši cenu i vodi status, korisnik ga vidi u kolekciji.</p>
      </div>
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
                      <input className="inp" name="quote" placeholder={r.quoted_cents ? money(r.quoted_cents) : 'Cena RSD'} style={{ minHeight: 36, width: 110 }} />
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
