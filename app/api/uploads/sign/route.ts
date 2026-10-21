import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { bad, readJson, requireApiUser, resolveOwner } from '@/lib/api';
import { PRIVATE_BUCKET, PUBLIC_BUCKET, supabaseAdmin } from '@/lib/storage';

// Files go straight from the browser to Supabase Storage (Vercel functions cap request bodies at ~4.5 MB).
const KINDS = {
  video: { bucket: PRIVATE_BUCKET, exts: ['mp4', 'webm', 'mov', 'm4v'] },
  preview: { bucket: PUBLIC_BUCKET, exts: ['mp4', 'webm', 'm4v'] },
  thumb: { bucket: PUBLIC_BUCKET, exts: ['jpg', 'jpeg', 'png', 'webp'] },
} as const;

export async function POST(req: Request) {
  const r = await requireApiUser();
  if ('error' in r) return r.error;
  const b = await readJson(req);

  const kind = String(b.kind ?? '') as keyof typeof KINDS;
  const cfg = KINDS[kind];
  if (!cfg) return bad('Unknown upload type.');

  const ext = String(b.filename ?? '').split('.').pop()?.toLowerCase() ?? '';
  if (!(cfg.exts as readonly string[]).includes(ext)) return bad(`Allowed file types: ${cfg.exts.join(', ')}`);

  const o = await resolveOwner(r.user, b.ownerId);
  if ('error' in o) return o.error;

  const path = `${o.ownerId}/${kind}/${randomUUID()}.${ext}`;
  const { data, error } = await supabaseAdmin().storage.from(cfg.bucket).createSignedUploadUrl(path);
  if (error || !data) return bad(`Could not prepare upload: ${error?.message ?? 'unknown error'}`, 500);

  return NextResponse.json({ bucket: cfg.bucket, path, token: data.token });
}
