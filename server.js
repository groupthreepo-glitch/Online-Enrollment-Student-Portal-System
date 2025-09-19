import { createServer } from 'http';
import { Server } from 'socket.io';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import { join, dirname } from 'path';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import fs from 'fs';
import authRoutes from './backend/routes/auth.js';
import userRoutes from './backend/routes/users.js';
import messageRoutes from './backend/routes/messages.js';
import studentInfoRoutes from './backend/routes/studentinfo.js';
import courseRoutes from './backend/routes/course.js';
import enrollmentRoutes from './backend/routes/enrollment.js';
import notificationRoutes from './backend/routes/notifications.js'
import NotificationService from './backend/services/notificationService.js';

// Import database connection for notification functionality
let db;
try {
    const dbModule = await import('./backend/config/database.js');
    db = dbModule.default;
    console.log('✅ Database connection imported successfully');
    global.db = db; // Make it globally available
} catch (dbError) {
    console.error('❌ Failed to import database:', dbError);
}
// Setup __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

// FIXED: Correct uploads directory path to match your backend structure
const uploadsDir = join(__dirname, 'backend', 'uploads', 'announcements');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 Created uploads directory:', uploadsDir);
}

// ADDED: Create avatars directory
const avatarsDir = join(__dirname, 'backend', 'uploads', 'avatars');
if (!fs.existsSync(avatarsDir)) {
    fs.mkdirSync(avatarsDir, { recursive: true });
    console.log('📁 Created avatars directory:', avatarsDir);
}

// Receipts directory
const receiptsDir = path.join(__dirname, 'uploads', 'receipts');
if (!fs.existsSync(receiptsDir)) {
    fs.mkdirSync(receiptsDir, { recursive: true });
    console.log('📁 Created receipts directory:', receiptsDir);
}

// Import authentication middleware with proper error handling
let authenticateToken;
try {
    const authModule = await import('./backend/middleware/auth.js');
    authenticateToken = authModule.authenticateToken || authModule.default?.authenticateToken;
    
    if (!authenticateToken) {
        throw new Error('authenticateToken not found in auth middleware');
    }
    console.log('✅ Authentication middleware loaded successfully');
} catch (error) {
    console.error('❌ Failed to load authentication middleware:', error);
    
    // Create a simple fallback middleware for testing
    authenticateToken = (req, res, next) => {
        console.log('⚠️ Using fallback authentication');
        
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'Access token required' 
            });
        }
        
        // Simple token validation - replace with proper JWT validation
        try {
            // For testing, we'll just extract user ID from a simple token
            // In production, use proper JWT verification
            req.user = { id: 1, username: 'student' }; // Mock user
            next();
        } catch (error) {
            return res.status(403).json({ 
                success: false, 
                message: 'Invalid token' 
            });
        }
    };
}
// Try to import announcements route, with fallback
let announcementRoutes;
try {
    announcementRoutes = (await import('./backend/routes/announcements.js')).default;
    console.log('✅ Announcements route loaded successfully');
} catch (error) {
    console.log('⚠️ Announcements route not found, creating enhanced fallback');
    
    announcementRoutes = express.Router();
    
    // Configure multer for the fallback route
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadsDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = file.originalname.split('.').pop();
            cb(null, 'announcement-' + uniqueSuffix + '.' + ext);
        }
    });

    const upload = multer({ 
        storage: storage,
        limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
        fileFilter: (req, file, cb) => {
            // Only allow image files
            if (file.mimetype.startsWith('image/')) {
                cb(null, true);
            } else {
                cb(new Error('Only image files are allowed'), false);
            }
        }
    });

    // Mock announcements data
    const mockAnnouncements = [
        {
            id: 1,
            title: "Welcome to the New Semester",
            content: "We are excited to welcome all students back for the new academic year. Please check your schedules and prepare for an amazing semester ahead!",
            target_audience: "All Students",
            target_course: "All",
            target_year: "All",
            priority: "important",
            posted_by_id: 1,
            posted_by_username: "Admin",
            image_url: null,
            view_count: 45,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            id: 2,
            title: "Library Hours Extended",
            content: "Starting this week, the library will be open 24/7 to support your academic needs during finals season.",
            target_audience: "All Students",
            target_course: "All", 
            target_year: "All",
            priority: "general",
            posted_by_id: 1,
            posted_by_username: "Admin",
            image_url: null,
            view_count: 23,
            created_at: new Date(Date.now() - 86400000).toISOString(),
            updated_at: new Date(Date.now() - 86400000).toISOString()
        }
    ];
    
    // GET /api/announcements
    announcementRoutes.get('/', (req, res) => {
        console.log('📡 Fallback announcements API called');
        try {
            const { priority, target_course, target_year, search, limit = 50, offset = 0 } = req.query;
            
            let filteredAnnouncements = [...mockAnnouncements];
            
            // Apply filters
            if (priority && priority !== 'all') {
                filteredAnnouncements = filteredAnnouncements.filter(a => a.priority === priority);
            }
            
            if (target_course && target_course !== 'all' && target_course !== 'All') {
                filteredAnnouncements = filteredAnnouncements.filter(a => 
                    a.target_course === target_course || a.target_course === 'All'
                );
            }
            
            if (target_year && target_year !== 'all' && target_year !== 'All') {
                filteredAnnouncements = filteredAnnouncements.filter(a => 
                    a.target_year === target_year || a.target_year === 'All'
                );
            }
            
            if (search) {
                const searchLower = search.toLowerCase();
                filteredAnnouncements = filteredAnnouncements.filter(a => 
                    a.title.toLowerCase().includes(searchLower) ||
                    a.content.toLowerCase().includes(searchLower)
                );
            }
            
            // Sort by priority and date
            filteredAnnouncements.sort((a, b) => {
                const priorityOrder = { urgent: 1, important: 2, general: 3 };
                const aPriority = priorityOrder[a.priority] || 3;
                const bPriority = priorityOrder[b.priority] || 3;
                
                if (aPriority !== bPriority) {
                    return aPriority - bPriority;
                }
                
                return new Date(b.created_at) - new Date(a.created_at);
            });
            
            // Apply pagination
            const startIndex = parseInt(offset);
            const endIndex = startIndex + parseInt(limit);
            const paginatedAnnouncements = filteredAnnouncements.slice(startIndex, endIndex);
            
            res.json({
                success: true,
                data: paginatedAnnouncements,
                pagination: {
                    total: filteredAnnouncements.length,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: startIndex + paginatedAnnouncements.length < filteredAnnouncements.length
                }
            });
        } catch (error) {
            console.error('Error in fallback announcements API:', error);
            res.status(500).json({ 
                success: false,
                message: 'Failed to fetch announcements',
                error: error.message 
            });
        }
    });

    // GET /api/announcements/stats/summary
    announcementRoutes.get('/stats/summary', (req, res) => {
        try {
            const total_announcements = mockAnnouncements.length;
            const urgent_count = mockAnnouncements.filter(a => a.priority === 'urgent').length;
            const important_count = mockAnnouncements.filter(a => a.priority === 'important').length;
            const general_count = mockAnnouncements.filter(a => a.priority === 'general').length;
            const total_views = mockAnnouncements.reduce((sum, a) => sum + (a.view_count || 0), 0);

            res.json({
                success: true,
                data: { 
                    total_announcements, 
                    urgent_count, 
                    important_count, 
                    general_count,
                    total_views
                }
            });
        } catch (error) {
            console.error('Error fetching announcement stats:', error);
            res.status(500).json({ 
                success: false,
                message: 'Failed to fetch statistics',
                error: error.message
            });
        }
    });

    // GET /api/announcements/:id
    announcementRoutes.get('/:id', (req, res) => {
        try {
            const { id } = req.params;
            const announcement = mockAnnouncements.find(a => a.id === parseInt(id));
            
            if (!announcement) {
                return res.status(404).json({
                    success: false,
                    message: 'Announcement not found'
                });
            }

            // Increment view count
            announcement.view_count = (announcement.view_count || 0) + 1;

            res.json({
                success: true,
                data: announcement
            });
        } catch (error) {
            console.error('Error fetching single announcement:', error);
            res.status(500).json({ 
                success: false,
                message: 'Failed to fetch announcement',
                error: error.message
            });
        }
    });

    // COMPLETELY FIXED POST /api/announcements
    announcementRoutes.post('/', upload.single('image'), (req, res) => {
        try {
            console.log('📝 Creating new announcement (fallback)');
            console.log('📋 Request body:', req.body);
            console.log('📸 File received:', req.file ? {
                originalname: req.file.originalname,
                filename: req.file.filename,
                size: req.file.size,
                mimetype: req.file.mimetype,
                path: req.file.path
            } : 'No file');
            
            const { title, content, target_audience, target_course, target_year, priority } = req.body;

            // Validation
            if (!title || !title.trim()) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Title is required and cannot be empty'
                });
            }

            if (!content || !content.trim()) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Content is required and cannot be empty'
                });
            }

            // Create new announcement
            const newAnnouncement = {
                id: Math.max(...mockAnnouncements.map(a => a.id), 0) + 1,
                title: title.trim(),
                content: content.trim(),
                target_audience: target_audience || 'All Students',
                target_course: target_course || 'All',
                target_year: target_year || 'All',
                priority: priority || 'general',
                posted_by_id: 1,
                posted_by_username: 'Admin',
                // COMPLETELY FIXED: Store consistent full path
                image_url: req.file ? `/uploads/announcements/${req.file.filename}` : null,
                view_count: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            mockAnnouncements.unshift(newAnnouncement);

            console.log('✅ Announcement created successfully (fallback):', {
                id: newAnnouncement.id,
                title: newAnnouncement.title,
                hasImage: !!newAnnouncement.image_url,
                imageFilename: newAnnouncement.image_url
            });

            res.status(201).json({
                success: true,
                message: 'Announcement created successfully',
                data: newAnnouncement
            });
        } catch (error) {
            console.error('❌ Error creating announcement (fallback):', error);
            
            // Handle multer errors specifically
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ 
                    success: false,
                    message: 'File size too large. Maximum size is 5MB.'
                });
            }
            
            if (error.message === 'Only image files are allowed') {
                return res.status(400).json({ 
                    success: false,
                    message: 'Only image files are allowed. Please upload a valid image.'
                });
            }
            
            res.status(500).json({ 
                success: false,
                message: 'Failed to create announcement',
                error: error.message
            });
        }
    });

    // PUT /api/announcements/:id - FIXED
    announcementRoutes.put('/:id', upload.single('image'), (req, res) => {
        try {
            const { id } = req.params;
            const { title, content, target_audience, target_course, target_year, priority } = req.body;
            
            console.log('📝 Updating announcement:', id);
            console.log('📋 Request body:', req.body);
            console.log('📸 New file:', req.file ? req.file.filename : 'No new file');
            
            const announcementIndex = mockAnnouncements.findIndex(a => a.id === parseInt(id));
            
            if (announcementIndex === -1) {
                return res.status(404).json({
                    success: false,
                    message: 'Announcement not found'
                });
            }

            // Update the announcement
            const existingAnnouncement = mockAnnouncements[announcementIndex];
            mockAnnouncements[announcementIndex] = {
                ...existingAnnouncement,
                title: title?.trim() || existingAnnouncement.title,
                content: content?.trim() || existingAnnouncement.content,
                target_audience: target_audience || existingAnnouncement.target_audience,
                target_course: target_course || existingAnnouncement.target_course,
                target_year: target_year || existingAnnouncement.target_year,
                priority: priority || existingAnnouncement.priority,
                // COMPLETELY FIXED: Store consistent full path for new uploads
                image_url: req.file ? `/uploads/announcements/${req.file.filename}` : existingAnnouncement.image_url,
                updated_at: new Date().toISOString()
            };

            console.log('✅ Announcement updated successfully');

            res.json({
                success: true,
                message: 'Announcement updated successfully',
                data: mockAnnouncements[announcementIndex]
            });
        } catch (error) {
            console.error('❌ Error updating announcement:', error);
            res.status(500).json({ 
                success: false,
                message: 'Failed to update announcement',
                error: error.message
            });
        }
    });

    // DELETE /api/announcements/:id - FIXED
    announcementRoutes.delete('/:id', (req, res) => {
        try {
            const { id } = req.params;
            const announcementIndex = mockAnnouncements.findIndex(a => a.id === parseInt(id));
            
            if (announcementIndex === -1) {
                return res.status(404).json({
                    success: false,
                    message: 'Announcement not found'
                });
            }

            const deletedAnnouncement = mockAnnouncements[announcementIndex];
            
            // Delete associated image file if exists
            if (deletedAnnouncement.image_url) {
                const imagePath = join(uploadsDir, deletedAnnouncement.image_url);
                if (fs.existsSync(imagePath)) {
                    try {
                        fs.unlinkSync(imagePath);
                        console.log('🗑️ Deleted image file:', deletedAnnouncement.image_url);
                    } catch (error) {
                        console.error('❌ Error deleting image file:', error);
                    }
                }
            }

            mockAnnouncements.splice(announcementIndex, 1);

            res.json({
                success: true,
                message: 'Announcement deleted successfully'
            });
        } catch (error) {
            console.error('❌ Error deleting announcement:', error);
            res.status(500).json({ 
                success: false,
                message: 'Failed to delete announcement',
                error: error.message
            });
        }
    });
}

// Import profile routes from your existing info.js file
let profileRoutes;
try {
    profileRoutes = (await import('./backend/routes/info.js')).default;
    console.log('✅ Profile routes loaded from info.js');
} catch (error) {
    console.error('❌ Failed to load profile routes from info.js:', error);
    
    // Create database-connected routes as fallback
    profileRoutes = express.Router();
    
    // Import your database connection
    // Import your database connection
let db;
try {
    const dbModule = await import('./backend/config/database.js');
    db = dbModule.default;
    console.log('✅ Database connection imported for profile routes');
} catch (dbError) {
    console.error('❌ Failed to import database:', dbError);
    throw new Error('Database connection required for profile functionality');
}

    // Import authentication middleware
    const { authenticateToken } = await import('./backend/middleware/auth.js');

    // Configure multer for avatar uploads
    const avatarStorage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, avatarsDir);
        },
        filename: (req, file, cb) => {
            const userId = req.user?.id || 1; // Get from authenticated user
            const timestamp = Date.now();
            const ext = path.extname(file.originalname);
            const filename = `avatar_${userId}_${timestamp}${ext}`;
            console.log('📸 Generated avatar filename:', filename);
            cb(null, filename);
        }
    });

    const avatarUpload = multer({
        storage: avatarStorage,
        limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
        fileFilter: (req, file, cb) => {
            const allowedTypes = /jpeg|jpg|png|gif|webp/;
            const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
            const mimetype = allowedTypes.test(file.mimetype);
            if (mimetype && extname) {
                return cb(null, true);
            } else {
                cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)'));
            }
        }
    });

    profileRoutes.get('/get', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id; // Get from authenticated user
        console.log('Fetching profile for user ID:', userId);
        
        const [rows] = await db.execute(
            'SELECT * FROM student_info WHERE id = ?',
            [userId]
        );
        
        if (rows.length > 0) {
            console.log('Profile found:', rows[0]);
            res.json({
                success: true,
                data: rows[0],
                message: 'Profile found'
            });
        } else {
            console.log('No profile found for user:', userId);
            res.json({
                success: true,
                data: null,
                message: 'No profile data found'
            });
        }
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile data',
            error: error.message
        });
    }
});

    // Test endpoint for profile API
    profileRoutes.get('/test', (req, res) => {
        res.json({
            success: true,
            message: 'Profile API is working',
            timestamp: new Date().toISOString(),
            endpoints: [
                'GET /api/profile/get - Get profile data (PROTECTED)',
                'POST /api/profile/save - Save profile (PROTECTED)',
                'POST /api/profile/upload-avatar - Upload avatar (PROTECTED)',
                'DELETE /api/profile/delete-avatar - Delete avatar (PROTECTED)'
            ]
        });
    });

    // Save profile data - PROTECTED ROUTE
    profileRoutes.post('/save', authenticateToken, async (req, res) => {
        try {
            const userId = req.user.id; // Get from authenticated user
            const {
                firstName, lastName, displayName, email, phone,
                dateOfBirth, homeAddress, city, postalCode, 
                province, country, studentId, major, yearLevel
            } = req.body;

            console.log('💾 Saving profile for user:', userId);
            console.log('📋 Profile data:', req.body);

            // Validate required fields
            if (!firstName || !lastName || !displayName || !email || !studentId || !major || !yearLevel) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields'
                });
            }

            // Check if profile exists
            const [existingRows] = await db.execute(
                'SELECT id FROM student_info WHERE id = ?',
                [userId]
            );

            let query, params;
            if (existingRows.length > 0) {
                // Update existing profile
                query = `UPDATE student_info SET 
                    first_name = ?, last_name = ?, display_name = ?, email = ?, phone = ?,
                    date_of_birth = ?, home_address = ?, city = ?, postal_code = ?, 
                    province = ?, country = ?, student_id = ?, major = ?, year_level = ?,
                    updated_at = NOW()
                    WHERE id = ?`;
                params = [firstName, lastName, displayName, email, phone, 
                         dateOfBirth, homeAddress, city, postalCode, province, 
                         country, studentId, major, yearLevel, userId];
                console.log('🔄 Updating existing profile');
            } else {
                // Insert new profile
                query = `INSERT INTO student_info 
                    (id, first_name, last_name, display_name, email, phone, date_of_birth, 
                     home_address, city, postal_code, province, country, student_id, major, 
                     year_level, created_at, updated_at) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`;
                params = [userId, firstName, lastName, displayName, email, phone, 
                         dateOfBirth, homeAddress, city, postalCode, province, 
                         country, studentId, major, yearLevel];
                console.log('✨ Creating new profile');
            }

            await db.execute(query, params);

            // Fetch updated profile
            const [updatedRows] = await db.execute(
                'SELECT * FROM student_info WHERE id = ?',
                [userId]
            );

            console.log('✅ Profile saved successfully');

            res.json({
                success: true,
                message: 'Profile saved successfully',
                data: updatedRows[0]
            });

        } catch (error) {
            console.error('❌ Error saving profile:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to save profile',
                error: error.message
            });
        }
    });

    // Upload avatar route - PROTECTED ROUTE
    profileRoutes.post('/upload-avatar', authenticateToken, avatarUpload.single('avatar'), async (req, res) => {
    try {
        console.log('📸 Avatar upload request received');
        console.log('User from token:', req.user);
        console.log('File received:', req.file ? {
            originalname: req.file.originalname,
            filename: req.file.filename,
            size: req.file.size,
            path: req.file.path
        } : 'No file received');

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const userId = req.user.id; // Get from authenticated user
        const avatarUrl = `/uploads/avatars/${req.file.filename}`;

        console.log('💾 Saving avatar URL to database:', avatarUrl);

        // Get current avatar to delete old file
        const [currentRows] = await db.execute(
            'SELECT avatar_url FROM student_info WHERE id = ?',
            [userId]
        );

        // Delete old avatar file if exists
        if (currentRows.length > 0 && currentRows[0].avatar_url) {
            const oldFileName = path.basename(currentRows[0].avatar_url);
            const oldAvatarPath = path.join(avatarsDir, oldFileName);
            if (fs.existsSync(oldAvatarPath)) {
                try {
                    fs.unlinkSync(oldAvatarPath);
                    console.log('🗑️ Deleted old avatar:', oldAvatarPath);
                } catch (deleteError) {
                    console.warn('⚠️ Could not delete old avatar:', deleteError.message);
                }
            }
        }

        // Update or insert avatar URL in database
        if (currentRows.length > 0) {
            await db.execute(
                'UPDATE student_info SET avatar_url = ?, updated_at = NOW() WHERE id = ?',
                [avatarUrl, userId]
            );
            console.log('✅ Updated existing profile with avatar');
        } else {
            // Create new profile record with just avatar
            await db.execute(
                `INSERT INTO student_info (id, avatar_url, created_at, updated_at) 
                 VALUES (?, ?, NOW(), NOW())`,
                [userId, avatarUrl]
            );
            console.log('✅ Created new profile with avatar');
        }

        console.log('🎉 Avatar upload successful');

        res.json({
            success: true,
            message: 'Avatar uploaded successfully',
            avatarUrl: avatarUrl,
            filename: req.file.filename
        });

    } catch (error) {
        console.error('❌ Error uploading avatar:', error);
        
        // Delete uploaded file if database update fails
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            try {
                fs.unlinkSync(req.file.path);
                console.log('🧹 Cleaned up failed upload file');
            } catch (cleanupError) {
                console.warn('⚠️ Could not cleanup file:', cleanupError.message);
            }
        }

        res.status(500).json({
            success: false,
            message: error.message || 'Failed to upload avatar',
            error: error.message
        });
    }
});

    // Delete avatar - PROTECTED ROUTE
    profileRoutes.delete('/delete-avatar', authenticateToken, async (req, res) => {
        try {
            const userId = req.user.id; // Get from authenticated user

            // Get current avatar
            const [rows] = await db.execute(
                'SELECT avatar_url FROM student_info WHERE id = ?',
                [userId]
            );

            if (rows.length > 0 && rows[0].avatar_url) {
                // Delete avatar file
                const avatarPath = path.join(avatarsDir, path.basename(rows[0].avatar_url));
                if (fs.existsSync(avatarPath)) {
                    fs.unlinkSync(avatarPath);
                    console.log('🗑️ Deleted avatar file:', avatarPath);
                }

                // Update database
                await db.execute(
                    'UPDATE student_info SET avatar_url = NULL, updated_at = NOW() WHERE id = ?',
                    [userId]
                );
            }

            res.json({
                success: true,
                message: 'Avatar deleted successfully'
            });

        } catch (error) {
            console.error('Error deleting avatar:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete avatar'
            });
        }
    });
}

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3006;

// CRITICAL FIX: Proper middleware order and configuration
app.use(cookieParser());

app.use('/uploads/*', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
});

// Request logging middleware
app.use((req, res, next) => {
    console.log(`📝 ${req.method} ${req.path}`, {
        contentType: req.headers['content-type'] || 'none',
        hasAuth: req.headers.authorization ? 'Yes' : 'No',
        cookies: req.cookies ? Object.keys(req.cookies).length : 0
    });
    next();
});

// FIXED: Static file serving configuration - CORRECTED PATH
console.log('📁 Setting up static file serving...');
const uploadsPath = path.join(__dirname, 'backend', 'uploads');
console.log('  - Upload files from:', uploadsPath);
console.log('  - Public files from:', path.join(__dirname, 'public'));

// Serve uploads with proper headers
app.use('/uploads', (req, res, next) => {
    console.log('📸 Serving upload request:', req.path);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
});

app.use('/uploads', express.static(uploadsPath, {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        };
        if (mimeTypes[ext]) {
            res.setHeader('Content-Type', mimeTypes[ext]);
        }
    }
}));

// Serve public files
app.use(express.static(join(__dirname, 'public')));

// SMART BODY PARSER: Only apply to non-multipart requests
app.use((req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    
    // Skip body parsing for multipart form data and announcement routes with images
    if (contentType.startsWith('multipart/form-data')) {
        console.log('🚫 Skipping body parser for multipart data');
        return next();
    }
    
    // Apply bodyParser for JSON and URL-encoded data
    bodyParser.json({ limit: '10mb' })(req, res, (err) => {
        if (err) return next(err);
        bodyParser.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
    });
});
// CORS middleware specifically for profile routes
app.use('/api/profile', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// ADD ERROR HANDLING MIDDLEWARE
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File size too large. Maximum size is 5MB.'
            });
        }
    }
    
    console.error('Server Error:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// ADD THIS DEBUG MIDDLEWARE TO server.js
app.use('/api/enrollment/*', (req, res, next) => {
    console.log(`🔍 ENROLLMENT API CALL: ${req.method} ${req.originalUrl}`);
    console.log('📍 Route exists?', req.route ? 'YES' : 'NO');
    console.log('📍 Params:', req.params);
    console.log('📍 Query:', req.query);
    next();
});

// Your enrollment routes should come AFTER this
app.use('/api/enrollment', enrollmentRoutes);

// ADDED: Register profile routes
app.use('/api/profile', profileRoutes);

// API routes - Announcements route comes after static serving
app.use('/api/announcements', announcementRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/studentinfo', studentInfoRoutes);
// Register course routes properly
app.use('/api', courseRoutes); // This will handle /api/programs and /api/curriculum
app.use('/api/enrollment', enrollmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/notificationService', NotificationService);


// Route handlers for HTML pages
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'login.html'));
});

app.get('/login.html', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'register.html'));
});

app.get('/register.html', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'register.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'dashboard.html'));
});

app.get('/dashboard.html', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'dashboard.html'));
});

app.get('/announcements', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'announcements.html'));
});

app.get('/announcements.html', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'announcements.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'admin.html'));
});

app.get('/admin.html', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'admin.html'));
});

app.get('/messages', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'messages.html'));
});

app.get('/messages.html', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'messages.html'));
});

app.get('/profile', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'profile.html'));
});

app.get('/profile.html', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'profile.html'));
});

// FIXED: Debug endpoints with correct path
app.get('/debug/image-test', (req, res) => {
    try {
        const files = fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : [];
        const fileDetails = files.map(file => {
            const filePath = join(uploadsDir, file);
            const stats = fs.statSync(filePath);
            return {
                name: file,
                size: stats.size,
                created: stats.birthtime,
                directUrl: `http://localhost:3006/uploads/announcements/${file}`,
                exists: fs.existsSync(filePath)
            };
        });
        
        res.json({
            success: true,
            uploadsDirectory: uploadsDir,
            totalFiles: files.length,
            files: fileDetails
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/debug/serve-image/:filename', (req, res) => {
    const { filename } = req.params;
    const imagePath = join(uploadsDir, filename);
    
    console.log('🔍 Direct image request:', {
        filename,
        fullPath: imagePath,
        exists: fs.existsSync(imagePath)
    });
    
    if (!fs.existsSync(imagePath)) {
        return res.status(404).json({ error: 'Image not found', path: imagePath });
    }
    
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.sendFile(imagePath);
});

// FIXED: Debug endpoint to test image serving
app.get('/api/debug/test-image/:filename', (req, res) => {
    const { filename } = req.params;
    const imagePath = path.join(uploadsDir, filename);
    
    console.log('🧪 Testing image access:', {
        filename,
        fullPath: imagePath,
        exists: fs.existsSync(imagePath)
    });
    
    if (!fs.existsSync(imagePath)) {
        return res.status(404).json({
            error: 'Image not found',
            filename,
            searchPath: imagePath,
            uploadsDir: uploadsDir
        });
    }
    
    try {
        const stats = fs.statSync(imagePath);
        res.setHeader('Content-Type', 'image/png'); // or detect from extension
        res.setHeader('Content-Length', stats.size);
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        const stream = fs.createReadStream(imagePath);
        stream.pipe(res);
    } catch (error) {
        console.error('Error serving image:', error);
        res.status(500).json({ error: 'Error serving image' });
    }
});

// FIXED: Comprehensive debug endpoint
app.get('/api/debug/image-status', async (req, res) => {
    try {
        const files = fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : [];
        
        const fileDetails = files.map(file => {
            const filePath = path.join(uploadsDir, file);
            const stats = fs.statSync(filePath);
            return {
                name: file,
                size: stats.size,
                created: stats.birthtime,
                publicUrl: `/uploads/announcements/${file}`,
                directTestUrl: `/api/debug/test-image/${file}`,
                exists: fs.existsSync(filePath),
                fullPath: filePath
            };
        });
        
        res.json({
            success: true,
            uploadsDirectory: uploadsDir,
            avatarsDirectory: avatarsDir,
            staticMiddleware: 'Configured for /uploads',
            totalFiles: files.length,
            files: fileDetails,
            serverInfo: {
                port: PORT,
                nodeEnv: process.env.NODE_ENV || 'development'
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message,
            uploadsDir: uploadsDir
        });
    }
});

// API health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Server is running properly',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        uploadsDir: uploadsDir,
        avatarsDir: avatarsDir,
        uploadsDirExists: fs.existsSync(uploadsDir),
        avatarsDirExists: fs.existsSync(avatarsDir)
    });
});

// Test endpoint for announcements
app.get('/test/announcements', (req, res) => {
    res.json({
        message: 'Announcements API is working',
        uploadsDirectory: uploadsDir,
        uploadsDirExists: fs.existsSync(uploadsDir),
        endpoints: [
            'GET /api/announcements - Get all announcements',
            'POST /api/announcements - Create announcement',
            'GET /api/announcements/stats/summary - Get stats',
            'PUT /api/announcements/:id - Update announcement',
            'DELETE /api/announcements/:id - Delete announcement'
        ]
    });
});

// ADDED: Test endpoint for profile
app.get('/test/profile', (req, res) => {
    res.json({
        message: 'Profile API is working',
        avatarsDirectory: avatarsDir,
        avatarsDirExists: fs.existsSync(avatarsDir),
        endpoints: [
            'GET /api/profile/get - Get profile data',
            'POST /api/profile/save - Save profile',
            'POST /api/profile/upload-avatar - Upload avatar',
            'DELETE /api/profile/delete-avatar - Delete avatar'
        ]
    });
});

// Test endpoint to verify profile API is working
app.get('/test/profile-debug', (req, res) => {
    res.json({
        success: true,
        message: 'Profile API debug info',
        routes: [
            'GET /api/profile/get - Get profile data',
            'POST /api/profile/save - Save profile data',
            'POST /api/profile/upload-avatar - Upload avatar',
            'DELETE /api/profile/delete-avatar - Delete avatar',
            'GET /api/profile/test - Test endpoint'
        ],
        uploadsPath: uploadsPath,
        serverTime: new Date().toISOString()
    });
});

// Test image serving endpoint
app.get('/test/image-serving', (req, res) => {
    const files = fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : [];
    
    res.json({
        message: 'Image serving test',
        uploadsDirectory: uploadsDir,
        uploadsDirExists: fs.existsSync(uploadsDir),
        imageFiles: files,
        sampleImageUrl: files.length > 0 ? `/uploads/announcements/${files[0]}` : 'No images found',
        staticMiddlewareInfo: 'Static middleware should be serving from /uploads'
    });
});

// Test specific image file
app.get('/test/image/:filename', (req, res) => {
    const { filename } = req.params;
    const imagePath = join(uploadsDir, filename);
    
    console.log('🔍 Testing image file:', {
        filename,
        fullPath: imagePath,
        exists: fs.existsSync(imagePath)
    });
    
    if (fs.existsSync(imagePath)) {
        res.sendFile(imagePath);
    } else {
        res.status(404).json({
            success: false,
            message: 'Image not found',
            searchPath: imagePath,
            uploadsDir: uploadsDir
        });
    }
});

// Catch-all route for SPA routing
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/') && !req.path.startsWith('/uploads/')) {
        res.sendFile(join(__dirname, 'public', 'index.html'));
    } else if (req.path.startsWith('/api/')) {
        res.status(404).json({ 
            success: false, 
            message: 'API endpoint not found' 
        });
    }
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler:', err.stack);
    
    // Handle multer errors
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File size too large. Maximum size is 5MB.'
            });
        }
    }
    
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// Enhanced error handling middleware
app.use((error, req, res, next) => {
    console.error('🚨 Server error:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// ADD THESE ROUTES DIRECTLY TO server.js AS A TEMPORARY FIX

// GET student information - FIXED VERSION
app.get('/api/enrollment/student-info/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        console.log('📋 Fetching student info for ID:', studentId);
        
        const query = `
            SELECT 
                student_id,
                first_name,
                last_name,
                display_name,
                email,
                major,
                year_level
            FROM student_info 
            WHERE student_id = ?
        `;
        
        const [results] = await db.execute(query, [studentId]);
        console.log('📊 Student query results:', results);
        
        if (results.length === 0) {
            console.log('❌ Student not found');
            return res.status(404).json({ 
                success: false, 
                message: 'Student not found' 
            });
        }
        
        const student = results[0];
        
        // FIXED: Map major to program code - handle both short and long names
        const programMap = {
            'information_technology': 'BSIT',
            'computer_science': 'BSCS',
            'information_systems': 'BSIS', 
            'business_administration': 'BSBA',
            'Bachelor of Science in Information Technology': 'BSIT',
            'Bachelor of Science in Computer Science': 'BSCS',
            'Bachelor of Science in Information Systems': 'BSIS',
            'Bachelor of Science in Business Administration': 'BSBA'
        };

        // Map year_level to proper format
        const yearLevelMap = {
            '1st_year': '1st Year',
            '2nd_year': '2nd Year', 
            '3rd_year': '3rd Year',
            '4th_year': '4th Year',
            '1st Year': '1st Year',
            '2nd Year': '2nd Year',
            '3rd Year': '3rd Year',
            '4th Year': '4th Year'
        };
        
        const responseData = {
            success: true,
            student: {
                id: student.student_id,
                name: student.display_name || `${student.first_name} ${student.last_name}`,
                email: student.email,
                program: programMap[student.major] || 'BSIT',
                yearLevel: yearLevelMap[student.year_level] || '3rd Year'
            }
        };
        
        console.log('✅ Sending student data:', responseData);
        res.json(responseData);
        
    } catch (error) {
        console.error('❌ Error fetching student info:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error',
            error: error.message 
        });
    }
});

// GET programs
app.get('/api/programs', async (req, res) => {
    try {
        console.log('🎓 Fetching programs...');
        const [results] = await db.execute('SELECT * FROM programs ORDER BY created_at DESC');
        
        console.log('📊 Programs found:', results.length);
        
        res.json({
            success: true,
            data: results
        });
        
    } catch (error) {
        console.error('❌ Error fetching programs:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// GET curriculum
app.get('/api/enrollment/curriculum', async (req, res) => {
    try {
        const { program_id, year_level, semester } = req.query;
        console.log('📚 Fetching curriculum:', { program_id, year_level, semester });
        
        // Mock data as before
        const mockCurriculumData = {
            'BSIT': {
                '3rd Year': {
                    '1st Term': [
                        {
                            subject_code: 'IT301',
                            subject_name: 'Database Systems',
                            units: 3,
                            prerequisite: 'IT201',
                            schedule: 'MWF 10:00-11:00'
                        },
                        {
                            subject_code: 'IT302',
                            subject_name: 'Web Development',
                            units: 3,
                            prerequisite: 'IT202',
                            schedule: 'TTH 2:00-3:30'
                        },
                        {
                            subject_code: 'IT303',
                            subject_name: 'System Analysis and Design',
                            units: 3,
                            prerequisite: 'IT201',
                            schedule: 'MWF 2:00-3:00'
                        }
                    ]
                }
            }
        };

        // Get program name
        const [programData] = await db.execute('SELECT program_name FROM programs WHERE id = ?', [program_id]);
        
        if (programData.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Program not found'
            });
        }

        const programName = programData[0].program_name;
        const curriculumData = mockCurriculumData[programName]?.[year_level]?.[semester] || [];
        
        console.log('📚 Curriculum data:', curriculumData.length, 'subjects');

        res.json({
            success: true,
            data: curriculumData
        });

    } catch (error) {
        console.error('❌ Curriculum error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// ADD THIS DATABASE TEST TO server.js
app.get('/api/test-db', async (req, res) => {
    try {
        console.log('🔍 Testing database connection...');
        
        // Test basic connection
        const [result] = await db.execute('SELECT 1 as test');
        console.log('✅ Database connection OK');
        
        // Test student_info table
        const [studentTest] = await db.execute('SELECT COUNT(*) as count FROM student_info');
        console.log('📊 student_info table has', studentTest[0].count, 'records');
        
        // Test programs table  
        const [programsTest] = await db.execute('SELECT COUNT(*) as count FROM programs');
        console.log('📊 programs table has', programsTest[0].count, 'records');
        
        res.json({
            success: true,
            message: 'Database connection OK',
            student_count: studentTest[0].count,
            programs_count: programsTest[0].count
        });
        
    } catch (error) {
        console.error('❌ Database test failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// DEBUG: Check curriculum table structure and data
app.get('/api/debug/curriculum/:program_id', async (req, res) => {
    try {
        const { program_id } = req.params;
        
        console.log('🔍 Debugging curriculum table for program:', program_id);
        
        // Check table structure
        const [structure] = await db.execute('DESCRIBE curriculum');
        console.log('📊 Curriculum table structure:', structure);
        
        // Check all data for this program
        const [allData] = await db.execute('SELECT * FROM curriculum WHERE program_id = ? LIMIT 10', [program_id]);
        console.log('📊 Sample curriculum data:', allData);
        
        // Check unique combinations
        const [combinations] = await db.execute('SELECT DISTINCT program_id, year_level, semester, COUNT(*) as subject_count FROM curriculum WHERE program_id = ? GROUP BY program_id, year_level, semester', [program_id]);
        console.log('📊 Available combinations:', combinations);
        
        res.json({
            success: true,
            structure,
            sampleData: allData,
            combinations
        });
        
    } catch (error) {
        console.error('❌ Debug error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/test/create-notification', async (req, res) => {
    try {
        const { userId, type, title, message } = req.body;
        
        console.log('🧪 Creating test notification:', { userId, type, title });
        
        // Import the createNotification function
        const { createNotification } = await import('./backend/routes/notifications.js');
        
        const notificationId = await createNotification({
            userId: userId || 1, // Default to user ID 1 for testing
            type: type || 'system',
            title: title || 'Test Notification',
            message: message || 'This is a test notification from the server',
            data: { test: true },
            actionUrl: '/dashboard'
        });
        
        // Create notification object for real-time broadcasting
        const notificationData = {
            id: notificationId,
            userId: userId || 1,
            type: type || 'system',
            title: title || 'Test Notification',
            message: message || 'This is a test notification from the server',
            is_read: false,
            created_at: new Date().toISOString(),
            action_url: '/dashboard'
        };
        
        // Broadcast to connected user
        const io = global.io;
        const connectedUsers = global.connectedUsers;
        const targetUserId = (userId || 1).toString();
        
        if (io && connectedUsers && connectedUsers.has(targetUserId)) {
            const socketId = connectedUsers.get(targetUserId);
            io.to(socketId).emit('newNotification', notificationData);
            console.log(`📡 Test notification sent to user ${targetUserId} via socket ${socketId}`);
        } else {
            console.log(`⚠️ User ${targetUserId} not connected to socket`);
        }
        
        res.json({
            success: true,
            message: 'Test notification created and sent',
            notificationId,
            connectedUsers: Array.from(connectedUsers.keys()),
            socketConnected: !!io
        });
        
    } catch (error) {
        console.error('❌ Test notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create test notification',
            error: error.message
        });
    }
});

// ADD THIS ROUTE TO CHECK SOCKET STATUS
app.get('/api/test/socket-status', (req, res) => {
    const connectedUsers = global.connectedUsers ? Array.from(global.connectedUsers.entries()) : [];
    
    res.json({
        success: true,
        socketEnabled: !!global.io,
        connectedUsers: connectedUsers.length,
        connectedUsersList: connectedUsers.map(([userId, socketId]) => ({
            userId,
            socketId: socketId.substring(0, 8) + '...'
        })),
        hasGlobalIO: !!global.io,
        hasConnectedUsers: !!global.connectedUsers
    });
});


// ADDED: Debug/Test endpoints for troubleshooting
app.post('/api/test/send-notification', authenticateToken, async (req, res) => {
    try {
        const { receiverId, title, message, type } = req.body;
        const senderId = req.user.id;
        
        console.log('🧪 Test notification request:', { senderId, receiverId, title, type });
        
        const notificationId = await NotificationService.createNotification({
            userId: receiverId || senderId,
            type: type || 'system',
            title: title || 'Test Notification',
            message: message || 'This is a test notification',
            data: { test: true, sender: senderId }
        });

        const notificationData = {
            id: notificationId,
            userId: receiverId || senderId,
            type: type || 'system',
            title: title || 'Test Notification',
            message: message || 'This is a test notification',
            is_read: false,
            created_at: new Date().toISOString()
        };

        const sent = NotificationService.sendRealTimeNotification(receiverId || senderId, notificationData);

        res.json({
            success: true,
            message: 'Test notification sent',
            notificationId,
            realTimeSent: sent,
            connectedUsers: Array.from(global.connectedUsers.keys())
        });

    } catch (error) {
        console.error('❌ Test notification error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// ADDED: Socket connection status endpoint
app.get('/api/socket/status', (req, res) => {
    const connectedUsers = global.connectedUsers ? Array.from(global.connectedUsers.entries()) : [];
    
    res.json({
        success: true,
        socketEnabled: !!global.io,
        connectedUsers: connectedUsers.length,
        connectedUsersList: connectedUsers.map(([userId, socketId]) => ({
            userId,
            socketId: socketId.substring(0, 8) + '...'
        })),
        totalSockets: global.io ? global.io.sockets.sockets.size : 0
    });
});

// Get unread messages
app.get('/api/messages/unread', authenticateToken, async (req, res) => {
    try {
        const userEmail = req.user.email;
        
        const [messages] = await db.execute(`
            SELECT m.*, 
                   s.first_name as sender_first_name,
                   s.last_name as sender_last_name
            FROM messages m
            JOIN users s ON m.sender_email = s.email
            WHERE m.receiver_email = ? AND m.is_read = 0
            ORDER BY m.timestamp DESC
            LIMIT 10
        `, [userEmail]);
        
        res.json({
            success: true,
            messages: messages
        });
        
    } catch (error) {
        console.error('Error fetching unread messages:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch unread messages'
        });
    }
});

// Test notification endpoint - ADD this for debugging
app.post('/api/test/send-message-notification', authenticateToken, async (req, res) => {
    try {
        const senderId = req.user.id;
        const { receiverId, message } = req.body;
        
        console.log('🧪 Testing message notification:', { senderId, receiverId, message });
        
        const notificationId = await NotificationService.createMessageNotification(
            senderId,
            receiverId || 1, // Default to user ID 1
            message || 'Test message notification',
            Date.now() // Mock message ID
        );
        
        res.json({
            success: true,
            message: 'Test notification sent',
            notificationId,
            socketConnected: !!global.io,
            connectedUsers: global.connectedUsers ? Array.from(global.connectedUsers.keys()) : []
        });
        
    } catch (error) {
        console.error('❌ Test notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send test notification',
            error: error.message
        });
    }
});

// ADD this test endpoint to server.js for debugging
app.post('/api/test/notification-flow', async (req, res) => {
    try {
        const { senderId, receiverId, message } = req.body;
        
        console.log('🧪 Testing notification flow:', { senderId, receiverId, message });
        
        // Test notification creation
        const notificationId = await NotificationService.createMessageNotification(
            senderId || 8, // Default to registrar ID
            receiverId || 7, // Default to admin ID  
            message || 'Test notification message',
            999 // Mock message ID
        );
        
        res.json({
            success: true,
            message: 'Test notification sent',
            notificationId,
            connectedUsers: Array.from(global.connectedUsers.entries()),
            socketAvailable: !!global.io
        });
        
    } catch (error) {
        console.error('❌ Test notification error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// FIXED: Enhanced message sending with proper validation
app.post('/api/messages/messages', authenticateToken, async (req, res) => {
    try {
        const senderEmail = req.user.email;
        const senderId = req.user.id;
        
        console.log('📨 Message sending request from user:', { senderId, senderEmail });
        
        const { receiver_id, content, message } = req.body;
        const messageContent = content || message;
        
        if (!receiver_id || !messageContent?.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Receiver ID and content are required'
            });
        }

        // VALIDATION: Prevent sending message to self
        if (parseInt(receiver_id) === parseInt(senderId)) {
            return res.status(400).json({
                success: false,
                message: 'Cannot send message to yourself'
            });
        }

        // Get receiver information
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

        console.log('📤 Sending message from', senderEmail, 'to', receiverEmail);

        // Save message as UNREAD
        const [messageResult] = await db.execute(
            'INSERT INTO messages (sender_email, receiver_email, message, timestamp, is_read) VALUES (?, ?, ?, NOW(), 0)',
            [senderEmail, receiverEmail, messageContent.trim()]
        );

        const messageId = messageResult.insertId;
        console.log('✅ Message saved with ID:', messageId);

        // Create notification
        try {
            const notificationId = await NotificationService.createMessageNotification(
                senderId,
                parseInt(receiver_id),
                messageContent.trim(),
                messageId
            );
            console.log('✅ Notification created with ID:', notificationId);
        } catch (notificationError) {
            console.error('❌ Failed to create notification:', notificationError);
        }

        res.json({
            success: true,
            message: 'Message sent successfully',
            data: {
                id: messageId,
                sender_id: senderId,
                sender_email: senderEmail,
                receiver_id: parseInt(receiver_id),
                receiver_email: receiverEmail,
                message: messageContent.trim(),
                timestamp: new Date(),
                is_read: 0
            }
        });

    } catch (error) {
        console.error('❌ Error sending message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message',
            error: error.message
        });
    }
});

// FIXED: Get messages with proper conversation filtering
app.get('/api/messages/messages', authenticateToken, async (req, res) => {
    try {
        const userEmail = req.user.email;
        const userId = req.user.id;
        const { conversation_with, limit = 50, offset = 0 } = req.query;

        console.log('📥 Fetching messages for user:', userEmail, 'conversation_with:', conversation_with);

        let query;
        let params;

        if (conversation_with) {
            // Get specific conversation - FIXED: Proper partner identification
            const [conversationUser] = await db.execute(
                'SELECT email FROM users WHERE id = ?',
                [conversation_with]
            );

            if (conversationUser.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Conversation user not found'
                });
            }

            const conversationEmail = conversationUser[0].email;

            query = `
                SELECT m.*, 
                       sender.id as sender_id, sender.first_name as sender_first_name, sender.last_name as sender_last_name,
                       receiver.id as receiver_id, receiver.first_name as receiver_first_name, receiver.last_name as receiver_last_name
                FROM messages m
                LEFT JOIN users sender ON m.sender_email = sender.email
                LEFT JOIN users receiver ON m.receiver_email = receiver.email
                WHERE (
                    (m.sender_email = ? AND m.receiver_email = ?) OR
                    (m.sender_email = ? AND m.receiver_email = ?)
                )
                ORDER BY m.timestamp ASC
                LIMIT ? OFFSET ?
            `;
            params = [userEmail, conversationEmail, conversationEmail, userEmail, parseInt(limit), parseInt(offset)];
        } else {
            // Get all messages for user - FIXED: Only show actual conversations
            query = `
                SELECT m.*, 
                       sender.id as sender_id, sender.first_name as sender_first_name, sender.last_name as sender_last_name,
                       receiver.id as receiver_id, receiver.first_name as receiver_first_name, receiver.last_name as receiver_last_name
                FROM messages m
                LEFT JOIN users sender ON m.sender_email = sender.email
                LEFT JOIN users receiver ON m.receiver_email = receiver.email
                WHERE m.sender_email = ? OR m.receiver_email = ?
                ORDER BY m.timestamp DESC
                LIMIT ? OFFSET ?
            `;
            params = [userEmail, userEmail, parseInt(limit), parseInt(offset)];
        }

        const [messages] = await db.execute(query, params);

        // FIXED: Process messages with correct sender/receiver identification
        const processedMessages = messages.map(msg => {
            const isSent = msg.sender_email === userEmail;
            return {
                ...msg,
                is_sent: isSent,
                conversation_partner: isSent ? 
                    { 
                        id: msg.receiver_id, 
                        email: msg.receiver_email, 
                        name: `${msg.receiver_first_name} ${msg.receiver_last_name}`.trim() 
                    } :
                    { 
                        id: msg.sender_id, 
                        email: msg.sender_email, 
                        name: `${msg.sender_first_name} ${msg.sender_last_name}`.trim() 
                    }
            };
        });

        console.log(`📥 Processed ${processedMessages.length} messages`);

        res.json({
            success: true,
            messages: processedMessages,
            total: messages.length,
            has_more: messages.length === parseInt(limit)
        });

    } catch (error) {
        console.error('❌ Error fetching messages:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch messages'
        });
    }
});
// FIXED: Get conversation list with proper contact information
app.get('/api/messages/conversations', authenticateToken, async (req, res) => {
    try {
        const userEmail = req.user.email;
        const userId = req.user.id;

        console.log('📋 Fetching conversations for user:', userEmail);

        // FIXED: Simplified query to get actual conversation partners
        const query = `
            SELECT DISTINCT
                CASE 
                    WHEN m.sender_email = ? THEN (
                        SELECT u.id FROM users u WHERE u.email = m.receiver_email
                    )
                    ELSE (
                        SELECT u.id FROM users u WHERE u.email = m.sender_email
                    )
                END as partner_id,
                CASE 
                    WHEN m.sender_email = ? THEN m.receiver_email
                    ELSE m.sender_email
                END as partner_email,
                CASE 
                    WHEN m.sender_email = ? THEN (
                        SELECT CONCAT(u.first_name, ' ', u.last_name) FROM users u WHERE u.email = m.receiver_email
                    )
                    ELSE (
                        SELECT CONCAT(u.first_name, ' ', u.last_name) FROM users u WHERE u.email = m.sender_email
                    )
                END as partner_name,
                (SELECT MAX(m2.timestamp) 
                 FROM messages m2 
                 WHERE (m2.sender_email = ? AND m2.receiver_email = CASE WHEN m.sender_email = ? THEN m.receiver_email ELSE m.sender_email END) OR
                       (m2.receiver_email = ? AND m2.sender_email = CASE WHEN m.sender_email = ? THEN m.receiver_email ELSE m.sender_email END)
                ) as last_message_time,
                (SELECT m3.message 
                 FROM messages m3 
                 WHERE (m3.sender_email = ? AND m3.receiver_email = CASE WHEN m.sender_email = ? THEN m.receiver_email ELSE m.sender_email END) OR
                       (m3.receiver_email = ? AND m3.sender_email = CASE WHEN m.sender_email = ? THEN m.receiver_email ELSE m.sender_email END)
                 ORDER BY m3.timestamp DESC 
                 LIMIT 1
                ) as last_message,
                (SELECT COUNT(*) 
                 FROM messages m4
                 WHERE m4.receiver_email = ? AND 
                       m4.sender_email = CASE WHEN m.sender_email = ? THEN m.receiver_email ELSE m.sender_email END AND
                       m4.is_read = 0
                ) as unread_count
            FROM messages m
            WHERE m.sender_email = ? OR m.receiver_email = ?
            HAVING partner_id IS NOT NULL AND partner_email != ?
            ORDER BY last_message_time DESC
        `;

        const params = [
            userEmail, userEmail, userEmail,  // For CASE statements
            userEmail, userEmail, userEmail, userEmail,  // For last_message_time subquery
            userEmail, userEmail, userEmail, userEmail,  // For last_message subquery
            userEmail, userEmail,  // For unread_count subquery
            userEmail, userEmail,  // For WHERE clause
            userEmail  // For HAVING clause to exclude self
        ];

        const [conversations] = await db.execute(query, params);

        console.log(`📋 Found ${conversations.length} conversations for ${userEmail}`);

        res.json({
            success: true,
            conversations: conversations
        });

    } catch (error) {
        console.error('❌ Error fetching conversations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch conversations'
        });
    }
});
// FIXED: Mark messages as read with proper validation
app.post('/api/messages/mark-read', authenticateToken, async (req, res) => {
    try {
        const userEmail = req.user.email;
        const { conversation_with, message_id } = req.body;

        console.log('✅ Marking messages as read:', { userEmail, conversation_with, message_id });

        let query;
        let params;

        if (message_id) {
            // Mark specific message as read
            query = 'UPDATE messages SET is_read = 1 WHERE id = ? AND receiver_email = ?';
            params = [message_id, userEmail];
        } else if (conversation_with) {
            // Mark all messages from specific sender as read
            const [senderInfo] = await db.execute(
                'SELECT email FROM users WHERE id = ?',
                [conversation_with]
            );

            if (senderInfo.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Conversation partner not found'
                });
            }

            const senderEmail = senderInfo[0].email;
            query = 'UPDATE messages SET is_read = 1 WHERE sender_email = ? AND receiver_email = ? AND is_read = 0';
            params = [senderEmail, userEmail];
        } else {
            return res.status(400).json({
                success: false,
                message: 'Either conversation_with or message_id is required'
            });
        }

        const [result] = await db.execute(query, params);

        console.log(`✅ Marked ${result.affectedRows} messages as read`);

        res.json({
            success: true,
            message: 'Messages marked as read',
            affected_rows: result.affectedRows
        });

    } catch (error) {
        console.error('❌ Error marking messages as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark messages as read'
        });
    }
});


// FIXED: Get current user endpoint with proper authentication
app.get('/api/messages/user/current', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const userEmail = req.user.email;
        
        console.log('👤 Getting current user for socket:', userId, userEmail);
        
        // Get user details from database
        const [userResult] = await db.execute(
            'SELECT id, email, first_name, last_name, role FROM users WHERE id = ?',
            [userId]
        );
        
        if (userResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        const user = userResult[0];
        
        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role,
                full_name: `${user.first_name} ${user.last_name}`
            }
        });
        
    } catch (error) {
        console.error('❌ Error getting current user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user information'
        });
    }
});


const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:3006", "http://127.0.0.1:3006"],
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Initialize connected users map
const connectedUsers = new Map();
global.connectedUsers = connectedUsers;
global.io = io;

// ENHANCED: Socket.IO connection handling with better user management
io.on('connection', (socket) => {
    console.log(`🔌 New socket connection: ${socket.id}`);
    
    // Enhanced authentication with better validation
    socket.on('authenticate', async (data) => {
        try {
            console.log('🔐 Authentication attempt:', data);
            
            if (!data || !data.userId || !data.email) {
                console.log('❌ Invalid authentication data');
                socket.emit('authError', { message: 'Invalid authentication data' });
                return;
            }
            
            const { userId, email } = data;
            
            // Validate user exists in database
            const [userResult] = await db.execute(
                'SELECT id, email, first_name, last_name FROM users WHERE id = ? AND email = ?',
                [userId, email]
            );
            
            if (userResult.length === 0) {
                console.log('❌ User not found in database:', userId, email);
                socket.emit('authError', { message: 'User not found' });
                return;
            }
            
            const user = userResult[0];
            
            // Store user data in socket
            socket.userId = parseInt(userId);
            socket.userEmail = email;
            socket.userData = user;
            socket.authenticated = true;
            
            // Add to connected users map with proper key formatting
            const userIdString = String(userId);
            connectedUsers.set(userIdString, socket.id);
            
            console.log(`✅ User authenticated: ${userId} (${email}) with socket ${socket.id}`);
            console.log('👥 Total connected users:', connectedUsers.size);
            
            // Emit authentication success
            socket.emit('authenticated', {
                userId: userId,
                email: email,
                socketId: socket.id,
                message: 'Authentication successful'
            });
            
        } catch (error) {
            console.error('❌ Authentication error:', error);
            socket.emit('authError', { message: 'Authentication failed' });
        }
    });
    
    // Enhanced disconnect handling
    socket.on('disconnect', (reason) => {
        if (socket.authenticated && socket.userId) {
            const userIdString = String(socket.userId);
            console.log(`🔌 User ${socket.userId} (${socket.userEmail}) disconnected: ${reason}`);
            connectedUsers.delete(userIdString);
            console.log('👥 Remaining connected users:', connectedUsers.size);
        } else {
            console.log(`🔌 Unauthenticated socket ${socket.id} disconnected: ${reason}`);
        }
    });
    
    // Test notification endpoint for debugging
    socket.on('testNotification', async (data) => {
        if (!socket.authenticated) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
        }
        
        try {
            console.log('🧪 Test notification request from user:', socket.userId);
            await NotificationService.sendTestNotification(socket.userId, 'system');
            socket.emit('testNotificationSent', { success: true });
        } catch (error) {
            console.error('❌ Test notification error:', error);
            socket.emit('error', { message: 'Failed to send test notification' });
        }
    });
    
    // Handle ping/pong for connection health
    socket.on('ping', () => {
        socket.emit('pong');
    });
    
    // Error handling
    socket.on('error', (error) => {
        console.error('❌ Socket error for user', socket.userId || 'unknown', ':', error);
    });
});

// CHANGE THE app.listen() to server.listen()
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log('📡 Socket.IO enabled for real-time notifications');
    console.log('🔗 Notification system initialized');
    console.log(`📱 Login page: http://localhost:${PORT}/login.html`);
    console.log(`🏠 Home page: http://localhost:${PORT}/`);
    console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📢 Announcements: http://localhost:${PORT}/announcements.html`);
    console.log(`👤 Profile: http://localhost:${PORT}/profile.html`);
    console.log(`📁 Uploads directory: ${uploadsDir}`);
    console.log(`👨‍💼 Avatars directory: ${avatarsDir}`);
    console.log(`📸 Test image URL: http://localhost:${PORT}/uploads/announcements/[filename]`);
    console.log(`👤 Test avatar URL: http://localhost:${PORT}/uploads/avatars/[filename]`);
    console.log(`👤 Profile API: http://localhost:${PORT}/api/profile/test`);
    console.log(`🧪 Debug endpoint: http://localhost:${PORT}/test/profile-debug`);
    console.log(`📁 Uploads will be served from: ${uploadsPath}`);
    console.log(`🔗 Avatar URLs will be: http://localhost:${PORT}/uploads/avatars/[filename]`);
    console.log(`🧪 Test endpoints:`);
    console.log(`   http://localhost:${PORT}/test/announcements - API test`);
    console.log(`   http://localhost:${PORT}/test/profile - Profile API test`);
    console.log(`   http://localhost:${PORT}/test/image-serving - Image serving test`);
    console.log(`   http://localhost:${PORT}/test/image/[filename] - Specific image test`);
    
    // ENHANCED: Verify uploads directory on startup
    if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);
        console.log(`📁 Found ${files.length} files in uploads directory`);
        if (files.length > 0) {
            console.log(`📸 Sample images available at:`);
            files.slice(0, 3).forEach(file => {
                console.log(`   http://localhost:${PORT}/uploads/announcements/${file}`);
            });
        }
    } else {
        console.log('⚠️ Uploads directory does not exist, creating...');
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('✅ Uploads directory created successfully');
    }

    // ADDED: Verify avatars directory on startup
    if (fs.existsSync(avatarsDir)) {
        const avatarFiles = fs.readdirSync(avatarsDir);
        console.log(`👤 Found ${avatarFiles.length} files in avatars directory`);
        if (avatarFiles.length > 0) {
            console.log(`👨‍💼 Sample avatars available at:`);
            avatarFiles.slice(0, 3).forEach(file => {
                console.log(`   http://localhost:${PORT}/uploads/avatars/${file}`);
            });
        }
    } else {
        console.log('⚠️ Avatars directory does not exist, creating...');
        fs.mkdirSync(avatarsDir, { recursive: true });
        console.log('✅ Avatars directory created successfully');
    }
    
    // ENHANCED: Additional startup checks
    console.log('\n🔧 Server Configuration:');
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Max File Size: 5MB`);
    console.log(`   Static Files: ${join(__dirname, 'public')}`);
    console.log(`   Uploads Path: ${uploadsDir}`);
    console.log(`   Avatars Path: ${avatarsDir}`);
    console.log(`   CORS Origins: http://localhost:3006, http://127.0.0.1:3006, http://localhost:3000`);
    
    console.log('\n🚀 Server is ready for connections!');
    console.log('💡 To test profile functionality:');
    console.log('   1. Visit the profile page at http://localhost:3006/profile.html');
    console.log('   2. Fill in the form and upload an avatar');
    console.log('   3. Click Save to store your profile data');
    console.log('   4. Check the avatars directory for your uploaded image');
});

// ENHANCED: Graceful shutdown handling
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown(signal) {
    console.log(`\n🛑 Received ${signal}, starting graceful shutdown...`);
    
    // Close server
    const server = app.listen();
    server.close(() => {
        console.log('✅ HTTP server closed');
        
        // Cleanup resources here if needed
        console.log('🧹 Cleanup completed');
        
        console.log('👋 Server shutdown complete');
        process.exit(0);
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
        console.log('⏰ Forcing shutdown due to timeout');
        process.exit(1);
    }, 10000);
}

// ENHANCED: Unhandled rejection and exception handling
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit the process, just log it
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    // Exit the process for uncaught exceptions
    process.exit(1);
});

// Export app for testing purposes
export default app;