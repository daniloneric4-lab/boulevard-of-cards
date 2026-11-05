import { createClient } from '@/lib/supabase/server';
import ActionForm from '@/components/ActionForm';
import { date } from '@/lib/format';
import { saveSettings } from '../actions';

export default async function AdminSettings() {
  const supabase = await createClient();
  const { data: s } = await supabase.from('platform_settings').select('*').eq('id', 1).single();
  const c = (v: number | null | undefined) => (v == null ? '' : String(v / 100));

  return (
    <>
      <h1 style={{ fontSize: 'clamp(28px,4vw,40px)' }}>Podešavanja platforme</h1>
      <p className="muted mono" style={{ fontSize: 12 }}>
        Poslednja izmena: {date(s?.updated_at, true)}
      </p>
      <ActionForm action={saveSettings} submit="Sačuvaj podešavanja" className="card stack">
        <h3>Novac i rokovi</h3>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          <label className="fld">
            Provizija na tržištu (%)
            <input className="inp" name="commission_percent" inputMode="decimal" defaultValue={s?.commission_percent ?? 8} />
          </label>
          <label className="fld">
            Avans za preorder (%)
            <input className="inp" name="deposit_percent" type="number" min={0} max={100} defaultValue={s?.deposit_percent ?? 30} />
          </label>
          <label className="fld">
            Rok za uplatu (sati)
            <input className="inp" name="pay_window_hours" type="number" min={1} max={168} defaultValue={s?.pay_window_hours ?? 24} />
          </label>
          <label className="fld">
            Produženje aukcije (sekunde)
            <input className="inp" name="auction_extend_seconds" type="number" min={0} defaultValue={s?.auction_extend_seconds ?? 120} />
          </label>
          <label className="fld">
            Kurs EUR → RSD
            <input className="inp" name="eur_rsd_rate" inputMode="decimal" defaultValue={s?.eur_rsd_rate ?? ''} />
          </label>
          <label className="fld">
            Kurs USD → RSD
            <input className="inp" name="usd_rsd_rate" inputMode="decimal" defaultValue={s?.usd_rsd_rate ?? ''} />
          </label>
        </div>
        <h3>Dostava</h3>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          <label className="fld">
            Cena kurira (RSD)
            <input className="inp" name="shipping" inputMode="decimal" defaultValue={c(s?.shipping_cents)} />
          </label>
          <label className="fld">
            Besplatna dostava od (RSD)
            <input className="inp" name="free_shipping_from" inputMode="decimal" defaultValue={c(s?.free_shipping_from_cents)} placeholder="prazno = nikad" />
          </label>
        </div>
        <h3>Traka i održavanje</h3>
        <label className="fld">
          Tekst trake na vrhu sajta
          <input className="inp" name="banner_text" defaultValue={s?.banner_text ?? ''} maxLength={160} />
        </label>
        <label className="chk">
          <input type="checkbox" name="banner_on" defaultChecked={s?.banner_on} /> Prikaži traku
        </label>
        <label className="chk">
          <input type="checkbox" name="maintenance" defaultChecked={s?.maintenance} /> Režim održavanja (pauzira porudžbine)
        </label>
      </ActionForm>
    </>
  );
}
