import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ORDER_STATUS, date, money } from '@/lib/format';

export default async function AdminHome() {
  const supabase = await createClient();
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const [{ data: orders }, { count: users }, { count: products }, { data: recent }] = await Promise.all([
    supabase.from('orders').select('amount_cents, shipping_cents, status').gte('created_at', since),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_visible', true),
    supabase.from('orders').select('id, status, amount_cents, shipping_cents, currency, created_at, profiles!orders_buyer_id_fkey(username)').order('created_at', { ascending: false }).limit(8),
  ]);
  const paid = (orders ?? []).filter((o) => !['pending_payment', 'cancelled', 'refunded'].includes(o.status));
  const revenue = paid.reduce((t, o) => t + o.amount_cents + o.shipping_cents, 0);
  const waiting = (orders ?? []).filter((o) => o.status === 'pending_payment').length;

  return (
    <>
      <h1 style={{ fontSize: 'clamp(28px,4vw,40px)' }}>Pregled</h1>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}>
        <div className="stat">
          <span className="muted">Promet, 30 dana</span>
          <b>{money(revenue)}</b>
        </div>
        <div className="stat">
          <span className="muted">Porudžbine, 30 dana</span>
          <b>{orders?.length ?? 0}</b>
        </div>
        <div className="stat">
          <span className="muted">Čeka uplatu</span>
          <b>{waiting}</b>
        </div>
        <div className="stat">
          <span className="muted">Korisnici</span>
          <b>{users ?? 0}</b>
        </div>
        <div className="stat">
          <span className="muted">Proizvodi u prodaji</span>
          <b>{products ?? 0}</b>
        </div>
      </div>
      <div className="row between">
        <h2>Poslednje porudžbine</h2>
        <Link href="/admin/porudzbine" className="btn btn-ghost btn-sm">
          Sve porudžbine
        </Link>
      </div>
      {recent && recent.length ? (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Kupac</th>
                <th>Iznos</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.id}>
                  <td className="mono">{date(o.created_at, true)}</td>
                  <td>@{(o.profiles as unknown as { username: string } | null)?.username ?? '—'}</td>
                  <td className="mono">{money(o.amount_cents + o.shipping_cents, o.currency)}</td>
                  <td>{ORDER_STATUS[o.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="alert alert-info">Još nema porudžbina.</div>
      )}
    </>
  );
}
