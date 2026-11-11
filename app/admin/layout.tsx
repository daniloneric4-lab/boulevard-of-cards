import Link from 'next/link';
import type { Metadata } from 'next';
import { getSessionInfo } from '@/lib/supabase/server';
import AdminNav from './AdminNav';

export const metadata: Metadata = { title: 'Admin', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, isAdmin } = await getSessionInfo();
  if (!user || !isAdmin) {
    return (
      <div className="wrap section" style={{ maxWidth: 560 }}>
        <div className="card stack">
          <h2>Nemaš pristup</h2>
          <p className="muted">Admin panel je samo za tim Boulevard of Cards. Ako si admin, prijavi se admin nalogom i potvrdi e-poštu.</p>
          <Link href="/" className="btn btn-dark" style={{ alignSelf: 'flex-start' }}>
            Na početnu
          </Link>
        </div>
      </div>
    );
  }
  const [{ count: pendingRel }, { count: toPack }, { data: low }, { count: notArrived }, { count: drawsN }, { count: svcN }, { count: dispN }, { count: repN }, { count: payN }, { count: supN }] = await Promise.all([
    supabase.from('releases').select('id', { count: 'exact', head: true }).eq('review_status', 'pending'),
    supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', ['pending_payment', 'paid']),
    supabase.from('products').select('stock, low_stock_at, mode, is_visible'),
    supabase.from('stock_receipts').select('id', { count: 'exact', head: true }).is('received_at', null),
    supabase.from('draws').select('id', { count: 'exact', head: true }).in('status', ['open', 'closed']),
    supabase.from('service_requests').select('id', { count: 'exact', head: true }).eq('status', 'submitted'),
    supabase.from('disputes').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('payouts').select('id', { count: 'exact', head: true }).eq('status', 'ready'),
    supabase.from('support_messages').select('id', { count: 'exact', head: true }).eq('status', 'open'),
  ]);
  const lowStock = (low ?? []).filter((p) => p.is_visible && p.mode === 'in_stock' && p.stock <= p.low_stock_at).length;
  const counts = {
    proizvodi: lowStock + (notArrived ?? 0),
    porudzbine: toPack ?? 0,
    izdanja: pendingRel ?? 0,
    izvlacenja: drawsN ?? 0,
    usluge: svcN ?? 0,
    sporovi: (dispN ?? 0) + (repN ?? 0),
    isplate: payN ?? 0,
    podrska: supN ?? 0,
  };

  return (
    <div className="adm">
      <aside>
        <div className="stack" style={{ gap: 4, marginBottom: 16 }}>
          <span className="kicker">Admin</span>
          <span className="mono muted" style={{ fontSize: 12 }}>
            {user.email}
          </span>
        </div>
        <AdminNav counts={counts} />
      </aside>
      <section className="stack" style={{ gap: 24, minWidth: 0 }}>
        {children}
      </section>
    </div>
  );
}
