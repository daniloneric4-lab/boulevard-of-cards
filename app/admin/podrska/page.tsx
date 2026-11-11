import { createClient } from '@/lib/supabase/server';
import SubmitButton from '@/components/SubmitButton';
import { setSupportStatus } from '../actions';
import { date } from '@/lib/format';

export const dynamic = 'force-dynamic';

const TOPIC: Record<string, string> = { order: 'Porudžbina', draw: 'Izvlačenje', auction: 'Aukcija', service: 'Usluge (sef, otkup)', dispute: 'Spor', other: 'Drugo' };

export default async function AdminSupport() {
  const supabase = await createClient();
  const [{ data: msgs }, { count: nl }] = await Promise.all([
    supabase.from('support_messages').select('*').order('created_at', { ascending: false }).limit(100),
    supabase.from('newsletter_signups').select('id', { count: 'exact', head: true }),
  ]);
  return (
    <>
      <div className="stack" style={{ gap: 6 }}>
        <h1 style={{ fontSize: 36 }}>Poruke podrške</h1>
        <p className="muted">Poruke sa stranice Pomoć. Odgovori na e-poštu pošiljaoca, pa označi kao odgovoreno. Upisanih na listu „Javi mi prvi“: {nl ?? 0}.</p>
      </div>
      {(msgs ?? []).length ? (
        <div className="list">
          {(msgs ?? []).map((m) => (
            <div key={m.id} className="list-row" style={{ alignItems: 'flex-start', opacity: m.status === 'open' ? 1 : 0.6 }}>
              <div className="stack" style={{ gap: 4, flex: 1 }}>
                <span className="row" style={{ gap: 8 }}>
                  <span className="pill">{TOPIC[m.topic] ?? m.topic}</span>
                  <a href={`mailto:${m.email}`} className="lnk">
                    {m.email}
                  </a>
                  <span className="mono muted" style={{ fontSize: 12 }}>
                    {date(m.created_at, true)}
                  </span>
                </span>
                <p style={{ whiteSpace: 'pre-line' }}>{m.message}</p>
              </div>
              {m.status === 'open' ? (
                <form action={setSupportStatus}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="status" value="answered" />
                  <SubmitButton className="btn btn-sm btn-dark">Odgovoreno</SubmitButton>
                </form>
              ) : (
                <span className="pill pill-green">Odgovoreno</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="alert alert-info">Nema poruka.</div>
      )}
    </>
  );
}
