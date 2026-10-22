import { createClient } from '@supabase/supabase-js';

export const PUBLIC_BUCKET = 'public-media'; // thumbnails + short preview clips
export const PRIVATE_BUCKET = 'private-videos'; // full videos (paid)

export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase storage is not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  return createClient(url, key, { auth: { persistSession: false } });
}

export function publicUrl(path?: string | null) {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/${PUBLIC_BUCKET}/${path}`;
}

/** Short-lived link to a private file (premium post photo). */
export async function signedPrivateUrl(path: string, seconds = 60 * 60 * 2) {
  const { data } = await supabaseAdmin().storage.from(PRIVATE_BUCKET).createSignedUrl(path, seconds);
  return data?.signedUrl ?? null;
}

/** Short-lived link to the full video. Only call this after checking the viewer has paid. */
export async function signedVideoUrl(path: string, seconds = 60 * 60 * 2) {
  const { data, error } = await supabaseAdmin().storage.from(PRIVATE_BUCKET).createSignedUrl(path, seconds);
  if (error) throw error;
  return data.signedUrl;
}
