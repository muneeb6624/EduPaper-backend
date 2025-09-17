const Notification = require('../models/Notification');

class NotificationController {
  // Get user notifications
  async getUserNotifications(req, res) {
    try {
      const { page = 1, limit = 20, unreadOnly = false } = req.query;
      
      const query = { userId: req.user._id };
      if (unreadOnly === 'true') {
        query.read = false;
      }

      const notifications = await Notification.find(query)
        .populate('data.paperId', 'title subject')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const unreadCount = await Notification.countDocuments({
        userId: req.user._id,
        read: false
      });

      res.json({
        success: true,
        notifications,
        unreadCount,
        page: parseInt(page),
        totalPages: Math.ceil(notifications.length / limit)
      });
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching notifications',
        error: error.message
      });
    }
  }

  // Mark notification as read
  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      
      const notification = await Notification.findOneAndUpdate(
        { _id: id, userId: req.user._id },
        { read: true },
        { new: true }
      );

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      res.json({
        success: true,
        notification
      });
    } catch (error) {
      console.error('Mark as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Error marking notification as read',
        error: error.message
      });
    }
  }

  // Mark all notifications as read
  async markAllAsRead(req, res) {
    try {
      await Notification.updateMany(
        { userId: req.user._id, read: false },
        { read: true }
      );

      res.json({
        success: true,
        message: 'All notifications marked as read'
      });
    } catch (error) {
      console.error('Mark all as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Error marking all notifications as read',
        error: error.message
      });
    }
  }

  // Delete notification
  async deleteNotification(req, res) {
    try {
      const { id } = req.params;
      
      const notification = await Notification.findOneAndDelete({
        _id: id,
        userId: req.user._id
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      res.json({
        success: true,
        message: 'Notification deleted'
      });
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting notification',
        error: error.message
      });
    }
  }

  // Create notification (internal use)
  static async createNotification(data) {
    try {
      const notification = await Notification.create(data);
      return notification;
    } catch (error) {
      console.error('Create notification error:', error);
      return null;
    }
  }

  // Bulk create notifications for multiple users
  static async createBulkNotifications(users, notificationData) {
    try {
      const notifications = users.map(userId => ({
        ...notificationData,
        userId
      }));

      await Notification.insertMany(notifications);
      return true;
    } catch (error) {
      console.error('Bulk create notifications error:', error);
      return false;
    }
  }
}

module.exports = new NotificationController();