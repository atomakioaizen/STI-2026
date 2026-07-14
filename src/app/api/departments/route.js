import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const where = {};
    if (user.role === 'PRINCIPAL') {
      where.name = { not: 'Admin' };
    }

    const departments = await prisma.department.findMany({
      where,
      include: {
        _count: {
          select: { users: true }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({ success: true, departments });

  } catch (error) {
    console.error('Fetch departments error:', error);
    return NextResponse.json(
      { error: 'An error occurred fetching departments' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = await getSessionUser();
    const isAllowed = user && user.role === 'SCHOOL_ADMIN';

    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden — School Admin privileges required' }, { status: 403 });
    }

    const { name } = await request.json();

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Department name is required' },
        { status: 400 }
      );
    }

    const cleanName = name.trim();

    // Check if duplicate
    const existing = await prisma.department.findUnique({
      where: { name: cleanName }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Department name already exists' },
        { status: 400 }
      );
    }

    const dept = await prisma.department.create({
      data: { name: cleanName }
    });

    return NextResponse.json({ success: true, department: dept });

  } catch (error) {
    console.error('Create department error:', error);
    return NextResponse.json(
      { error: 'An error occurred creating department' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'Forbidden — School Admin privileges required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');
    if (!idParam) {
      return NextResponse.json({ error: 'Department ID is required' }, { status: 400 });
    }

    const deptId = parseInt(idParam, 10);
    if (isNaN(deptId)) {
      return NextResponse.json({ error: 'Invalid department ID' }, { status: 400 });
    }

    // Set users belonging to this department to NULL departmentId
    await prisma.user.updateMany({
      where: { departmentId: deptId },
      data: { departmentId: null }
    });

    await prisma.department.delete({
      where: { id: deptId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete department error:', error);
    return NextResponse.json({ error: 'Failed to delete department' }, { status: 500 });
  }
}
