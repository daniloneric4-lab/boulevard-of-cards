import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AuthForm from './AuthForm';

export const metadata: Metadata = { title: 'Log in / Sign up' };

const PERKS = [
  'Kupovina iz zvanične prodavnice i od kolekcionara, uz zaštitu novca',
  'Besplatne prijave za izvlačenja retkih kutija',
  'Aukcije, ponude i razmena direktno iz poruka',
  'Tvoja kolekcija, lista želja i vitrina za deljenje',
];

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; greska?: string; mode?: string }> }) {
  const { next, greska, mode } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const dest = next && next.startsWith('/') && !next.startsWith('//') ? next : mode === 'signup' ? '/pocetak' : '/kolekcija';
  if (user) redirect(dest);
  return (
    <div className="wrap section auth-grid">
      <div className="stack" style={{ gap: 18 }}>
        <span className="kicker">Nalog</span>
        <h1 style={{ fontSize: 'clamp(32px,5vw,56px)' }}>Uđi na bulevar.</h1>
        <p className="muted" style={{ fontSize: 17, maxWidth: 460 }}>
          Jedan nalog za kupovinu, izvlačenja, aukcije, vitrinu i chat sa kolekcionarima iz regiona.
        </p>
        <ul className="ticks">
          {PERKS.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>
      <div className="stack" style={{ gap: 16 }}>
        {greska ? <div className="alert alert-err">Link iz mejla je već iskorišćen ili je istekao. Ako si već kliknuo na njega, nalog je potvrđen i samo se prijavi ovde.</div> : null}
        <AuthForm next={dest} initial={mode === 'signup' ? 'signup' : 'login'} />
      </div>
    </div>
  );
}
