import type { Ad } from '@prisma/client';

// Native ad styled like a video card, shown inside the feed
export default function NativeAd({ ad }: { ad: Ad }) {
  return (
    <a href={`/api/ads/${ad.id}/click`} target="_blank" rel="sponsored noopener" className="card ad-card">
      <div className="thumb">
        {ad.imageUrl ? <img src={ad.imageUrl} alt="" loading="lazy" decoding="async" /> : <div className="placeholder" />}
        <span className="ad-label">Sponsored</span>
      </div>
      <div className="card-body">
        <div className="title">{ad.title}</div>
        {ad.body && <div className="muted ad-body">{ad.body}</div>}
      </div>
    </a>
  );
}
