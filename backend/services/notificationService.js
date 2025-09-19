import db from '../config/database.js';

class NotificationService {
    // Create a new notification in the database
    static async createNotification({ userId, type, title, message, data = null, actionUrl = null }) {
        try {
            const [result] = await db.execute(`
                INSERT INTO notifications (user_id, type, title, message, data, action_url, created_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
            `, [userId, type, title, message, JSON.stringify(data), actionUrl]);
            
            console.log('✅ Notification created in database with ID:', result.insertId);
            return result.insertId;
        } catch (error) {
            console.error('❌ Error creating notification:', error);
            throw error;
        }
    }

    // FIXED: Improved timing for badge updates with proper sequencing
static sendRealTimeNotification(userId, notificationData) {
    const io = global.io;
    const connectedUsers = global.connectedUsers;
    
    if (!io || !connectedUsers) {
        console.log('⚠️ Socket.IO or connectedUsers not available');
        return false;
    }
    
    const userIdString = userId.toString();
    const socketId = connectedUsers.get(userIdString);
    
    console.log(`📡 Attempting to send notification to user ${userIdString}`);
    
    if (socketId) {
        try {
            // Send notification immediately
            io.to(socketId).emit('newNotification', {
                id: notificationData.id || Date.now(),
                userId: parseInt(userId),
                type: notificationData.type || 'message',
                title: notificationData.title || 'New Notification',
                message: notificationData.message || '',
                senderId: notificationData.senderId,
                senderName: notificationData.senderName,
                created_at: notificationData.created_at || new Date().toISOString(),
                is_read: false,
                action_url: notificationData.action_url || '/messages'
            });
            
            console.log(`✅ Notification sent to user ${userId}`);
            
            // FIXED: Ensure proper timing for badge update after DB operations
            setTimeout(async () => {
                try {
                    const counts = await NotificationService.getNotificationCounts(userId);
                    io.to(socketId).emit('updateNotificationCount', counts);
                    console.log('✅ Badge updated for user', userId, 'with counts:', counts);
                } catch (error) {
                    console.error('❌ Error updating badge:', error);
                }
            }, 1000); // Increased delay to ensure DB consistency
            
            return true;
        } catch (error) {
            console.error('❌ Error sending real-time notification:', error);
            return false;
        }
    } else {
        console.log(`❌ User ${userId} not connected to socket`);
        return false;
    }
}

    // FIXED: Create and send message notification with proper error handling
    static async createMessageNotification(senderId, receiverId, messageContent, messageId) {
        try {
            console.log('📨 Creating message notification:', { senderId, receiverId, messageId });
            
            // Get sender information
            const [senderInfo] = await db.execute(
                'SELECT first_name, last_name, email FROM users WHERE id = ?',
                [senderId]
            );
            
            if (senderInfo.length === 0) {
                throw new Error(`Sender with ID ${senderId} not found`);
            }
            
            const sender = senderInfo[0];
            const senderName = `${sender.first_name} ${sender.last_name}`;
            
            // Truncate message for notification display
            const truncatedMessage = messageContent.length > 100 
                ? messageContent.substring(0, 100) + '...' 
                : messageContent;
            
            // Create notification in database
            const notificationId = await this.createNotification({
                userId: receiverId,
                type: 'message',
                title: `New message from ${senderName}`,
                message: truncatedMessage,
                data: {
                    senderId: senderId,
                    senderName: senderName,
                    senderEmail: sender.email,
                    messageId: messageId
                },
                actionUrl: '/messages'
            });
            
            // Prepare real-time notification data
            const notificationData = {
                id: notificationId,
                userId: receiverId,
                type: 'message',
                title: `New message from ${senderName}`,
                message: truncatedMessage,
                senderId: senderId,
                senderName: senderName,
                senderEmail: sender.email,
                messageId: messageId,
                created_at: new Date().toISOString(),
                is_read: false,
                action_url: '/messages'
            };
            
            // Send real-time notification
            const sent = this.sendRealTimeNotification(receiverId, notificationData);
            console.log(`📡 Real-time notification ${sent ? 'sent' : 'failed'} for message ${messageId}`);
            
            return notificationId;
        } catch (error) {
            console.error('❌ Error creating message notification:', error);
            throw error;
        }
    }

    // FIXED: Prevent double counting and ensure accurate counts
static async getNotificationCounts(userId) {
    try {
        console.log('📊 Getting notification counts for user:', userId);
        
        // Get user email first
        const [userResult] = await db.execute('SELECT email FROM users WHERE id = ?', [userId]);
        
        if (userResult.length === 0) {
            console.log('❌ User not found:', userId);
            return { total: 0, counts: { message: 0, announcement: 0, system: 0 } };
        }
        
        const userEmail = userResult[0].email;
        
        // FIXED: Get ONLY unread message counts from messages table (primary source of truth)
        const [messageCounts] = await db.execute(`
            SELECT COUNT(*) as unread_messages
            FROM messages 
            WHERE receiver_email = ? AND is_read = 0
        `, [userEmail]);
        
        // FIXED: Get ONLY non-message notification counts to avoid double counting
        const [notificationCounts] = await db.execute(`
            SELECT 
                type,
                COUNT(*) as unread
            FROM notifications 
            WHERE user_id = ? AND read_at IS NULL AND type != 'message'
            GROUP BY type
        `, [userId]);
        
        // Build response - messages from messages table only, no double counting
        const result = {
            total: 0,
            counts: {
                message: parseInt(messageCounts[0]?.unread_messages || 0),
                announcement: 0,
                system: 0
            }
        };
        
        // Add only non-message notification counts
        notificationCounts.forEach(count => {
            if (count.type && count.type !== 'message') {
                result.counts[count.type] = parseInt(count.unread || 0);
            }
        });
        
        // Calculate total - no double counting
        result.total = result.counts.message + result.counts.announcement + result.counts.system;
        
        console.log('📊 Fixed notification counts for user', userId, ':', result);
        return result;
    } catch (error) {
        console.error('❌ Error getting notification counts:', error);
        return { total: 0, counts: { message: 0, announcement: 0, system: 0 } };
    }
}

    // Mark notification as read
    static async markAsRead(notificationId, userId) {
        try {
            const [result] = await db.execute(
                'UPDATE notifications SET read_at = NOW() WHERE id = ? AND user_id = ?',
                [notificationId, userId]
            );
            console.log(`✅ Marked notification ${notificationId} as read for user ${userId}`);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('❌ Error marking notification as read:', error);
            return false;
        }
    }

    // Send test notification
    static async sendTestNotification(userId, type = 'system') {
        try {
            const notificationId = await this.createNotification({
                userId: userId,
                type: type,
                title: 'Test Notification',
                message: 'This is a test notification to verify the system is working',
                data: { test: true },
                actionUrl: '/dashboard'
            });

            const notificationData = {
                id: notificationId,
                userId: userId,
                type: type,
                title: 'Test Notification',
                message: 'This is a test notification to verify the system is working',
                is_read: false,
                created_at: new Date().toISOString(),
                action_url: '/dashboard'
            };

            this.sendRealTimeNotification(userId, notificationData);
            
            return notificationId;
        } catch (error) {
            console.error('❌ Error sending test notification:', error);
            throw error;
        }
    }

    // ADD this method to NotificationService class - for announcement notifications
static async createAnnouncementNotifications(announcementId, targetAudience, targetCourse, targetYear, announcementTitle, postedBy) {
    try {
        console.log('📢 Creating announcement notifications:', { announcementId, targetAudience, targetCourse, targetYear });
        
        // Determine who should be notified based on target audience
        let targetQuery = '';
        let targetParams = [];
        
        switch (targetAudience) {
            case 'All Students':
                targetQuery = `SELECT id, email, first_name, last_name FROM users WHERE role = 'student' AND id != ?`;
                targetParams = [postedBy];
                break;
            case 'Registrar':
                targetQuery = `SELECT id, email, first_name, last_name FROM users WHERE role = 'registrar' AND id != ?`;
                targetParams = [postedBy];
                break;
            case 'Faculty':
                targetQuery = `SELECT id, email, first_name, last_name FROM users WHERE role = 'faculty' AND id != ?`;
                targetParams = [postedBy];
                break;
            case 'All':
                targetQuery = `SELECT id, email, first_name, last_name FROM users WHERE role IN ('student', 'faculty', 'registrar') AND id != ?`;
                targetParams = [postedBy];
                break;
            default:
                targetQuery = `SELECT id, email, first_name, last_name FROM users WHERE role = 'student' AND id != ?`;
                targetParams = [postedBy];
        }
        
        // Add course and year filtering for students if specified
        if (targetAudience === 'All Students' || targetAudience === 'All') {
            if (targetCourse && targetCourse !== 'All') {
                targetQuery = targetQuery.replace('WHERE role', 'LEFT JOIN student_info si ON users.id = si.id WHERE (role != \'student\' OR si.major = ?) AND role');
                targetParams.unshift(targetCourse);
            }
            if (targetYear && targetYear !== 'All') {
                if (targetCourse && targetCourse !== 'All') {
                    targetQuery = targetQuery.replace('si.major = ?', 'si.major = ? AND si.year_level = ?');
                    targetParams.splice(1, 0, targetYear);
                } else {
                    targetQuery = targetQuery.replace('WHERE role', 'LEFT JOIN student_info si ON users.id = si.id WHERE (role != \'student\' OR si.year_level = ?) AND role');
                    targetParams.unshift(targetYear);
                }
            }
        }
        
        const [targetUsers] = await db.execute(targetQuery, targetParams);
        
        // Create notifications for each target user
        const notifications = [];
        if (targetUsers.length > 0) {
            for (const user of targetUsers) {
                const notificationId = await this.createNotification({
                    userId: user.id,
                    type: 'announcement',
                    title: 'New Announcement',
                    message: `${announcementTitle.substring(0, 100)}${announcementTitle.length > 100 ? '...' : ''}`,
                    data: {
                        announcement_id: announcementId,
                        posted_by: postedBy,
                        target_audience: targetAudience
                    },
                    actionUrl: '/announcements'
                });
                
                // Send real-time notification
                const notificationData = {
                    id: notificationId,
                    userId: user.id,
                    type: 'announcement',
                    title: 'New Announcement',
                    message: `${announcementTitle.substring(0, 100)}${announcementTitle.length > 100 ? '...' : ''}`,
                    is_read: false,
                    created_at: new Date().toISOString(),
                    action_url: '/announcements'
                };
                
                this.sendRealTimeNotification(user.id, notificationData);
                notifications.push(notificationId);
            }
            
            console.log(`📬 Created ${targetUsers.length} announcement notification(s)`);
        }
        
        return notifications;
    } catch (error) {
        console.error('❌ Error creating announcement notifications:', error);
        throw error;
    }
}

// ENHANCED: Two-stage enrollment notification system
static async createEnrollmentNotification(userId, status, courseName, semesterYear, enrollmentRequestId = null) {
    try {
        console.log('🎓 Creating enrollment notification:', { userId, status, courseName, enrollmentRequestId });
        
        // Ensure userId is integer
        const studentId = parseInt(userId);
        if (!studentId || isNaN(studentId)) {
            throw new Error('Invalid userId provided: ' + userId);
        }
        
        // Verify user exists in database
        const [userCheck] = await db.execute('SELECT id, email FROM users WHERE id = ?', [studentId]);
        if (userCheck.length === 0) {
            throw new Error('User not found in database for ID: ' + studentId);
        }
        
        console.log('✅ User verified:', userCheck[0].email);
        
        let title, message, type;

        if (status === 'approved') {
            // STAGE 1: Registrar approval notification
            title = 'Enrollment Request Approved!';
            message = `Your enrollment request for ${courseName} (${semesterYear}) has been approved by the registrar. Please wait for faculty processing to complete your enrollment.`;
            type = 'enrollment';
        } else if (status === 'enrolled') {
            // STAGE 2: Faculty migration completion notification
            title = 'Successfully Enrolled!';
            message = `Welcome to ${courseName} (${semesterYear})! Your enrollment is now complete and active. You can now view your class schedule and course materials.`;
            type = 'enrollment';
        } else if (status === 'rejected') {
            title = 'Enrollment Update Required';
            message = `Your enrollment for ${courseName} (${semesterYear}) requires attention. Please contact the registrar's office for more information.`;
            type = 'enrollment';
        } else {
            title = 'Enrollment Update';
            message = `Your enrollment status for ${courseName} (${semesterYear}) has been updated to: ${status}`;
            type = 'enrollment';
        }
        
        // Create the notification in database FIRST
        const notificationData = {
            userId: studentId,
            type: type,
            title: title,
            message: message,
            data: {
                status: status,
                course_name: courseName,
                semester_year: semesterYear,
                enrollment_request_id: enrollmentRequestId,
                action_type: 'enrollment_status_update',
                stage: status === 'approved' ? 'registrar_approved' : status === 'enrolled' ? 'faculty_enrolled' : 'other'
            },
            actionUrl: '/dashboard'
        };
        
        const notificationId = await this.createNotification(notificationData);
        console.log('📧 Notification created in database with ID:', notificationId);
        
        // Send real-time notification immediately
        const realTimeData = {
            id: notificationId,
            user_id: studentId,
            userId: studentId,
            type: type,
            title: title,
            message: message,
            is_read: 0,
            read: false,
            created_at: new Date().toISOString(),
            action_url: '/dashboard',
            data: JSON.stringify(notificationData.data)
        };
        
        console.log('📡 Sending real-time notification to user:', studentId);
        const sent = this.sendRealTimeNotification(studentId, realTimeData);
        console.log(`📡 Real-time notification ${sent ? 'SENT SUCCESSFULLY' : 'FAILED TO SEND'}`);
        
        return notificationId;
        
    } catch (error) {
        console.error('❌ CRITICAL ERROR in createEnrollmentNotification:', error);
        console.error('❌ Full error details:', {
            message: error.message,
            stack: error.stack,
            userId: userId,
            status: status
        });
        throw error;
    }
}

// ADD this method to NotificationService class - for grades notification
static async createGradesNotification(studentId, courseName, semester, facultyName) {
    try {
        console.log('📊 Creating grades notification:', { studentId, courseName, semester });
        
        // Ensure studentId is integer
        const studentIdInt = parseInt(studentId);
        if (!studentIdInt || isNaN(studentIdInt)) {
            throw new Error('Invalid studentId provided: ' + studentId);
        }
        
        // Verify user exists in database
        const [userCheck] = await db.execute('SELECT id, email FROM users WHERE id = ?', [studentIdInt]);
        if (userCheck.length === 0) {
            throw new Error('User not found in database for ID: ' + studentIdInt);
        }
        
        console.log('✅ Student verified:', userCheck[0].email);
        
        const title = 'Grades Available';
        const message = `Your grades for ${courseName} (${semester}) are now available. Please check your student portal to view your academic performance.`;
        const type = 'grades';
        
        // Create the notification in database
        const notificationData = {
            userId: studentIdInt,
            type: type,
            title: title,
            message: message,
            data: {
                course_name: courseName,
                semester: semester,
                faculty_name: facultyName,
                action_type: 'grades_posted'
            },
            actionUrl: '/grades'
        };
        
        const notificationId = await this.createNotification(notificationData);
        console.log('📧 Grades notification created in database with ID:', notificationId);
        
        // Send real-time notification
        const realTimeData = {
            id: notificationId,
            user_id: studentIdInt,
            userId: studentIdInt,
            type: type,
            title: title,
            message: message,
            is_read: 0,
            read: false,
            created_at: new Date().toISOString(),
            action_url: '/grades',
            data: JSON.stringify(notificationData.data)
        };
        
        console.log('📡 Sending real-time grades notification to user:', studentIdInt);
        const sent = this.sendRealTimeNotification(studentIdInt, realTimeData);
        console.log(`📡 Real-time grades notification ${sent ? 'SENT SUCCESSFULLY' : 'FAILED TO SEND'}`);
        
        return notificationId;
        
    } catch (error) {
        console.error('❌ CRITICAL ERROR in createGradesNotification:', error);
        throw error;
    }
}
}



export default NotificationService;
