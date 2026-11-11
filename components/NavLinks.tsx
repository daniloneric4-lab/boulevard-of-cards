'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/prodavnica', label: 'Prodavnica' },
  { href: '/katalog', label: 'Katalog' },
  { href: '/izvlacenja', label: 'Izvlačenja' },
  { href: '/aukcije', label: 'Aukcije' },
  { href: '/live', label: 'Live' },
  { href: '/usluge', label: 'Usluge' },
  { href: '/kolekcija', label: 'Kolekcija' },
];

export default function NavLinks() {
  const path = usePathname();
  return (
    <nav aria-label="Glavni meni">
      {LINKS.map((l) => {
        const on = path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} className={on ? 'on' : undefined} aria-current={on ? 'page' : undefined}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
