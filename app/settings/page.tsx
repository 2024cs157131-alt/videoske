import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { publicUrl } from '@/lib/storage';
import ProfileForm from './ProfileForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit profile' };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/settings');
  return (
    <div className="card-panel pop-in" style={{ maxWidth: 560, margin: '0 auto' }}>
      <h1>Edit profile</h1>
      <ProfileForm
        username={user.username}
        displayName={user.displayName}
        bio={user.bio ?? ''}
        avatarUrl={publicUrl(user.avatarPath)}
      />
    </div>
  );
}
