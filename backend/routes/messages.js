// routes/messages.js - Enhanced with Read Status and Improved Contact Sorting
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import db from '../config/database.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import NotificationService from '../services/notificationService.js';   
const router = Router();

// Create uploads directory if it doesn't exist
const uploadsDir = './public/uploads';
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: function (req, file, cb) {
        // Allow common file types
        const allowedTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
            'application/pdf', 'application/msword', 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain', 'application/zip', 'application/x-rar-compressed'
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('File type not allowed'), false);
        }
    }
});

// UPDATED Token verification middleware - REPLACE existing verifyToken function
const verifyToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Access denied. No token provided.' 
        });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = {
            userId: decoded.id || decoded.userId, // Support both formats
            email: decoded.email,
            role: decoded.role
        };
        next();
    } catch (error) {
        res.status(400).json({ 
            success: false, 
            message: 'Invalid token' 
        });
    }
};

// Helper function to get user ID by email
async function getUserIdByEmail(email) {
    try {
        const [users] = await db.execute(
            'SELECT id FROM users WHERE email = ?', 
            [email]
        );
        return users[0]?.id;
    } catch (error) {
        console.error('Error getting user ID by email:', error);
        return null;
    }
}

// Helper function to get user email by ID
async function getUserEmailById(id) {
    try {
        const [users] = await db.execute(
            'SELECT email FROM users WHERE id = ?', 
            [id]
        );
        return users[0]?.email;
    } catch (error) {
        console.error('Error getting user email by ID:', error);
        return null;
    }
}

// 🔹 Get Users by Role or Search (FIXED - Don't exclude same role users)
router.get('/users', verifyToken, async (req, res) => {
    try {
        const currentUserId = req.user.userId;
        const currentUserEmail = req.user.email;
        const { search, role } = req.query;
        
        // FIXED: Only exclude the current user, not users with same role
        let query = `
            SELECT id, username, email, role, first_name, last_name, 
                   created_at, updated_at, last_login
            FROM users 
            WHERE id != ?
        `;
        let params = [currentUserId];

        // Add search functionality
        if (search) {
            query += ` AND (email LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR username LIKE ?)`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        // Add role filter
        if (role && role !== 'all') {
            query += ` AND role = ?`;
            params.push(role);
        }

        const [users] = await db.execute(query, params);

        // Get last message and unread count for each user
        const usersWithMessageInfo = await Promise.all(users.map(async (user) => {
            // Get last message between current user and this user
            const [lastMessage] = await db.execute(`
                SELECT message as content, timestamp as created_at, sender_email
                FROM messages 
                WHERE (sender_email = ? AND receiver_email = ?) 
                   OR (sender_email = ? AND receiver_email = ?)
                ORDER BY timestamp DESC 
                LIMIT 1
            `, [currentUserEmail, user.email, user.email, currentUserEmail]);

            // Count ACTUAL unread messages (messages sent to current user that are marked as unread)
            const [unreadCount] = await db.execute(`
                SELECT COUNT(*) as count
                FROM messages 
                WHERE sender_email = ? AND receiver_email = ? AND is_read = 0
            `, [user.email, currentUserEmail]);

            return {
                ...user,
                last_message: lastMessage[0]?.content || null,
                last_message_time: lastMessage[0]?.created_at || null,
                unread_count: parseInt(unreadCount[0]?.count || 0),
                is_online: false
            };
        }));

        // Sort contacts: unread messages first, then by most recent message time, then alphabetically
        usersWithMessageInfo.sort((a, b) => {
            // First priority: unread messages
            if (a.unread_count !== b.unread_count) {
                return b.unread_count - a.unread_count;
            }
            
            // Second priority: most recent message time
            if (a.last_message_time && b.last_message_time) {
                return new Date(b.last_message_time) - new Date(a.last_message_time);
            }
            
            // If one has a message and the other doesn't
            if (a.last_message_time && !b.last_message_time) return -1;
            if (!a.last_message_time && b.last_message_time) return 1;
            
            // Third priority: alphabetical by first name
            return a.first_name.localeCompare(b.first_name);
        });

        res.json({
            success: true,
            users: usersWithMessageInfo,
            contacts: usersWithMessageInfo
        });

    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users'
        });
    }
});

// 🔹 Get Message History Between Two Users (UPDATED with file attachment fields and read status)
router.get('/messages', verifyToken, async (req, res) => {
    try {
        const currentUserId = req.user.userId;
        const currentUserEmail = req.user.email;
        const { user_id, user1, user2 } = req.query;
        let otherUserEmail;

        // Support both query formats
        if (user_id) {
            otherUserEmail = await getUserEmailById(user_id);
        } else if (user1 && user2) {
            // Determine which user is the other user
            otherUserEmail = user1 === currentUserEmail ? user2 : user1;
        } else {
            return res.status(400).json({
                success: false,
                message: 'Missing user parameters'
            });
        }

        // Get messages between the two users INCLUDING FILE ATTACHMENTS AND READ STATUS
        const [messages] = await db.execute(`
            SELECT m.*, 
                   m.message as content,
                   m.timestamp as created_at,
                   m.sender_email,
                   m.receiver_email,
                   m.file_name,
                   m.file_path,
                   m.file_size,
                   m.file_type,
                   m.is_read,
                   s.first_name as sender_first_name, 
                   s.last_name as sender_last_name,
                   s.username as sender_name,
                   s.id as sender_id,
                   r.first_name as receiver_first_name, 
                   r.last_name as receiver_last_name,
                   r.id as receiver_id
            FROM messages m
            JOIN users s ON m.sender_email = s.email
            JOIN users r ON m.receiver_email = r.email
            WHERE (m.sender_email = ? AND m.receiver_email = ?) 
               OR (m.sender_email = ? AND m.receiver_email = ?)
            ORDER BY m.timestamp ASC
        `, [currentUserEmail, otherUserEmail, otherUserEmail, currentUserEmail]);

        res.json({
            success: true,
            messages: messages
        });

    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch messages'
        });
    }
});

// Get messages between current user and specific contact (original endpoint) - UPDATED
router.get('/:contactId', verifyToken, async (req, res) => {
    try {
        const { contactId } = req.params;
        const currentUserEmail = req.user.email;
        
        // Get contact email
        const contactEmail = await getUserEmailById(contactId);
        if (!contactEmail) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }
        
        const [results] = await db.execute(
            `SELECT m.*, 
                    m.message as content,
                    m.timestamp as created_at,
                    m.file_name,
                    m.file_path,
                    m.file_size,
                    m.file_type,
                    m.is_read,
                    u.username as sender_name,
                    s.first_name as sender_first_name,
                    s.last_name as sender_last_name,
                    s.id as sender_id
             FROM messages m
             JOIN users u ON m.sender_email = u.email
             JOIN users s ON m.sender_email = s.email
             WHERE (m.sender_email = ? AND m.receiver_email = ?) 
                OR (m.sender_email = ? AND m.receiver_email = ?)
             ORDER BY m.timestamp ASC`,
            [currentUserEmail, contactEmail, contactEmail, currentUserEmail]
        );
        
        res.json({ 
            success: true, 
            messages: results 
        });
        
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Database error' 
        });
    }
});

// 🔹 Send a Message WITH FILE ATTACHMENT SUPPORT (ENHANCED with proper is_read initialization)
router.post('/messages', verifyToken, upload.single('attachment'), async (req, res) => {
    try {
        const currentUserId = req.user.userId;
        const currentUserEmail = req.user.email;
        const { receiver_id, receiver_email, content } = req.body;
        
        // Allow empty content if there's an attachment
        if ((!content || content.trim() === '') && !req.file) {
            return res.status(400).json({
                success: false,
                message: 'Message content or attachment is required'
            });
        }

        let receiverEmail = receiver_email;
        
        // If receiver_email not provided but receiver_id is, find the email
        if (!receiverEmail && receiver_id) {
            receiverEmail = await getUserEmailById(receiver_id);
            if (!receiverEmail) {
                return res.status(404).json({
                    success: false,
                    message: 'Receiver not found'
                });
            }
        }

        // Verify receiver exists
        const [receiverCheck] = await db.execute(
            'SELECT id, email FROM users WHERE email = ?',
            [receiverEmail]
        );
        
        if (receiverCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Receiver not found'
            });
        }

        // Prepare file attachment data using your existing column names
        let fileName = null;
        let filePath = null;
        let fileSize = null;
        let fileType = null;

        if (req.file) {
            fileName = req.file.originalname;
            filePath = `/uploads/${req.file.filename}`;
            fileSize = req.file.size;
            fileType = req.file.mimetype;
        }

        // Insert the message with file attachment data and is_read = 0 (unread)
        const [result] = await db.execute(`
            INSERT INTO messages (sender_email, receiver_email, message, timestamp, file_name, file_path, file_size, file_type, is_read)
            VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, 0)
        `, [currentUserEmail, receiverEmail, content?.trim() || '', fileName, filePath, fileSize, fileType]);

        // Get the inserted message with user details
        const [newMessage] = await db.execute(`
            SELECT m.*, 
                   m.message as content,
                   m.timestamp as created_at,
                   m.file_name,
                   m.file_path,
                   m.file_size,
                   m.file_type,
                   m.is_read,
                   s.first_name as sender_first_name, 
                   s.last_name as sender_last_name,
                   s.username as sender_name,
                   s.id as sender_id,
                   r.first_name as receiver_first_name, 
                   r.last_name as receiver_last_name,
                   r.id as receiver_id
            FROM messages m
            JOIN users s ON m.sender_email = s.email
            JOIN users r ON m.receiver_email = r.email
            WHERE m.id = ?
        `, [result.insertId]);
        

        res.json({
            success: true,
            message: newMessage[0],
            messageId: result.insertId
        });

    } catch (error) {
        console.error('Error sending message:', error);
        
        // Clean up uploaded file if there was an error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to send message'
        });
    }
});

// FIXED: Send a Message WITH proper notification creation
router.post('/', verifyToken, upload.single('attachment'), async (req, res) => {
    try {
        const { receiver_id, content } = req.body;
        const currentUserEmail = req.user.email;
        const currentUserId = req.user.userId;
        
        console.log('📨 Message sending request:', { currentUserId, currentUserEmail, receiver_id, content });
        
        if (!receiver_id || (!content && !req.file)) {
            return res.status(400).json({
                success: false,
                message: 'Receiver and content or attachment are required'
            });
        }
        
        // Get receiver email and info
        const [receiverInfo] = await db.execute(
            'SELECT id, email, first_name, last_name FROM users WHERE id = ?',
            [receiver_id]
        );
        
        if (receiverInfo.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Receiver not found'
            });
        }
        
        const receiver = receiverInfo[0];
        const receiverEmail = receiver.email;
        
        // Prepare file attachment data
        let fileName = null;
        let filePath = null;
        let fileSize = null;
        let fileType = null;

        if (req.file) {
            fileName = req.file.originalname;
            filePath = `/uploads/${req.file.filename}`;
            fileSize = req.file.size;
            fileType = req.file.mimetype;
        }
        
        // Insert message with is_read = 0 (EXPLICITLY UNREAD)
        const [result] = await db.execute(
            `INSERT INTO messages (sender_email, receiver_email, message, timestamp, file_name, file_path, file_size, file_type, is_read) 
             VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, 0)`,
            [currentUserEmail, receiverEmail, content?.trim() || '', fileName, filePath, fileSize, fileType]
        );

        console.log('✅ Message saved with ID:', result.insertId, 'as UNREAD');

        // Get the inserted message with full details for real-time notification
const [messageDetails] = await db.execute(`
    SELECT m.*, 
           s.first_name as sender_first_name, 
           s.last_name as sender_last_name,
           s.email as sender_email,
           s.id as sender_id,
           r.id as receiver_id
    FROM messages m
    JOIN users s ON m.sender_email = s.email
    JOIN users r ON m.receiver_email = r.email
    WHERE m.id = ?
`, [result.insertId]);

// FIXED: Send real-time notification without creating duplicate DB notification
if (global.io && messageDetails.length > 0) {
    const message = messageDetails[0];
    const notificationData = {
        id: Date.now(), // Use timestamp for real-time notification ID
        userId: parseInt(receiver_id),
        type: 'message',
        title: `New message from ${message.sender_first_name} ${message.sender_last_name}`,
        message: content?.trim() || '[Attachment]',
        senderId: currentUserId,
        senderName: `${message.sender_first_name} ${message.sender_last_name}`,
        senderEmail: currentUserEmail,
        messageId: result.insertId,
        created_at: new Date().toISOString(),
        is_read: false,
        action_url: '/messages'
    };
    
    // Send only real-time notification, no DB notification for messages
    const io = global.io;
    const connectedUsers = global.connectedUsers;
    
    if (io && connectedUsers) {
        const receiverSocketId = connectedUsers.get(receiver_id.toString());
        if (receiverSocketId) {
            // Send notification immediately
            io.to(receiverSocketId).emit('newNotification', notificationData);
            console.log('✅ Real-time message notification sent to user:', receiver_id);
            
            // FIXED: Send badge update after ensuring DB commit
            setTimeout(async () => {
                try {
                    const counts = await NotificationService.getNotificationCounts(parseInt(receiver_id));
                    io.to(receiverSocketId).emit('updateNotificationCount', counts);
                    console.log('🔄 Badge updated for user:', receiver_id, counts);
                } catch (error) {
                    console.error('❌ Error updating badge:', error);
                }
            }, 300);
        }
    }
}

        res.json({ 
            success: true, 
            messageId: result.insertId,
            message: 'Message sent successfully' 
        });

    } catch (error) {
        console.error('❌ Error sending message:', error);
        
        // Clean up uploaded file if there was an error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Database error: ' + error.message
        });
    }
});

// File download route (unchanged)
router.get('/download/:filename', verifyToken, async (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join('./public/uploads', filename);
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        // Get file stats
        const stats = fs.statSync(filePath);
        const fileBuffer = fs.readFileSync(filePath);
        
        // Get original filename from database
        const [fileInfo] = await db.execute(
            'SELECT file_name, file_type FROM messages WHERE file_path = ?',
            [`/uploads/${filename}`]
        );
        
        const originalName = fileInfo[0]?.file_name || filename;
        const mimeType = fileInfo[0]?.file_type || 'application/octet-stream';
        
        // Set appropriate headers
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);
        res.setHeader('Content-Length', stats.size);
        
        // Send file buffer
        res.send(fileBuffer);
        
    } catch (error) {
        console.error('Error downloading file:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to download file'
        });
    }
});

// 🔹 Mark Messages as Read (ENHANCED - actually updates is_read field)
router.post('/messages/read', verifyToken, async (req, res) => {
    try {
        const currentUserEmail = req.user.email;
        const { sender_id } = req.body;

        // Get sender's email
        const senderEmail = await getUserEmailById(sender_id);
        if (!senderEmail) {
            return res.status(400).json({
                success: false,
                message: 'Invalid sender ID'
            });
        }

        // Mark all messages from this sender to current user as read
        await db.execute(
            `UPDATE messages 
             SET is_read = 1 
             WHERE sender_email = ? AND receiver_email = ? AND is_read = 0`,
            [senderEmail, currentUserEmail]
        );

        res.json({
            success: true,
            message: 'Messages marked as read'
        });

    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark messages as read'
        });
    }
});

// 🔹 NEW: Get Read Status Updates for sent messages
router.get('/messages/read-status', verifyToken, async (req, res) => {
    try {
        const currentUserEmail = req.user.email;
        const { user_id, message_ids } = req.query;

        if (!user_id || !message_ids) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters'
            });
        }

        // Get receiver's email
        const receiverEmail = await getUserEmailById(user_id);
        if (!receiverEmail) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        // Convert message_ids to array
        const messageIdArray = message_ids.split(',').map(id => parseInt(id));

        // Get messages that have been marked as read
        const placeholders = messageIdArray.map(() => '?').join(',');
        const [readMessages] = await db.execute(
            `SELECT id FROM messages 
             WHERE id IN (${placeholders}) 
             AND sender_email = ? 
             AND receiver_email = ? 
             AND is_read = 1`,
            [...messageIdArray, currentUserEmail, receiverEmail]
        );

        res.json({
            success: true,
            readMessages: readMessages.map(msg => msg.id)
        });

    } catch (error) {
        console.error('Error getting read status updates:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get read status updates'
        });
    }
});

// 🔹 Get New Messages (for polling) - UPDATED with file fields and read status
router.get('/messages/new', verifyToken, async (req, res) => {
    try {
        const currentUserEmail = req.user.email;
        const { user_id, last_message_id } = req.query;

        // Get other user's email
        const otherUserEmail = await getUserEmailById(user_id);
        if (!otherUserEmail) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const [messages] = await db.execute(`
            SELECT m.*, 
                   m.message as content,
                   m.timestamp as created_at,
                   m.file_name,
                   m.file_path,
                   m.file_size,
                   m.file_type,
                   m.is_read,
                   s.first_name as sender_first_name, 
                   s.last_name as sender_last_name,
                   s.username as sender_name,
                   s.id as sender_id
            FROM messages m
            JOIN users s ON m.sender_email = s.email
            WHERE ((m.sender_email = ? AND m.receiver_email = ?) 
                OR (m.sender_email = ? AND m.receiver_email = ?))
                AND m.id > ?
            ORDER BY m.timestamp ASC
        `, [currentUserEmail, otherUserEmail, otherUserEmail, currentUserEmail, last_message_id || 0]);

        res.json({
            success: true,
            messages: messages
        });

    } catch (error) {
        console.error('Error fetching new messages:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch new messages'
        });
    }
});

// 🔹 Get Current User Info
router.get('/user/current', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        // Get full user details from database
        const [users] = await db.execute(
            'SELECT id, username, email, role, first_name, last_name FROM users WHERE id = ?',
            [userId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: users[0]
        });

    } catch (error) {
        console.error('Error getting current user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user information'
        });
    }
});

// 🔹 Get Contacts with Updated Info (ENHANCED for polling with proper sorting)
router.get('/contacts/update', verifyToken, async (req, res) => {
    try {
        const currentUserId = req.user.userId;
        const currentUserEmail = req.user.email;

        // Get all users except current user
        const [users] = await db.execute(`
            SELECT id, username, email, role, first_name, last_name
            FROM users 
            WHERE id != ?
        `, [currentUserId]);

        // Get unread message counts and last messages
        const usersWithUnread = await Promise.all(users.map(async (user) => {
            // Get ACTUAL unread count
            const [unreadResult] = await db.execute(`
                SELECT COUNT(*) as count
                FROM messages 
                WHERE sender_email = ? AND receiver_email = ? AND is_read = 0
            `, [user.email, currentUserEmail]);

            const unreadCount = parseInt(unreadResult[0]?.count || 0);

            // Get last message
            const [lastMessage] = await db.execute(`
                SELECT message as content, timestamp as created_at
                FROM messages 
                WHERE (sender_email = ? AND receiver_email = ?) 
                   OR (sender_email = ? AND receiver_email = ?)
                ORDER BY timestamp DESC 
                LIMIT 1
            `, [currentUserEmail, user.email, user.email, currentUserEmail]);

            return {
                ...user,
                unread_count: unreadCount,
                last_message: lastMessage[0]?.content || null,
                last_message_time: lastMessage[0]?.created_at || null,
                is_online: false
            };
        }));

        // Sort contacts: unread messages first, then by most recent message time, then alphabetically
        usersWithUnread.sort((a, b) => {
            // First priority: unread messages
            if (a.unread_count !== b.unread_count) {
                return b.unread_count - a.unread_count;
            }
            
            // Second priority: most recent message time
            if (a.last_message_time && b.last_message_time) {
                return new Date(b.last_message_time) - new Date(a.last_message_time);
            }
            
            // If one has a message and the other doesn't
            if (a.last_message_time && !b.last_message_time) return -1;
            if (!a.last_message_time && b.last_message_time) return 1;
            
            // Third priority: alphabetical by first name
            return a.first_name.localeCompare(b.first_name);
        });

        res.json({
            success: true,
            contacts: usersWithUnread
        });

    } catch (error) {
        console.error('Error updating contacts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update contacts'
        });
    }
});

// Get unread message count (original endpoint) - ENHANCED with actual unread counts
router.get('/unread/count', verifyToken, async (req, res) => {
    try {
        const currentUserEmail = req.user.email;
        
        // Get unread message counts per sender
        const [unreadCounts] = await db.execute(`
            SELECT s.id as sender_id, s.first_name, s.last_name, s.email, COUNT(*) as unread_count
            FROM messages m
            JOIN users s ON m.sender_email = s.email
            WHERE m.receiver_email = ? AND m.is_read = 0
            GROUP BY s.id, s.email, s.first_name, s.last_name
        `, [currentUserEmail]);
        
        res.json({ 
            success: true, 
            unreadCounts: unreadCounts 
        });
        
    } catch (error) {
        console.error('Error fetching unread counts:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Database error' 
        });
    }
});

// NOTIFICATION ENDPOINTS

// Get notifications for current user
router.get('/notifications', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { limit = 10, offset = 0, unread_only = false, since } = req.query;
        
        let query = `
            SELECT n.*, 
                   DATE_FORMAT(n.created_at, '%Y-%m-%d %H:%i:%s') as formatted_date
            FROM notifications n
            WHERE n.user_id = ?
        `;
        const params = [userId];
        
        if (unread_only === 'true') {
            query += ' AND n.read_at IS NULL';
        }
        
        if (since) {
            query += ' AND UNIX_TIMESTAMP(n.created_at) * 1000 > ?';
            params.push(parseInt(since));
        }
        
        query += ' ORDER BY n.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const [notifications] = await db.execute(query, params);
        
        // Get total unread count
        const [unreadResult] = await db.execute(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read_at IS NULL',
            [userId]
        );
        
        res.json({
            success: true,
            notifications: notifications,
            unread_count: unreadResult[0]?.count || 0,
            total: notifications.length
        });
        
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications'
        });
    }
});

// Get notification counts by type - FIXED VERSION
router.get('/notifications/counts', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
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


// Mark notification as read
router.post('/notifications/:id/read', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        
        await db.execute(
            'UPDATE notifications SET read_at = NOW() WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        
        res.json({
            success: true,
            message: 'Notification marked as read'
        });
        
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read'
        });
    }
});

// Mark all notifications as read
router.post('/notifications/read-all', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { type } = req.body; // Optional: mark only specific type as read
        
        let query = 'UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL';
        let params = [userId];
        
        if (type) {
            query += ' AND type = ?';
            params.push(type);
        }
        
        await db.execute(query, params);
        
        res.json({
            success: true,
            message: 'Notifications marked as read'
        });
        
    } catch (error) {
        console.error('Error marking notifications as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notifications as read'
        });
    }
});

export default router;
