import { prisma } from './db';

export async function logActivity(userId, action, details) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: parseInt(userId, 10),
        action,
        details
      }
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}
