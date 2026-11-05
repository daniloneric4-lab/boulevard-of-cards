import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { money } from '@/lib/format';
import { removeCartItem, updateCartQty } from '@/app/actions';
import Checkout from './Checkout';

export const metadata: Metadata = { title: 'Korpa' };
export const dynamic = 'force-dynamic';

export default async function Cart() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: items }, { data: s }] = await Promise.all([
    supabase
      .from('cart_items')
      .select('id, quantity, products(id, name, price_cents, currency, stock, mode, is_visible)')
      .eq('user_id', user!.id)
      .not('product_id', 'is', null)
      .order('created_at'),
    supabase.from('platform_settings').select('shipping_cents, free_shipping_from_cents, pay_window_hours, maintenance').eq('id', 1).single(),
  ]);

  type Row = { id: string; quantity: number; products: { id: string; name: string; price_cents: number | null; currency: string; stock: number; mode: string; is_visible: boolean } | null };
  const rows = (items ?? []) as unknown as Row[];
  const subtotal = rows.reduce((t, r) => t + (r.products?.price_cents ?? 0) * r.quantity, 0);
  const freeFrom = s?.free_shipping_from_cents ?? null;
  const courier = freeFrom != null && subtotal >= freeFrom ? 0 : s?.shipping_cents ?? 0;
  const problems = rows.filter((r) => !r.products || !r.products.is_visible || r.products.mode !== 'in_stock' || r.products.stock < r.quantity);

  return (
    <div className="wrap section stack" style={{ gap: 24 }}>
      <h1 style={{ fontSize: 'clamp(28px,4vw,44px)' }}>Korpa</h1>
      {rows.length === 0 ? (
        <div className="stack">
          <div className="alert alert-info">Korpa je prazna.</div>
          <Link href="/prodavnica" className="btn btn-red" style={{ alignSelf: 'flex-start' }}>
            Idi u prodavnicu
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', alignItems: 'start' }}>
          <div className="stack">
            {rows.map((r) => {
              const p = r.products;
              const bad = !p || !p.is_visible || p.mode !== 'in_stock' || p.stock < r.quantity;
              return (
                <div key={r.id} className="card row between" style={{ alignItems: 'flex-start' }}>
                  <div className="stack" style={{ gap: 4, flex: '1 1 200px' }}>
                    <strong>{p?.name ?? 'Proizvod više nije dostupan'}</strong>
                    <span className="mono muted" style={{ fontSize: 13 }}>
                      {money(p?.price_cents, p?.currency)} / kom.
                    </span>
                    {bad && p ? (
                      <span style={{ color: '#8a1c13', fontSize: 13 }}>
                        {p.mode !== 'in_stock' || !p.is_visible ? 'Trenutno nije dostupno' : `Na stanju je još ${p.stock} kom.`}
                      </span>
                    ) : null}
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <form action={updateCartQty} className="row" style={{ gap: 6 }}>
                      <input type="hidden" name="id" value={r.id} />
                      <label>
                        <span style={{ position: 'absolute', left: -9999 }}>Količina</span>
                        <input className="inp" type="number" name="quantity" min={1} max={50} defaultValue={r.quantity} style={{ width: 80 }} />
                      </label>
                      <button className="btn btn-ghost btn-sm">Promeni</button>
                    </form>
                    <form action={removeCartItem}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="btn btn-ghost btn-sm">Ukloni</button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="card-dark stack">
            <h2>Porudžbina</h2>
            <div className="row between">
              <span>Proizvodi</span>
              <span className="mono">{money(subtotal)}</span>
            </div>
            <Checkout
              subtotal={subtotal}
              courier={courier}
              payHours={s?.pay_window_hours ?? 24}
              disabled={problems.length > 0 || !!s?.maintenance}
              note={s?.maintenance ? 'Sajt je u održavanju, porudžbine su pauzirane.' : problems.length ? 'Ispravi stavke označene crveno pre poručivanja.' : ''}
            />
          </div>
        </div>
      )}
    </div>
  );
}
