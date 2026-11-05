import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AuthForm from './AuthForm';

export const metadata: Metadata = { title: 'Prijava' };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; greska?: string }> }) {
  const { next, greska } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(next && next.startsWith('/') ? next : '/profil');
  return (
    <div className="wrap section" style={{ maxWidth: 520 }}>
      <div className="stack" style={{ gap: 20 }}>
        <div className="stack" style={{ gap: 8 }}>
          <span className="kicker">Nalog</span>
          <h1 style={{ fontSize: 'clamp(28px,4vw,44px)' }}>Uđi na Boulevard of Cards</h1>
        </div>
        {greska ? <div className="alert alert-err">Link za potvrdu nije važeći ili je istekao. Prijavi se ponovo.</div> : null}
        <AuthForm next={next && next.startsWith('/') ? next : '/profil'} />
      </div>
    </div>
  );
}
