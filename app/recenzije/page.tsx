import Link from 'next/link';
import type { Metadata } from 'next';
import { getSessionInfo } from '@/lib/supabase/server';
import PageHero from '@/components/PageHero';
import { date } from '@/lib/format';
import ReviewForm from './ReviewForm';

export const metadata: Metadata = { title: 'Recenzije' };
export const dynamic = 'force-dynamic';

export default async function Reviews({ searchParams }: { searchParams: Promise<{ sort?: string; stars?: string }> }) {
  const { sort = 'new', stars } = await searchParams;
  const { supabase, user } = await getSessionInfo();
  let q = supabase.from('reviews').select('id, rating, comment, created_at, reviewer:profiles!reviews_reviewer_id_fkey(username, city), reviewee:profiles!reviews_reviewee_id_fkey(username)').limit(100);
  if (stars) q = q.eq('rating', Number(stars));
  q = sort === 'low' ? q.order('rating').order('created_at', { ascending: false }) : sort === 'high' ? q.order('rating', { ascending: false }).order('created_at', { ascending: false }) : q.order('created_at', { ascending: false });
  const [{ data: list }, { data: all }, eligible] = await Promise.all([
    q,
    supabase.from('reviews').select('rating'),
    user
      ? supabase.from('orders').select('id, created_at, order_items(title), seller:profiles!orders_seller_id_fkey(username), reviews(id)').eq('buyer_id', user.id).eq('status', 'completed').not('seller_id', 'is', null)
      : Promise.resolve({ data: [] }),
  ]);
  const ratings = (all ?? []).map((r) => r.rating);
  const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '—';
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: ratings.filter((r) => r === n).length }));
  type E = { id: string; created_at: string; order_items: { title: string }[] | null; seller: { username: string } | { username: string }[] | null; reviews: { id: string }[] | null };
  const toReview = ((eligible.data ?? []) as E[])
    .filter((o) => !(o.reviews ?? []).length)
    .map((o) => {
      const s = Array.isArray(o.seller) ? o.seller[0] : o.seller;
      return { id: o.id, label: `${(o.order_items ?? [])[0]?.title ?? 'Porudžbina'} · @${s?.username ?? ''} · ${date(o.created_at)}` };
    });
  const one = <T,>(x: T | T[] | null): T | null => (Array.isArray(x) ? x[0] ?? null : x);

  return (
    <>
      <PageHero kicker="Samo proverene kupovine" title="Recenzije" lead="Recenziju može da napiše samo kupac koji je primio porudžbinu. Loše ocene ne brišemo. Uklanjamo samo uvredljive i lažne, posle provere." />
      <div className="page">
        <div className="side">
          <section className="stack">
            <div className="row between">
              <div className="chips">
                <Link href="/recenzije" className={'chip' + (!stars ? ' on' : '')}>
                  Sve
                </Link>
                {[5, 4, 3, 2, 1].map((n) => (
                  <Link key={n} href={`/recenzije?stars=${n}&sort=${sort}`} className={'chip' + (stars === String(n) ? ' on' : '')}>
                    {n}★
                  </Link>
                ))}
              </div>
              <div className="chips">
                {[
                  ['new', 'Najnovije'],
                  ['low', 'Najniže'],
                  ['high', 'Najviše'],
                ].map(([k, l]) => (
                  <Link key={k} href={`/recenzije?sort=${k}${stars ? '&stars=' + stars : ''}`} className={'chip' + (sort === k ? ' on' : '')} style={{ minHeight: 36, fontSize: 13 }}>
                    {l}
                  </Link>
                ))}
              </div>
            </div>
            {list && list.length ? (
              <div className="list">
                {list.map((r) => {
                  const who = one(r.reviewer as unknown as { username: string; city: string | null } | null);
                  const to = one(r.reviewee as unknown as { username: string } | null);
                  return (
                    <article key={r.id} className="list-row" style={{ alignItems: 'flex-start' }}>
                      <span className="ava" style={{ width: 40, height: 40, fontSize: 15 }} aria-hidden="true">
                        {(who?.username ?? '?')[0]?.toUpperCase()}
                      </span>
                      <div className="stack" style={{ gap: 4, flex: 1 }}>
                        <span className="row between">
                          <b>
                            @{who?.username}
                            {who?.city ? <span className="muted" style={{ fontWeight: 400 }}> · {who.city}</span> : null}
                          </b>
                          <span className="stars" aria-label={`${r.rating} od 5`}>
                            {'★'.repeat(r.rating)}
                            <span style={{ color: 'var(--bc-line)' }}>{'★'.repeat(5 - r.rating)}</span>
                          </span>
                        </span>
                        <span className="mono muted" style={{ fontSize: 12 }}>
                          {date(r.created_at)} · prodavac <Link href={`/u/${to?.username}`} className="lnk">@{to?.username}</Link> · ✓ PROVERENA KUPOVINA
                        </span>
                        {r.comment ? <p>{r.comment}</p> : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty">
                <span className="empty-t">Još nema recenzija</span>
                <span className="muted">Prave recenzije stižu posle prvih porudžbina.</span>
              </div>
            )}
          </section>
          <aside className="stack">
            <section className="card stack">
              <div className="row" style={{ gap: 14 }}>
                <b style={{ fontFamily: 'var(--font-display)', fontSize: 48 }}>{avg}</b>
                <div className="stack" style={{ gap: 0 }}>
                  <span className="stars">★★★★★</span>
                  <span className="muted" style={{ fontSize: 13 }}>
                    {ratings.length} recenzija
                  </span>
                </div>
              </div>
              {dist.map((d) => (
                <div key={d.n} className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
                  <span className="mono" style={{ width: 28 }}>
                    {d.n}★
                  </span>
                  <span style={{ flex: 1, height: 8, background: '#fff', borderRadius: 4, overflow: 'hidden' }}>
                    <span style={{ display: 'block', height: '100%', width: `${ratings.length ? (d.c / ratings.length) * 100 : 0}%`, background: 'var(--bc-red)' }} />
                  </span>
                  <span className="mono muted" style={{ width: 24, textAlign: 'right' }}>
                    {d.c}
                  </span>
                </div>
              ))}
            </section>
            <section className="card stack">
              <h3>Oceni kupovinu</h3>
              {!user ? (
                <Link href="/prijava?next=/recenzije" className="btn btn-dark" style={{ alignSelf: 'flex-start' }}>
                  Log in
                </Link>
              ) : toReview.length ? (
                <ReviewForm orders={toReview} />
              ) : (
                <span className="muted" style={{ fontSize: 14 }}>
                  Kad potvrdiš prijem porudžbine, ovde je možeš oceniti. Imaš 30 dana.
                </span>
              )}
            </section>
            <section className="card stack">
              <h3>Kako radi</h3>
              <ol className="stack" style={{ margin: 0, paddingLeft: 20, gap: 6, fontSize: 14 }}>
                <li>Porudžbina stigne i potvrdiš prijem.</li>
                <li>Dobiješ obaveštenje „Oceni kupovinu“ i imaš 30 dana da oceniš.</li>
                <li>Prodavac može jednom javno da odgovori.</li>
              </ol>
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}
