import Link from 'next/link';
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import Avatar from '@/components/Avatar';
import { date } from '@/lib/format';

export const metadata: Metadata = { title: 'Poruke' };
export const dynamic = 'force-dynamic';

type P = { id: string; username: string; avatar_url: string | null };

export default async function Inbox({ searchParams }: { searchParams: Promise<{ greska?: string }> }) {
  const { greska } = await searchParams;
  const { supabase, user } = await requireUser('/poruke');
  const { data: convs } = await supabase
    .from('conversations')
    .select('id, last_message_at, created_at, buyer:profiles!conversations_buyer_id_fkey(id, username, avatar_url), seller:profiles!conversations_seller_id_fkey(id, username, avatar_url), listings(title)')
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order('last_message_at', { ascending: false, nullsFirst: false });
  const ids = (convs ?? []).map((c) => c.id);
  const { data: unread } = ids.length
    ? await supabase.from('messages').select('conversation_id').in('conversation_id', ids).is('read_at', null).neq('sender_id', user.id)
    : { data: [] };
  const n = (id: string) => (unread ?? []).filter((m) => m.conversation_id === id).length;

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <span className="kicker">Privatne poruke</span>
      <h1 style={{ fontSize: 'clamp(30px,4vw,48px)' }}>Poruke</h1>
      {greska ? <div className="alert alert-err">Razgovor nije mogao da se otvori.</div> : null}
      {convs && convs.length ? (
        <div className="list">
          {convs.map((c) => {
            const b = (Array.isArray(c.buyer) ? c.buyer[0] : c.buyer) as P;
            const s = (Array.isArray(c.seller) ? c.seller[0] : c.seller) as P;
            const other = b?.id === user.id ? s : b;
            const li = Array.isArray(c.listings) ? c.listings[0] : c.listings;
            const k = n(c.id);
            return (
              <Link key={c.id} href={`/poruke/${c.id}`} className="list-row" style={{ textDecoration: 'none' }}>
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
