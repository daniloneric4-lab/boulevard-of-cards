import Link from 'next/link';
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import Avatar from '@/components/Avatar';
import { date } from '@/lib/format';
import { clearConversation } from '@/app/_act/market';
import SubmitButton from '@/components/SubmitButton';

export const metadata: Metadata = { title: 'Poruke' };
export const dynamic = 'force-dynamic';

type P = { id: string; username: string; avatar_url: string | null };

export default async function Inbox({ searchParams }: { searchParams: Promise<{ greska?: string; obrisano?: string }> }) {
  const { greska, obrisano } = await searchParams;
  const { supabase, user } = await requireUser('/poruke');
  const { data: convs } = await supabase
    .from('conversations')
    .select('id, buyer_id, buyer_cleared_at, seller_cleared_at, last_message_at, created_at, buyer:profiles!conversations_buyer_id_fkey(id, username, avatar_url), seller:profiles!conversations_seller_id_fkey(id, username, avatar_url), listings(title)')
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order('last_message_at', { ascending: false, nullsFirst: false });
  // razgovor koji si obrisao ne prikazujemo, osim ako je posle stigla nova poruka
  const visible = (convs ?? []).filter((c) => {
    const cleared = c.buyer_id === user.id ? c.buyer_cleared_at : c.seller_cleared_at;
    return !cleared || (c.last_message_at && c.last_message_at > cleared);
  });
  const ids = visible.map((c) => c.id);
  const { data: unread } = ids.length
    ? await supabase.from('messages').select('conversation_id').in('conversation_id', ids).is('read_at', null).neq('sender_id', user.id)
    : { data: [] };
  const n = (id: string) => (unread ?? []).filter((m) => m.conversation_id === id).length;

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <span className="kicker">Privatne poruke</span>
      <h1 style={{ fontSize: 'clamp(30px,4vw,48px)' }}>Poruke</h1>
      {greska ? <div className="alert alert-err">Razgovor nije mogao da se otvori.</div> : null}
      {obrisano ? <div className="alert alert-ok">Razgovor je obrisan kod tebe. Druga strana ga i dalje vidi.</div> : null}
      {visible.length ? (
        <div className="list">
          {visible.map((c) => {
            const b = (Array.isArray(c.buyer) ? c.buyer[0] : c.buyer) as P;
            const s = (Array.isArray(c.seller) ? c.seller[0] : c.seller) as P;
            const other = b?.id === user.id ? s : b;
            const li = Array.isArray(c.listings) ? c.listings[0] : c.listings;
            const k = n(c.id);
            return (
              <div key={c.id} className="list-row" style={{ alignItems: 'center' }}>
              <Link href={`/poruke/${c.id}`} className="row" style={{ textDecoration: 'none', flex: 1, gap: 14, minWidth: 0, flexWrap: 'nowrap' }}>
                <Avatar name={other?.username} url={other?.avatar_url} size={44} />
                <div className="stack" style={{ gap: 2, flex: 1 }}>
                  <b>@{other?.username}</b>
                  <span className="muted" style={{ fontSize: 13 }}>
                    {li?.title ? `O: ${li.title}` : 'Opšti razgovor'}
                  </span>
                </div>
                {k ? <span className="pill pill-red">{k}</span> : null}
                <span className="mono muted" style={{ fontSize: 12 }}>
                  {date(c.last_message_at ?? c.created_at, true)}
                </span>
              </Link>
              <form action={clearConversation}>
                <input type="hidden" name="id" value={c.id} />
                <SubmitButton className="btn btn-sm btn-ghost" pendingText="…">
                  <span aria-hidden="true">🗑</span>
                  <span className="sr-only">Obriši razgovor sa @{other?.username} kod sebe</span>
                </SubmitButton>
              </form>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty">
          <span className="empty-t">Dogovor u jednoj poruci</span>
          <span className="muted">Pitaj prodavca, pošalji ponudu ili predloži razmenu sa stranice oglasa ili profila. Kad prodavac prihvati, plaćaš iz istog razgovora.</span>
          <Link href="/prodavnica" className="btn btn-dark">
            U prodavnicu
          </Link>
        </div>
      )}
    </div>
  );
}
