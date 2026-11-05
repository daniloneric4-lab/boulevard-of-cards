'use client';
import { useActionState, useState } from 'react';
import { placeOrder } from '@/app/actions';
import { money, PAYMENT } from '@/lib/format';

export default function Checkout({ subtotal, courier, payHours, disabled, note }: { subtotal: number; courier: number; payHours: number; disabled: boolean; note: string }) {
  const [state, action, pending] = useActionState(placeOrder, { ok: false, msg: '' });
  const [shipping, setShipping] = useState('courier');
  const ship = shipping === 'courier' ? courier : 0;
  return (
    <form action={action} className="stack">
      <fieldset style={{ border: 0, padding: 0, margin: 0 }} className="stack">
        <legend style={{ fontWeight: 600, marginBottom: 8 }}>Dostava</legend>
        <label className="chk">
          <input type="radio" name="shipping" value="courier" checked={shipping === 'courier'} onChange={() => setShipping('courier')} />
          Kurirska služba ({courier ? money(courier) : 'besplatno'})
        </label>
        <label className="chk">
          <input type="radio" name="shipping" value="pickup" checked={shipping === 'pickup'} onChange={() => setShipping('pickup')} />
          Lično preuzimanje u Beogradu
        </label>
      </fieldset>
      <label className="fld">
        Plaćanje
        <select className="inp" name="payment" defaultValue="bank_transfer">
          {['bank_transfer', 'ips_qr', 'cash_on_delivery'].map((k) => (
            <option key={k} value={k}>
              {PAYMENT[k]}
            </option>
          ))}
        </select>
      </label>
      <div className="row between" style={{ borderTop: '1px solid var(--bc-line-dk)', paddingTop: 12 }}>
        <strong>Ukupno</strong>
        <strong className="mono">{money(subtotal + ship)}</strong>
      </div>
      <p style={{ fontSize: 13, color: 'var(--bc-gray-dk)' }}>
        Roba se rezerviše odmah. Uplatu treba izvršiti u roku od {payHours} h, inače se porudžbina otkazuje.
      </p>
      {note ? <div className="alert alert-err">{note}</div> : null}
      {state.msg && !state.ok ? <div className="alert alert-err" role="alert">{state.msg}</div> : null}
      <button className="btn btn-red" disabled={disabled || pending}>
        {pending ? 'Šaljem porudžbinu…' : 'Poruči'}
      </button>
    </form>
  );
}
