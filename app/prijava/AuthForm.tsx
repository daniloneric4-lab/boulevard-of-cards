'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const ERR: Record<string, string> = {
  'Invalid login credentials': 'Pogrešna e-pošta ili lozinka. Ako ne možeš da se setiš lozinke, klikni „Zaboravljena lozinka“ i postavi novu.',
  'Email not confirmed': 'Nalog još nije potvrđen. Otvori mejl koji smo ti poslali i klikni na link, pa se prijavi.',
  'Email rate limit exceeded': 'Poslato je previše mejlova. Sačekaj nekoliko minuta pa pokušaj ponovo.',
  'Password should be at least 6 characters.': 'Lozinka mora imati bar 8 znakova.',
  'User already registered': 'Nalog sa ovom e-poštom već postoji. Prijavi se.',
};

export default function AuthForm({ next, initial = 'login' }: { next: string; initial?: 'login' | 'signup' }) {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get('email')).trim().toLowerCase();
    const password = String(f.get('password') || '');
    setBusy(true);
    setMsg(null);
    const origin = window.location.origin;
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg({ ok: false, text: ERR[error.message] ?? error.message });
      else {
        router.replace(next);
        router.refresh();
      }
    } else if (mode === 'signup') {
      const username = String(f.get('username') || '').trim().toLowerCase();
      if (password.length < 8) {
        setMsg({ ok: false, text: 'Lozinka mora imati bar 8 znakova.' });
        setBusy(false);
        return;
      }
      if (password !== String(f.get('password2') || '')) {
        setMsg({ ok: false, text: 'Lozinke se ne poklapaju. Upiši istu lozinku u oba polja.' });
        setBusy(false);
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`, data: { username, display_name: username } },
      });
      if (error) setMsg({ ok: false, text: ERR[error.message] ?? error.message });
      else if (data.user && (data.user.identities ?? []).length === 0) {
        setMode('login');
        setMsg({ ok: false, text: 'Nalog sa ovom e-poštom već postoji. Prijavi se lozinkom koju si tada upisao, ili klikni „Zaboravljena lozinka“.' });
      } else if (data.session) {
        router.replace(next);
        router.refresh();
      } else setMsg({ ok: true, text: `Nalog je napravljen. Poslali smo mejl na ${email}: klikni na link u njemu da potvrdiš nalog, pa se prijavi ovde. Ako ne vidiš mejl, pogledaj i Spam.` });
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback?next=/profil/lozinka` });
      setMsg(error ? { ok: false, text: error.message } : { ok: true, text: 'Ako nalog postoji, poslali smo link za novu lozinku.' });
    }
    setBusy(false);
  }

  return (
    <div className="card stack">
      <div className="chips" role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'login'} className={'chip' + (mode === 'login' ? ' on' : '')} onClick={() => setMode('login')}>
          Log in
        </button>
        <button type="button" role="tab" aria-selected={mode === 'signup'} className={'chip' + (mode === 'signup' ? ' on' : '')} onClick={() => setMode('signup')}>
          Sign up
        </button>
      </div>
      <form onSubmit={submit} className="stack">
        {mode === 'signup' ? (
          <label className="fld">
            Korisničko ime
            <input className="inp" name="username" required pattern="[a-zA-Z0-9_]{3,24}" title="3–24 slova, brojeva ili _" autoComplete="username" />
          </label>
        ) : null}
        <label className="fld">
          E-pošta
          <input className="inp" type="email" name="email" required autoComplete="email" />
        </label>
        {mode !== 'reset' ? (
          <label className="fld">
            Lozinka
            <span className="row" style={{ flexWrap: 'nowrap', gap: 8 }}>
              <input className="inp" type={showPw ? 'text' : 'password'} name="password" required minLength={mode === 'signup' ? 8 : 1} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowPw((v) => !v)} aria-pressed={showPw}>
                {showPw ? 'Sakrij' : 'Prikaži'}
              </button>
            </span>
          </label>
        ) : null}
        {mode === 'signup' ? (
          <label className="fld">
            Ponovi lozinku
            <input className="inp" type={showPw ? 'text' : 'password'} name="password2" required minLength={8} autoComplete="new-password" />
          </label>
        ) : null}
        {msg ? (
          <div className={'alert ' + (msg.ok ? 'alert-ok' : 'alert-err')} role="status">
            {msg.text}
          </div>
        ) : null}
        <button className="btn btn-red" disabled={busy}>
          {busy ? 'Sačekaj…' : mode === 'login' ? 'Prijavi se' : mode === 'signup' ? 'Napravi nalog' : 'Pošalji link'}
        </button>
        {mode === 'login' ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMode('reset')} style={{ alignSelf: 'flex-start' }}>
            Zaboravljena lozinka
          </button>
        ) : mode === 'reset' ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMode('login')} style={{ alignSelf: 'flex-start' }}>
            Nazad na prijavu
          </button>
        ) : null}
      </form>
    </div>
  );
}
