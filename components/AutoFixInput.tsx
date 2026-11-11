'use client';
import { useState } from 'react';
import { autocorrect } from '@/lib/spell';

/** Polje koje posle kucanja (kad izađeš iz polja) samo ispravi naziv kartice ili kutije. */
export default function AutoFixInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { defaultValue, onBlur, ...rest } = props;
  const [val, setVal] = useState(String(defaultValue ?? ''));
  const [prev, setPrev] = useState<string | null>(null);
  return (
    <>
      <input
        {...rest}
        value={val}
        onChange={(e) => {
          setVal(e.target.value);
          setPrev(null);
        }}
        onBlur={(e) => {
          const fixed = autocorrect(val);
          if (fixed !== val) {
            setPrev(val);
            setVal(fixed);
          }
          onBlur?.(e);
        }}
      />
      {prev !== null ? <FixNote onUndo={() => (setVal(prev), setPrev(null))} /> : null}
    </>
  );
}

export function FixNote({ onUndo }: { onUndo: () => void }) {
  return (
    <span role="status" style={{ fontSize: 12, color: 'var(--bc-gray-dk)' }}>
      Ispravili smo naziv.{' '}
      <button type="button" onClick={onUndo} className="lnk" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', fontSize: 12 }}>
        Vrati kako sam napisao
      </button>
    </span>
  );
}
