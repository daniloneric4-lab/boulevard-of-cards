'use client';
import { useActionState } from 'react';
import { buyListing } from '@/app/_act/market';

export default function BuyForm({ listingId, label }: { listingId: string; label: string }) {
  const [state, run, pending] = useActionState(buyListing, { ok: false, msg: '' });
  return (
    <form action={run} className="stack" style={{ gap: 10 }}>
      <input type="hidden" name="listing_id" value={listingId} />
      <div className="row" style={{ gap: 10 }}>
        <label className="fld" style={{ flex: '1 1 160px' }}>
          Dostava
          <select className="inp" name="shipping" defaultValue="courier">
            <option value="courier">Kurir do vrata</option>
            <option value="pickup">Lično preuzimanje</option>
          </select>
        </label>
        <label className="fld" style={{ flex: '1 1 160px' }}>
          Plaćanje
          <select className="inp" name="payment" defaultValue="ips_qr">
            <option value="ips_qr">IPS QR (instant)</option>
            <option value="bank_transfer">Uplata na račun</option>
            <option value="card">Kartica</option>
          </select>
        </label>
      </div>
      <button className="btn btn-red" disabled={pending}>
        {pending ? 'Rezervišem…' : label}
      </button>
      {state.msg ? (
        <div className="alert alert-err" role="status">
          {state.msg}
        </div>
      ) : null}
    </form>
  );
}
