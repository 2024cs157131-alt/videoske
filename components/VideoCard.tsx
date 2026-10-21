import Link from 'next/link';
import type { User, Video } from '@prisma/client';
import { publicUrl } from '@/lib/storage';
import { priceLabel, type Pricing } from '@/lib/pricing';

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
  const label = !v.isPremium ? 'FREE' : unlocked ? '▶ Unlocked' : `🔒 ${priceLabel(v.price, pricing)}`;
  const cls = !v.isPremium ? 'free' : unlocked ? 'unlocked' : '';
  return (
    <Link href={`/v/${v.id}`} className="card">
      <div className="thumb">
        {thumb ? <img src={thumb} alt="" loading="lazy" /> : <div className="placeholder" />}
        <span className={`price ${cls}`}>{label}</span>
        {showStatus && v.status !== 'APPROVED' && <span className="status">{v.status}</span>}
      </div>
      <div className="card-body">
        <div className="title">{v.title}</div>
        <div className="muted">
          {v.owner ? `@${v.owner.username} · ` : ''}
          {fmtViews(v.views)} view{v.views === 1 ? '' : 's'}
        </div>
      </div>
    </Link>
  );
}
