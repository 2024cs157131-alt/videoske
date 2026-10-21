import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import UploadForm from './UploadForm';

export const dynamic = 'force-dynamic';

export default async function UploadPage({ searchParams }: { searchParams: { owner?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/upload');

  const settings = await getSettings();
  const owners =
    user.role === 'ADMIN'
      ? [
          { id: user.id, label: `Me (@${user.username})` },
          ...(
            await prisma.user.findMany({ where: { managedByAdmin: true, banned: false }, orderBy: { username: 'asc' } })
          ).map((p) => ({ id: p.id, label: `@${p.username} – ${p.displayName}` })),
        ]
      : [];

  const defaultOwner = owners.find((o) => o.id === searchParams.owner)?.id ?? user.id;

  return (
    <div className="card-panel" style={{ maxWidth: 640, margin: '0 auto' }}>
      <h1>Upload a video</h1>
      <p className="muted">
        Each video gets its own random price between Ksh {settings.price_min} and Ksh {settings.price_max}.
        {user.role !== 'ADMIN' && ' Your video will appear after an admin approves it.'}
      </p>
      <UploadForm owners={owners} defaultOwner={defaultOwner} />
    </div>
  );
}
