import { createClient } from '@/lib/supabase/server';
import ActionForm from '@/components/ActionForm';
import SubmitButton from '@/components/SubmitButton';
import { savePromo, togglePromo } from '../actions';
import { date } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AdminPromo() {
  const supabase = await createClient();
  const { data: codes } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false });
  return (
    <>
      <div className="stack" style={{ gap: 6 }}>
        <h1 style={{ fontSize: 36 }}>Kodovi za popust</h1>
        <p className="muted">Kupac upisuje kod u korpi. Popust važi na proizvode iz zvanične prodavnice, bez dostave.</p>
      </div>
      <ActionForm action={savePromo} submit="Sačuvaj kod" className="card row" style={{ alignItems: 'flex-end' }}>
        <label className="fld">
          Kod
          <input className="inp" name="code" required placeholder="BULEVAR10" style={{ textTransform: 'uppercase' }} />
        </label>
        <label className="fld">
          Popust (%)
          <input className="inp" name="percent" type="number" min={1} max={90} defaultValue={10} required />
        </label>
        <label className="fld">
          Važi do (nije obavezno)
          <input className="inp" name="expires_at" type="datetime-local" />
        </label>
        <label className="fld">
          Najviše korišćenja
          <input className="inp" name="max_uses" type="number" min={1} placeholder="bez ograničenja" />
        </label>
      </ActionForm>
      {(codes ?? []).length ? (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Kod</th>
                <th>Popust</th>
                <th>Iskorišćeno</th>
                <th>Važi do</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(codes ?? []).map((c) => (
                <tr key={c.code}>
                  <td className="mono">
                    <b>{c.code}</b>
                  </td>
                  <td>{c.percent}%</td>
                  <td className="mono">
                    {c.used_count}
                    {c.max_uses ? ` / ${c.max_uses}` : ''}
                  </td>
                  <td className="mono">{c.expires_at ? date(c.expires_at, true) : '—'}</td>
                  <td>{c.active ? <span className="pill pill-green">Aktivan</span> : <span className="pill">Ugašen</span>}</td>
                  <td>
                    <form action={togglePromo}>
                      <input type="hidden" name="code" value={c.code} />
                      <input type="hidden" name="active" value={c.active ? '0' : '1'} />
                      <SubmitButton className="btn btn-sm btn-ghost">{c.active ? 'Ugasi' : 'Uključi'}</SubmitButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="alert alert-info">Još nema kodova.</div>
      )}
    </>
  );
}
