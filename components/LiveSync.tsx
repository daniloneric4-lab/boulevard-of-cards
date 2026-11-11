'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { NOTIF } from '@/lib/format';

type Toast = { id: string; title: string; text?: string; href?: string };

/** Uživo: nova obaveštenja, poruke i ponude na aukcijama stižu bez osvežavanja strane. */
export default function LiveSync({ userId }: { userId: string }) {
  const router = useRouter();
  const path = usePathname();
  const pathRef = useRef(path);
  pathRef.current = path;
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const refresh = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 250);
    };
    const push = (t: Toast) => {
      setToasts((x) => [...x.slice(-2), t]);
      setTimeout(() => setToasts((x) => x.filter((y) => y.id !== t.id)), 6000);
    };
    const ch = supabase
      .channel(`live-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (p) => {
        const n = p.new as { id: string; type: string; payload: Record<string, string> };
        if (n.type === 'message') return refresh();
        const def = NOTIF[n.type] ?? { title: 'Novo obaveštenje' };
        push({ id: n.id, title: def.title, text: n.payload?.title, href: def.href?.(n.payload ?? {}) });
        refresh();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (p) => {
        const m = p.new as { id: string; sender_id: string; conversation_id: string; body?: string };
        if (m.sender_id !== userId && !pathRef.current.startsWith(`/poruke/${m.conversation_id}`)) {
          push({ id: m.id, title: 'Nova poruka', text: m.body?.slice(0, 80), href: `/poruke/${m.conversation_id}` });
        }
        refresh();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'auctions' }, (p) => {
        const a = p.new as { listing_id: string };
        if (pathRef.current.includes(a.listing_id) || pathRef.current.startsWith('/aukcije')) refresh();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, router]);

  if (!toasts.length) return null;
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => {
        const body = (
          <>
            <b>{t.title}</b>
            {t.text ? <span>{t.text}</span> : null}
          </>
        );
        return t.href ? (
          <Link key={t.id} href={t.href} className="toast" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}>
            {body}
          </Link>
        ) : (
          <div key={t.id} className="toast">
            {body}
          </div>
        );
      })}
    </div>
  );
}
