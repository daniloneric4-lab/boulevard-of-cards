import Link from 'next/link';
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import SubmitButton from '@/components/SubmitButton';
import { clearNotifications, deleteNotification, markAllRead, markRead } from '@/app/_act/market';
import { NOTIF, date, money } from '@/lib/format';

export const metadata: Metadata = { title: 'Obaveštenja' };
export const dynamic = 'force-dynamic';

const GROUPS: Record<string, string[]> = {
  aukcije: ['outbid', 'auction_won', 'auction_sold', 'auction_unsold'],
  izvlacenja: ['draw_won', 'draw_waitlist'],
  poruke: ['offer_received', 'counter_offer', 'offer_accepted', 'trade_received', 'message'],
  porudzbine: ['sold', 'shipped', 'payout_ready'],
};

export default async function Notifications({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f = 'sve' } = await searchParams;
  const { supabase, user } = await requireUser('/obavestenja');
  let q = supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100);
  if (f === 'neprocitano') q = q.is('read_at', null);
  else if (GROUPS[f]) q = q.in('type', GROUPS[f]);
  const { data } = await q;
  const list = data ?? [];
  const unread = list.filter((n) => !n.read_at).length;

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <div className="row between">
        <div className="stack" style={{ gap: 6 }}>
          <span className="kicker">{unread ? `${unread} nepročitanih` : 'Sve je pročitano'}</span>
          <h1 style={{ fontSize: 'clamp(30px,4vw,48px)' }}>Obaveštenja</h1>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {unread ? (
            <form action={markAllRead}>
              <SubmitButton className="btn btn-ghost">Označi sve kao pročitano</SubmitButton>
            </form>
          ) : null}
          {list.some((n) => n.read_at) ? (
            <form action={clearNotifications}>
              <input type="hidden" name="mode" value="read" />
              <SubmitButton className="btn btn-ghost" pendingText="Brišem…">
                Obriši pročitana
              </SubmitButton>
            </form>
          ) : null}
          {list.length ? (
            <details className="del-confirm">
              <summary className="btn btn-ghost">Obriši sva</summary>
              <form action={clearNotifications}>
                <input type="hidden" name="mode" value="all" />
                <SubmitButton className="btn btn-red btn-sm" pendingText="Brišem…">
                  Da, obriši sva obaveštenja
                </SubmitButton>
              </form>
            </details>
          ) : null}
        </div>
      </div>
      <div className="chips">
        {[
          ['sve', 'Sve'],
          ['neprocitano', 'Nepročitano'],
          ['aukcije', 'Aukcije'],
          ['izvlacenja', 'Izvlačenja'],
          ['poruke', 'Ponude i poruke'],
          ['porudzbine', 'Porudžbine'],
        ].map(([k, l]) => (
          <Link key={k} href={`/obavestenja?f=${k}`} className={'chip' + (f === k ? ' on' : '')}>
            {l}
          </Link>
        ))}
      </div>
      {list.length ? (
        <div className="list">
          {list.map((n) => {
            const def = NOTIF[n.type] ?? { title: n.type };
            const p = (n.payload ?? {}) as Record<string, string>;
            const href = def.href?.(p);
            return (
              <div key={n.id} className="list-row" style={!n.read_at ? { background: '#fff7f6', margin: '0 -12px', padding: '14px 12px', borderRadius: 12 } : undefined}>
                <span className="ava" style={{ width: 40, height: 40, background: n.priority >= 2 ? 'var(--bc-red)' : 'var(--bc-carbon)', fontSize: 16 }} aria-hidden="true">
                  {n.priority >= 2 ? '!' : '•'}
                </span>
                <div className="stack" style={{ gap: 2, flex: 1 }}>
                  <b>{def.title}</b>
                  <span className="muted" style={{ fontSize: 13 }}>
                    {[p.username ? '@' + p.username : null, p.title, p.amount_cents ? money(Number(p.amount_cents)) : null, p.price_cents ? money(Number(p.price_cents), p.currency) : null, p.position ? `mesto ${p.position}` : null, p.tracking ? `praćenje ${p.tracking}` : null].filter(Boolean).join(' · ')}
                  </span>
                  <span className="mono muted" style={{ fontSize: 12 }}>
                    {date(n.created_at, true)}
                  </span>
                </div>
                {href ? (
                  <Link href={href} className="btn btn-sm btn-dark">
                    Otvori
                  </Link>
                ) : null}
                <form action={markRead}>
                  <input type="hidden" name="id" value={n.id} />
                  <input type="hidden" name="unread" value={n.read_at ? '1' : '0'} />
                  <button className="btn btn-sm btn-ghost" aria-label={n.read_at ? 'Označi kao nepročitano' : 'Označi kao pročitano'}>
                    {n.read_at ? '○' : '✓'}
                  </button>
                </form>
                <form action={deleteNotification}>
                  <input type="hidden" name="id" value={n.id} />
                  <button className="btn btn-sm btn-ghost" aria-label={`Obriši obaveštenje: ${def.title}`} title="Obriši">
                    🗑
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty">
          <span className="empty-t">Nema obaveštenja</span>
          <span className="muted">Nova obaveštenja stižu ovde i na e-poštu, kako podesiš.</span>
        </div>
      )}
      <div className="card stack">
        <span className="muted" style={{ fontSize: 14 }}>
          Obaveštenja o nadlicitiranju i izvlačenju stižu odmah. Ostala dobijaš jednom dnevno, da te ne zatrpavamo.
        </span>
        <Link href="/podesavanja#obavestenja" className="lnk">
          Sva podešavanja obaveštenja →
        </Link>
      </div>
    </div>
  );
}
