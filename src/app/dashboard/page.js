import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import DashboardClient from './DashboardClient';

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

  // Fetch full user details from DB to make sure we are in sync
  const user = await prisma.user.findUnique({
    where: { id: decodedUser.userId },
    include: { department: true }
  });

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
