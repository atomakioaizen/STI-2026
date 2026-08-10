import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

// Cache bust comment to trigger re-compile.

export async function GET(request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notifications = await prisma.activityLog.findMany({
      where: {
        userId: user.userId,
        action: { in: ['REJECTED_DELETED', 'TASK_RESTORED', 'TASK_ACCEPTED', 'TASK_REJECTED', 'TASK_APPROVED', 'PROGRESS_REJECTED'] }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ notifications });

  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json(
      { error: 'An error occurred fetching notifications' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing notification ID' }, { status: 400 });
    }

    const logId = parseInt(id, 10);
    if (isNaN(logId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Ensure the log belongs to the user
    const log = await prisma.activityLog.findFirst({
      where: {
        id: logId,
        userId: user.userId,
        action: { in: ['REJECTED_DELETED', 'TASK_RESTORED', 'TASK_ACCEPTED', 'TASK_REJECTED', 'TASK_APPROVED', 'PROGRESS_REJECTED'] }
      }
    });

    if (!log) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    await prisma.activityLog.delete({
      where: { id: logId }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete notification error:', error);
    return NextResponse.json(
      { error: 'An error occurred deleting notification' },
      { status: 500 }
    );
  }
}
