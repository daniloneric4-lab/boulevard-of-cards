'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function NewPassword() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const pw = String(new FormData(e.currentTarget).get('password') || '');
    if (pw.length < 8) return setMsg({ ok: false, text: 'Lozinka mora imati bar 8 znakova.' });
    const { error } = await createClient().auth.updateUser({ password: pw });
    if (error) setMsg({ ok: false, text: error.message });
    else {
      setMsg({ ok: true, text: 'Lozinka je promenjena.' });
      setTimeout(() => router.replace('/profil'), 1200);
    }
  }
  return (
    <div className="wrap section" style={{ maxWidth: 520 }}>
      <form onSubmit={submit} className="card stack">
        <h2>Nova lozinka</h2>
        <label className="fld">
          Nova lozinka
          <input className="inp" type="password" name="password" minLength={8} required autoComplete="new-password" />
        </label>
        {msg ? <div className={'alert ' + (msg.ok ? 'alert-ok' : 'alert-err')}>{msg.text}</div> : null}
        <button className="btn btn-red">Sačuvaj lozinku</button>
      </form>
    </div>
  );
}
