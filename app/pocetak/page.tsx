import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import SubmitButton from '@/components/SubmitButton';
import { saveOnboarding } from '@/app/_act/account';

export const metadata: Metadata = { title: 'Šta skupljaš?' };
export const dynamic = 'force-dynamic';

const SPORTS: [string, string, string][] = [
  ['football', 'Fudbal', 'Liga šampiona, Premijer liga, Bundesliga'],
  ['f1', 'F1', 'Chrome, Sapphire, Turbo Attax'],
  ['nba', 'NBA', 'Chrome, Flagship, Finest'],
  ['nfl', 'NFL', 'Chrome, Midnight, rookie klasa'],
  ['other', 'Oprema i ostalo', 'Toploaderi, sleeve-ovi, magnetni držači'],
];

export default async function Onboarding() {
  const { supabase, user } = await requireUser('/pocetak');
  const { data: st } = await supabase.from('user_settings').select('sports').eq('user_id', user.id).maybeSingle();
  const cur = st?.sports ?? [];
  return (
    <div className="page" style={{ maxWidth: 960 }}>
      <div className="row between">
        <span className="kicker">Prvi ulazak</span>
        <Link href="/" className="lnk">
          Preskoči za sada
        </Link>
      </div>
      <h1 style={{ fontSize: 'clamp(32px,5vw,56px)' }}>Šta skupljaš?</h1>
      <p className="muted" style={{ fontSize: 17 }}>
        Izaberi sportove i upiši igrače ili timove koje pratiš. Prilagodićemo ti početnu i javiti kad se pojavi nešto od toga.
      </p>
      <form action={saveOnboarding} className="stack" style={{ gap: 24 }}>
        <div className="check-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {SPORTS.map(([k, l, sub]) => (
            <label key={k} className="check-card" style={{ minHeight: 96 }}>
              <span className="row" style={{ gap: 8 }}>
                <input type="checkbox" name="sports" value={k} defaultChecked={cur.includes(k)} /> <b style={{ fontSize: 18 }}>{l}</b>
              </span>
              <span className="muted" style={{ fontSize: 13 }}>
                {sub}
              </span>
            </label>
          ))}
        </div>
        <label className="fld">
          Igrači, timovi ili setovi (odvoji zarezom)
          <input className="inp" name="follow" placeholder="npr. Jokić, Crvena zvezda, Chrome F1 Sapphire" />
        </label>
        <div className="card stack">
          <b>Javi mi kad se pojavi nešto od ovoga</b>
          <span className="muted" style={{ fontSize: 14 }}>
            Upisano ide na tvoju listu želja. Obaveštenja za izabrane igrače, timove i izlaske menjaš u podešavanjima.
          </span>
        </div>
        <SubmitButton className="btn btn-red">Na moj bulevar</SubmitButton>
      </form>
    </div>
  );
}
