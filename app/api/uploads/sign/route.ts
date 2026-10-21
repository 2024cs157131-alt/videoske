import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { bad, readJson, requireApiUser, resolveOwner } from '@/lib/api';
import { PRIVATE_BUCKET, PUBLIC_BUCKET, publicUrl, supabaseAdmin } from '@/lib/storage';

// Files go straight from the browser to Supabase Storage (Vercel functions cap request bodies at ~4.5 MB).
const KINDS = {
  video: { bucket: PRIVATE_BUCKET, exts: ['mp4', 'webm', 'mov', 'm4v'], admin: false },
  preview: { bucket: PUBLIC_BUCKET, exts: ['mp4', 'webm', 'm4v'], admin: false },
  thumb: { bucket: PUBLIC_BUCKET, exts: ['jpg', 'jpeg', 'png', 'webp'], admin: false },
  ad: { bucket: PUBLIC_BUCKET, exts: ['jpg', 'jpeg', 'png', 'webp', 'gif'], admin: true },
} as const;

export async function POST(req: Request) {
  const r = await requireApiUser();
  if ('error' in r) return r.error;
  const b = await readJson(req);

  const kind = String(b.kind ?? '') as keyof typeof KINDS;
  const cfg = KINDS[kind];
  if (!cfg) return bad('Unknown upload type.');
  if (cfg.admin && r.user.role !== 'ADMIN') return bad('Admins only.', 403);

  const ext = String(b.filename ?? '').split('.').pop()?.toLowerCase() ?? '';
  if (!(cfg.exts as readonly string[]).includes(ext)) return bad(`Allowed file types: ${cfg.exts.join(', ')}`);

  const o = await resolveOwner(r.user, b.ownerId);
  if ('error' in o) return o.error;

  const path = `${o.ownerId}/${kind}/${randomUUID()}.${ext}`;
  const { data, error } = await supabaseAdmin().storage.from(cfg.bucket).createSignedUploadUrl(path);
  if (error || !data) return bad(`Could not prepare upload: ${error?.message ?? 'unknown error'}`, 500);

  return NextResponse.json({
    bucket: cfg.bucket,
    path,
    token: data.token,
    publicUrl: cfg.bucket === PUBLIC_BUCKET ? publicUrl(path) : null,
  });
}
