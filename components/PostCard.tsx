import Link from 'next/link';
import type { User, Video } from '@prisma/client';
import { publicUrl } from '@/lib/storage';
import { priceLabel, type Pricing } from '@/lib/pricing';
import { statusLabel } from '@/lib/content';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';

export function timeAgo(d: Date) {
  const s = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
}

// A thought / story in the feed. Premium posts show a blurred teaser until unlocked.
export default function PostCard({
  p,
  unlocked,
  pricing,
  showStatus,
}: {
  p: Video & { owner: User };
  unlocked: boolean;
  pricing: Pricing;
  showStatus?: boolean;
}) {
  const locked = p.isPremium && !unlocked;
  const img = !p.isPremium ? publicUrl(p.imagePath) : null; // premium photos stay private
  const status = showStatus ? statusLabel(p.status, p.flaggedSexual) : null;
  const text = p.body ?? p.title;

  return (
    <Link href={`/v/${p.id}`} className={`card post-card ${p.sensitive ? 'is-sensitive' : ''}`}>
      <div className="post-head">
        <Avatar user={p.owner} size={34} />
        <div style={{ minWidth: 0 }}>
          <div className="post-name">
            {p.owner.displayName} {p.owner.verified && <VerifiedBadge size={12} />}
          </div>
          <div className="muted small">
            @{p.owner.username} · {timeAgo(p.createdAt)}
          </div>
        </div>
        {status && <span className="status static">{status}</span>}
      </div>
      <div className={`post-body ${locked ? 'locked' : ''} ${p.sensitive ? 'blurred' : ''}`}>{locked ? text.slice(0, 160) : text}</div>
      {img && !locked && <img src={img} alt="" className={`post-img ${p.sensitive ? 'blurred' : ''}`} loading="lazy" decoding="async" />}
      <div className="post-foot">
        {p.isPremium ? (
          <span className={`pill ${unlocked ? 'pill-ok' : 'pill-lock'}`}>{unlocked ? '✓ Unlocked' : `🔒 ${priceLabel(p.price, pricing)}`}</span>
        ) : (
          <span className="pill pill-free">FREE</span>
        )}
        {p.sensitive && <span className="pill">⚠ Sensitive</span>}
        <span className="muted small">{p.views.toLocaleString()} views</span>
      </div>
    </Link>
  );
}
