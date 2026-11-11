'use client';
import { useState } from 'react';

export default function GradeCalc() {
  const [raw, setRaw] = useState('50');
  const [psa, setPsa] = useState('180');
  const [p, setP] = useState('40');
  const cost = 35;
  const r = Number(raw) || 0;
  const g = Number(psa) || 0;
  const pr = Math.min(100, Math.max(0, Number(p) || 0)) / 100;
  const expected = pr * g + (1 - pr) * r * 1.05 - cost;
  const gain = Math.round(expected - r);
  return (
    <div className="card stack">
      <h3>Kalkulator: isplati li se gradiranje</h3>
      <div className="row" style={{ gap: 10 }}>
        <label className="fld" style={{ flex: '1 1 150px' }}>
          Vrednost bez ocene (€)
          <input className="inp" inputMode="decimal" value={raw} onChange={(e) => setRaw(e.target.value)} />
        </label>
        <label className="fld" style={{ flex: '1 1 150px' }}>
          Vrednost sa PSA 10 (€)
          <input className="inp" inputMode="decimal" value={psa} onChange={(e) => setPsa(e.target.value)} />
        </label>
        <label className="fld" style={{ flex: '1 1 120px' }}>
          Šansa za 10 (%)
          <input className="inp" inputMode="numeric" value={p} onChange={(e) => setP(e.target.value)} />
        </label>
      </div>
      <div className={'alert ' + (gain > 0 ? 'alert-ok' : 'alert-info')} role="status">
        <b>{gain > 0 ? `Isplati se: oko +${gain} € očekivano` : 'Verovatno se ne isplati'}</b>
        <div style={{ fontSize: 13 }}>Računato sa oko {cost} € troška gradiranja i slanja. Pre slanja sa fotografije proveravamo centriranje i vidljiva oštećenja.</div>
      </div>
    </div>
  );
}
