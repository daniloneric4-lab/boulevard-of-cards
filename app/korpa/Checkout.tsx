'use client';
import { useActionState, useState, useTransition } from 'react';
import { checkPromo, placeOrder } from '@/app/actions';
import { money } from '@/lib/format';

const SHIPS: [string, string, string][] = [
  ['courier', 'Kurir do vrata', 'Srbija · 1–2 radna dana'],
  ['pickup', 'Preuzimanje u Beogradu', 'Bez troška · uz najavu'],
];
const PAYS: [string, string, string, boolean][] = [
  ['ips_qr', 'IPS QR', 'Skeniraš u aplikaciji banke', true],
  ['bank_transfer', 'Uplatnica', 'Rezervacija važi do roka za uplatu', true],
  ['cash_on_delivery', 'Pouzećem', 'Plaćaš kuriru pri preuzimanju', true],
  ['card', 'Platna kartica', 'Uskoro', false],
];

export default function Checkout({
  subtotal,
  courier,
  freeFrom,
  payHours,
  disabled,
  note,
  defaults,
}: {
  subtotal: number;
  courier: number;
  freeFrom: number | null;
  payHours: number;
  disabled: boolean;
  note: string;
  defaults: { name: string; city: string };
}) {
  const [state, action, pending] = useActionState(placeOrder, { ok: false, msg: '' });
  const [ship, setShip] = useState('courier');
  const [pay, setPay] = useState('ips_qr');
  const [promo, setPromo] = useState('');
  const [pct, setPct] = useState<number | null>(null);
  const [promoMsg, setPromoMsg] = useState('');
  const [checking, start] = useTransition();
  const shipCost = ship === 'courier' ? courier : 0;
  const disc = pct ? Math.round((subtotal * pct) / 100) : 0;
  const total = subtotal + shipCost - disc;

  return (
    <form action={action} className="stack" style={{ gap: 20 }}>
      <input type="hidden" name="promo" value={pct ? promo : ''} />
      <section className="card stack">
        <h3>Kod za popust</h3>
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <label className="sr-only" htmlFor="promo">
            Kod za popust
          </label>
          <input
            id="promo"
            className="inp"
            value={promo}
            onChange={(e) => {
              setPromo(e.target.value.toUpperCase());
              setPct(null);
              setPromoMsg('');
            }}
            placeholder="npr. BULEVAR10"
          />
          <button
            type="button"
            className="btn btn-dark"
            disabled={checking || promo.trim().length < 3}
            onClick={() =>
              start(async () => {
                const p = await checkPromo(promo);
                setPct(p);
                setPromoMsg(p ? `Popust ${p}% je primenjen ✓` : 'Kod nije važeći ili je istekao.');
              })
            }
          >
            {checking ? '…' : 'Primeni'}
          </button>
        </div>
        {promoMsg ? (
          <span role="status" style={{ fontSize: 13, color: pct ? 'var(--bc-green)' : '#8a1c13' }}>
            {promoMsg}
          </span>
        ) : null}
      </section>

      <section className="card stack">
        <h3>Dostava</h3>
        <div className="check-grid">
          {SHIPS.map(([k, l, sub]) => (
            <label key={k} className="check-card">
              <span className="row" style={{ gap: 8 }}>
                <input type="radio" name="shipping" value={k} checked={ship === k} onChange={() => setShip(k)} /> <b>{l}</b>
              </span>
              <span className="muted" style={{ fontSize: 12 }}>
                {sub}
                {k === 'courier' ? ` · ${courier ? money(courier) : 'besplatno'}` : ''}
              </span>
            </label>
          ))}
        </div>
        {freeFrom && ship === 'courier' && subtotal < freeFrom ? (
          <span className="muted" style={{ fontSize: 13 }}>
            Besplatna dostava za porudžbine od {money(freeFrom)}.
          </span>
        ) : null}
        <div className="row" style={{ gap: 10 }}>
          <label className="fld" style={{ flex: '1 1 200px' }}>
            Ime i prezime
            <input className="inp" name="name" required minLength={3} defaultValue={defaults.name} autoComplete="name" />
          </label>
          <label className="fld" style={{ flex: '1 1 160px' }}>
            Telefon
            <input className="inp" name="phone" required type="tel" autoComplete="tel" placeholder="06x xxx xxxx" />
          </label>
        </div>
        {ship === 'courier' ? (
          <div className="row" style={{ gap: 10 }}>
            <label className="fld" style={{ flex: '2 1 240px' }}>
              Adresa
              <input className="inp" name="address" required minLength={5} autoComplete="street-address" />
            </label>
            <label className="fld" style={{ flex: '1 1 140px' }}>
              Grad i poštanski broj
              <input className="inp" name="city" required defaultValue={defaults.city} autoComplete="address-level2" />
            </label>
          </div>
        ) : null}
      </section>

      <section className="card stack">
        <h3>Plaćanje</h3>
        <div className="check-grid">
          {PAYS.map(([k, l, sub, on]) => (
            <label key={k} className="check-card" style={on ? undefined : { opacity: 0.5, cursor: 'not-allowed' }}>
              <span className="row" style={{ gap: 8 }}>
                <input type="radio" name="payment" value={k} checked={pay === k} disabled={!on} onChange={() => setPay(k)} /> <b>{l}</b>
              </span>
              <span className="muted" style={{ fontSize: 12 }}>
                {sub}
              </span>
            </label>
          ))}
        </div>
        <span className="muted" style={{ fontSize: 13 }}>
          Roba se rezerviše odmah. Uplata u roku od {payHours} h, inače se porudžbina otkazuje.
        </span>
      </section>

      <section className="card-dark stack">
        <h3>Pregled</h3>
        {[
          ['Proizvodi', money(subtotal)],
          ['Dostava', shipCost ? money(shipCost) : 'besplatno'],
          ['Popust', disc ? `− ${money(disc)}` : '—'],
        ].map(([k, v]) => (
          <div key={k} className="row between">
            <span style={{ color: 'var(--bc-line)' }}>{k}</span>
            <span className="mono">{v}</span>
          </div>
        ))}
        <div className="row between" style={{ borderTop: '1px solid var(--bc-line-dk)', paddingTop: 12 }}>
          <strong>Plaćaš</strong>
          <strong className="mono" style={{ fontSize: 22 }}>
            {money(total)}
          </strong>
        </div>
        {note ? <div className="alert alert-err">{note}</div> : null}
        {state.msg && !state.ok ? (
          <div className="alert alert-err" role="alert">
            {state.msg}
          </div>
        ) : null}
        <button className="btn btn-red" disabled={disabled || pending} style={{ minHeight: 52 }}>
          {pending ? 'Šaljem porudžbinu…' : `Poruči · ${PAYS.find((p) => p[0] === pay)?.[1]}`}
        </button>
        <span style={{ fontSize: 12, color: 'var(--bc-gray-dk)' }}>Cene su do vrata. Novac je zaštićen dok ne potvrdiš prijem.</span>
      </section>
    </form>
  );
}
