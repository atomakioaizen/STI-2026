import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, hashPassword } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role === 'FACULTY_STAFF') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId');

    const where = {};

    // Program heads can only view faculty in their own department
    if (user.role === 'PROGRAM_HEAD') {
      where.departmentId = user.departmentId;
      where.role = 'FACULTY_STAFF';
    } else if (user.role === 'PRINCIPAL') {
      // Principal sees everyone EXCEPT Admin department (Staff)
      where.department = {
        name: { not: 'Admin' }
      };
      if (departmentId && departmentId !== 'All') {
        where.departmentId = parseInt(departmentId, 10);
      }
    } else if (user.role === 'SCHOOL_ADMIN' || user.role === 'ADMIN') {
      if (departmentId && departmentId !== 'All') {
        where.departmentId = parseInt(departmentId, 10);
      }
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        name: true,
        position: true,
        role: true,
        departmentId: true,
        department: {
          select: {
            id: true,
            name: true
          }
        },
        createdAt: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({ success: true, users });

  } catch (error) {
    console.error('Fetch users error:', error);
    return NextResponse.json(
      { error: 'An error occurred fetching users' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, username, password, position, role, departmentId } = await request.json();

    if (!name || !username || !password || !role || !departmentId) {
      return NextResponse.json(
        { error: 'Name, username, password, role, and department are required' },
        { status: 400 }
      );
    }

    const ROLE_LEVELS = {
      'SCHOOL_ADMIN': 4,
      'PRINCIPAL': 3,
      'PROGRAM_HEAD': 2,
      'FACULTY_STAFF': 1
    };

    const currentUserLevel = ROLE_LEVELS[currentUser.role] || 0;
    const targetUserLevel = ROLE_LEVELS[role] || 0;

    if (currentUserLevel <= targetUserLevel || currentUserLevel <= 1) {
      return NextResponse.json(
        { error: 'Forbidden — You do not have permission to create this type of account' },
        { status: 403 }
      );
    }


    const cleanUsername = username.trim().toLowerCase();

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { username: cleanUsername }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 400 }
      );
    }

    const targetDeptId = parseInt(departmentId, 10);
    const hashedPassword = await hashPassword(password);

    // Auto-assign Program Head rule on creation:
    // If this new user is created as a PROGRAM_HEAD, auto-demote the previous one in the same department
    if (role === 'PROGRAM_HEAD') {
      await prisma.user.updateMany({
        where: {
          role: 'PROGRAM_HEAD',
          departmentId: targetDeptId
        },
        data: { role: 'FACULTY_STAFF' }
      });
    }

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        username: cleanUsername,
        password: hashedPassword,
        position: position ? position.trim() : 'Faculty',
        role: role,
        departmentId: targetDeptId
      },
      select: {
        id: true,
        username: true,
        name: true,
        position: true,
        role: true,
        departmentId: true
      }
    });

    return NextResponse.json({ success: true, user: newUser });

  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: 'An error occurred creating the user' },
      { status: 500 }
    );
  }
}
