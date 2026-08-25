import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    redirect('/');
  }

  const decodedUser = verifyToken(token);
  if (!decodedUser) {
    redirect('/');
  }

  const userId = decodedUser.userId || decodedUser.id;
  if (!userId) {
    redirect('/');
  }

  // Fetch full user details from DB to make sure we are in sync (with automatic reconnect retry)
  let user = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      user = await prisma.user.findUnique({
        where: { id: userId },
        include: { department: true }
      });
      if (user) break;
    } catch (e) {
      console.warn(`Prisma findUnique attempt ${attempt + 1} failed, retrying...`, e?.message);
      await new Promise(r => setTimeout(r, 500));
    }
  }

  if (!user) {
    redirect('/');
  }

  const serializedUser = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    position: user.position,
    departmentId: user.departmentId,
    departmentName: user.department?.name || null
  };

  return <DashboardClient user={serializedUser} />;
}
