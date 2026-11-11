import type { SupabaseClient } from '@supabase/supabase-js';

export type StatusItem = { t: string; v: number; sub: string; href: string; hot?: boolean };

/** "Moj status": izvlačenja, aukcije gde vodiš, porudžbine u toku, nepročitana obaveštenja. */
export async function getMyStatus(supabase: SupabaseClient, userId: string): Promise<StatusItem[]> {
  const [d, a, o, n] = await Promise.all([
    supabase.from('draw_entries').select('status', { count: 'exact' }).eq('user_id', userId).in('status', ['entered', 'won', 'waitlist']),
    supabase.from('auctions').select('listing_id', { count: 'exact', head: true }).eq('current_bidder_id', userId),
    supabase.from('orders').select('status', { count: 'exact', head: true }).eq('buyer_id', userId).in('status', ['pending_payment', 'paid', 'shipped', 'delivered']),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('read_at', null),
  ]);
  const won = (d.data ?? []).some((x) => x.status === 'won');
  return [
    { t: 'Izvlačenja', v: d.count ?? 0, sub: won ? 'Izvučen si! Plati u roku' : 'aktivnih prijava', href: '/profil#prijave', hot: won },
    { t: 'Vodiš na aukcijama', v: a.count ?? 0, sub: 'trenutno najviša ponuda', href: '/aukcije?view=mine' },
    { t: 'Porudžbine u toku', v: o.count ?? 0, sub: 'plaćanje, slanje, prijem', href: '/profil#porudzbine' },
    { t: 'Obaveštenja', v: n.count ?? 0, sub: 'nepročitanih', href: '/obavestenja' },
  ];
}
