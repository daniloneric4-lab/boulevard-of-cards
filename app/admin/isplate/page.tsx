import { createClient } from '@/lib/supabase/server';
import SubmitButton from '@/components/SubmitButton';
import { payAllReady, setPayout } from '../actions';
import { date, money } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AdminPayouts() {
  const supabase = await createClient();
  const { data: payouts } = await supabase.from('payouts').select('*, seller:profiles!payouts_seller_id_fkey(username)').order('created_at', { ascending: false }).limit(200);
  const P = payouts ?? [];
  const sum = (st: string) => P.filter((p) => p.status === st).reduce((s, p) => s + p.amount_cents, 0);
  const one = <T,>(x: T | T[] | null): T | null => (Array.isArray(x) ? x[0] ?? null : x);
  return (
    <>
      <div className="stack" style={{ gap: 6 }}>
        <h1 style={{ fontSize: 36 }}>Isplate prodavcima</h1>
        <p className="muted">Isplata postaje spremna kad kupac potvrdi prijem. Iznos je već umanjen za proviziju.</p>
      </div>
      <div className="kv">
        <div>
          <span>Spremno</span>
          <b>{money(sum('ready'))}</b>
        </div>
        <div>
          <span>Zadržano</span>
          <b>{money(sum('held'))}</b>
        </div>
        <div>
          <span>Isplaćeno</span>
          <b>{money(sum('paid'))}</b>
        </div>
        <div>
          <span>Provizija ukupno</span>
          <b>{money(P.reduce((s, p) => s + (p.fee_cents ?? 0), 0))}</b>
        </div>
      </div>
      {sum('ready') > 0 ? (
        <form action={payAllReady}>
          <SubmitButton className="btn btn-red">Označi sve spremne kao isplaćene</SubmitButton>
        </form>
      ) : null}
      {P.length ? (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Prodavac</th>
                <th>Iznos</th>
                <th>Provizija</th>
                <th>Status</th>
                <th>Datum</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {P.map((p) => (
                <tr key={p.id}>
                  <td>@{one(p.seller as { username: string } | null)?.username}</td>
                  <td className="mono">{money(p.amount_cents, p.currency)}</td>
                  <td className="mono">{money(p.fee_cents, p.currency)}</td>
                  <td>
                    {p.status === 'ready' ? 'Spremno' : p.status === 'held' ? 'Zadržano' : 'Isplaćeno'}
                    {p.hold_reason ? <div className="muted" style={{ fontSize: 12 }}>{p.hold_reason}</div> : null}
                  </td>
                  <td className="mono">{date(p.paid_at ?? p.created_at)}</td>
                  <td className="row" style={{ gap: 6 }}>
                    {p.status !== 'paid' ? (
                      <form action={setPayout}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="status" value="paid" />
                        <SubmitButton className="btn btn-sm btn-dark">Isplaćeno</SubmitButton>
                      </form>
                    ) : null}
                    {p.status === 'ready' ? (
                      <form action={setPayout}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="status" value="held" />
                        <input type="hidden" name="note" value="Zadržano ručno" />
                        <SubmitButton className="btn btn-sm btn-ghost">Zadrži</SubmitButton>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="alert alert-info">Još nema isplata.</div>
      )}
    </>
  );
}
