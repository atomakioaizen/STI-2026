import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const logs = await prisma.activityLog.findMany({
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
      take: 200 // Cap at latest 200 logs for performance
    });

    return NextResponse.json({ success: true, logs });
  } catch (error) {
    console.error('Insights fetch error:', error);
    return NextResponse.json(
      { error: 'An error occurred fetching insights' },
      { status: 500 }
    );
  }
}
