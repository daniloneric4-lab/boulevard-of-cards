import { createClient } from '@/lib/supabase/server';
import ActionForm from '@/components/ActionForm';
import AutoFixInput from '@/components/AutoFixInput';
import SubmitButton from '@/components/SubmitButton';
import { addPull, saveLive, setSlotStatus } from '../actions';
import { date } from '@/lib/format';

export const dynamic = 'force-dynamic';

const local = (d: string | null) => (d ? new Date(new Date(d).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');

function LiveFields({ e }: { e?: Record<string, unknown> }) {
  const g = (k: string) => (e?.[k] as string) ?? '';
  return (
    <>
      {e ? <input type="hidden" name="id" value={g('id')} /> : null}
      <label className="fld">
        Naziv
        <AutoFixInput className="inp" name="title" defaultValue={g('title')} required placeholder="2× 2026 Topps Midnight Football Hobby" />
      </label>
      <label className="fld">
        Opis
        <input className="inp" name="description" defaultValue={g('description')} />
      </label>
      <div className="row">
        <label className="fld">
          Početak
          <input className="inp" type="datetime-local" name="starts_at" defaultValue={local((e?.starts_at as string) ?? null)} required />
        </label>
        <label className="fld">
          Status
          <select className="inp" name="status" defaultValue={g('status') || 'scheduled'}>
            <option value="scheduled">Zakazano</option>
            <option value="live">Uživo sada</option>
            <option value="ended">Završeno</option>
          </select>
        </label>
        <label className="fld">
          Partner
          <input className="inp" name="partner_name" defaultValue={g('partner_name')} />
        </label>
      </div>
      <div className="row">
        <label className="fld" style={{ flex: 1 }}>
          Link prenosa (Instagram/TikTok/YouTube)
          <input className="inp" name="stream_url" defaultValue={g('stream_url')} />
        </label>
        <label className="fld" style={{ flex: 1 }}>
          Link snimka
          <input className="inp" name="recording_url" defaultValue={g('recording_url')} />
        </label>
      </div>
      <div className="row">
        <label className="fld" style={{ flex: 2 }}>
          Mesta za otvaranje po timovima (odvoji zarezom)
          <input className="inp" name="slot_labels" defaultValue={((e?.slot_labels as string[]) ?? []).join(', ')} placeholder="Tim 1, Tim 2, Tim 3" />
        </label>
        <label className="fld" style={{ flex: 1 }}>
          Cena po mestu (RSD)
          <input className="inp" name="slot_price" inputMode="decimal" defaultValue={e?.slot_price_cents ? String(Number(e.slot_price_cents) / 100) : ''} />
        </label>
      </div>
    </>
  );
}

export default async function AdminLive() {
  const supabase = await createClient();
  const { data: events } = await supabase.from('live_events').select('*, live_slots(id, label, status, profiles(username)), live_pulls(id)').order('starts_at', { ascending: false });
  return (
    <>
      <div className="stack" style={{ gap: 6 }}>
        <h1 style={{ fontSize: 36 }}>Live otvaranja</h1>
        <p className="muted">Zakaži prenos, otvori mesta po timovima i upisuj izvučene kartice uživo.</p>
      </div>
      <details className="box" open={!(events ?? []).length}>
        <summary>+ Novi live</summary>
        <ActionForm action={saveLive} submit="Sačuvaj live" style={{ marginTop: 12 }}>
          <LiveFields />
        </ActionForm>
      </details>
      {(events ?? []).map((e) => {
        const slots = (e.live_slots ?? []) as { id: string; label: string; status: string; profiles: { username: string } | { username: string }[] | null }[];
        return (
          <section key={e.id} className="card stack">
            <div className="row between">
              <b style={{ fontSize: 17 }}>{e.title}</b>
              <span className="mono muted">
                {date(e.starts_at, true)} · {e.status} · {(e.live_pulls ?? []).length} izvučenih
              </span>
            </div>
            <ActionForm action={addPull} submit="Upiši izvučenu karticu" className="row" btn="btn btn-red">
              <input type="hidden" name="live_event_id" value={e.id} />
              <input className="inp" name="card_name" placeholder="Rookie autogram · ime igrača" style={{ flex: 2 }} />
              <input className="inp" name="note" placeholder="Za koga / napomena" style={{ flex: 1 }} />
            </ActionForm>
            {slots.length ? (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Mesto</th>
                      <th>Kupac</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {slots.map((s) => (
                      <tr key={s.id}>
                        <td>{s.label}</td>
                        <td>@{Array.isArray(s.profiles) ? s.profiles[0]?.username : s.profiles?.username}</td>
                        <td>{s.status === 'paid' ? 'Plaćeno' : s.status === 'cancelled' ? 'Otkazano' : 'Rezervisano'}</td>
                        <td className="row" style={{ gap: 6 }}>
                          {s.status === 'reserved' ? (
                            <>
                              <form action={setSlotStatus}>
                                <input type="hidden" name="id" value={s.id} />
                                <input type="hidden" name="status" value="paid" />
                                <SubmitButton className="btn btn-sm btn-dark">Plaćeno</SubmitButton>
                              </form>
                              <form action={setSlotStatus}>
                                <input type="hidden" name="id" value={s.id} />
                                <input type="hidden" name="status" value="cancelled" />
                                <SubmitButton className="btn btn-sm btn-ghost">Otkaži</SubmitButton>
                              </form>
                            </>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            <details className="box">
              <summary>Izmeni</summary>
              <ActionForm action={saveLive} submit="Sačuvaj" style={{ marginTop: 12 }}>
                <LiveFields e={e} />
              </ActionForm>
            </details>
          </section>
        );
      })}
    </>
  );
}
