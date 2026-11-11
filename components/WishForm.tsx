'use client';
import { useActionState } from 'react';
import { addWish } from '@/app/_act/market';
import AutoFixInput from './AutoFixInput';

export default function WishForm({ catalogId, query, compact = false, suggestions }: { catalogId?: string; query?: string; compact?: boolean; suggestions?: string[] }) {
  const [state, run, pending] = useActionState(addWish, { ok: false, msg: '' });
  return (
    <form action={run} className="stack" style={{ gap: 10 }}>
      {catalogId ? <input type="hidden" name="catalog_id" value={catalogId} /> : null}
      {!catalogId ? (
        <label className="fld">
          Šta tražiš?
          <AutoFixInput className="inp" name="query" defaultValue={query} placeholder="npr. Jokić Chrome Refractor /99" required list={suggestions?.length ? 'wish-suggest' : undefined} autoComplete="off" />
          {suggestions?.length ? (
            <datalist id="wish-suggest">
              {suggestions.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          ) : null}
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
