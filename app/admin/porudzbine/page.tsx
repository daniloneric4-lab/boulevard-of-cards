import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ORDER_STATUS, PAYMENT, date, money } from '@/lib/format';
import ActionForm from '@/components/ActionForm';
import { updateOrder } from '../actions';

const FILTERS: [string, string][] = [
  ['aktivne', 'Za obradu'],
  ['pending_payment', 'Čeka uplatu'],
  ['paid', 'Plaćeno'],
  ['shipped', 'Poslato'],
  ['sve', 'Sve'],
];

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f = 'aktivne' } = await searchParams;
  const supabase = await createClient();
  let q = supabase
    .from('orders')
    .select('id, status, is_official, amount_cents, shipping_cents, currency, shipping, payment_method, tracking_number, pay_deadline, created_at, buyer:profiles!orders_buyer_id_fkey(username, display_name, city), order_items(title, quantity, unit_price_cents)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (f === 'aktivne') q = q.in('status', ['pending_payment', 'paid', 'shipped']);
  else if (f !== 'sve') q = q.eq('status', f);
  const { data: orders, error } = await q;

  return (
    <>
      <h1 style={{ fontSize: 'clamp(28px,4vw,40px)' }}>Porudžbine</h1>
      <div className="chips">
        {FILTERS.map(([k, v]) => (
          <Link key={k} href={`/admin/porudzbine?f=${k}`} className={'chip' + (f === k ? ' on' : '')}>
            {v}
          </Link>
        ))}
      </div>
      {error ? <div className="alert alert-err">{error.message}</div> : null}
      {orders && orders.length ? (
        <div className="stack">
          {orders.map((o) => {
            const buyer = o.buyer as unknown as { username: string; display_name: string | null; city: string | null } | null;
            return (
              <div key={o.id} className="card stack">
                <div className="row between" style={{ alignItems: 'flex-start' }}>
                  <div className="stack" style={{ gap: 4 }}>
                    <strong>
                      @{buyer?.username} {buyer?.city ? <span className="muted">· {buyer.city}</span> : null}
                    </strong>
                    <span className="mono muted" style={{ fontSize: 12 }}>
                      {date(o.created_at, true)} · #{o.id.slice(0, 8)} · {o.is_official ? 'Zvanična prodavnica' : 'Tržište'}
                    </span>
                    {(o.order_items ?? []).map((i, k) => (
                      <span key={k} style={{ fontSize: 14 }}>
                        {i.quantity} × {i.title} <span className="mono muted">({money(i.unit_price_cents)})</span>
                      </span>
                    ))}
                  </div>
                  <div className="stack" style={{ gap: 4, alignItems: 'flex-end' }}>
                    <span className="price">{money(o.amount_cents + o.shipping_cents, o.currency)}</span>
                    <span className="muted" style={{ fontSize: 13 }}>
                      {o.payment_method ? PAYMENT[o.payment_method] : '—'} · {o.shipping === 'pickup' ? 'Lično preuzimanje' : 'Kurir'}
                    </span>
                    <span className={'pill ' + (o.status === 'pending_payment' ? 'pill-red' : '')}>{ORDER_STATUS[o.status]}</span>
                    {o.status === 'pending_payment' && o.pay_deadline ? (
                      <span className="muted" style={{ fontSize: 12 }}>
                        Rok za uplatu {date(o.pay_deadline, true)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <ActionForm action={updateOrder} submit="Sačuvaj status" className="row" style={{ alignItems: 'flex-end' }}>
                  <input type="hidden" name="id" value={o.id} />
                  <label className="fld">
                    Status
                    <select className="inp" name="status" defaultValue={o.status}>
                      {Object.entries(ORDER_STATUS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="fld" style={{ flex: '1 1 200px' }}>
                    Broj za praćenje
                    <input className="inp" name="tracking" defaultValue={o.tracking_number ?? ''} />
                  </label>
                </ActionForm>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="alert alert-info">Nema porudžbina za ovaj filter.</div>
      )}
    </>
  );
}
