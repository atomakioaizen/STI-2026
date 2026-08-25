import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      // Clear the stale cookie
      const res = NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      );
      res.cookies.set('auth_token', '', { maxAge: 0, path: '/' });
      return res;
    }

    const numUserId = parseInt(decoded.userId || decoded.id, 10);
    if (isNaN(numUserId)) {
      const res = NextResponse.json(
        { error: 'Invalid session user ID' },
        { status: 401 }
      );
      res.cookies.set('auth_token', '', { maxAge: 0, path: '/' });
      return res;
    }

    // Verify user still exists in DB (handles DB wipes / account deletion)
    const user = await prisma.user.findUnique({
      where: { id: numUserId },
      select: { id: true }
    });

    if (!user) {
      // User no longer exists — clear the stale cookie
      const res = NextResponse.json(
        { error: 'User account not found' },
        { status: 401 }
      );
      res.cookies.set('auth_token', '', { maxAge: 0, path: '/' });
      return res;
    }

    return NextResponse.json({
      authenticated: true,
      user: decoded
    });
  } catch (error) {
    console.error('Session verify error:', error);
    return NextResponse.json(
      { error: 'An error occurred verifying session' },
      { status: 500 }
    );
  }
}
