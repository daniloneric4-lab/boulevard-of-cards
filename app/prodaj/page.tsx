import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import PageHero from '@/components/PageHero';
import SellForm from './SellForm';

export const metadata: Metadata = { title: 'Prodaj karticu' };
export const dynamic = 'force-dynamic';

export default async function Sell({ searchParams }: { searchParams: Promise<{ title?: string; sport?: string; mode?: string }> }) {
  const sp = await searchParams;
  const { user } = await requireUser('/prodaj');
  return (
    <>
      <PageHero kicker="Prodaj ili izloži karticu" title="Oglas za 30 sekundi" lead="Slikaj karticu, proveri podatke i izaberi kako je nudiš. Plaćanje i slanje idu preko platforme, uz zaštitu za obe strane." />
      <div className="page">
        <SellForm initialTitle={sp.title} initialSport={sp.sport} initialMode={sp.mode} userId={user.id} />
      </div>
    </>
  );
}
