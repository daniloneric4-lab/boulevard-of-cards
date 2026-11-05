import { createClient } from '@/lib/supabase/server';
import { date } from '@/lib/format';

const ACTION: Record<string, string> = {
  product_created: 'Dodat proizvod',
  product_updated: 'Izmenjen proizvod',
  product_deleted: 'Obrisan proizvod',
  stock_received: 'Primljena roba',
  settings_updated: 'Izmenjena podešavanja',
  order_paid: 'Porudžbina plaćena',
  order_shipped: 'Porudžbina poslata',
  order_delivered: 'Porudžbina isporučena',
  order_completed: 'Porudžbina završena',
  order_cancelled: 'Porudžbina otkazana',
  order_refunded: 'Novac vraćen',
  dispute_refund: 'Spor: povraćaj kupcu',
  dispute_release: 'Spor: isplata prodavcu',
  payout_paid: 'Isplaćeno',
  payout_held: 'Isplata zadržana',
  payout_pay_all: 'Isplati sve',
};

export default async function AdminLog() {
  const supabase = await createClient();
  const { data: log } = await supabase
    .from('admin_log')
    .select('id, action, target_type, details, created_at, admin:profiles(username)')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <>
      <h1 style={{ fontSize: 'clamp(28px,4vw,40px)' }}>Dnevnik</h1>
      <p className="muted">Svaka admin radnja se upisuje automatski. Zapisi ne mogu da se menjaju ni brišu.</p>
      {log && log.length ? (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Vreme</th>
                <th>Ko</th>
                <th>Radnja</th>
                <th>Detalji</th>
              </tr>
            </thead>
            <tbody>
              {log.map((l) => (
                <tr key={l.id}>
                  <td className="mono" style={{ whiteSpace: 'nowrap' }}>
                    {date(l.created_at, true)}
                  </td>
                  <td>@{(l.admin as unknown as { username: string } | null)?.username ?? '—'}</td>
                  <td>{ACTION[l.action] ?? l.action}</td>
                  <td className="mono" style={{ fontSize: 12, wordBreak: 'break-word' }}>
                    {Object.entries((l.details as Record<string, unknown>) ?? {})
                      .filter(([, v]) => v != null && v !== '')
                      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                      .join(' · ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="alert alert-info">Dnevnik je prazan.</div>
      )}
    </>
  );
}
