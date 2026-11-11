import Link from 'next/link';
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import Avatar from '@/components/Avatar';
import SettingsForm from './SettingsForm';

export const metadata: Metadata = { title: 'Podešavanja naloga' };
export const dynamic = 'force-dynamic';

export default async function Settings() {
  const { supabase, user, profile } = await requireUser('/podesavanja');
  const [{ data: full }, { data: st }] = await Promise.all([
    supabase.from('profiles').select('username, display_name, city, country, bio, collects, avatar_url, is_verified').eq('id', user.id).single(),
    supabase.from('user_settings').select('script, sports, notify_email, notify_push, notify_prefs').eq('user_id', user.id).maybeSingle(),
  ]);
  return (
    <div className="page" style={{ maxWidth: 1100 }}>
      <div className="row" style={{ gap: 16 }}>
        <Avatar name={profile?.username} url={full?.avatar_url} size={64} />
        <div className="stack" style={{ gap: 4 }}>
          <span className="kicker">Nalog · @{full?.username}</span>
          <h1 style={{ fontSize: 'clamp(30px,4vw,48px)' }}>Podešavanja</h1>
        </div>
      </div>
      <div className="side">
        <SettingsForm
          p={{
            username: full?.username ?? '',
            display_name: full?.display_name ?? '',
            city: full?.city ?? '',
            country: full?.country ?? 'RS',
            bio: full?.bio ?? '',
            collects: full?.collects ?? '',
          }}
          s={{
            script: st?.script ?? 'latin',
            sports: st?.sports ?? [],
            notify_email: st?.notify_email ?? true,
            notify_push: st?.notify_push ?? true,
            prefs: (st?.notify_prefs as Record<string, boolean>) ?? {},
          }}
        />
        <aside className="stack">
          <section className="card stack">
            <h3>Bezbednost</h3>
            <span className="muted" style={{ fontSize: 14 }}>
              Prijavljen kao {user.email}
            </span>
            <Link href="/profil/lozinka" className="btn btn-ghost" style={{ alignSelf: 'flex-start' }}>
              Promeni lozinku
            </Link>
          </section>
          <section id="isplata" className="card stack">
            <h3>Isplata za prodaju</h3>
            <span className="muted" style={{ fontSize: 14 }}>
              Isplata stiže sledećeg radnog dana posle potvrde kupca. Podatke računa čuva platni procesor, ne mi. Povezivanje računa otvaramo sa prvim prodavcima.
            </span>
          </section>
          <section className="card stack">
            <h3>Verifikacija prodavca</h3>
            {full?.is_verified ? (
              <span className="pill pill-green" style={{ alignSelf: 'flex-start' }}>
                ✓ Verifikovan prodavac
              </span>
            ) : (
              <>
                <span className="muted" style={{ fontSize: 14 }}>
                  Verifikovani prodavci dobijaju oznaku na profilu, više poverenja kupaca i isplatu bez zadržavanja.
                </span>
                <Link href="/pomoc#kontakt" className="btn btn-dark" style={{ alignSelf: 'flex-start' }}>
                  Zatraži verifikaciju
                </Link>
              </>
            )}
          </section>
          <Link href="/pocetak" className="lnk">
            Promeni šta skupljam (sportovi, timovi, igrači) →
          </Link>
        </aside>
      </div>
    </div>
  );
}
