'use client';
import { useActionState, useRef, useState } from 'react';
import { sendMessage, sendOffer, proposeTrade } from '@/app/_act/market';

type Item = { id: string; title: string };
const QUICK = ['Da li je još dostupna?', 'Možeš li da pošalješ još slika?', 'Kada možeš da pošalješ?'];

export default function Composer({ conversationId, myItems, theirItems }: { conversationId: string; myItems: Item[]; theirItems: Item[] }) {
  const [tab, setTab] = useState<'msg' | 'offer' | 'trade'>('msg');
  const [offerState, offerRun, offerPending] = useActionState(sendOffer, { ok: false, msg: '' });
  const [tradeState, tradeRun, tradePending] = useActionState(proposeTrade, { ok: false, msg: '' });
  const ref = useRef<HTMLFormElement>(null);
  const [text, setText] = useState('');
  return (
    <div className="card stack">
      <div className="chips" role="tablist">
        {[
          ['msg', 'Poruka'],
          ['offer', 'Pošalji ponudu'],
          ['trade', 'Predloži razmenu'],
        ].map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={'chip' + (tab === k ? ' on' : '')} onClick={() => setTab(k as typeof tab)}>
            {l}
          </button>
        ))}
      </div>
      {tab === 'msg' ? (
        <form
          ref={ref}
          action={async (f) => {
            await sendMessage(f);
            setText('');
          }}
          className="stack"
          style={{ gap: 8 }}
        >
          <input type="hidden" name="conversation_id" value={conversationId} />
          <div className="row" style={{ gap: 6 }}>
            {QUICK.map((q) => (
              <button key={q} type="button" className="chip" style={{ minHeight: 34, fontSize: 13 }} onClick={() => setText(q)}>
                {q}
              </button>
            ))}
          </div>
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <label className="sr-only" htmlFor="msg">
              Poruka
            </label>
            <input id="msg" className="inp" name="body" value={text} onChange={(e) => setText(e.target.value)} placeholder="Napiši poruku…" maxLength={2000} autoComplete="off" />
            <button className="btn btn-dark" disabled={!text.trim()}>
              Pošalji
            </button>
          </div>
        </form>
      ) : tab === 'offer' ? (
        <form action={offerRun} className="stack" style={{ gap: 10 }}>
          <input type="hidden" name="conversation_id" value={conversationId} />
          <div className="row" style={{ gap: 10 }}>
            <label className="fld" style={{ flex: '1 1 160px' }}>
              Tvoja ponuda (RSD)
              <input className="inp" name="amount" inputMode="decimal" required />
            </label>
            <label className="fld" style={{ flex: '1 1 120px' }}>
              Ponuda važi
              <select className="inp" name="hours" defaultValue="24">
                <option value="6">6 sati</option>
                <option value="24">24 sata</option>
                <option value="48">48 sati</option>
              </select>
            </label>
            <label className="fld" style={{ flex: '1 1 140px' }}>
              Slanje
              <select className="inp" name="shipping" defaultValue="courier">
                <option value="courier">Kurir</option>
                <option value="pickup">Lično</option>
              </select>
            </label>
          </div>
          <span className="muted" style={{ fontSize: 13 }}>
            Kad prodavac prihvati, plaćaš odmah, a novac čeka dok ne potvrdiš prijem.
          </span>
          <button className="btn btn-red" disabled={offerPending} style={{ alignSelf: 'flex-start' }}>
            {offerPending ? 'Šaljem…' : 'Pošalji ponudu'}
          </button>
          {offerState.msg ? <div className={'alert ' + (offerState.ok ? 'alert-ok' : 'alert-err')}>{offerState.msg}</div> : null}
        </form>
      ) : (
        <form action={tradeRun} className="stack" style={{ gap: 10 }}>
          <input type="hidden" name="conversation_id" value={conversationId} />
          <div className="two" style={{ gap: 16 }}>
            <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0, gap: 6 }}>
              <legend style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Daješ (iz tvoje kolekcije)</legend>
              {myItems.length ? (
                myItems.map((i) => (
                  <label key={i.id} className="chk">
                    <input type="checkbox" name="give" value={i.id} /> {i.title}
                  </label>
                ))
              ) : (
                <span className="muted" style={{ fontSize: 13 }}>
                  Kolekcija ti je prazna.
                </span>
              )}
            </fieldset>
            <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0, gap: 6 }}>
              <legend style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Dobijaš (iz njegove vitrine)</legend>
              {theirItems.length ? (
                theirItems.map((i) => (
                  <label key={i.id} className="chk">
                    <input type="checkbox" name="get" value={i.id} /> {i.title}
                  </label>
                ))
              ) : (
                <span className="muted" style={{ fontSize: 13 }}>
                  Nema javnih kartica.
                </span>
              )}
            </fieldset>
          </div>
          <label className="fld" style={{ maxWidth: 260 }}>
            Doplata sa tvoje strane (RSD, nije obavezno)
            <input className="inp" name="topup" inputMode="decimal" />
          </label>
          <button className="btn btn-red" disabled={tradePending} style={{ alignSelf: 'flex-start' }}>
            {tradePending ? 'Šaljem…' : 'Pošalji predlog razmene'}
          </button>
          {tradeState.msg ? <div className={'alert ' + (tradeState.ok ? 'alert-ok' : 'alert-err')}>{tradeState.msg}</div> : null}
        </form>
      )}
      <span className="muted" style={{ fontSize: 12 }}>
        Dogovor i plaćanje ostaju na platformi, tada važi zaštita kupca. Poruke su dokaz u slučaju spora.
      </span>
    </div>
  );
}
