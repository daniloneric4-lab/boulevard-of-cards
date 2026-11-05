'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Početna' },
  { href: '/prodavnica', label: 'Prodavnica' },
];

export default function NavLinks() {
  const path = usePathname();
  return (
    <nav aria-label="Glavni meni">
      {LINKS.map((l) => {
        const on = l.href === '/' ? path === '/' : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} className={on ? 'on' : undefined} aria-current={on ? 'page' : undefined}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
