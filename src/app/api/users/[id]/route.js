import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, hashPassword } from "@/lib/auth";

export async function PATCH(request, { params }) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const ROLE_LEVELS = {
      'SCHOOL_ADMIN': 4,
      'PRINCIPAL': 3,
      'PROGRAM_HEAD': 2,
      'FACULTY_STAFF': 1
    };

    const currentUserLevel = ROLE_LEVELS[currentUser.role] || 0;
    const targetUserLevel = ROLE_LEVELS[targetUser.role] || 0;
    const isSelf = currentUser.id === userId || currentUser.userId === userId;

    // Check modification permission
    if (!isSelf) {
      if (currentUserLevel <= targetUserLevel || currentUserLevel <= 1) {
        return NextResponse.json({ error: "Forbidden — You cannot modify accounts of equal or higher hierarchy" }, { status: 403 });
      }
    }

    const body = await request.json();
    const { name, username, password, position, role, departmentId } = body;

    const data = {};
    if (name) data.name = name.trim();
    if (position !== undefined) data.position = position ? position.trim() : "";
    if (password) data.password = await hashPassword(password);

    // Username update check: Only School Admin and Principal can edit usernames, and only for accounts below their role
    if (username && username.trim().toLowerCase() !== targetUser.username) {
      const canEditUsername = (currentUser.role === 'SCHOOL_ADMIN' || currentUser.role === 'PRINCIPAL') && (currentUserLevel > targetUserLevel);
      if (!canEditUsername) {
        return NextResponse.json({ error: "Forbidden — Only School Admin and Principal can edit usernames of lower accounts" }, { status: 403 });
      }
      data.username = username.trim().toLowerCase();
    }

    // Role and department update check: Only levels > 2 (Admin/Principal) can modify role/department, and only to levels below their own
    if (role && role !== targetUser.role) {
      const newRoleLevel = ROLE_LEVELS[role] || 0;
      if (currentUserLevel <= 2 || currentUserLevel <= newRoleLevel) {
        return NextResponse.json({ error: "Forbidden — You do not have permission to assign this role" }, { status: 403 });
      }
      data.role = role;
    }

    if (departmentId !== undefined && parseInt(departmentId, 10) !== targetUser.departmentId) {
      if (currentUserLevel <= 2) {
        return NextResponse.json({ error: "Forbidden — You do not have permission to modify department" }, { status: 403 });
      }
      data.departmentId = departmentId ? parseInt(departmentId, 10) : null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    if (data.username) {
      const existing = await prisma.user.findFirst({
        where: { username: data.username, NOT: { id: userId } }
      });
      if (existing) {
        return NextResponse.json({ error: "Username already taken" }, { status: 400 });
      }
    }

    // Auto-assign Program Head rule:
    // If setting role = PROGRAM_HEAD for a department, ensure any previous PROGRAM_HEAD in that department becomes FACULTY_STAFF
    if ((currentUser.role === "SCHOOL_ADMIN" || currentUser.role === "PRINCIPAL") && data.role === "PROGRAM_HEAD" && (data.departmentId || targetUser.departmentId)) {
      await prisma.user.updateMany({
        where: {
          role: "PROGRAM_HEAD",
          departmentId: data.departmentId || targetUser.departmentId,
          NOT: { id: userId }
        },
        data: { role: "FACULTY_STAFF" }
      });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true, username: true, name: true,
        position: true, role: true, departmentId: true,
        department: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const currentUserId = currentUser.id || currentUser.userId;
    if (userId === currentUserId) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    const ROLE_LEVELS = {
      'SCHOOL_ADMIN': 4,
      'PRINCIPAL': 3,
      'PROGRAM_HEAD': 2,
      'FACULTY_STAFF': 1
    };

    const currentUserLevel = ROLE_LEVELS[currentUser.role] || 0;
    if (currentUserLevel <= 2) {
      return NextResponse.json({ error: "Forbidden — School Admin or Principal privileges required" }, { status: 403 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const targetUserLevel = ROLE_LEVELS[targetUser.role] || 0;
    if (currentUserLevel <= targetUserLevel) {
      return NextResponse.json({ error: "Forbidden — Cannot delete accounts of equal or higher hierarchy" }, { status: 403 });
    }

    // Delete user tasks first
    await prisma.task.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}