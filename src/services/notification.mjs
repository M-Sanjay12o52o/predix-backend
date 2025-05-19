import { prisma } from '../lib/prisma.js';

export const createNotification = async (userId, type, message, link = null) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        message,
        link,
      },
    });
    // TODO: Implement real-time notification push via WebSocket
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw new Error('Failed to create notification');
  }
};

export const getNotifications = async (userId, readStatus = null, limit = 10, offset = 0) => {
  try {
    const where = {
      userId,
      ...(readStatus !== null && { isRead: readStatus }),
    };

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const totalCount = await prisma.notification.count({
      where,
    });

    return {
      notifications,
      totalCount,
    };
  } catch (error) {
    console.error('Error getting notifications:', error);
    throw new Error('Failed to get notifications');
  }
};

export const markNotificationAsRead = async (notificationId) => {
  try {
    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
    return notification;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw new Error('Failed to mark notification as read');
  }
};

export const markAllNotificationsAsRead = async (userId) => {
  try {
    const { count } = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return count;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw new Error('Failed to mark all notifications as read');
  }
}; 