import { createClient } from '@/lib/supabase/server';
import { KIND, PRODUCT_MODE, SPORTS, date, money, productImage, sportLabel } from '@/lib/format';
import ActionForm from '@/components/ActionForm';
import { addReceipt, adjustStock, receiveStock, saveProduct } from '../actions';

type P = {
  id: string;
  name: string;
  kind: string;
  sport: string;
  mode: string;
  price_cents: number | null;
  currency: string;
  stock: number;
  low_stock_at: number;
  max_per_order: number | null;
  description: string | null;
  image_path: string | null;
  is_visible: boolean;
};

function ProductFields({ p }: { p?: P }) {
  return (
    <div className="stack">
      {p ? <input type="hidden" name="id" value={p.id} /> : null}
      <label className="fld">
        Naziv
        <input className="inp" name="name" required defaultValue={p?.name} placeholder="npr. 2025-26 Topps Chrome UCL Hobby" />
      </label>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
        <label className="fld">
          Vrsta
          <select className="inp" name="kind" defaultValue={p?.kind ?? 'sealed_box'}>
            {Object.entries(KIND).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="fld">
          Sport
          <select className="inp" name="sport" defaultValue={p?.sport ?? 'football'}>
            {SPORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="fld">
          Prodaja
          <select className="inp" name="mode" defaultValue={p?.mode ?? 'in_stock'}>
            {Object.entries(PRODUCT_MODE).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="fld">
          Cena (RSD)
          <input className="inp" name="price" inputMode="decimal" defaultValue={p?.price_cents != null ? String(p.price_cents / 100) : ''} />
        </label>
        {!p ? (
          <label className="fld">
            Početno stanje
            <input className="inp" name="stock" type="number" min={0} defaultValue={0} />
          </label>
        ) : null}
        <label className="fld">
          Upozori kad ostane
          <input className="inp" name="low_stock_at" type="number" min={0} defaultValue={p?.low_stock_at ?? 3} />
        </label>
        <label className="fld">
          Najviše po porudžbini
          <input className="inp" name="max_per_order" type="number" min={1} defaultValue={p?.max_per_order ?? ''} />
        </label>
      </div>
      <label className="fld">
        Opis
        <textarea className="inp" name="description" defaultValue={p?.description ?? ''} />
      </label>
      <label className="fld">
        Slika (JPG, PNG ili WEBP, do 5 MB)
        <input className="inp" name="image" type="file" accept="image/jpeg,image/png,image/webp" />
      </label>
      <label className="chk">
        <input type="checkbox" name="is_visible" defaultChecked={p ? p.is_visible : true} /> Vidljiv u prodavnici
      </label>
    </div>
  );
}

export default async function AdminProducts() {
  const supabase = await createClient();
  const [{ data: products }, { data: receipts }] = await Promise.all([
    supabase.from('products').select('*').order('created_at', { ascending: false }),
    supabase.from('stock_receipts').select('id, quantity_expected, quantity_received, supplier, tracking_number, expected_at, received_at, note, products(name)').order('created_at', { ascending: false }).limit(30),
  ]);
  const list = (products ?? []) as P[];

  return (
    <>
      <h1 style={{ fontSize: 'clamp(28px,4vw,40px)' }}>Proizvodi i zalihe</h1>

      <details className="box">
        <summary>+ Novi proizvod</summary>
        <div style={{ marginTop: 16 }}>
          <ActionForm action={saveProduct} submit="Dodaj proizvod">
            <ProductFields />
          </ActionForm>
        </div>
      </details>

      {list.length ? (
        <div className="stack">
          {list.map((p) => {
            const img = productImage(p.image_path);
            const low = p.mode === 'in_stock' && p.stock <= p.low_stock_at;
            return (
              <div key={p.id} className="card stack">
                <div className="row between" style={{ alignItems: 'flex-start' }}>
                  <div className="row" style={{ alignItems: 'flex-start' }}>
                    {img ? <img src={img} alt="" style={{ width: 72, height: 54, objectFit: 'cover', borderRadius: 8 }} /> : null}
                    <div className="stack" style={{ gap: 4 }}>
                      <strong>{p.name}</strong>
                      <div className="row" style={{ gap: 6 }}>
                        <span className="pill">{sportLabel(p.sport)}</span>
                        <span className="pill">{PRODUCT_MODE[p.mode]}</span>
                        {!p.is_visible ? <span className="pill pill-dark">Sakriven</span> : null}
                        {low ? <span className="pill pill-red">Malo na stanju</span> : null}
                      </div>
                      <span className="mono muted" style={{ fontSize: 13 }}>
                        {money(p.price_cents, p.currency)}
                      </span>
                    </div>
                  </div>
                  <form action={adjustStock} className="row" style={{ gap: 6 }}>
                    <input type="hidden" name="id" value={p.id} />
                    <label className="fld" style={{ fontWeight: 500 }}>
                      Stanje
                      <input className="inp" type="number" name="stock" min={0} defaultValue={p.stock} style={{ width: 90 }} />
                    </label>
                    <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-end' }}>
                      Postavi
                    </button>
                  </form>
                </div>
                <details>
                  <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Izmeni</summary>
                  <div style={{ marginTop: 12 }}>
                    <ActionForm action={saveProduct} submit="Sačuvaj izmene">
                      <ProductFields p={p} />
                    </ActionForm>
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="alert alert-info">Još nema proizvoda. Dodaj prvi gore.</div>
      )}

      <h2>Prijem robe</h2>
      {list.length ? (
        <details className="box">
          <summary>+ Upiši pošiljku koja stiže</summary>
          <div style={{ marginTop: 16 }}>
            <ActionForm action={addReceipt} submit="Upiši pošiljku">
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                <label className="fld">
                  Proizvod
                  <select className="inp" name="product_id" required>
                    {list.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="fld">
                  Količina
                  <input className="inp" type="number" name="quantity_expected" min={1} defaultValue={1} required />
                </label>
                <label className="fld">
                  Dobavljač
                  <input className="inp" name="supplier" />
                </label>
                <label className="fld">
                  Broj za praćenje
                  <input className="inp" name="tracking_number" />
                </label>
                <label className="fld">
                  Očekuje se
                  <input className="inp" type="date" name="expected_at" />
                </label>
              </div>
              <label className="fld">
                Napomena
                <input className="inp" name="note" />
              </label>
            </ActionForm>
          </div>
        </details>
      ) : null}
      {receipts && receipts.length ? (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Proizvod</th>
                <th>Kom.</th>
                <th>Dobavljač / praćenje</th>
                <th>Očekuje se</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((r) => (
                <tr key={r.id}>
                  <td>{(r.products as unknown as { name: string } | null)?.name}</td>
                  <td className="mono">{r.quantity_received ?? r.quantity_expected}</td>
                  <td>
                    {r.supplier ?? '—'}
                    {r.tracking_number ? <div className="mono" style={{ fontSize: 12 }}>{r.tracking_number}</div> : null}
                  </td>
                  <td className="mono">{date(r.expected_at)}</td>
                  <td>
                    {r.received_at ? (
                      <span className="pill pill-green">Stiglo {date(r.received_at)}</span>
                    ) : (
                      <form action={receiveStock} className="row" style={{ gap: 6 }}>
                        <input type="hidden" name="id" value={r.id} />
                        <label>
                          <span style={{ position: 'absolute', left: -9999 }}>Stiglo komada</span>
                          <input className="inp" type="number" name="quantity" min={0} defaultValue={r.quantity_expected} style={{ width: 80 }} />
                        </label>
                        <button className="btn btn-red btn-sm">Stiglo</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
