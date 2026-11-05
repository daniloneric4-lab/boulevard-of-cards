'use client';
import { useActionState } from 'react';
import { addToCart } from '@/app/actions';

export default function AddToCart({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState(addToCart, { ok: false, msg: '' });
  return (
    <form action={action} className="stack" style={{ gap: 6 }}>
      <input type="hidden" name="product_id" value={productId} />
      <button className="btn btn-red" disabled={pending}>
        {pending ? 'Dodajem…' : 'Dodaj u korpu'}
      </button>
      {state.msg ? (
        <span role="status" style={{ fontSize: 13, color: state.ok ? 'var(--bc-green)' : '#8a1c13' }}>
          {state.msg}
        </span>
      ) : null}
    </form>
  );
}
