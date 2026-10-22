import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { canPostPremium } from '@/lib/content';
import PostForm from './PostForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'New post' };

export default async function NewPostPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/new');
  const s = await getSettings();

  return (
    <div className="card-panel pop-in" style={{ maxWidth: 680, margin: '0 auto' }}>
      <div className="row between">
        <h1 style={{ margin: 0 }}>Share a thought or story</h1>
        <Link href="/upload" className="btn small ghost">
          🎬 Upload a video instead
        </Link>
      </div>
      <PostForm
        canPremium={canPostPremium(user)}
        verified={user.verified}
        priceMin={parseInt(s.price_min, 10)}
        priceMax={parseInt(s.price_max, 10)}
        viewsRate={parseInt(s.views_rate, 10) || 0}
        creatorPercent={100 - (parseInt(s.commission_percent, 10) || 30)}
      />
    </div>
  );
}
