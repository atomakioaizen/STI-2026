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

    // Restriction: School Admin can edit anyone.
    // Principal and others cannot edit through this route unless it is their own profile (which they handle, or School Admin manages them)
    const isSchoolAdmin = currentUser.role === "SCHOOL_ADMIN";
    const isSelf = currentUser.userId === userId;

    if (!isSchoolAdmin && !isSelf) {
      return NextResponse.json({ error: "Forbidden — School Admin only" }, { status: 403 });
    }

    const body = await request.json();
    const { name, username, password, position, role, departmentId } = body;

    const data = {};
    if (name) data.name = name.trim();
    if (username) data.username = username.trim().toLowerCase();
    if (position !== undefined) data.position = position ? position.trim() : "";
    
    // Only School Admin can change role or department
    if (isSchoolAdmin) {
      if (role) data.role = role;
      if (departmentId) data.departmentId = parseInt(departmentId, 10);
    }
    
    if (password) data.password = await hashPassword(password);

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
    if (isSchoolAdmin && data.role === "PROGRAM_HEAD" && data.departmentId) {
      await prisma.user.updateMany({
        where: {
          role: "PROGRAM_HEAD",
          departmentId: data.departmentId,
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
    if (!currentUser || currentUser.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ error: "Forbidden — School Admin only" }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    if (userId === currentUser.userId) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
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