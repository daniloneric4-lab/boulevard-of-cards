import { createClient } from '@/lib/supabase/server';
import ActionForm from '@/components/ActionForm';
import SubmitButton from '@/components/SubmitButton';
import { deleteCatalog, saveCatalog } from '../actions';
import { SPORTS, sportLabel } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AdminCatalog() {
  const supabase = await createClient();
  const { data: cards } = await supabase.from('card_catalog').select('*').order('created_at', { ascending: false }).limit(200);
  return (
    <>
      <div className="stack" style={{ gap: 6 }}>
        <h1 style={{ fontSize: 36 }}>Katalog kartica</h1>
        <p className="muted">Kartice iz kataloga korisnici dodaju u kolekciju, na listu želja i vezuju za oglase.</p>
      </div>
      <details className="box" open>
        <summary>+ Nova kartica</summary>
        <ActionForm action={saveCatalog} submit="Dodaj u katalog" style={{ marginTop: 12 }}>
          <div className="row">
            <label className="fld">
              Sport
              <select className="inp" name="sport" defaultValue="football">
                {SPORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="fld">
              Godina
              <input className="inp" name="year" required placeholder="2026" />
            </label>
            <label className="fld" style={{ flex: 1 }}>
              Set
              <input className="inp" name="set_name" required placeholder="Topps Chrome F1" />
            </label>
            <label className="fld">
              Broj
              <input className="inp" name="card_number" />
            </label>
          </div>
          <div className="row">
            <label className="fld" style={{ flex: 1 }}>
              Igrač / vozač
              <input className="inp" name="player" required />
            </label>
            <label className="fld" style={{ flex: 1 }}>
              Tim
              <input className="inp" name="team" />
            </label>
            <label className="fld">
              Paralela
              <input className="inp" name="parallel" placeholder="Refractor" />
            </label>
            <label className="fld">
              Tiraž (/n)
              <input className="inp" name="print_run" type="number" min={1} />
            </label>
          </div>
          <div className="row">
            <label className="chk">
              <input type="checkbox" name="is_rookie" /> Rookie
            </label>
            <label className="chk">
              <input type="checkbox" name="is_autograph" /> Autogram
            </label>
          </div>
        </ActionForm>
      </details>
      {(cards ?? []).length ? (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Kartica</th>
                <th>Set</th>
                <th>Sport</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(cards ?? []).map((c) => (
                <tr key={c.id}>
                  <td>
                    <b>{c.player}</b> {c.parallel ? `· ${c.parallel}` : ''} {c.print_run ? `/${c.print_run}` : ''} {c.is_rookie ? <span className="pill">RC</span> : null} {c.is_autograph ? <span className="pill">AUTO</span> : null}
                  </td>
                  <td>
                    {c.year} {c.set_name} {c.card_number ? `#${c.card_number}` : ''}
                  </td>
                  <td>{sportLabel(c.sport)}</td>
                  <td>
                    <form action={deleteCatalog}>
                      <input type="hidden" name="id" value={c.id} />
                      <SubmitButton className="btn btn-sm btn-ghost">Obriši</SubmitButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
