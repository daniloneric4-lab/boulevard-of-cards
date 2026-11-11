'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { signOut } from '@/app/actions';
import { avatarUrl, initials } from '@/lib/format';
import type { StatusItem } from '@/lib/status';

export default function UserMenu({
  username,
  name,
  avatar,
  isAdmin,
  unreadMsgs,
  status,
}: {
  username: string;
  name: string;
  avatar: string | null;
  isAdmin: boolean;
  unreadMsgs: number;
  status: StatusItem[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  const src = avatarUrl(avatar);
  const items: [string, string, number?][] = [
    [`/u/${username}`, 'Moj profil'],
    ['/kolekcija', 'Moja kolekcija'],
    ['/profil', 'Porudžbine, prijave, preorderi'],
    ['/poruke', 'Poruke', unreadMsgs],
    ['/prodavac', 'Panel prodavca'],
    ['/prodaj', 'Prodaj karticu'],
    ['/podesavanja', 'Podešavanja'],
  ];
  return (
    <div className="umenu" ref={ref}>
      <button type="button" className="umenu-btn" aria-haspopup="menu" aria-expanded={open} aria-label={`Nalog @${username}`} onClick={() => setOpen((o) => !o)}>
        <span className="ava" style={{ width: 36, height: 36, fontSize: 14 }}>
          {src ? <img src={src} alt="" /> : initials(name || username)}
        </span>
        {unreadMsgs ? <span className="dot-badge" aria-hidden="true" /> : null}
      </button>
      {open ? (
        <div className="umenu-pop" role="menu">
          <div className="umenu-head">
            <b>{name || username}</b>
            <span className="mono muted">@{username}</span>
          </div>
          <div className="umenu-status">
            <span className="umenu-st-h">
              Moj status
              <Link href="/profil#status" className="lnk" style={{ fontSize: 12 }}>
                Sve →
              </Link>
            </span>
            <div className="umenu-st-grid">
              {status.map((m) => (
                <Link key={m.t} href={m.href} className={'umenu-st' + (m.hot ? ' hot' : '')}>
                  <b>{m.v}</b>
                  <span>{m.t}</span>
                </Link>
              ))}
            </div>
          </div>
          {items.map(([href, label, n]) => (
            <Link key={href} href={href} role="menuitem">
              {label}
              {n ? <span className="pill pill-red">{n}</span> : null}
            </Link>
          ))}
          {isAdmin ? (
            <Link href="/admin" role="menuitem" style={{ color: 'var(--bc-red-dk)' }}>
              Admin panel
            </Link>
          ) : null}
          <form action={signOut}>
            <button role="menuitem" className="umenu-out">
              Odjavi se
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
