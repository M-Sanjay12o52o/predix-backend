import express from 'express';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/notification.mjs';
import { protect } from '../middleware/auth.mjs'; // Assuming you have an auth middleware

const router = express.Router();

// Protect all notification routes
router.use(protect);

// Get notifications for the authenticated user
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id; // Assuming user ID is available on req.user
    const { read, limit, offset } = req.query;
    const readStatus = read === 'true' ? true : read === 'false' ? false : null;
    const notificationLimit = parseInt(limit) || 10;
    const notificationOffset = parseInt(offset) || 0;

    const { notifications, totalCount } = await getNotifications(
      userId,
      readStatus,
      notificationLimit,
      notificationOffset
    );

    res.json({ notifications, totalCount });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark a specific notification as read
router.patch('/:notificationId/read', async (req, res) => {
  try {
    const notificationId = req.params.notificationId;
    // Optional: Verify that the notification belongs to the authenticated user
    // const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
    // if (!notification || notification.userId !== req.user.id) {
    //   return res.status(403).json({ error: 'Unauthorized' });
    // }
    const notification = await markNotificationAsRead(notificationId);
    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read for the authenticated user
router.patch('/read-all', async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await markAllNotificationsAsRead(userId);
    res.json({ message: `${count} notifications marked as read` });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

export default router; 