'use client';
import { useActionState } from 'react';
import { addWish } from '@/app/_act/market';

export default function WishForm({ catalogId, query, compact = false }: { catalogId?: string; query?: string; compact?: boolean }) {
  const [state, run, pending] = useActionState(addWish, { ok: false, msg: '' });
  return (
    <form action={run} className="stack" style={{ gap: 10 }}>
      {catalogId ? <input type="hidden" name="catalog_id" value={catalogId} /> : null}
      {!catalogId ? (
        <label className="fld">
          Šta tražiš?
          <input className="inp" name="query" defaultValue={query} placeholder="npr. Jokić Chrome rookie" required />
        </label>
      ) : (
        <input type="hidden" name="query" value={query ?? ''} />
      )}
      {!compact ? (
        <label className="fld">
          Javi mi kad je ispod (RSD)
          <input className="inp" name="max_price" inputMode="decimal" placeholder="nije obavezno" />
        </label>
      ) : null}
      <button className="btn btn-dark" disabled={pending} style={{ alignSelf: 'flex-start' }}>
        {pending ? 'Dodajem…' : 'Dodaj na listu želja'}
      </button>
      {state.msg ? (
        <span role="status" style={{ fontSize: 13, color: state.ok ? 'var(--bc-green)' : '#8a1c13' }}>
          {state.msg}
        </span>
      ) : null}
    </form>
  );
}
