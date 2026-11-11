import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { PAYMENT, date, money } from '@/lib/format';
import Steps from '@/components/Steps';

export const metadata: Metadata = { title: 'Porudžbina primljena' };
export const dynamic = 'force-dynamic';

const PAY_TEXT: Record<string, [string, string]> = {
  ips_qr: ['Plati IPS QR kodom', 'IPS QR kod sa iznosom i pozivom na broj šaljemo u obaveštenja i na e-poštu. Skeniraš ga u aplikaciji svoje banke i uplata se potvrđuje za nekoliko sekundi.'],
  bank_transfer: ['Plati uplatnicom', 'Podatke za uplatu (račun i poziv na broj) šaljemo u obaveštenja i na e-poštu. Rezervacija važi do roka za uplatu.'],
  cash_on_delivery: ['Plaćaš pouzećem', 'Plaćaš kuriru pri preuzimanju. Ne moraš ništa da uplaćuješ unapred.'],
  card: ['Plaćanje karticom', 'Otvara se sigurna stranica banke za unos kartice.'],
};

export default async function OrderDone({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser(`/korpa/potvrda/${id}`);
  const { data: o } = await supabase.from('orders').select('id, status, amount_cents, shipping_cents, discount_cents, promo_code, currency, payment_method, shipping, pay_deadline, created_at, ship_name, ship_address, order_items(title, quantity, unit_price_cents)').eq('id', id).maybeSingle();
  if (!o) notFound();
  const total = o.amount_cents + o.shipping_cents - (o.discount_cents ?? 0);
  const [pt, px] = PAY_TEXT[o.payment_method ?? 'ips_qr'] ?? PAY_TEXT.ips_qr;
  const paid = !['pending_payment', 'cancelled'].includes(o.status);
  const TRACK: [string, string, boolean][] = [
    ['Porudžbina primljena', date(o.created_at, true), true],
    [o.payment_method === 'cash_on_delivery' ? 'Plaćanje pri preuzimanju' : 'Uplata', paid ? 'Potvrđena' : `Do ${date(o.pay_deadline, true)}`, paid],
    ['Pakovanje uz video', 'Snimak stiže u poruke pre slanja', ['shipped', 'delivered', 'completed'].includes(o.status)],
    [o.shipping === 'pickup' ? 'Spremno za preuzimanje' : 'Poslato kurirom', 'Broj za praćenje dobijaš u obaveštenjima', ['shipped', 'delivered', 'completed'].includes(o.status)],
    ['Potvrdi prijem', 'U profilu, kad paket stigne', o.status === 'completed'],
  ];

  return (
    <div className="page" style={{ maxWidth: 1100 }}>
      <div className="row between">
        <span className="kicker">Porudžbina #BOC-{o.id.slice(0, 8).toUpperCase()}</span>
        <Steps at={2} />
      </div>
      <h1 style={{ fontSize: 'clamp(30px,4vw,48px)' }}>Hvala, porudžbina je primljena.</h1>
      <div className="side">
        <div className="stack" style={{ gap: 20 }}>
          <section className="card-dark stack">
            <h3>{pt}</h3>
            <p style={{ color: 'var(--bc-line)' }}>{px}</p>
            <div className="kv">
              <div>
                <span>Iznos</span>
                <b>{money(total, o.currency)}</b>
              </div>
              <div>
                <span>Način</span>
                <b style={{ fontSize: 16 }}>{o.payment_method ? PAYMENT[o.payment_method] : '—'}</b>
              </div>
              {o.payment_method !== 'cash_on_delivery' ? (
                <div>
                  <span>Rok</span>
                  <b style={{ fontSize: 16 }}>{date(o.pay_deadline, true)}</b>
                </div>
              ) : null}
            </div>
          </section>
          <section className="stack">
            <h2>Šta sledi</h2>
            <ol className="track">
              {TRACK.map(([t, sub, done]) => (
                <li key={t} className={done ? 'done' : undefined}>
                  <b>{t}</b>
                  <span className="muted" style={{ fontSize: 13 }}>
                    {sub}
                  </span>
                </li>
              ))}
            </ol>
          </section>
          <div className="row">
            <Link href="/profil" className="btn btn-dark">
              Prati porudžbinu
            </Link>
            <Link href="/prodavnica" className="btn btn-ghost">
              Nastavi kupovinu
            </Link>
          </div>
        </div>
        <aside className="card stack">
          <h3>Stavke</h3>
          {(o.order_items ?? []).map((i, k) => (
            <div key={k} className="row between" style={{ fontSize: 14 }}>
              <span>
                {i.quantity} × {i.title}
              </span>
              <span className="mono">{money(i.unit_price_cents * i.quantity)}</span>
            </div>
          ))}
          <div className="row between" style={{ fontSize: 14 }}>
            <span>Dostava</span>
            <span className="mono">{o.shipping_cents ? money(o.shipping_cents) : 'besplatno'}</span>
          </div>
          {o.discount_cents ? (
            <div className="row between" style={{ fontSize: 14 }}>
              <span>Popust {o.promo_code}</span>
              <span className="mono">− {money(o.discount_cents)}</span>
            </div>
          ) : null}
          <div className="row between" style={{ borderTop: '1px solid var(--bc-line)', paddingTop: 10 }}>
            <b>Ukupno</b>
            <b className="mono">{money(total)}</b>
          </div>
          {o.ship_name ? (
            <span className="muted" style={{ fontSize: 13 }}>
              {o.ship_name}
              {o.ship_address ? ` · ${o.ship_address}` : ' · lično preuzimanje'}
            </span>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
