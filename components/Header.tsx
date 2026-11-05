import Link from 'next/link';
import { getSessionInfo } from '@/lib/supabase/server';
import NavLinks from './NavLinks';

export default async function Header() {
  const { supabase, user, profile, isAdmin } = await getSessionInfo();
  let cartCount = 0;
  if (user) {
    const { data } = await supabase.from('cart_items').select('quantity').eq('user_id', user.id);
    cartCount = (data ?? []).reduce((s, r) => s + (r.quantity ?? 0), 0);
  }

  return (
    <header className="hdr">
      <div className="hdr-in">
        <Link href="/" className="hdr-logo" aria-label="Boulevard of Cards početna">
          <img src="/boc-b.png" alt="Boulevard of Cards" />
        </Link>
        <NavLinks />
        <div className="hdr-act">
          {isAdmin ? (
            <Link href="/admin" className="btn btn-sm btn-red">
              Admin
            </Link>
          ) : null}
          <Link href="/korpa" className="btn btn-sm btn-light">
            Korpa · {cartCount}
          </Link>
          {user ? (
            <Link href="/profil" className="btn btn-sm btn-ghost">
              {profile?.display_name || profile?.username || 'Profil'}
            </Link>
          ) : (
            <Link href="/prijava" className="btn btn-sm btn-ghost">
              Uđi
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
