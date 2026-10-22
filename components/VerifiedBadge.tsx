// Blue check shown next to verified creators
export default function VerifiedBadge({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label="Verified creator"
      style={{ display: 'inline-block', verticalAlign: '-2px', flexShrink: 0 }}
    >
      <title>Verified creator</title>
      <path
        fill="#1d9bf0"
        d="M12 1.5l2.6 1.9 3.2-.2 1 3 2.6 1.9-1 3.1 1 3.1-2.6 1.9-1 3-3.2-.2L12 22.5l-2.6-1.9-3.2.2-1-3L2.6 16l1-3.1-1-3.1 2.6-1.9 1-3 3.2.2z"
      />
      <path fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" d="M7.5 12.3l3 3 6-6.3" />
    </svg>
  );
}
