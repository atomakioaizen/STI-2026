import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = await getSessionUser();
    const isAllowed = user && (user.role === 'SCHOOL_ADMIN' || user.role === 'ADMIN' || user.role === 'PRINCIPAL' || user.role === 'PROGRAM_HEAD');
    if (!isAllowed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [logs, users] = await Promise.all([
      prisma.activityLog.findMany({
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              role: true,
              department: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 300
      }),
      prisma.user.findMany({
        include: {
          department: { select: { name: true } },
          activityLogs: {
            orderBy: { createdAt: 'asc' },
            select: { id: true, action: true, createdAt: true }
          }
        },
        orderBy: { name: 'asc' }
      })
    ]);

    const userUsageStats = users.map(u => {
      const uLogs = u.activityLogs;
      let totalTimeMs = 0;
      let lastLoginDate = null;
      let lastLogoutDate = null;
      let lastActiveDate = uLogs.length > 0 ? uLogs[uLogs.length - 1].createdAt : null;

      let currentLoginTime = null;

      uLogs.forEach(log => {
        if (log.action === 'LOGIN') {
          currentLoginTime = new Date(log.createdAt);
          lastLoginDate = log.createdAt;
        } else if (log.action === 'LOGOUT') {
          lastLogoutDate = log.createdAt;
          if (currentLoginTime) {
            const duration = new Date(log.createdAt).getTime() - currentLoginTime.getTime();
            if (duration > 0 && duration < 12 * 60 * 60 * 1000) {
              totalTimeMs += duration;
            }
            currentLoginTime = null;
          }
        }
      });

      if (currentLoginTime && lastActiveDate) {
        const lastTime = new Date(lastActiveDate).getTime();
        const startTime = currentLoginTime.getTime();
        const activeDuration = lastTime - startTime;
        if (activeDuration > 0 && activeDuration < 12 * 60 * 60 * 1000) {
          totalTimeMs += activeDuration;
        }
      }

      const totalMinutes = Math.floor(totalTimeMs / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const formattedDuration = totalMinutes === 0 && uLogs.length > 0 ? '15 mins (active)' : hours > 0 ? `${hours} hr${hours > 1 ? 's' : ''} ${minutes} min${minutes > 1 ? 's' : ''}` : `${minutes} min${minutes > 1 ? 's' : ''}`;

      const now = new Date();
      const isToday = lastActiveDate && new Date(lastActiveDate).toDateString() === now.toDateString();
      const isRecent = lastActiveDate && (now.getTime() - new Date(lastActiveDate).getTime() <= 7 * 24 * 60 * 60 * 1000);

      const status = isToday ? 'Active Today' : isRecent ? 'Recently Active' : 'Inactive / Not Used';

      return {
        id: u.id,
        name: u.name,
        username: u.username,
        role: u.role,
        departmentName: u.department?.name || 'Admin',
        position: u.position || 'Staff',
        totalLoginCount: uLogs.filter(l => l.action === 'LOGIN').length,
        totalTimeMs,
        totalMinutes,
        formattedDuration,
        lastLoginDate,
        lastLogoutDate,
        lastActiveDate,
        status
      };
    });

    return NextResponse.json({ success: true, logs, userUsageStats });
  } catch (error) {
    console.error('Insights fetch error:', error);
    return NextResponse.json(
      { error: 'An error occurred fetching insights' },
      { status: 500 }
    );
  }
}
