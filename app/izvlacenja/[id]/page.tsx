import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionInfo } from '@/lib/supabase/server';
import CardArt from '@/components/CardArt';
import Countdown from '@/components/Countdown';
import SubmitButton from '@/components/SubmitButton';
import { enterDraw, leaveDraw } from '@/app/_act/market';
import { DRAW_STATUS, date, money, sportLabel } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Draw({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionInfo();
  const { data: d } = await supabase
    .from('draws')
    .select('*, releases(name, sport, box_format, description, release_date)')
    .eq('id', id)
    .maybeSingle();
  if (!d) notFound();
  const r = Array.isArray(d.releases) ? d.releases[0] : d.releases;
  const [{ data: count }, mine, { data: winners }] = await Promise.all([
    supabase.rpc('draw_entry_count', { p_draw_id: id }),
    user ? supabase.from('draw_entries').select('*').eq('draw_id', id).eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.rpc('draw_winners', { p_draw_id: id }),
  ]);
  const entry = mine.data as { status: string; open_for_me: boolean; waitlist_position: number | null; pay_deadline: string | null } | null;
  const now = Date.now();
  const isOpen = d.status === 'open' && now >= new Date(d.opens_at).getTime() && now <= new Date(d.closes_at).getTime();

  return (
    <div className="page">
      <Link href="/izvlacenja" className="lnk">
        ← Sva izvlačenja
      </Link>
      <div className="two">
        <CardArt seed={d.id} grade="SEALED" size="lg" label={r?.name ?? 'Kutija'} />
        <div className="stack" style={{ gap: 20 }}>
          <div className="row" style={{ gap: 8 }}>
            <span className="pill pill-red">IZVLAČENJE</span>
            <span className="pill">{sportLabel(r?.sport)}</span>
            {r?.box_format ? <span className="pill">{r.box_format}</span> : null}
            <span className="pill pill-dark">{DRAW_STATUS[d.status]}</span>
          </div>
          <h1 style={{ fontSize: 'clamp(30px,4vw,48px)' }}>{r?.name}</h1>
          <p className="muted" style={{ fontSize: 16 }}>
            {r?.description || 'Kutija stiže u maloj količini. Prijava je besplatna, a kupce bira nasumično izvlačenje uživo. Plaćaš samo ako budeš izvučen.'}
          </p>
          <div className="kv">
            <div>
              <span>Cena po kutiji</span>
              <b>{money(d.price_cents, d.currency)}</b>
            </div>
            <div>
              <span>Kutija</span>
              <b>{d.boxes_available}</b>
            </div>
            <div>
              <span>Prijavljenih</span>
              <b>{count ?? 0}</b>
            </div>
            <div>
              <span>Po osobi</span>
              <b>{d.max_per_user ?? 1}</b>
            </div>
          </div>
          <div className="card stack light">
            <span className="muted" style={{ fontSize: 13 }}>
              {d.status === 'scheduled' ? `Prijave se otvaraju ${date(d.opens_at, true)}` : `Prijave se zatvaraju ${date(d.closes_at, true)}`}
            </span>
            <Countdown to={d.status === 'scheduled' ? d.opens_at : d.closes_at} />
          </div>

          {!user ? (
            <Link href={`/prijava?next=/izvlacenja/${id}`} className="btn btn-red">
              Prijavi se za izvlačenje · besplatno
            </Link>
          ) : entry ? (
            entry.status === 'won' ? (
              <div className="card-dark stack">
                <h3>Izvučen si!</h3>
                <p>
                  Imaš do {date(entry.pay_deadline, true)} da platiš {money(d.price_cents, d.currency)}. Uputstvo za uplatu (IPS QR ili račun) je u obaveštenjima, a posle tog roka mesto ide sledećem na rezervnoj listi.
                </p>
                <Link href="/obavestenja" className="btn btn-red" style={{ alignSelf: 'flex-start' }}>
                  Uputstvo za uplatu
                </Link>
              </div>
            ) : entry.status === 'paid' ? (
              <div className="alert alert-ok">Uplata je potvrđena. Kutija ti stiže uz video pakovanja.</div>
            ) : entry.status === 'waitlist' ? (
              <div className="alert alert-info">Ovaj put nisi izvučen. Na rezervnoj si listi kao broj {entry.waitlist_position}. Ako neko ne plati u roku, kutija ide tebi.</div>
            ) : entry.status === 'lost' || entry.status === 'forfeited' ? (
              <div className="alert alert-info">Ovaj put nisi izvučen. Srećno sledeći put!</div>
            ) : (
              <div className="card stack">
                <b>Prijavljen si{entry.open_for_me ? ' · otvaramo kutiju za tebe' : ' · zapečaćena kutija'}</b>
                <span className="muted">Izvlačenje je {date(d.draw_at ?? d.closes_at, true)}, uživo na Instagramu. Obaveštenje stiže čim se izvlačenje završi.</span>
                {isOpen ? (
                  <form action={leaveDraw}>
                    <input type="hidden" name="draw_id" value={id} />
                    <SubmitButton className="btn btn-ghost btn-sm">Odjavi se</SubmitButton>
                  </form>
                ) : null}
              </div>
            )
          ) : isOpen ? (
            <form action={enterDraw} className="stack">
              <input type="hidden" name="draw_id" value={id} />
              <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
                <legend style={{ fontWeight: 600, marginBottom: 8 }}>Ako budem izvučen, želim:</legend>
                <div className="check-grid">
                  <label className="check-card">
                    <span className="row" style={{ gap: 8 }}>
                      <input type="radio" name="open_for_me" value="0" defaultChecked /> <b>Zapečaćenu kutiju</b>
                    </span>
                    <span className="muted" style={{ fontSize: 13 }}>
                      Šaljemo uz video pakovanja
                    </span>
                  </label>
                  <label className="check-card">
                    <span className="row" style={{ gap: 8 }}>
                      <input type="radio" name="open_for_me" value="1" /> <b>Otvori za mene</b>
                    </span>
                    <span className="muted" style={{ fontSize: 13 }}>
                      Uživo ili na snimku, kartice u kolekciji
                    </span>
                  </label>
                </div>
              </fieldset>
              <SubmitButton className="btn btn-red">Prijavi se za izvlačenje · besplatno</SubmitButton>
              <span className="muted" style={{ fontSize: 13 }}>
                Jedna prijava po nalogu. <Link href="/pomoc" className="lnk">Pravila izvlačenja</Link> su javna.
              </span>
            </form>
          ) : (
            <div className="alert alert-info">{d.status === 'scheduled' ? 'Prijave još nisu otvorene.' : 'Prijave su zatvorene.'}</div>
          )}
        </div>
      </div>

      {winners && winners.length ? (
        <section className="stack">
          <h2>Izvučeni</h2>
          <div className="chips">
            {winners.map((w: { username: string }) => (
              <Link key={w.username} href={`/u/${w.username}`} className="chip">
                @{w.username}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
