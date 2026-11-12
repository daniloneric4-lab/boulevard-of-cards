import Link from 'next/link';
import AdminBadge from '@/components/AdminBadge';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSessionInfo } from '@/lib/supabase/server';
import Avatar from '@/components/Avatar';
import CardArt from '@/components/CardArt';
import ListingTile from '@/components/ListingTile';
import SubmitButton from '@/components/SubmitButton';
import { startConversation, toggleFollow } from '@/app/_act/market';
import { date, gradeLabel, money } from '@/lib/format';
import { LISTING_SELECT, type ListingRow } from '@/lib/listings';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${decodeURIComponent(username)}` };
}

export default async function PublicProfile({ params, searchParams }: { params: Promise<{ username: string }>; searchParams: Promise<{ t?: string }> }) {
  const { username } = await params;
  const { t = 'prodaja' } = await searchParams;
  const { supabase, user } = await getSessionInfo();
  const { data: p } = await supabase.from('profiles').select('id, username, display_name, city, bio, collects, avatar_url, is_verified, is_suspended, created_at, role').eq('username', decodeURIComponent(username).toLowerCase()).maybeSingle();
  if (!p || p.is_suspended) notFound();
  const me = user?.id === p.id;
  const [{ data: listings }, { data: shown }, { data: wants }, { data: reviews }, { count: followers }, fol, matches, { count: sold }] = await Promise.all([
    supabase.from('listings').select(LISTING_SELECT).eq('seller_id', p.id).eq('status', 'active').order('created_at', { ascending: false }).limit(24),
    supabase.from('collection_items').select('id, title, grader, grade, open_to_trade, estimated_value_cents, currency').eq('owner_id', p.id).eq('is_public', true).order('created_at', { ascending: false }).limit(48),
    supabase.from('wishlist').select('id, query, max_price_cents, card_catalog(player, set_name, parallel)').eq('user_id', p.id).eq('is_public', true).limit(30),
    supabase.from('reviews').select('rating, comment, created_at, reviewer:profiles!reviews_reviewer_id_fkey(username)').eq('reviewee_id', p.id).order('created_at', { ascending: false }).limit(20),
    supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('followee_id', p.id),
    user && !me ? supabase.from('follows').select('follower_id').eq('follower_id', user.id).eq('followee_id', p.id).maybeSingle() : Promise.resolve({ data: null }),
    user && !me ? supabase.rpc('profile_matches', { p_profile_id: p.id }) : Promise.resolve({ data: null }),
    supabase.from('listings').select('id', { count: 'exact', head: true }).eq('seller_id', p.id).eq('status', 'sold'),
  ]);
  const following = !!fol.data;
  const m = (Array.isArray(matches.data) ? matches.data[0] : matches.data) as { on_my_wishlist: number; i_have_their_wants: number } | null;
  const R = reviews ?? [];
  const rating = R.length ? (R.reduce((s, r) => s + r.rating, 0) / R.length).toFixed(1) : '—';
  const back = `/u/${p.username}`;
  const one = <T,>(x: T | T[] | null): T | null => (Array.isArray(x) ? x[0] ?? null : x);

  return (
    <div className="page">
      <section className="card-dark stack" style={{ gap: 20 }}>
        <div className="row" style={{ gap: 20 }}>
          <Avatar name={p.username} url={p.avatar_url} size={88} />
          <div className="stack" style={{ gap: 6, flex: '1 1 260px' }}>
            <div className="row" style={{ gap: 10 }}>
              <h1 style={{ fontSize: 'clamp(28px,4vw,44px)' }}>@{p.username}</h1>
              {p.is_verified ? <span className="pill pill-green">✓ Verifikovan prodavac</span> : null}
              <AdminBadge role={p.role} />
            </div>
            <span style={{ color: 'var(--bc-gray-dk)', fontSize: 14 }}>
              {[p.city, p.collects ? 'skuplja ' + p.collects : null, 'član od ' + date(p.created_at)].filter(Boolean).join(' · ')}
            </span>
            {p.bio ? <p style={{ color: 'var(--bc-line)', maxWidth: 640 }}>{p.bio}</p> : null}
          </div>
          <div className="row">
            {me ? (
              <Link href="/podesavanja" className="btn btn-light">
                Uredi profil
              </Link>
            ) : (
              <>
                <form action={startConversation}>
                  <input type="hidden" name="user_id" value={p.id} />
                  <SubmitButton className="btn btn-red">Pošalji poruku</SubmitButton>
                </form>
                <form action={toggleFollow}>
                  <input type="hidden" name="user_id" value={p.id} />
                  <input type="hidden" name="on" value={following ? '1' : '0'} />
                  <input type="hidden" name="back" value={back} />
                  <SubmitButton className="btn btn-ghost">{following ? '✓ Pratiš' : 'Prati'}</SubmitButton>
                </form>
              </>
            )}
          </div>
        </div>
        <div className="kv">
          <div>
            <span>Na prodaju</span>
            <b>{(listings ?? []).length}</b>
          </div>
          <div>
            <span>U vitrini</span>
            <b>{(shown ?? []).length}</b>
          </div>
          <div>
            <span>Prodaja</span>
            <b>{sold ?? 0}</b>
          </div>
          <div>
            <span>Ocena kupaca</span>
            <b>{rating}</b>
          </div>
          <div>
            <span>Pratilaca</span>
            <b>{followers ?? 0}</b>
          </div>
        </div>
      </section>

      {m && (m.on_my_wishlist > 0 || m.i_have_their_wants > 0) ? (
        <div className="two">
          {m.on_my_wishlist > 0 ? (
            <div className="card stack">
              <b>Ima {m.on_my_wishlist} kartice sa tvoje liste želja</b>
              <span className="muted">Pogledaj vitrinu i pošalji ponudu iz poruke.</span>
            </div>
          ) : null}
          {m.i_have_their_wants > 0 ? (
            <div className="card stack">
              <b>Traži {m.i_have_their_wants} kartice koje ti imaš</b>
              <span className="muted">Dobra prilika za razmenu.</span>
            </div>
          ) : null}
        </div>
      ) : null}

      <nav className="tabs">
        {[
          ['prodaja', `Na prodaju`],
          ['vitrina', 'Vitrina'],
          ['trazi', `Šta @${p.username} traži`],
          ['ocene', 'Ocene kupaca'],
        ].map(([k, l]) => (
          <Link key={k} href={`${back}?t=${k}`} className={t === k ? 'on' : undefined}>
            {l}
          </Link>
        ))}
      </nav>

      {t === 'prodaja' ? (
        listings && listings.length ? (
          <div className="grid-tiles">
            {(listings as unknown as ListingRow[]).map((l) => (
              <ListingTile key={l.id} l={l} />
            ))}
          </div>
        ) : (
          <div className="alert alert-info">Trenutno nema kartica na prodaju.</div>
        )
      ) : t === 'vitrina' ? (
        shown && shown.length ? (
          <div className="grid-tiles">
            {shown.map((c) => (
              <div key={c.id} className="tile">
                <div className="tile-media">
                  <CardArt seed={c.id} grade={gradeLabel(c.grader, c.grade)} />
                  {c.open_to_trade ? <span className="tile-time">ZA RAZMENU</span> : null}
                </div>
                <div className="tile-body">
                  <span className="tile-title">{c.title}</span>
                  <span className="mono muted" style={{ fontSize: 13 }}>
                    {c.estimated_value_cents ? money(c.estimated_value_cents, c.currency) : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="alert alert-info">Vitrina je prazna.</div>
        )
      ) : t === 'trazi' ? (
        wants && wants.length ? (
          <div className="list">
            {wants.map((w) => {
              const c = one(w.card_catalog as unknown as { player: string; set_name: string; parallel: string | null } | null);
              return (
                <div key={w.id} className="list-row">
                  <b style={{ flex: 1 }}>{c ? `${c.player} · ${c.set_name}${c.parallel ? ' · ' + c.parallel : ''}` : w.query}</b>
                  {w.max_price_cents ? <span className="mono muted">do {money(w.max_price_cents)}</span> : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="alert alert-info">Lista želja nije javna ili je prazna.</div>
        )
      ) : R.length ? (
        <div className="list">
          {R.map((r, i) => (
            <div key={i} className="list-row" style={{ alignItems: 'flex-start' }}>
              <div className="stack" style={{ gap: 4, flex: 1 }}>
                <span className="row between">
                  <b>@{one(r.reviewer)?.username}</b>
                  <span className="stars">{'★'.repeat(r.rating)}</span>
                </span>
                {r.comment ? <span>{r.comment}</span> : null}
                <span className="mono muted" style={{ fontSize: 12 }}>
                  {date(r.created_at)} · proverena kupovina
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="alert alert-info">Još nema ocena. Ocenu može da ostavi samo kupac koji je primio porudžbinu.</div>
      )}

      <div className="card row between">
        <div className="stack" style={{ gap: 2 }}>
          <span className="kicker">Vitrina za deljenje</span>
          <span className="mono" style={{ fontSize: 14 }}>
            boulevard-of-cards.vercel.app/u/{p.username}
          </span>
        </div>
        <span className="muted" style={{ fontSize: 13 }}>
          Javna stranica sa svim izloženim karticama
        </span>
      </div>
    </div>
  );
}
