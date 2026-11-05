'use client';
import { useActionState } from 'react';

type State = { ok: boolean; msg: string };

export default function ActionForm({
  action,
  children,
  submit,
  className = 'stack',
  style,
}: {
  action: (s: State, f: FormData) => Promise<State>;
  children: React.ReactNode;
  submit: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [state, run, pending] = useActionState(action, { ok: false, msg: '' });
  return (
    <form action={run} className={className} style={style}>
      {children}
      {state.msg ? (
        <div className={'alert ' + (state.ok ? 'alert-ok' : 'alert-err')} role="status">
          {state.msg}
        </div>
      ) : null}
      <button className="btn btn-dark" disabled={pending} style={{ alignSelf: 'flex-start' }}>
        {pending ? 'Čuvam…' : submit}
      </button>
    </form>
  );
}
