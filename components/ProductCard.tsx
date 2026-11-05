import Link from 'next/link';
import { money, sportLabel, productImage, PRODUCT_MODE, KIND } from '@/lib/format';
import AddToCart from './AddToCart';

export type Product = {
  id: string;
  name: string;
  kind: string;
  sport: string;
  mode: string;
  price_cents: number | null;
  currency: string;
  stock: number;
  low_stock_at: number;
  image_path: string | null;
  description: string | null;
};

export default function ProductCard({ p }: { p: Product }) {
  const img = productImage(p.image_path);
  const canBuy = p.mode === 'in_stock' && p.stock > 0 && p.price_cents != null;
  return (
    <article className="prod">
      <div className="prod-img">
        {img ? <img src={img} alt={p.name} loading="lazy" /> : <img className="ph" src="/boc-b.png" alt="" aria-hidden="true" />}
        <span className="pill pill-dark" style={{ position: 'absolute', left: 12, top: 12 }}>
          {sportLabel(p.sport)}
        </span>
      </div>
      <div className="prod-body">
        <div className="row" style={{ gap: 6 }}>
          <span className="pill">{KIND[p.kind] ?? p.kind}</span>
          <span className={'pill ' + (p.mode === 'sold_out' ? '' : p.mode === 'in_stock' ? 'pill-green' : 'pill-red')}>
            {PRODUCT_MODE[p.mode] ?? p.mode}
          </span>
        </div>
        <h3>{p.name}</h3>
        {p.description ? (
          <p className="muted" style={{ fontSize: 14 }}>
            {p.description.length > 110 ? p.description.slice(0, 110) + '…' : p.description}
          </p>
        ) : null}
        <div style={{ flex: 1 }} />
        <div className="row between">
          <span className="price">{money(p.price_cents, p.currency)}</span>
          {p.mode === 'in_stock' && p.stock > 0 && p.stock <= p.low_stock_at ? (
            <span className="mono" style={{ fontSize: 12, color: 'var(--bc-red)' }}>
              Još {p.stock} kom.
            </span>
          ) : null}
        </div>
        {canBuy ? (
          <AddToCart productId={p.id} />
        ) : (
          <Link href="/prijava" className="btn btn-ghost" aria-disabled="true" style={{ pointerEvents: 'none', opacity: 0.6 }}>
            {p.mode === 'sold_out' || p.stock === 0 ? 'Rasprodato' : 'Uskoro'}
          </Link>
        )}
      </div>
    </article>
  );
}
