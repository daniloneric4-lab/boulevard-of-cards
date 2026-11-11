'use client';
import { useActionState } from 'react';
import { newsletter } from '@/app/_act/market';

export default function NewsletterForm({ source = 'home', dark = false }: { source?: string; dark?: boolean }) {
  const [state, run, pending] = useActionState(newsletter, { ok: false, msg: '' });
  if (state.ok)
    return (
      <span role="status" style={{ fontSize: 14, color: dark ? '#fff' : 'var(--bc-green)' }}>
        {state.msg}
      </span>
    );
  return (
    <form action={run} className="row" style={{ gap: 8, flexWrap: 'nowrap', width: '100%', maxWidth: 460 }}>
      <input type="hidden" name="source" value={source} />
      <label className="sr-only" htmlFor={'nl-' + source}>
        E-pošta
      </label>
      <input id={'nl-' + source} className="inp" type="email" name="email" required placeholder="tvoja@e-posta.rs" autoComplete="email" />
      <button className="btn btn-red" disabled={pending}>
        {pending ? '…' : 'Javi mi prvi'}
      </button>
      {state.msg ? (
        <span role="status" className="sr-only">
          {state.msg}
        </span>
      ) : null}
    </form>
  );
}
