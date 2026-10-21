import Link from 'next/link';
import type { User, Video } from '@prisma/client';
import { publicUrl } from '@/lib/storage';

export default function VideoCard({
  v,
  unlocked,
  showStatus,
}: {
  v: Video & { owner?: User };
  unlocked: boolean;
  showStatus?: boolean;
}) {
  const thumb = publicUrl(v.thumbPath);
  return (
    <Link href={`/v/${v.id}`} className="card">
      <div className="thumb">
        {thumb ? <img src={thumb} alt="" loading="lazy" /> : <div className="placeholder" />}
        <span className={`price ${unlocked ? 'unlocked' : ''}`}>{unlocked ? '▶ Unlocked' : `🔒 Ksh ${v.price}`}</span>
        {showStatus && v.status !== 'APPROVED' && <span className="status">{v.status}</span>}
      </div>
      <div className="card-body">
        <div className="title">{v.title}</div>
        {v.owner && <div className="muted">@{v.owner.username}</div>}
      </div>
    </Link>
  );
}
