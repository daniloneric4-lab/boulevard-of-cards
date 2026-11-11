import { redirect } from 'next/navigation';

// Katalog je sada Lista želja
export default async function Catalog({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = new URLSearchParams(await searchParams).toString();
  redirect('/lista-zelja' + (sp ? '?' + sp : ''));
}
