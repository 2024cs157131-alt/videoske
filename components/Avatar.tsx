import { publicUrl } from '@/lib/storage';

const COLORS = ['#e6375a', '#2b6cdf', '#2fbf71', '#f0a83a', '#8e5cf7', '#13a8b8', '#d9480f'];

// Profile picture, or a coloured circle with the user's initials when there isn't one
export default function Avatar({
  user,
  size = 36,
}: {
  user: { username: string; displayName?: string | null; avatarPath?: string | null };
  size?: number;
}) {
  const url = publicUrl(user.avatarPath);
  const style = { width: size, height: size, fontSize: Math.round(size * 0.42) };
  if (url) return <img src={url} alt="" className="avatar" style={style} loading="lazy" decoding="async" />;
  const name = (user.displayName || user.username).trim();
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  const color = COLORS[[...user.username].reduce((n, c) => n + c.charCodeAt(0), 0) % COLORS.length];
  return (
    <span className="avatar avatar-initials" style={{ ...style, background: color }} aria-hidden>
      {initials || '?'}
    </span>
  );
}
