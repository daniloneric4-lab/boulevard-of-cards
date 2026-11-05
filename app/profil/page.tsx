import type { Metadata } from 'next';
import Link from 'next/link';
import { getSessionInfo } from '@/lib/supabase/server';
import { ORDER_STATUS, PAYMENT, date, money } from '@/lib/format';
import { signOut } from '@/app/actions';
import ProfileForm from './ProfileForm';

export const metadata: Metadata = { title: 'Profil' };
export const dynamic = 'force-dynamic';

export default async function Profile({ searchParams }: { searchParams: Promise<{ porudzbina?: string }> }) {
  const { porudzbina } = await searchParams;
  const { supabase, user, profile, isAdmin } = await getSessionInfo();
  const [{ data: orders }, { data: settings }, { data: full }] = await Promise.all([
    supabase
      .from('orders')
      .select('id, status, amount_cents, shipping_cents, currency, payment_method, pay_deadline, tracking_number, created_at, order_items(title, quantity, unit_price_cents)')
      .eq('buyer_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase.from('user_settings').select('script, sports, notify_email, notify_push').eq('user_id', user!.id).maybeSingle(),
    supabase.from('profiles').select('bio').eq('id', user!.id).single(),
  ]);

  return (
    <div className="wrap section stack" style={{ gap: 32 }}>
      <div className="row between">
        <div className="stack" style={{ gap: 6 }}>
          <span className="kicker">Profil</span>
          <h1 style={{ fontSize: 'clamp(28px,4vw,44px)' }}>{profile?.display_name || profile?.username}</h1>
          <span className="mono muted" style={{ fontSize: 13 }}>
            @{profile?.username} · {user!.email}
            {isAdmin ? ' · ADMIN' : ''}
          </span>
        </div>
        <div className="row">
          {isAdmin ? (
            <Link href="/admin" className="btn btn-red">
              Admin panel
            </Link>
          ) : null}
          <form action={signOut}>
            <button className="btn btn-ghost">Odjavi se</button>
          </form>
        </div>
      </div>

      {porudzbina ? (
        <div className="alert alert-ok" role="status">
          Porudžbina je primljena. Uputstvo za uplatu stiže na e-poštu, a status pratiš ovde.
        </div>
      ) : null}

      <section className="stack">
        <h2>Moje porudžbine</h2>
        {orders && orders.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Stavke</th>
                  <th>Ukupno</th>
                  <th>Plaćanje</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} style={o.id === porudzbina ? { background: '#f7fbf8' } : undefined}>
                    <td className="mono">{date(o.created_at, true)}</td>
                    <td>
                      {(o.order_items ?? []).map((i, k) => (
                        <div key={k}>
                          {i.quantity} × {i.title}
                        </div>
                      ))}
                    </td>
                    <td className="mono">{money(o.amount_cents + o.shipping_cents, o.currency)}</td>
                    <td>{o.payment_method ? PAYMENT[o.payment_method] : '—'}</td>
                    <td>
                      <span className={'pill ' + (o.status === 'pending_payment' ? 'pill-red' : o.status === 'completed' || o.status === 'delivered' ? 'pill-green' : '')}>
                        {ORDER_STATUS[o.status] ?? o.status}
                      </span>
                      {o.status === 'pending_payment' && o.pay_deadline ? (
                        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                          Uplata do {date(o.pay_deadline, true)}
                        </div>
                      ) : null}
                      {o.tracking_number ? (
                        <div className="mono" style={{ fontSize: 12, marginTop: 4 }}>
                          Praćenje: {o.tracking_number}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="alert alert-info">Još nemaš porudžbina.</div>
        )}
      </section>

      <section className="stack" style={{ maxWidth: 640 }}>
        <h2>Podešavanja</h2>
        <ProfileForm
          profile={{ display_name: profile?.display_name ?? '', city: profile?.city ?? '', bio: full?.bio ?? '' }}
          settings={{
            script: settings?.script ?? 'latin',
            sports: settings?.sports ?? [],
            notify_email: settings?.notify_email ?? true,
            notify_push: settings?.notify_push ?? true,
          }}
        />
      </section>
    </div>
  );
}
