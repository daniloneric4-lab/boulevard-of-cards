import Link from 'next/link';
import type { Metadata } from 'next';
import { getSessionInfo } from '@/lib/supabase/server';
import PageHero from '@/components/PageHero';
import Countdown from '@/components/Countdown';
import CardArt from '@/components/CardArt';
import Empty from '@/components/Empty';
import SubmitButton from '@/components/SubmitButton';
import { toggleReminder } from '@/app/_act/market';
import { date, money } from '@/lib/format';
import SlotPicker from './SlotPicker';

export const metadata: Metadata = { title: 'Live otvaranja' };
export const dynamic = 'force-dynamic';

export default async function Live() {
  const { supabase, user } = await getSessionInfo();
  const { data: events } = await supabase.from('live_events').select('*').order('starts_at', { ascending: true });
  const all = events ?? [];
  const now = Date.now();
  const next = all.find((e) => e.status === 'live') ?? all.find((e) => e.status !== 'ended' && new Date(e.starts_at).getTime() > now - 3 * 3600_000);
  const upcoming = all.filter((e) => e.id !== next?.id && e.status !== 'ended' && new Date(e.starts_at).getTime() > now);
  const recordings = all.filter((e) => e.recording_url).reverse();
  const [{ data: slots }, { data: pulls }, rem] = next
    ? await Promise.all([
        supabase.from('live_slots').select('label, status').eq('live_event_id', next.id).neq('status', 'cancelled'),
        supabase.from('live_pulls').select('id, card_name, note, pulled_at').eq('live_event_id', next.id).order('pulled_at', { ascending: false }).limit(8),
        user ? supabase.from('live_reminders').select('live_event_id').eq('live_event_id', next.id).eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
      ])
    : [{ data: [] }, { data: [] }, { data: null }];
  const isLive = next?.status === 'live';

  return (
    <>
      <PageHero
        title={next ? next.title : 'Live otvaranja'}
        badge={
          isLive ? (
            <>
              <span className="live-dot" style={{ background: '#fff' }} /> UŽIVO SADA
            </>
          ) : (
            'LIVE OTVARANJA'
          )
        }
        lead={next ? next.description || `Prenos na sajtu, Instagramu i TikToku · ${date(next.starts_at, true)}` : 'Otvaramo kutije uživo. Izvučena kartica se pojavljuje na ekranu u istom trenutku, sa vrednošću i dugmetom za ponudu.'}
      >
        {next ? (
          <div className="stack" style={{ gap: 12 }}>
            {!isLive ? <Countdown to={next.starts_at} /> : null}
            <div className="row">
              {next.stream_url ? (
                <a href={next.stream_url} target="_blank" rel="noreferrer" className="btn btn-red">
                  {isLive ? 'Gledaj prenos' : 'Link za prenos'}
                </a>
              ) : null}
              {user ? (
                <form action={toggleReminder}>
                  <input type="hidden" name="live_event_id" value={next.id} />
                  <input type="hidden" name="on" value={rem.data ? '1' : '0'} />
                  <SubmitButton className="btn btn-ghost">{rem.data ? '✓ Podsetnik uključen' : 'Podseti me'}</SubmitButton>
                </form>
              ) : (
                <Link href="/prijava?next=/live" className="btn btn-ghost">
                  Podseti me
                </Link>
              )}
            </div>
          </div>
        ) : null}
      </PageHero>
      <div className="page">
        {!next ? (
          <Empty title="Sledeći live još nije zakazan" text="Uključi obaveštenja i javićemo ti čim zakažemo otvaranje." href="/podesavanja" cta="Podesi obaveštenja" />
        ) : (
          <>
            <section className="stack">
              <h2>Upravo izvučeno</h2>
              {pulls && pulls.length ? (
                <div className="grid-tiles">
                  {pulls.map((p) => (
                    <div key={p.id} className="tile">
                      <CardArt seed={p.id} grade="LIVE" size="sm" />
                      <div className="tile-body">
                        <span className="tile-title">{p.card_name}</span>
                        {p.note ? <span className="muted" style={{ fontSize: 13 }}>{p.note}</span> : null}
                        <span className="mono muted" style={{ fontSize: 12 }}>
                          {date(p.pulled_at, true)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="alert alert-info">Izvučene kartice se ovde pojavljuju u istom trenutku kad izađu iz paketa.</div>
              )}
            </section>
            {next.slot_labels && next.slot_labels.length ? (
              <section className="card stack">
                <span className="kicker">Otvaranje po timovima</span>
                <h2>Kupi mesto u otvaranju</h2>
                <p className="muted">
                  Izabereš tim i dobijaš sve kartice tog tima iz kutija. Kartice šaljemo posle prenosa ili ostaju u tvojoj kolekciji i sefu.
                  {next.slot_price_cents ? ` Cena po mestu: ${money(next.slot_price_cents)}.` : ''}
                </p>
                <SlotPicker eventId={next.id} labels={next.slot_labels} taken={(slots ?? []).map((s) => s.label)} price={next.slot_price_cents} loggedIn={!!user} />
              </section>
            ) : null}
          </>
        )}
        {upcoming.length ? (
          <section className="stack">
            <h2>Raspored</h2>
            <div className="list">
              {upcoming.map((e) => (
                <div key={e.id} className="list-row">
                  <b style={{ flex: 1 }}>{e.title}</b>
                  {e.partner_name ? <span className="muted">{e.partner_name}</span> : null}
                  <span className="mono">{date(e.starts_at, true)}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
        {recordings.length ? (
          <section className="stack">
            <h2>Snimci otvaranja</h2>
            <div className="list">
              {recordings.map((e) => (
                <a key={e.id} href={e.recording_url!} target="_blank" rel="noreferrer" className="list-row" style={{ textDecoration: 'none' }}>
                  <b style={{ flex: 1 }}>{e.title}</b>
                  <span className="mono muted">{date(e.starts_at)}</span>
                  <span className="btn btn-sm btn-ghost">Pogledaj</span>
                </a>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
