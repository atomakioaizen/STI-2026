import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionUser } from '@/lib/auth';
import { logActivity } from '@/lib/activity';

export async function POST() {
  try {
    const user = await getSessionUser();
    if (user) {
      await logActivity(user.userId, 'LOGOUT', `User ${user.username} logged out.`);
    }

    const cookieStore = await cookies();
    cookieStore.delete('auth_token');
    
    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'An error occurred during logout' },
      { status: 500 }
    );
  }
}
