import { createClient } from '@/lib/supabase/server';
import { date, money, sportLabel } from '@/lib/format';
import { reviewRelease, reviewReleaseUpdate } from '../actions';

const SALE: Record<string, string> = { preorder: 'Preorder', draw: 'Izvlačenje', order: 'Porudžbina', coming_soon: 'Uskoro' };

export default async function AdminReleases() {
  const supabase = await createClient();
  const [{ data: pending }, { data: updates }, { data: approved }] = await Promise.all([
    supabase.from('releases').select('id, name, sport, box_format, release_date, sale_type, us_price_cents, source_url, found_by').eq('review_status', 'pending').order('release_date'),
    supabase.from('release_updates').select('id, field, old_value, new_value, source_url, note, releases(name)').eq('status', 'pending').order('created_at'),
    supabase.from('releases').select('id, name, sport, box_format, release_date, sale_type').eq('review_status', 'approved').order('release_date', { ascending: false }).limit(40),
  ]);

  return (
    <>
      <h1 style={{ fontSize: 'clamp(28px,4vw,40px)' }}>Izdanja</h1>
      <p className="muted">Automatsko praćenje dva puta nedeljno pronalazi nova Topps izdanja. Ovde ih odobravaš pre nego što se pojave na sajtu.</p>

      <h2>Čeka odobrenje ({pending?.length ?? 0})</h2>
      {pending && pending.length ? (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Izdanje</th>
                <th>Sport</th>
                <th>Izlazi</th>
                <th>Prodaja</th>
                <th>Cena SAD</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pending.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.name}</strong>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {r.box_format}
                      {r.source_url ? (
                        <>
                          {' · '}
                          <a href={r.source_url} target="_blank" rel="noreferrer">
                            izvor
                          </a>
                        </>
                      ) : null}
                    </div>
                  </td>
                  <td>{sportLabel(r.sport)}</td>
                  <td className="mono">{date(r.release_date)}</td>
                  <td>{SALE[r.sale_type] ?? r.sale_type}</td>
                  <td className="mono">{r.us_price_cents ? money(r.us_price_cents, 'USD') : '—'}</td>
                  <td>
                    <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                      <form action={reviewRelease}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="approve" value="1" />
                        <button className="btn btn-red btn-sm">Odobri</button>
                      </form>
                      <form action={reviewRelease}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="approve" value="0" />
                        <button className="btn btn-ghost btn-sm">Odbij</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="alert alert-info">Nema novih izdanja za odobrenje.</div>
      )}

      <h2>Predlozi izmena ({updates?.length ?? 0})</h2>
      {updates && updates.length ? (
        <div className="stack">
          {updates.map((u) => (
            <div key={u.id} className="card row between">
              <div className="stack" style={{ gap: 4 }}>
                <strong>{(u.releases as unknown as { name: string } | null)?.name}</strong>
                <span className="mono" style={{ fontSize: 13 }}>
                  {u.field}: {u.old_value ?? '—'} → {u.new_value}
                </span>
                {u.note ? <span className="muted" style={{ fontSize: 13 }}>{u.note}</span> : null}
              </div>
              <div className="row" style={{ gap: 6 }}>
                <form action={reviewReleaseUpdate}>
                  <input type="hidden" name="id" value={u.id} />
                  <input type="hidden" name="approve" value="1" />
                  <button className="btn btn-red btn-sm">Prihvati</button>
                </form>
                <form action={reviewReleaseUpdate}>
                  <input type="hidden" name="id" value={u.id} />
                  <input type="hidden" name="approve" value="0" />
                  <button className="btn btn-ghost btn-sm">Odbij</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="alert alert-info">Nema predloga izmena.</div>
      )}

      <h2>Odobrena izdanja</h2>
      <div className="tbl-wrap">
        <table className="tbl">
          <tbody>
            {(approved ?? []).map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{sportLabel(r.sport)}</td>
                <td>{r.box_format}</td>
                <td className="mono">{date(r.release_date)}</td>
                <td>{SALE[r.sale_type] ?? r.sale_type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
