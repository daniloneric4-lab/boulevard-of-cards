'use client';
import { useActionState, useState } from 'react';
import { writeReview } from '@/app/_act/market';

export default function ReviewForm({ orders }: { orders: { id: string; label: string }[] }) {
  const [state, run, pending] = useActionState(writeReview, { ok: false, msg: '' });
  const [r, setR] = useState(5);
  const words = ['', 'Loše', 'Slabo', 'Dobro', 'Vrlo dobro', 'Odlično'];
  return (
    <form action={run} className="stack">
      <label className="fld">
        Porudžbina
        <select className="inp" name="order_id" required defaultValue="">
          <option value="" disabled>
            Izaberi primljenu porudžbinu
          </option>
          {orders.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Ukupna ocena</legend>
        <div className="row" style={{ gap: 4 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} style={{ cursor: 'pointer', fontSize: 30, color: n <= r ? 'var(--bc-red)' : 'var(--bc-line)', minWidth: 44, minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <input type="radio" name="rating" value={n} checked={r === n} onChange={() => setR(n)} className="sr-only" />
              <span aria-hidden="true">★</span>
              <span className="sr-only">{n} od 5</span>
            </label>
          ))}
          <span className="muted" style={{ marginLeft: 8 }}>
            {words[r]}
          </span>
        </div>
      </fieldset>
      <label className="fld">
        Tvoj utisak
        <textarea className="inp" name="comment" maxLength={1500} placeholder="Kako je bilo pakovanje, brzina slanja, stanje kartice…" />
      </label>
      {state.msg ? <div className={'alert ' + (state.ok ? 'alert-ok' : 'alert-err')}>{state.msg}</div> : null}
      <button className="btn btn-red" disabled={pending} style={{ alignSelf: 'flex-start' }}>
        {pending ? 'Objavljujem…' : 'Objavi recenziju'}
      </button>
      <span className="muted" style={{ fontSize: 12 }}>
        Ime prikazujemo kao korisničko ime, bez prezimena.
      </span>
    </form>
  );
}
