'use client';
import { useActionState, useState } from 'react';
import { reserveSlot } from '@/app/_act/market';

export default function SlotPicker({ eventId, labels, taken, price, loggedIn }: { eventId: string; labels: string[]; taken: string[]; price: number | null; loggedIn: boolean }) {
  const [state, run, pending] = useActionState(reserveSlot, { ok: false, msg: '' });
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (l: string) => setPicked((p) => (p.includes(l) ? p.filter((x) => x !== l) : [...p, l]));
  return (
    <form action={run} className="stack">
      <input type="hidden" name="live_event_id" value={eventId} />
      <input type="hidden" name="price_cents" value={price ?? ''} />
      <div className="check-grid">
        {labels.map((l) => {
          const t = taken.includes(l);
          return (
            <label key={l} className="check-card" style={t ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}>
              <span className="row" style={{ gap: 8 }}>
                <input type="checkbox" name="label" value={l} disabled={t || !loggedIn} checked={picked.includes(l)} onChange={() => toggle(l)} />
                <b>{l}</b>
              </span>
              <span className="muted" style={{ fontSize: 12 }}>
                {t ? 'Zauzeto' : 'Slobodno'}
              </span>
            </label>
          );
        })}
      </div>
      <div className="row between">
        <span className="mono">
          {picked.length} {picked.length === 1 ? 'mesto' : 'mesta'}
          {price ? ` · ${((price * picked.length) / 100).toLocaleString('sr-Latn-RS')} RSD` : ''}
        </span>
        <button className="btn btn-red" disabled={pending || !picked.length || !loggedIn}>
          {pending ? 'Rezervišem…' : loggedIn ? 'Rezerviši mesta' : 'Prijavi se da rezervišeš'}
        </button>
      </div>
      {state.msg ? (
        <div className={'alert ' + (state.ok ? 'alert-ok' : 'alert-err')} role="status">
          {state.msg}
        </div>
      ) : null}
    </form>
  );
}
