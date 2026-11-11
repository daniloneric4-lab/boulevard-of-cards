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

export const GRADER: Record<string, string> = { raw: 'RAW', psa: 'PSA', bgs: 'BGS', sgc: 'SGC', pca: 'PCA', cgc: 'CGC' };
export function gradeLabel(grader?: string | null, grade?: number | string | null) {
  if (!grader || grader === 'raw') return 'RAW';
  return `${GRADER[grader] ?? grader.toUpperCase()}${grade != null ? ' ' + Number(grade) : ''}`;
}

export const LISTING_MODE: Record<string, string> = {
  fixed: 'Kupi odmah',
  auction: 'Aukcija',
  offers: 'Primam ponude',
  trade: 'Za razmenu',
  showcase: 'Samo izloženo',
};

export const SERVICE: Record<string, string> = {
  grading: 'Gradiranje',
  vault: 'Sef',
  consignment: 'Prodaja za tebe',
  buyback: 'Otkup',
};

export const SERVICE_STATUS: Record<string, string> = {
  submitted: 'Prijavljeno',
  received: 'Primljeno kod nas',
  sent: 'Poslato na ocenu',
  graded: 'Ocenjeno',
  returned: 'Vraćeno',
  cancelled: 'Otkazano',
};

export const DRAW_STATUS: Record<string, string> = {
  scheduled: 'Uskoro',
  open: 'Prijave otvorene',
  closed: 'Prijave zatvorene',
  drawn: 'Izvučeno',
  finished: 'Završeno',
};

export function timeLeft(end: string | null | undefined) {
  if (!end) return '—';
  const s = Math.floor((new Date(end).getTime() - Date.now()) / 1000);
  if (s <= 0) return 'Završeno';
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
}

export function listingImage(path: string | null | undefined) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-images/${path}`;
}

export function avatarUrl(path: string | null | undefined) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${path}`;
}

export const initials = (s: string | null | undefined) =>
  (s || '?').replace(/^@/, '').split(/[\s_.-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';

export const toCents = (v: FormDataEntryValue | null) => {
  const s = String(v ?? '').replace(/\s/g, '').replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
};

export const NOTIF: Record<string, { title: string; href?: (p: Record<string, string>) => string }> = {
  outbid: { title: 'Neko te je nadmašio na aukciji', href: (p) => `/oglas/${p.listing_id}` },
  auction_won: { title: 'Pobedio si na aukciji', href: () => '/profil' },
  auction_sold: { title: 'Tvoja aukcija je prodata', href: () => '/prodavac' },
  auction_unsold: { title: 'Aukcija je završena bez prodaje', href: () => '/prodavac' },
  sold: { title: 'Prodao si karticu', href: () => '/prodavac' },
  shipped: { title: 'Tvoja porudžbina je poslata', href: () => '/profil' },
  payout_ready: { title: 'Isplata je spremna', href: () => '/prodavac' },
  offer_received: { title: 'Stigla ti je ponuda', href: (p) => `/poruke/${p.conversation_id}` },
  counter_offer: { title: 'Stigla ti je kontraponuda', href: (p) => `/poruke/${p.conversation_id}` },
  offer_accepted: { title: 'Ponuda je prihvaćena', href: (p) => `/poruke/${p.conversation_id}` },
  trade_received: { title: 'Stigao ti je predlog razmene', href: (p) => `/poruke/${p.conversation_id}` },
  draw_won: { title: 'Izvučen si! Imaš 24 sata da platiš', href: (p) => `/izvlacenja/${p.draw_id}` },
  draw_waitlist: { title: 'Na rezervnoj si listi izvlačenja', href: (p) => `/izvlacenja/${p.draw_id}` },
  message: { title: 'Nova poruka', href: (p) => `/poruke/${p.conversation_id}` },
};
