import Link from 'next/link';
import type { User, Video } from '@prisma/client';
import { publicUrl } from '@/lib/storage';
import { priceLabel, type Pricing } from '@/lib/pricing';
import { statusLabel } from '@/lib/content';
import VerifiedBadge from './VerifiedBadge';
import Avatar from './Avatar';
import Trailer from './Trailer';

export const fmtViews = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

export default function VideoCard({
  v,
  unlocked,
  pricing,
  showStatus,
}: {
  v: Video & { owner?: User };
  unlocked: boolean;
  pricing: Pricing;
  showStatus?: boolean;
}) {
  const thumb = publicUrl(v.thumbPath);
  const trailer = publicUrl(v.previewPath);
  const label = !v.isPremium ? 'FREE' : unlocked ? '▶ Unlocked' : `🔒 ${priceLabel(v.price, pricing)}`;
  const cls = !v.isPremium ? 'free' : unlocked ? 'unlocked' : '';
  const status = showStatus ? statusLabel(v.status, v.flaggedSexual) : null;

  // Free videos: plain thumbnail. Premium: greyed-out trailer (or greyed thumbnail if there's no trailer).
  let media: React.ReactNode;
  if (v.isPremium && trailer) media = <Trailer src={trailer} poster={thumb ?? undefined} />;
  else if (thumb) media = <img src={thumb} alt="" loading="lazy" decoding="async" className={v.isPremium ? 'greyed' : ''} />;
  else media = <div className="placeholder" />;

  return (
    <Link href={`/v/${v.id}`} className="card">
      <div className={`thumb ${v.sensitive ? 'is-sensitive' : ''}`}>
        {media}
        {v.sensitive && <span className="sensitive-badge">⚠ Sensitive content</span>}
        {!v.isPremium && !v.sensitive && <span className="play-icon">▶</span>}
        <span className={`price ${cls}`}>{label}</span>
        {status && <span className="status">{status}</span>}
      </div>
      <div className="card-body card-body-row">
        {v.owner && <Avatar user={v.owner} size={30} />}
        <div style={{ minWidth: 0 }}>
          <div className="title">{v.title}</div>
          <div className="muted small">
            {v.owner && (
              <>
                @{v.owner.username} {v.owner.verified && <VerifiedBadge size={12} />} ·{' '}
              </>
            )}
            {fmtViews(v.views)} view{v.views === 1 ? '' : 's'}
          </div>
        </div>
      </div>
    </Link>
  );
}
