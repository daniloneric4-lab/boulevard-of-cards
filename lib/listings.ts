export const LISTING_SELECT =
  'id, title, mode, status, price_cents, currency, sport, kind, city, accepts_offers, is_official, is_checked_box, created_at, seller_id, seller:profiles!listings_seller_id_fkey(username, display_name, is_verified, avatar_url), auctions(current_bid_cents, start_price_cents, min_increment_cents, ends_at, bid_count, reserve_price_cents, current_bidder_id), listing_images(storage_path, position), collection_items(grader, grade, cert_number, passport_code)';

type One<T> = T | T[] | null | undefined;
export const one = <T,>(x: One<T>): T | null => (Array.isArray(x) ? x[0] ?? null : x ?? null);

export type ListingRow = {
  id: string;
  title: string;
  mode: string;
  status: string;
  price_cents: number | null;
  currency: string;
  sport: string;
  kind: string;
  city: string | null;
  accepts_offers: boolean;
  is_official: boolean;
  is_checked_box: boolean;
  created_at: string;
  seller_id: string;
  seller: One<{ username: string; display_name: string | null; is_verified: boolean; avatar_url: string | null }>;
  auctions: One<{ current_bid_cents: number | null; start_price_cents: number; min_increment_cents: number; ends_at: string; bid_count: number; reserve_price_cents: number | null; current_bidder_id: string | null }>;
  listing_images: { storage_path: string; position: number }[] | null;
  collection_items: One<{ grader: string | null; grade: number | null; cert_number: string | null; passport_code: string | null }>;
};
