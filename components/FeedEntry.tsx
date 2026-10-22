import Link from 'next/link';
import type { User, Video } from '@prisma/client';
import type { Pricing } from '@/lib/pricing';
import VideoCard from './VideoCard';
import PostCard from './PostCard';
import ActionBar, { type ActionState } from './ActionBar';

// One item in a feed: optional "🔁 Jane reshared" line, the video/post card, then like · comment · reshare · share
export default function FeedEntry({
  item,
  resharedBy,
  pricing,
  unlocked,
  showStatus,
  social,
  meId,
  origin,
  delay = 0,
}: {
  item: Video & { owner: User };
  resharedBy?: Pick<User, 'username' | 'displayName'> | null;
  pricing: Pricing;
  unlocked: boolean;
  showStatus?: boolean;
  social?: ActionState;
  meId?: string | null;
  origin: string;
  delay?: number;
}) {
  return (
    <div className="feed-item" style={{ animationDelay: `${delay}ms` }}>
      {resharedBy && (
        <Link href={`/u/${resharedBy.username}`} className="reshared-by">
          🔁 {resharedBy.displayName} reshared
        </Link>
      )}
      <div className="entry">
        {item.kind === 'POST' ? (
          <PostCard p={item} pricing={pricing} unlocked={unlocked} showStatus={showStatus} />
        ) : (
          <VideoCard v={item} pricing={pricing} unlocked={unlocked} showStatus={showStatus} />
        )}
        {social && item.status === 'APPROVED' && (
          <ActionBar
            s={social}
            loggedIn={!!meId}
            isOwn={meId === item.ownerId}
            shareUrl={`${origin}/v/${item.id}`}
            title={item.title}
          />
        )}
      </div>
    </div>
  );
}
