'use client';
import { createClient } from '@supabase/supabase-js';
import { postJSON } from './client';

export type UploadKind = 'video' | 'thumb' | 'preview' | 'ad' | 'avatar' | 'postimg' | 'postimg_private';

/** Upload a file straight from the browser to Supabase Storage; returns { path, url } (url only for public files). */
export async function uploadFile(kind: UploadKind, file: File, ownerId?: string) {
  const s = await postJSON<{ bucket: string; path: string; token: string; publicUrl: string | null }>('/api/uploads/sign', {
    kind,
    filename: file.name,
    ownerId,
  });
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { error } = await sb.storage.from(s.bucket).uploadToSignedUrl(s.path, s.token, file, {
    contentType: file.type || undefined,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return { path: s.path, url: s.publicUrl };
}
