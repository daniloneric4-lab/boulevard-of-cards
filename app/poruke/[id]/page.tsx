import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import Avatar from '@/components/Avatar';
import SubmitButton from '@/components/SubmitButton';
import { clearConversation, respondOffer, respondTrade } from '@/app/_act/market';
import { date, money } from '@/lib/format';
import Composer from './Composer';
import AdminBadge from '@/components/AdminBadge';

export const dynamic = 'force-dynamic';

const OFFER_ST: Record<string, string> = { pending: 'Čeka odgovor', accepted: 'Prihvaćeno', declined: 'Odbijeno', countered: 'Kontraponuda', expired: 'Isteklo', withdrawn: 'Povučeno' };

export default async function Conversation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser(`/poruke/${id}`);
  const { data: c } = await supabase
    .from('conversations')
    .select('id, buyer_id, seller_id, listing_id, buyer_cleared_at, seller_cleared_at, buyer:profiles!conversations_buyer_id_fkey(id, username, avatar_url, is_verified, role), seller:profiles!conversations_seller_id_fkey(id, username, avatar_url, is_verified, role), listings(id, title, price_cents, currency, status)')
    .eq('id', id)
    .maybeSingle();
  if (!c) notFound();
  await supabase.rpc('mark_conversation_read', { p_conversation_id: id });
  const otherRaw = c.buyer_id === user.id ? c.seller : c.buyer;
  const other = (Array.isArray(otherRaw) ? otherRaw[0] : otherRaw) as { id: string; username: string; avatar_url: string | null; is_verified: boolean; role?: string | null };
  const li = Array.isArray(c.listings) ? c.listings[0] : c.listings;
  const [{ data: msgs }, { data: offers }, { data: trades }, { data: mine }, { data: theirs }] = await Promise.all([
    // posle brisanja kod sebe vidiš samo nove poruke
    (() => {
      const cleared = c.buyer_id === user.id ? c.buyer_cleared_at : c.seller_cleared_at;
      let mq = supabase.from('messages').select('id, sender_id, kind, body, offer_id, trade_id, flagged, created_at').eq('conversation_id', id).order('created_at');
      if (cleared) mq = mq.gt('created_at', cleared);
      return mq;
    })(),
    supabase.from('offers').select('*').eq('conversation_id', id),
    supabase.from('trades').select('*, trade_items(side, collection_items(title))').eq('conversation_id', id),
    supabase.from('collection_items').select('id, title').eq('owner_id', user.id).limit(60),
    supabase.from('collection_items').select('id, title').eq('owner_id', other.id).limit(60),
  ]);
  const offerById = new Map((offers ?? []).map((o) => [o.id, o]));
  const tradeById = new Map((trades ?? []).map((t) => [t.id, t]));

  return (
    <div className="page" style={{ maxWidth: 960 }}>
      <Link href="/poruke" className="lnk">
        ← Sve poruke
      </Link>
      <div className="row" style={{ gap: 14 }}>
        <Avatar name={other.username} url={other.avatar_url} size={52} />
        <div className="stack" style={{ gap: 2, flex: 1 }}>
          <Link href={`/u/${other.username}`} style={{ fontWeight: 700, fontSize: 20, textDecoration: 'none' }}>
            @{other.username} {other.is_verified ? <span className="pill pill-green">Verifikovan</span> : null} <AdminBadge role={other.role} />
          </Link>
          {li ? (
            <span className="muted" style={{ fontSize: 14 }}>
              Razgovor o: <Link href={`/oglas/${li.id}`} className="lnk">{li.title}</Link>
              {li.price_cents ? ` · ${money(li.price_cents, li.currency)}` : ''}
            </span>
          ) : null}
        </div>
        <details className="del-confirm">
          <summary className="btn btn-sm btn-ghost">Obriši razgovor</summary>
          <form action={clearConversation} className="stack" style={{ gap: 6 }}>
            <input type="hidden" name="id" value={c.id} />
            <span className="muted" style={{ fontSize: 12 }}>Briše se samo kod tebe. @{other.username} i dalje vidi poruke.</span>
            <SubmitButton className="btn btn-red btn-sm" pendingText="Brišem…">
              Da, obriši kod mene
            </SubmitButton>
          </form>
        </details>
      </div>

      <div className="msg-box" aria-live="polite">
        {(msgs ?? []).length === 0 ? <span className="msg sys">Započni razgovor. Pitaj, pošalji ponudu ili predloži razmenu.</span> : null}
        {(msgs ?? []).map((m) => {
          if (m.kind === 'system') return <span key={m.id} className="msg sys">{m.body}</span>;
          const me = m.sender_id === user.id;
          if (m.kind === 'offer' && m.offer_id) {
            const o = offerById.get(m.offer_id);
            if (!o) return null;
            const toMe = o.to_user === user.id && o.status === 'pending' && new Date(o.expires_at).getTime() > Date.now();
            return (
              <div key={m.id} className="offer-card" style={{ alignSelf: me ? 'flex-end' : 'flex-start' }}>
                <span className="kicker">{o.parent_offer_id ? 'Kontraponuda' : 'Ponuda'}</span>
                <b className="price">{money(o.amount_cents, o.currency)}</b>
                <span className="muted" style={{ fontSize: 13 }}>
                  {OFFER_ST[o.status]} · važi do {date(o.expires_at, true)} · {o.shipping === 'pickup' ? 'lično' : 'kurir'}
                </span>
                {toMe ? (
                  <div className="row" style={{ gap: 6 }}>
                    <form action={respondOffer}>
                      <input type="hidden" name="conversation_id" value={id} />
                      <input type="hidden" name="offer_id" value={o.id} />
                      <input type="hidden" name="action" value="accept" />
                      <SubmitButton className="btn btn-sm btn-red">Prihvati</SubmitButton>
                    </form>
                    <form action={respondOffer}>
                      <input type="hidden" name="conversation_id" value={id} />
                      <input type="hidden" name="offer_id" value={o.id} />
                      <input type="hidden" name="action" value="decline" />
                      <SubmitButton className="btn btn-sm btn-ghost">Odbij</SubmitButton>
                    </form>
                    <form action={respondOffer} className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                      <input type="hidden" name="conversation_id" value={id} />
                      <input type="hidden" name="offer_id" value={o.id} />
                      <input type="hidden" name="action" value="counter" />
                      <input className="inp" name="counter" inputMode="decimal" placeholder="RSD" aria-label="Iznos kontraponude" style={{ width: 110, minHeight: 36 }} />
                      <SubmitButton className="btn btn-sm btn-ghost">Kontra</SubmitButton>
                    </form>
                  </div>
                ) : null}
                {me && o.status === 'pending' ? (
                  <form action={respondOffer}>
                    <input type="hidden" name="conversation_id" value={id} />
                    <input type="hidden" name="offer_id" value={o.id} />
                    <input type="hidden" name="action" value="withdraw" />
                    <SubmitButton className="btn btn-sm btn-ghost">Povuci ponudu</SubmitButton>
                  </form>
                ) : null}
                {o.status === 'accepted' && c.buyer_id === user.id ? (
                  <Link href="/profil" className="btn btn-sm btn-red">
                    Plati · novac zaštićen
                  </Link>
                ) : null}
              </div>
            );
          }
          if (m.kind === 'trade' && m.trade_id) {
            const t = tradeById.get(m.trade_id);
            if (!t) return null;
            const items = (t.trade_items ?? []) as { side: string; collection_items: { title: string } | { title: string }[] | null }[];
            const name = (x: (typeof items)[number]) => (Array.isArray(x.collection_items) ? x.collection_items[0]?.title : x.collection_items?.title);
            const give = items.filter((x) => x.side === 'give').map(name);
            const get = items.filter((x) => x.side === 'get').map(name);
            const proposerIsMe = t.proposer_id === user.id;
            return (
              <div key={m.id} className="offer-card" style={{ alignSelf: me ? 'flex-end' : 'flex-start' }}>
                <span className="kicker">Predlog razmene · {t.status === 'pending' ? 'čeka' : t.status}</span>
                <span style={{ fontSize: 14 }}>
                  <b>{proposerIsMe ? 'Daješ' : 'Dobijaš'}:</b> {give.join(', ') || '—'}
                </span>
                <span style={{ fontSize: 14 }}>
                  <b>{proposerIsMe ? 'Dobijaš' : 'Daješ'}:</b> {get.join(', ') || '—'}
                </span>
                {t.topup_cents ? <span className="muted" style={{ fontSize: 13 }}>Doplata: {money(t.topup_cents, t.currency)}</span> : null}
                {t.recipient_id === user.id && t.status === 'pending' ? (
                  <div className="row" style={{ gap: 6 }}>
                    <form action={respondTrade}>
                      <input type="hidden" name="conversation_id" value={id} />
                      <input type="hidden" name="trade_id" value={t.id} />
                      <input type="hidden" name="action" value="accept" />
                      <SubmitButton className="btn btn-sm btn-red">Prihvati razmenu</SubmitButton>
                    </form>
                    <form action={respondTrade}>
                      <input type="hidden" name="conversation_id" value={id} />
                      <input type="hidden" name="trade_id" value={t.id} />
                      <input type="hidden" name="action" value="decline" />
                      <SubmitButton className="btn btn-sm btn-ghost">Odbij</SubmitButton>
                    </form>
                  </div>
                ) : null}
              </div>
            );
          }
          return (
            <div key={m.id} className={'msg' + (me ? ' me' : '')}>
              {m.body}
              <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
                {date(m.created_at, true)}
                {m.flagged ? ' · označeno: dogovor van platforme gubi zaštitu' : ''}
              </div>
            </div>
          );
        })}
      </div>
      <Composer conversationId={id} myItems={mine ?? []} theirItems={theirs ?? []} />
    </div>
  );
}
