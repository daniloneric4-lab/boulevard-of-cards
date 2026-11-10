export const SPORTS: { key: string; label: string }[] = [
  { key: 'football', label: 'Fudbal' },
  { key: 'f1', label: 'F1' },
  { key: 'nba', label: 'NBA' },
  { key: 'nfl', label: 'NFL' },
  { key: 'other', label: 'Oprema i ostalo' },
];

export const sportLabel = (k: string | null | undefined) => SPORTS.find((s) => s.key === k)?.label ?? 'Ostalo';

export function money(cents: number | null | undefined, currency = 'RSD') {
  if (cents == null) return 'Cena uskoro';
  const v = cents / 100;
  return `${v.toLocaleString('sr-Latn-RS', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency}`;
}

export function date(d: string | null | undefined, withTime = false) {
  if (!d) return '—';
  const x = new Date(d);
  return x.toLocaleString('sr-Latn-RS', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    timeZone: 'Europe/Belgrade',
  });
}

export const ORDER_STATUS: Record<string, string> = {
  pending_payment: 'Čeka uplatu',
  paid: 'Plaćeno',
  shipped: 'Poslato',
  delivered: 'Isporučeno',
  completed: 'Završeno',
  disputed: 'Spor',
  refunded: 'Novac vraćen',
  cancelled: 'Otkazano',
};

export const PRODUCT_MODE: Record<string, string> = {
  in_stock: 'Odmah dostupno',
  preorder: 'Preorder',
  draw: 'Izvlačenje',
  sold_out: 'Rasprodato',
};

export const KIND: Record<string, string> = {
  sealed_box: 'Kutija',
  card: 'Kartica',
  graded_card: 'Gradirana kartica',
  lot: 'Lot',
  supply: 'Oprema',
};

export const PAYMENT: Record<string, string> = {
  ips_qr: 'IPS QR (instant)',
  bank_transfer: 'Uplata na račun',
  cash_on_delivery: 'Pouzećem',
  card: 'Kartica',
  store_credit: 'Kredit na sajtu',
};

export function productImage(path: string | null | undefined) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${path}`;
}
