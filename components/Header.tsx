import Link from 'next/link';
import { getSessionInfo } from '@/lib/supabase/server';
import NavLinks from './NavLinks';
import UserMenu from './UserMenu';
import { getMyStatus, type StatusItem } from '@/lib/status';

export default async function Header() {
  const { supabase, user, profile, isAdmin } = await getSessionInfo();
  let cartCount = 0;
  let unread = 0;
  let unreadMsgs = 0;
  let status: StatusItem[] = [];
  if (user) {
    const [{ data: cart }, { count: n }, { data: convs }, st] = await Promise.all([
      supabase.from('cart_items').select('quantity').eq('user_id', user.id),
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('read_at', null),
      supabase.from('conversations').select('id').or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`),
      getMyStatus(supabase, user.id),
    ]);
    status = st;
    cartCount = (cart ?? []).reduce((s, r) => s + (r.quantity ?? 0), 0);
    unread = n ?? 0;
    const ids = (convs ?? []).map((c) => c.id);
    if (ids.length) {
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .in('conversation_id', ids)
        .is('read_at', null)
        .neq('sender_id', user.id);
      unreadMsgs = count ?? 0;
    }
  }

  return (
    <header className="hdr">
      <div className="hdr-in">
        <Link href="/" className="hdr-logo" aria-label="Boulevard of Cards početna">
          <img src="/boc-b.png" alt="Boulevard of Cards" />
        </Link>
        <NavLinks />
        <div className="hdr-act">
          {user ? (
            <Link href="/obavestenja" className="icon-btn" aria-label={unread ? `Obaveštenja, ${unread} nova` : 'Obaveštenja'}>
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9" />
                <path d="M10 19a2 2 0 0 0 4 0" />
              </svg>
              {unread ? <span className="count-badge" aria-hidden="true">{unread > 9 ? '9+' : unread}</span> : null}
            </Link>
          ) : null}
          <Link href="/korpa" className="btn btn-sm btn-light hdr-cart">
            Korpa{cartCount ? ` · ${cartCount}` : ''}
          </Link>
          {user ? (
            <UserMenu
              username={profile?.username ?? 'nalog'}
              name={profile?.display_name || profile?.username || ''}
              avatar={profile?.avatar_url ?? null}
              isAdmin={isAdmin}
              unreadMsgs={unreadMsgs}
              status={status}
            />
          ) : (
            <>
              <Link href="/prijava" className="btn btn-sm btn-ghost">
                Log in
              </Link>
              <Link href="/prijava?mode=signup" className="btn btn-sm btn-red">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
