import express from 'express';
import db from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import NotificationService from '../services/notificationService.js';

const router = express.Router();

// GET /api/notifications - Fetch notifications with pagination
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 20, offset = 0, type } = req.query;
        
        console.log('📥 Loading notifications for user:', userId, 'limit:', limit, 'offset:', offset);
        
        // Build query with optional type filter
        let query = `
            SELECT 
                n.id,
                n.user_id,
                n.type,
                n.title,
                n.message,
                n.data,
                n.action_url,
                n.created_at,
                n.read_at,
                u.first_name as sender_first_name,
                u.last_name as sender_last_name,
                u.email as sender_email
            FROM notifications n
            LEFT JOIN users u ON JSON_EXTRACT(n.data, '$.senderId') = u.id
            WHERE n.user_id = ?
        `;
        let params = [userId];
        
        if (type && type !== 'all') {
            query += ' AND n.type = ?';
            params.push(type);
        }
        
        query += ' ORDER BY n.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const [notifications] = await db.execute(query, params);
        
        // Process notifications for proper display
        const processedNotifications = notifications.map(notification => {
            let data = {};
            try {
                data = notification.data ? JSON.parse(notification.data) : {};
            } catch (e) {
                console.warn('Failed to parse notification data:', notification.data);
            }
            
            // Determine sender name
            let senderName = 'System';
            if (notification.sender_first_name && notification.sender_last_name) {
                senderName = `${notification.sender_first_name} ${notification.sender_last_name}`;
            } else if (data.senderName) {
                senderName = data.senderName;
            }
            
            return {
                id: notification.id,
                user_id: notification.user_id,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                data: data,
                action_url: notification.action_url,
                created_at: notification.created_at,
                read_at: notification.read_at,
                is_read: !!notification.read_at,
                sender_name: senderName,
                sender_email: notification.sender_email || data.senderEmail,
                senderId: data.senderId
            };
        });
        
        console.log(`📋 Returning ${processedNotifications.length} processed notifications`);
        
        res.json({
            success: true,
            notifications: processedNotifications,
            total: processedNotifications.length,
            has_more: processedNotifications.length === parseInt(limit)
        });
        
    } catch (error) {
        console.error('❌ Error loading notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load notifications',
            error: error.message
        });
    }
});

// GET /api/notifications/counts - Get notification counts
router.get('/counts', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log('📊 Getting notification counts for user:', userId);
        
        const counts = await NotificationService.getNotificationCounts(userId);
        
        res.json({
            success: true,
            total: counts.total,
            counts: counts.counts
        });
        
    } catch (error) {
        console.error('❌ Error getting notification counts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get notification counts'
        });
    }
});

// GET /api/notifications/:id - Get single notification
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const notificationId = req.params.id;
        
        const [notifications] = await db.execute(`
            SELECT 
                n.*,
                u.first_name as sender_first_name,
                u.last_name as sender_last_name,
                u.email as sender_email
            FROM notifications n
            LEFT JOIN users u ON JSON_EXTRACT(n.data, '$.senderId') = u.id
            WHERE n.id = ? AND n.user_id = ?
        `, [notificationId, userId]);
        
        if (notifications.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }
        
        const notification = notifications[0];
        let data = {};
        try {
            data = notification.data ? JSON.parse(notification.data) : {};
        } catch (e) {
            console.warn('Failed to parse notification data:', notification.data);
        }
        
        const processedNotification = {
            ...notification,
            data: data,
            is_read: !!notification.read_at,
            sender_name: notification.sender_first_name && notification.sender_last_name ? 
                `${notification.sender_first_name} ${notification.sender_last_name}` : 
                (data.senderName || 'System')
        };
        
        res.json({
            success: true,
            notification: processedNotification
        });
        
    } catch (error) {
        console.error('❌ Error getting notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get notification'
        });
    }
});

// POST /api/notifications/:id/read - Mark notification as read
router.post('/:id/read', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const notificationId = req.params.id;
        
        const success = await NotificationService.markAsRead(notificationId, userId);
        
        if (success) {
            res.json({
                success: true,
                message: 'Notification marked as read'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Notification not found or already read'
            });
        }
        
    } catch (error) {
        console.error('❌ Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read'
        });
    }
});

// POST /api/notifications/read-all - Mark all notifications as read
router.post('/read-all', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const [result] = await db.execute(
            'UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL',
            [userId]
        );
        
        console.log(`✅ Marked ${result.affectedRows} notifications as read for user ${userId}`);
        
        res.json({
            success: true,
            message: 'All notifications marked as read',
            affected_rows: result.affectedRows
        });
        
    } catch (error) {
        console.error('❌ Error marking all notifications as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark all notifications as read'
        });
    }
});

// POST /api/notifications - Create notification (for testing)
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { userId, type, title, message, data, actionUrl } = req.body;
        
        const notificationId = await NotificationService.createNotification({
            userId: userId || req.user.id,
            type: type || 'system',
            title: title || 'Test Notification',
            message: message || 'This is a test notification',
            data: data || {},
            actionUrl: actionUrl || null
        });
        
        // Send real-time notification
        const notificationData = {
            id: notificationId,
            userId: userId || req.user.id,
            type: type || 'system',
            title: title || 'Test Notification',
            message: message || 'This is a test notification',
            is_read: false,
            created_at: new Date().toISOString(),
            action_url: actionUrl || null
        };
        
        const sent = NotificationService.sendRealTimeNotification(userId || req.user.id, notificationData);
        
        res.json({
            success: true,
            message: 'Notification created successfully',
            notificationId,
            realTimeSent: sent
        });
        
    } catch (error) {
        console.error('❌ Error creating notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create notification',
            error: error.message
        });
    }
});

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const notificationId = req.params.id;
        
        const [result] = await db.execute(
            'DELETE FROM notifications WHERE id = ? AND user_id = ?',
            [notificationId, userId]
        );
        
        if (result.affectedRows > 0) {
            res.json({
                success: true,
                message: 'Notification deleted successfully'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }
        
    } catch (error) {
        console.error('❌ Error deleting notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete notification'
        });
    }
});

// POST /api/notifications/test - Send test notification
router.post('/test', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, title, message } = req.body;
        
        console.log('🧪 Creating test notification for user:', userId);
        
        // FIXED: Ensure proper sequencing of notification creation and real-time sending
const notificationId = await NotificationService.createNotification({
    userId: userId,
    type: type || 'system',
    title: title || 'Test Notification',
    message: message || 'This is a test notification from the system',
    data: { test: true },
    actionUrl: '/dashboard'
});

const notificationData = {
    id: notificationId,
    userId: userId,
    type: type || 'system',
    title: title || 'Test Notification',
    message: message || 'This is a test notification from the system',
    is_read: false,
    created_at: new Date().toISOString(),
    action_url: '/dashboard'
};

// FIXED: Add delay to ensure DB transaction is committed
setTimeout(() => {
    const sent = NotificationService.sendRealTimeNotification(userId, notificationData);
    console.log('Real-time notification sent status:', sent);
}, 200);
        
        const sent = NotificationService.sendRealTimeNotification(userId, notificationData);
        
        res.json({
            success: true,
            message: 'Test notification sent successfully',
            notificationId,
            realTimeSent: sent,
            connectedUsers: Array.from(global.connectedUsers?.keys() || [])
        });
        
    } catch (error) {
        console.error('❌ Error sending test notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send test notification',
            error: error.message
        });
    }
});

// Helper function to create notification
export const createNotification = NotificationService.createNotification;

export default router;
