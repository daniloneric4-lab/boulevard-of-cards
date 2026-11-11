import { createClient } from '@/lib/supabase/server';
import ActionForm from '@/components/ActionForm';
import SubmitButton from '@/components/SubmitButton';
import { runDraw, saveDraw, setDrawStatus, setEntryStatus } from '../actions';
import { DRAW_STATUS, date, money } from '@/lib/format';

export const dynamic = 'force-dynamic';

const ENTRY: Record<string, string> = { entered: 'Prijavljen', won: 'Izvučen', lost: 'Nije izvučen', waitlist: 'Rezerva', paid: 'Platio', forfeited: 'Isteklo' };

export default async function AdminDraws() {
  const supabase = await createClient();
  const [{ data: draws }, { data: releases }] = await Promise.all([
    supabase.from('draws').select('*, releases(name), draw_entries(id, status, waitlist_position, pay_deadline, open_for_me, profiles(username))').order('created_at', { ascending: false }),
    supabase.from('releases').select('id, name, release_date').order('release_date', { ascending: true, nullsFirst: false }),
  ]);
  return (
    <>
      <div className="stack" style={{ gap: 6 }}>
        <h1 style={{ fontSize: 36 }}>Izvlačenja</h1>
        <p className="muted">Otvori prijave, zatvori ih, izvuci kupce nasumično i prati uplate. Izvučeni imaju rok za uplatu, posle toga mesto ide sledećem sa rezervne liste.</p>
      </div>
      <details className="box" open={!(draws ?? []).length}>
        <summary>+ Novo izvlačenje</summary>
        <ActionForm action={saveDraw} submit="Napravi izvlačenje" style={{ marginTop: 12 }}>
          <label className="fld">
            Izdanje
            <select className="inp" name="release_id" required defaultValue="">
              <option value="" disabled>
                Izaberi izdanje
              </option>
              {(releases ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.release_date ? `· ${r.release_date}` : ''}
                </option>
              ))}
            </select>
          </label>
          <div className="row">
            <label className="fld">
              Prijave od
              <input className="inp" type="datetime-local" name="opens_at" required />
            </label>
            <label className="fld">
              Prijave do
              <input className="inp" type="datetime-local" name="closes_at" required />
            </label>
            <label className="fld">
              Izvlačenje (uživo)
              <input className="inp" type="datetime-local" name="draw_at" />
            </label>
          </div>
          <div className="row">
            <label className="fld">
              Broj kutija
              <input className="inp" name="boxes_available" type="number" min={1} defaultValue={10} />
            </label>
            <label className="fld">
              Po osobi
              <input className="inp" name="max_per_user" type="number" min={1} defaultValue={1} />
            </label>
            <label className="fld">
              Cena po kutiji (RSD)
              <input className="inp" name="price" inputMode="decimal" />
            </label>
            <label className="fld">
              Rok za uplatu (h)
              <input className="inp" name="pay_window_hours" type="number" min={1} defaultValue={24} />
            </label>
            <label className="fld">
              Status
              <select className="inp" name="status" defaultValue="scheduled">
                <option value="scheduled">Uskoro</option>
                <option value="open">Prijave otvorene</option>
              </select>
            </label>
          </div>
        </ActionForm>
      </details>
      {(draws ?? []).map((d) => {
        const r = Array.isArray(d.releases) ? d.releases[0] : d.releases;
        const entries = (d.draw_entries ?? []) as { id: string; status: string; waitlist_position: number | null; pay_deadline: string | null; open_for_me: boolean; profiles: { username: string } | { username: string }[] | null }[];
        const winners = entries.filter((e) => ['won', 'paid', 'forfeited'].includes(e.status));
        const wait = entries.filter((e) => e.status === 'waitlist').sort((a, b) => (a.waitlist_position ?? 0) - (b.waitlist_position ?? 0));
        const u = (e: (typeof entries)[number]) => (Array.isArray(e.profiles) ? e.profiles[0]?.username : e.profiles?.username);
        return (
          <section key={d.id} className="card stack">
            <div className="row between">
              <div className="stack" style={{ gap: 2 }}>
                <b style={{ fontSize: 17 }}>{r?.name}</b>
                <span className="muted" style={{ fontSize: 13 }}>
                  {d.boxes_available} kutija · {entries.length} prijavljenih · {money(d.price_cents, d.currency)} · prijave {date(d.opens_at, true)} – {date(d.closes_at, true)}
                </span>
              </div>
              <span className="pill pill-dark">{DRAW_STATUS[d.status]}</span>
            </div>
            <div className="row">
              {d.status === 'scheduled' ? (
                <form action={setDrawStatus}>
                  <input type="hidden" name="id" value={d.id} />
                  <input type="hidden" name="status" value="open" />
                  <SubmitButton className="btn btn-sm btn-dark">Otvori prijave</SubmitButton>
                </form>
              ) : null}
              {d.status === 'open' ? (
                <form action={setDrawStatus}>
                  <input type="hidden" name="id" value={d.id} />
                  <input type="hidden" name="status" value="closed" />
                  <SubmitButton className="btn btn-sm btn-dark">Zatvori prijave</SubmitButton>
                </form>
              ) : null}
              {['open', 'closed'].includes(d.status) ? (
                <form action={runDraw}>
                  <input type="hidden" name="id" value={d.id} />
                  <SubmitButton className="btn btn-sm btn-red" pendingText="Izvlačim…">Izvuci kupce nasumično</SubmitButton>
                </form>
              ) : null}
              {d.status === 'drawn' ? (
                <form action={setDrawStatus}>
                  <input type="hidden" name="id" value={d.id} />
                  <input type="hidden" name="status" value="finished" />
                  <SubmitButton className="btn btn-sm btn-ghost">Završi izvlačenje</SubmitButton>
                </form>
              ) : null}
            </div>
            {winners.length ? (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Kupac</th>
                      <th>Želi</th>
                      <th>Rok</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {winners.map((e) => (
                      <tr key={e.id}>
                        <td>@{u(e)}</td>
                        <td>{e.open_for_me ? 'Otvori za mene' : 'Zapečaćena'}</td>
                        <td className="mono">{date(e.pay_deadline, true)}</td>
                        <td>{ENTRY[e.status]}</td>
                        <td>
                          {e.status === 'won' ? (
                            <div className="row" style={{ gap: 6 }}>
                              <form action={setEntryStatus}>
                                <input type="hidden" name="id" value={e.id} />
                                <input type="hidden" name="status" value="paid" />
                                <SubmitButton className="btn btn-sm btn-dark">Platio</SubmitButton>
                              </form>
                              <form action={setEntryStatus}>
                                <input type="hidden" name="id" value={e.id} />
                                <input type="hidden" name="status" value="forfeit" />
                                <SubmitButton className="btn btn-sm btn-ghost">Istekao rok → sledeći</SubmitButton>
                              </form>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {wait.length ? (
              <span className="muted" style={{ fontSize: 13 }}>
                Rezervna lista: {wait.map((e) => `${e.waitlist_position}. @${u(e)}`).join(', ')}
              </span>
            ) : null}
          </section>
        );
      })}
    </>
  );
}
