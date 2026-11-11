'use client';
import { useActionState, useState } from 'react';
import { placeBid } from '@/app/_act/market';

export default function BidForm({ listingId, min, step }: { listingId: string; min: number; step: number }) {
  const [state, run, pending] = useActionState(placeBid, { ok: false, msg: '' });
  const [amt, setAmt] = useState(String(min / 100));
  const quick = [min, min + step, min + step * 3];
  return (
    <form action={run} className="stack" style={{ gap: 10 }}>
      <input type="hidden" name="listing_id" value={listingId} />
      <div className="row" style={{ gap: 6 }}>
        {quick.map((q) => (
          <button key={q} type="button" className="chip" onClick={() => setAmt(String(q / 100))}>
            {(q / 100).toLocaleString('sr-Latn-RS')} RSD
          </button>
        ))}
      </div>
      <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
        <label className="fld" style={{ flex: 1 }}>
          <span>Tvoja ponuda (RSD)</span>
          <input className="inp" name="amount" inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} required />
        </label>
        <button className="btn btn-red" disabled={pending} style={{ alignSelf: 'flex-end' }}>
          {pending ? 'Šaljem…' : 'Licitiraj'}
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
