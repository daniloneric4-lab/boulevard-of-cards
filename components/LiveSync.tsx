'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { NOTIF } from '@/lib/format';

type Toast = { id: string; title: string; text?: string; href?: string };
type Notif = { id: string; type: string; payload: Record<string, string> | null };
type Msg = { id: string; sender_id: string; conversation_id: string; body?: string | null };

/**
 * Uživo: obaveštenja, poruke i ponude na aukcijama stižu bez osvežavanja strane.
 * Glavni kanal je Supabase Realtime; pored toga na svakih 5 s proveravamo da li ima nečeg novog,
 * pa stvari stižu i kad mreža ili pregledač prekinu vezu uživo.
 */
export default function LiveSync({ userId }: { userId: string }) {
  const router = useRouter();
  const path = usePathname();
  const pathRef = useRef(path);
  pathRef.current = path;
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();
    let alive = true;
    let ch: ReturnType<typeof supabase.channel> | null = null;
    const lastNotif = { id: '' };
    const lastMsg = { id: '' };

    const refresh = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 200);
    };
    const push = (t: Toast) => {
      setToasts((x) => [...x.slice(-2), t]);
      setTimeout(() => setToasts((x) => x.filter((y) => y.id !== t.id)), 7000);
    };
    const onNotif = (n: Notif) => {
      if (seen.current.has(n.id)) return;
      seen.current.add(n.id);
      lastNotif.id = n.id;
      if (n.type !== 'message') {
        const def = NOTIF[n.type] ?? { title: 'Novo obaveštenje' };
        const p = n.payload ?? {};
        push({ id: n.id, title: def.title, text: [p.username ? '@' + p.username : null, p.title].filter(Boolean).join(' · '), href: def.href?.(p) });
      }
      refresh();
    };
    const onMsg = (m: Msg) => {
      if (seen.current.has(m.id)) return;
      seen.current.add(m.id);
      lastMsg.id = m.id;
      if (m.sender_id !== userId && !pathRef.current.startsWith(`/poruke/${m.conversation_id}`)) {
        push({ id: m.id, title: 'Nova poruka', text: m.body?.slice(0, 80) ?? undefined, href: `/poruke/${m.conversation_id}` });
      }
      refresh();
    };

    // rezervna provera: najnovije obaveštenje i poruka
    const poll = async () => {
      if (document.hidden) return;
      const [{ data: n }, { data: m }] = await Promise.all([
        supabase.from('notifications').select('id, type, payload').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('messages').select('id, sender_id, conversation_id, body').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (!alive) return;
      if (n && lastNotif.id && n.id !== lastNotif.id) onNotif(n as Notif);
      else if (n && !lastNotif.id) {
        lastNotif.id = n.id;
        seen.current.add(n.id);
      }
      if (m && lastMsg.id && m.id !== lastMsg.id) onMsg(m as Msg);
      else if (m && !lastMsg.id) {
        lastMsg.id = m.id;
        seen.current.add(m.id);
      }
    };

    (async () => {
      // veza uživo mora da zna ko je prijavljen, inače baza ne šalje lične događaje
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) await supabase.realtime.setAuth(data.session.access_token);
      await poll();
      if (!alive) return;
      ch = supabase
        .channel(`live-${userId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (p) => onNotif(p.new as Notif))
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (p) => onMsg(p.new as Msg))
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'auctions' }, (p) => {
          const a = p.new as { listing_id: string };
          if (pathRef.current.includes(a.listing_id) || pathRef.current.startsWith('/aukcije')) refresh();
        })
        .subscribe();
    })();

    const iv = setInterval(poll, 5000);
    const onFocus = () => poll();
    window.addEventListener('focus', onFocus);
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s?.access_token) supabase.realtime.setAuth(s.access_token);
    });

    return () => {
      alive = false;
      clearInterval(iv);
      window.removeEventListener('focus', onFocus);
      sub.subscription.unsubscribe();
      if (ch) supabase.removeChannel(ch);
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
