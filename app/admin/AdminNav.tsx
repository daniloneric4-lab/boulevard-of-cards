'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS: [string, string, keyof Counts | null][] = [
  ['/admin', 'Pregled', null],
  ['/admin/proizvodi', 'Proizvodi i zalihe', 'proizvodi'],
  ['/admin/porudzbine', 'Porudžbine', 'porudzbine'],
  ['/admin/izdanja', 'Izdanja', 'izdanja'],
  ['/admin/izvlacenja', 'Izvlačenja', 'izvlacenja'],
  ['/admin/live', 'Live otvaranja', null],
  ['/admin/usluge', 'Usluge', 'usluge'],
  ['/admin/sporovi', 'Sporovi i prijave', 'sporovi'],
  ['/admin/isplate', 'Isplate', 'isplate'],
  ['/admin/korisnici', 'Korisnici', null],
  ['/admin/katalog', 'Katalog', null],
  ['/admin/podrska', 'Poruke podrške', 'podrska'],
  ['/admin/podesavanja', 'Podešavanja', null],
  ['/admin/dnevnik', 'Dnevnik', null],
];
type Counts = { proizvodi: number; porudzbine: number; izdanja: number; izvlacenja: number; usluge: number; sporovi: number; isplate: number; podrska: number };

export default function AdminNav({ counts }: { counts: Counts }) {
  const path = usePathname();
  return (
    <nav className="adm-nav" aria-label="Admin meni">
      {ITEMS.map(([href, label, key]) => {
        const on = href === '/admin' ? path === '/admin' : path.startsWith(href);
        const n = key ? counts[key] : 0;
        return (
          <Link key={href} href={href} className={on ? 'on' : undefined} aria-current={on ? 'page' : undefined}>
            {label}
            {n ? <span className="pill pill-red">{n}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
