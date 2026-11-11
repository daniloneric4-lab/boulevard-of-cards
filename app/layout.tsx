import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import Header from '@/components/Header';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: { default: 'Boulevard of Cards', template: '%s · Boulevard of Cards' },
  description: 'Topps kartice i kutije za kolekcionare na Balkanu: zvanična prodavnica, izvlačenja, aukcije i razmena.',
  icons: { icon: '/boc-b.png' },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from('platform_settings')
    .select('banner_on, banner_text, maintenance')
    .eq('id', 1)
    .single();

  return (
    <html lang="sr-Latn">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {settings?.banner_on && settings.banner_text ? <div className="banner">{settings.banner_text}</div> : null}
        {settings?.maintenance ? (
          <div className="banner" style={{ background: 'var(--bc-carbon)' }}>
            Sajt je u održavanju. Porudžbine su privremeno pauzirane.
          </div>
        ) : null}
        <Header />
        <main className="main">{children}</main>
        <footer className="ftr">
          <div className="ftr-in">
            <Link href="/" aria-label="Boulevard of Cards početna">
              <img src="/boc-b.png" alt="Boulevard of Cards" style={{ height: 28 }} />
            </Link>
            <nav className="ftr-links" aria-label="Linkovi u podnožju">
              <Link href="/katalog">Katalog</Link>
              <Link href="/prodavac">Za prodavce</Link>
              <Link href="/pomoc">Pomoć i pravila</Link>
              <Link href="/recenzije">Recenzije</Link>
              <Link href="/usluge">Usluge</Link>
              <Link href="/prodaj">Prodaj karticu</Link>
            </nav>
            <span className="mono" style={{ fontSize: 12 }}>
              IPS · Kartica · Uplatnica · Pouzeće · © {new Date().getFullYear()}
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
