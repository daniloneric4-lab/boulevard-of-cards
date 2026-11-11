import Link from 'next/link';
import type { Metadata } from 'next';
import { getSessionInfo } from '@/lib/supabase/server';
import CardArt from '@/components/CardArt';
import SubmitButton from '@/components/SubmitButton';
import { KIND, money, productImage } from '@/lib/format';
import { removeCartItem, updateCartQty } from '@/app/actions';
import Checkout from './Checkout';
import Steps from '@/components/Steps';

export const metadata: Metadata = { title: 'Korpa' };
export const dynamic = 'force-dynamic';

export default async function Cart() {
  const { supabase, user, profile } = await getSessionInfo();
  const [{ data: items }, { data: s }] = await Promise.all([
    supabase
      .from('cart_items')
      .select('id, quantity, products(id, name, kind, price_cents, currency, stock, mode, is_visible, image_path)')
      .eq('user_id', user!.id)
      .not('product_id', 'is', null)
      .order('created_at'),
    supabase.from('platform_settings').select('shipping_cents, free_shipping_from_cents, pay_window_hours, maintenance').eq('id', 1).single(),
  ]);

  type Row = { id: string; quantity: number; products: { id: string; name: string; kind: string; price_cents: number | null; currency: string; stock: number; mode: string; is_visible: boolean; image_path: string | null } | null };
  const rows = (items ?? []) as unknown as Row[];
  const n = rows.reduce((t, r) => t + r.quantity, 0);
  const subtotal = rows.reduce((t, r) => t + (r.products?.price_cents ?? 0) * r.quantity, 0);
  const freeFrom = s?.free_shipping_from_cents ?? null;
  const courier = freeFrom != null && subtotal >= freeFrom ? 0 : s?.shipping_cents ?? 0;
  const problems = rows.filter((r) => !r.products || !r.products.is_visible || r.products.mode !== 'in_stock' || r.products.stock < r.quantity);

  return (
    <div className="page">
      <div className="row between">
        <div className="stack" style={{ gap: 6 }}>
          <span className="kicker">Korpa i plaćanje</span>
          <h1 style={{ fontSize: 'clamp(30px,4vw,48px)' }}>Korpa{n ? ` · ${n} ${n === 1 ? 'stavka' : 'stavke'}` : ''}</h1>
        </div>
        <Steps at={0} />
      </div>
      {rows.length === 0 ? (
        <div className="empty">
          <span className="empty-t">Korpa je prazna</span>
          <span className="muted">Kutije, kartice i oprema koje dodaš pojaviće se ovde.</span>
          <Link href="/prodavnica" className="btn btn-red">
            U prodavnicu
          </Link>
        </div>
      ) : (
        <div className="side">
          <section className="stack">
            {rows.map((r) => {
              const p = r.products;
              const bad = !p || !p.is_visible || p.mode !== 'in_stock' || p.stock < r.quantity;
              const img = productImage(p?.image_path);
              return (
                <div key={r.id} className="cart-row">
                  <div className="cart-thumb">{img ? <img src={img} alt="" /> : <CardArt seed={p?.id ?? r.id} grade={p ? KIND[p.kind] ?? 'TOPPS' : ''} size="sm" />}</div>
                  <div className="stack" style={{ gap: 4, flex: '1 1 200px' }}>
                    <span className="pill" style={{ alignSelf: 'flex-start' }}>
                      {p ? KIND[p.kind] ?? p.kind : 'Nedostupno'}
                    </span>
                    <strong>{p?.name ?? 'Proizvod više nije dostupan'}</strong>
                    <span className="mono muted" style={{ fontSize: 13 }}>
                      {money(p?.price_cents, p?.currency)} / kom.
                    </span>
                    {bad && p ? (
                      <span style={{ color: '#8a1c13', fontSize: 13 }}>{p.mode !== 'in_stock' || !p.is_visible ? 'Trenutno nije dostupno' : `Na stanju je još ${p.stock} kom.`}</span>
                    ) : null}
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    <form action={updateCartQty}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="quantity" value={r.quantity - 1} />
                      <button className="qty-btn" aria-label={`Smanji količinu: ${p?.name ?? ''}`}>
                        −
                      </button>
                    </form>
                    <span className="mono" style={{ minWidth: 24, textAlign: 'center' }}>
                      {r.quantity}
                    </span>
                    <form action={updateCartQty}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="quantity" value={r.quantity + 1} />
                      <button className="qty-btn" aria-label={`Povećaj količinu: ${p?.name ?? ''}`}>
                        +
                      </button>
                    </form>
                  </div>
                  <b className="mono" style={{ minWidth: 110, textAlign: 'right' }}>
                    {money((p?.price_cents ?? 0) * r.quantity, p?.currency)}
                  </b>
                  <form action={removeCartItem}>
                    <input type="hidden" name="id" value={r.id} />
                    <SubmitButton className="qty-btn" pendingText="…">
                      <span aria-hidden="true">×</span>
                      <span className="sr-only">Izbaci iz korpe: {p?.name}</span>
                    </SubmitButton>
                  </form>
                </div>
              );
            })}
            <Link href="/prodavnica" className="lnk">
              ← Nastavi kupovinu
            </Link>
            <div className="card stack" style={{ marginTop: 8 }}>
              <b>Novac čeka dok ne potvrdiš prijem</b>
              <span className="muted" style={{ fontSize: 14 }}>
                Plaćaš preko platforme, pakujemo uz video, a porudžbinu pratiš u profilu.
              </span>
            </div>
          </section>
          <Checkout
            subtotal={subtotal}
            courier={courier}
            freeFrom={freeFrom}
            payHours={s?.pay_window_hours ?? 24}
            disabled={problems.length > 0 || !!s?.maintenance}
            note={s?.maintenance ? 'Sajt je u održavanju, porudžbine su pauzirane.' : problems.length ? 'Ispravi stavke označene crveno pre poručivanja.' : ''}
            defaults={{ name: profile?.display_name && profile.display_name !== profile.username ? profile.display_name : '', city: profile?.city ?? '' }}
          />
        </div>
      )}
    </div>
  );
}
