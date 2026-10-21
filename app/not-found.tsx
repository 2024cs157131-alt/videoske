import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="card-panel narrow" style={{ textAlign: 'center' }}>
      <h1>Not found</h1>
      <p className="muted">That page doesn’t exist or was removed.</p>
      <Link href="/" className="btn">
        Back home
      </Link>
    </div>
  );
}
