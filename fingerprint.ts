import { createHash } from 'crypto';
import { PRIVATE_BUCKET, supabaseAdmin } from './storage';

const CHUNK = 4 * 1024 * 1024; // 4 MB

async function range(url: string, from: number, to: number) {
  const res = await fetch(url, { headers: { Range: `bytes=${from}-${to}` }, cache: 'no-store' });
  if (res.status !== 206) throw new Error(`Range request not supported (${res.status})`);
  const total = parseInt(res.headers.get('content-range')?.split('/')[1] ?? '', 10);
  return { buf: Buffer.from(await res.arrayBuffer()), total };
}

/**
 * Fingerprint of an uploaded video, computed on the server from the stored file itself:
 * SHA-256 of (file size + first 4 MB + last 4 MB). Identical files always match.
 * Returns null if the file can't be read (the upload still goes ahead).
 */
export async function fingerprintVideo(path: string): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin().storage.from(PRIVATE_BUCKET).createSignedUrl(path, 300);
    if (!data?.signedUrl) return null;
    const head = await range(data.signedUrl, 0, CHUNK - 1);
    if (!isFinite(head.total) || head.total <= 0) return null;
    const h = createHash('sha256').update(String(head.total)).update(head.buf);
    if (head.total > CHUNK) {
      const tail = await range(data.signedUrl, Math.max(CHUNK, head.total - CHUNK), head.total - 1);
      h.update(tail.buf);
    }
    return h.digest('hex');
  } catch (e) {
    console.error('fingerprint failed', e);
    return null;
  }
}
