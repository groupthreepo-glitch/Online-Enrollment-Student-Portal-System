import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../config/database.js';
import { authenticateToken, canPostAnnouncements } from '../middleware/auth.js';
import NotificationService from '../services/notificationService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// UPDATED: Configure multer for both image and document uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        console.log('📂 Multer destination called for:', file.fieldname);
        let uploadPath;
        if (file.fieldname === 'image') {
            uploadPath = path.join(__dirname, '../uploads/announcements');
        } else if (file.fieldname === 'document') {
            uploadPath = path.join(__dirname, '../uploads/documents');
        } else {
            uploadPath = uploadsDir; // fallback
        }
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
            console.log('📁 Created uploads directory:', uploadPath);
        }
        
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        console.log('📝 Multer filename called for:', file.originalname, 'fieldname:', file.fieldname);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        let filename;
        
        if (file.fieldname === 'image') {
            filename = 'announcement-' + uniqueSuffix + path.extname(file.originalname);
        } else if (file.fieldname === 'document') {
            filename = 'doc-' + uniqueSuffix + path.extname(file.originalname);
        } else {
            filename = 'file-' + uniqueSuffix + path.extname(file.originalname);
        }
        
        console.log('💾 Generated filename:', filename);
        cb(null, filename);
    }
});

const fileFilter = (req, file, cb) => {
    console.log('🔍 File filter check:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        fieldname: file.fieldname,
        size: file.size
    });
    
    if (file.fieldname === 'image') {
        const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (allowedImageTypes.includes(file.mimetype)) {
            console.log('✅ Image type accepted:', file.mimetype);
            cb(null, true);
        } else {
            console.log('❌ Image type rejected:', file.mimetype);
            cb(new Error('Invalid image type. Only JPG, PNG, and GIF are allowed.'), false);
        }
    } else if (file.fieldname === 'document') {
        const allowedDocTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain'
        ];
        if (allowedDocTypes.includes(file.mimetype)) {
            console.log('✅ Document type accepted:', file.mimetype);
            cb(null, true);
        } else {
            console.log('❌ Document type rejected:', file.mimetype);
            cb(new Error('Invalid document type. Only PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, and TXT are allowed.'), false);
        }
    } else {
        cb(new Error('Unexpected field name'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit for documents
        files: 2 // Allow both image and document
    }
});

// Sanitize input function
const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
};

// UPDATED: CREATE ANNOUNCEMENT with document support
router.post('/', authenticateToken, canPostAnnouncements, upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'document', maxCount: 1 }
]), async (req, res) => {
    console.log('🚀 POST /api/announcements called with document support');
    console.log('📸 Files received:', req.files);

    try {
        const {
            title: rawTitle,
            content: rawContent,
            target_audience = 'All Students',
            target_course = 'All',
            target_year = 'All',
            priority = 'general'
        } = req.body;

        // Validation (same as before)
        if (!rawTitle || rawTitle === 'undefined' || rawTitle === 'null' || rawTitle.toString().trim() === '') {
            // Clean up uploaded files
            if (req.files) {
                Object.values(req.files).flat().forEach(file => {
                    if (fs.existsSync(file.path)) {
                        try {
                            fs.unlinkSync(file.path);
                        } catch (error) {
                            console.error('Error cleaning up file:', error);
                        }
                    }
                });
            }
            return res.status(400).json({
                success: false,
                message: 'Title is required and cannot be empty',
                field: 'title'
            });
        }

        if (!rawContent || rawContent === 'undefined' || rawContent === 'null' || rawContent.toString().trim() === '') {
            // Clean up uploaded files
            if (req.files) {
                Object.values(req.files).flat().forEach(file => {
                    if (fs.existsSync(file.path)) {
                        try {
                            fs.unlinkSync(file.path);
                        } catch (error) {
                            console.error('Error cleaning up file:', error);
                        }
                    }
                });
            }
            return res.status(400).json({
                success: false,
                message: 'Content is required and cannot be empty',
                field: 'content'
            });
        }

        const title = sanitizeInput(rawTitle.toString().trim());
        const content = sanitizeInput(rawContent.toString().trim());

        if (title.length < 3 || content.length < 10) {
            // Clean up uploaded files
            if (req.files) {
                Object.values(req.files).flat().forEach(file => {
                    if (fs.existsSync(file.path)) {
                        try {
                            fs.unlinkSync(file.path);
                        } catch (error) {
                            console.error('Error cleaning up file:', error);
                        }
                    }
                });
            }
            return res.status(400).json({
                success: false,
                message: title.length < 3 ? 'Title must be at least 3 characters long' : 'Content must be at least 10 characters long',
                field: title.length < 3 ? 'title' : 'content'
            });
        }

        // Handle image upload (same as before)
        let imageUrl = null;
        if (req.files && req.files.image && req.files.image[0]) {
            const imageFile = req.files.image[0];
            imageUrl = `/uploads/announcements/${imageFile.filename}`;
            console.log('📸 Image uploaded:', imageUrl);
        }

        // ADDED: Handle document upload
        let documentUrl = null;
        let documentName = null;
        let documentSize = null;
        
        if (req.files && req.files.document && req.files.document[0]) {
            const documentFile = req.files.document[0];
            documentUrl = `/uploads/documents/${documentFile.filename}`;
            documentName = documentFile.originalname;
            documentSize = documentFile.size;
            console.log('📄 Document uploaded:', {
                url: documentUrl,
                name: documentName,
                size: documentSize
            });
        }

        // UPDATED: Insert into database with document fields
        const query = `
            INSERT INTO announcements 
            (title, content, target_audience, target_course, target_year, priority, posted_by_id, 
             image_url, document_url, document_name, document_size, view_count, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())
        `;

        const [result] = await db.execute(query, [
            title,
            content,
            target_audience,
            target_course,
            target_year,
            priority,
            req.user.id,
            imageUrl,
            documentUrl,
            documentName,
            documentSize
        ]);

        // Fetch the created announcement
        const [newAnnouncement] = await db.execute(`
            SELECT a.*, u.username as posted_by_username, u.role as posted_by_role
            FROM announcements a 
            LEFT JOIN users u ON a.posted_by_id = u.id 
            WHERE a.id = ?
        `, [result.insertId]);

        console.log('✅ Announcement created with attachments:', {
            id: result.insertId,
            hasImage: !!imageUrl,
            hasDocument: !!documentUrl
        });
        // UPDATED: CREATE NOTIFICATIONS FOR ANNOUNCEMENT - ENHANCED VERSION
try {
    // Get the poster's role to determine allowed audiences
    const [posterInfo] = await db.execute('SELECT role FROM users WHERE id = ?', [req.user.id]);
    const posterRole = posterInfo[0]?.role || 'student';
    
    // Determine actual target audience based on role restrictions
    let actualTargetAudience = target_audience;
    
    // RESTRICTION: Only Admin can target Registrar and Faculty
    if (posterRole !== 'admin' && posterRole !== 'Admin') {
        if (target_audience === 'Registrar' || target_audience === 'Faculty') {
            actualTargetAudience = 'All Students'; // Force to students only
            console.log(`🚫 Non-admin user tried to target ${target_audience}, forcing to All Students`);
        }
        if (target_audience === 'All') {
            actualTargetAudience = 'All Students'; // Force to students only for non-admin
            console.log(`🚫 Non-admin user tried to target All, forcing to All Students`);
        }
    }
    
    // Determine who should be notified based on actual target audience
    let targetQuery = '';
    let targetParams = [];
    
    switch (actualTargetAudience) {
        case 'All Students':
            targetQuery = `SELECT id, email, first_name, last_name FROM users WHERE role = 'student' AND id != ?`;
            targetParams = [req.user.id];
            break;
        case 'Registrar':
            targetQuery = `SELECT id, email, first_name, last_name FROM users WHERE role = 'registrar' AND id != ?`;
            targetParams = [req.user.id];
            break;
        case 'Faculty':
            targetQuery = `SELECT id, email, first_name, last_name FROM users WHERE role = 'faculty' AND id != ?`;
            targetParams = [req.user.id];
            break;
        case 'All':
            targetQuery = `SELECT id, email, first_name, last_name FROM users WHERE role IN ('student', 'faculty', 'registrar') AND id != ?`;
            targetParams = [req.user.id];
            break;
        default:
            targetQuery = `SELECT id, email, first_name, last_name FROM users WHERE role = 'student' AND id != ?`;
            targetParams = [req.user.id];
    }
    
    // Add course and year filtering for students if specified
    if (actualTargetAudience === 'All Students' || actualTargetAudience === 'All') {
        if (target_course && target_course !== 'All') {
            targetQuery = targetQuery.replace('WHERE role', 'LEFT JOIN student_info si ON users.id = si.id WHERE (role != \'student\' OR si.major = ?) AND role');
            targetParams.unshift(target_course);
        }
        if (target_year && target_year !== 'All') {
            if (target_course && target_course !== 'All') {
                targetQuery = targetQuery.replace('si.major = ?', 'si.major = ? AND si.year_level = ?');
                targetParams.splice(1, 0, target_year);
            } else {
                targetQuery = targetQuery.replace('WHERE role', 'LEFT JOIN student_info si ON users.id = si.id WHERE (role != \'student\' OR si.year_level = ?) AND role');
                targetParams.unshift(target_year);
            }
        }
    }
    
    const [targetUsers] = await db.execute(targetQuery, targetParams);
    
    // Create notifications for each target user
    if (targetUsers.length > 0) {
        const notificationPromises = targetUsers.map(user => {
            return db.execute(`
                INSERT INTO notifications (user_id, type, title, message, data, created_at)
                VALUES (?, 'announcement', ?, ?, ?, NOW())
            `, [
                user.id,
                `New ${priority} Announcement`,
                `${title.substring(0, 100)}${title.length > 100 ? '...' : ''}`,
                JSON.stringify({
                    announcement_id: result.insertId,
                    posted_by: req.user.username || req.user.first_name || 'Admin',
                    priority: priority,
                    target_audience: actualTargetAudience,
                    poster_role: posterRole
                })
            ]);
        });
        
        await Promise.all(notificationPromises);
        console.log(`📬 Created ${targetUsers.length} announcement notification(s) for ${actualTargetAudience}`);
        
        // Send real-time notifications using NotificationService
        for (const user of targetUsers) {
            const notificationData = {
                id: Date.now() + Math.random(),
                userId: user.id,
                type: 'announcement',
                title: `New ${priority} Announcement`,
                message: `${title.substring(0, 100)}${title.length > 100 ? '...' : ''}`,
                is_read: false,
                created_at: new Date().toISOString(),
                action_url: '/announcements',
                data: {
                    announcement_id: result.insertId,
                    posted_by: req.user.username || req.user.first_name || 'Admin',
                    priority: priority
                }
            };
            
            NotificationService.sendRealTimeNotification(user.id, notificationData);
        }
        
    } else {
        console.log('📭 No target users found for notifications');
    }
    
} catch (notificationError) {
    console.error('❌ Error creating notifications:', notificationError);
    // Don't fail the announcement creation if notifications fail
}

        res.status(201).json({
            success: true,
            message: 'Announcement created successfully!',
            data: newAnnouncement[0]
        });

    } catch (error) {
        console.error('❌ Error creating announcement:', error);

        // Clean up uploaded files on error
        if (req.files) {
            Object.values(req.files).flat().forEach(file => {
                if (fs.existsSync(file.path)) {
                    try {
                        fs.unlinkSync(file.path);
                    } catch (error) {
                        console.error('Error cleaning up file:', error);
                    }
                }
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create announcement',
            debug: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// NEW: Document serving endpoint
router.get('/document/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const documentPath = path.join(__dirname, '../uploads/documents', filename);
        
        console.log('📄 Document request:', {
            filename,
            fullPath: documentPath,
            exists: fs.existsSync(documentPath)
        });
        
        if (!fs.existsSync(documentPath)) {
            return res.status(404).json({
                error: 'Document not found',
                filename,
                searchPath: documentPath
            });
        }
        
        // Set appropriate headers for document download
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes = {
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.ppt': 'application/vnd.ms-powerpoint',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            '.txt': 'text/plain'
        };
        
        const mimeType = mimeTypes[ext] || 'application/octet-stream';
        
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        
        // For download instead of inline viewing, uncomment the next line:
        // res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        const stream = fs.createReadStream(documentPath);
        stream.on('error', (error) => {
            console.error('Stream error:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error streaming document' });
            }
        });
        
        stream.pipe(res);
        
    } catch (error) {
        console.error('Error serving document:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// UPDATED FETCH ALL ANNOUNCEMENTS - Replace the filtering section in your GET route
router.get('/', async (req, res) => {
    try {
        const { 
            priority, 
            target_course, 
            target_year, 
            search, 
            limit = 50, 
            offset = 0 
        } = req.query;
        
        // Get user's role from the authenticated request
        const userRole = req.user?.role?.toLowerCase() || 'student';
        
        console.log('📋 Fetching announcements with filters:', {
            priority,
            target_course,
            target_year,
            search,
            userRole
        });
        
        let query = `
            SELECT a.*, u.username as posted_by_username, u.role as posted_by_role
            FROM announcements a 
            LEFT JOIN users u ON a.posted_by_id = u.id 
            WHERE 1=1
        `;
        const queryParams = [];
        
        // CRITICAL: Add role-based target audience filtering
        switch (userRole) {
            case 'student':
                query += ' AND (a.target_audience = "All Students" OR a.target_audience = "All")';
                break;
            case 'registrar':
                query += ' AND (a.target_audience = "Registrar" OR a.target_audience = "All")';
                break;
            case 'faculty':
                query += ' AND (a.target_audience = "Faculty" OR a.target_audience = "All")';
                break;
            case 'admin':
            case 'administrator':
                // Admin can see all announcements
                break;
            default:
                // Default to student filtering for unknown roles
                query += ' AND (a.target_audience = "All Students" OR a.target_audience = "All")';
        }
        
        // Apply other filters only for students (course and year filtering)
        if (userRole === 'student') {
            // FIXED: Course filtering - show announcements for student's course OR "All" courses
            if (target_course && target_course !== 'all' && target_course !== 'All') {
                query += ' AND (a.target_course = ? OR a.target_course = "All")';
                queryParams.push(target_course);
                console.log(`🎯 Filtering for course: ${target_course} OR All`);
            }
            
            // FIXED: Year filtering - show announcements for student's year OR "All" years
            if (target_year && target_year !== 'all' && target_year !== 'All') {
                query += ' AND (a.target_year = ? OR a.target_year = "All")';
                queryParams.push(target_year);
                console.log(`🎯 Filtering for year: ${target_year} OR All`);
            }
        }
        
        // Apply priority filter
        if (priority && priority !== 'all') {
            query += ' AND a.priority = ?';
            queryParams.push(priority);
        }
        
        // Apply search filter
        if (search) {
            query += ' AND (a.title LIKE ? OR a.content LIKE ?)';
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm);
        }
        
        // Order by priority and creation date
        query += ` 
            ORDER BY 
                CASE a.priority 
                    WHEN 'urgent' THEN 1 
                    WHEN 'important' THEN 2 
                    ELSE 3 
                END,
                a.created_at DESC
            LIMIT ? OFFSET ?
        `;
        queryParams.push(parseInt(limit), parseInt(offset));
        
        console.log('🔍 Executing query:', query);
        console.log('📝 With parameters:', queryParams);
        
        const [announcements] = await db.execute(query, queryParams);
        
        console.log(`✅ Found ${announcements.length} announcements for ${userRole}`);
        
        // Get total count for pagination (with same filters)
        let countQuery = 'SELECT COUNT(*) as total FROM announcements WHERE 1=1';
        const countParams = [];
        
        // Apply same role-based filtering to count
        switch (userRole) {
            case 'student':
                countQuery += ' AND (target_audience = "All Students" OR target_audience = "All")';
                break;
            case 'registrar':
                countQuery += ' AND (target_audience = "Registrar" OR target_audience = "All")';
                break;
            case 'faculty':
                countQuery += ' AND (target_audience = "Faculty" OR target_audience = "All")';
                break;
            case 'admin':
            case 'administrator':
                // Admin can see all announcements
                break;
            default:
                countQuery += ' AND (target_audience = "All Students" OR target_audience = "All")';
        }
        
        // Apply other filters to count query
        if (userRole === 'student') {
            if (target_course && target_course !== 'all' && target_course !== 'All') {
                countQuery += ' AND (target_course = ? OR target_course = "All")';
                countParams.push(target_course);
            }
            
            if (target_year && target_year !== 'all' && target_year !== 'All') {
                countQuery += ' AND (target_year = ? OR target_year = "All")';
                countParams.push(target_year);
            }
        }
        
        if (priority && priority !== 'all') {
            countQuery += ' AND priority = ?';
            countParams.push(priority);
        }
        
        if (search) {
            countQuery += ' AND (title LIKE ? OR content LIKE ?)';
            const searchTerm = `%${search}%`;
            countParams.push(searchTerm, searchTerm);
        }
        
        const [countResult] = await db.execute(countQuery, countParams);
        
        res.json({
            success: true,
            data: announcements,
            pagination: {
                total: countResult[0].total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: parseInt(offset) + announcements.length < countResult[0].total
            }
        });
        
    } catch (error) {
        console.error('Error fetching announcements:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching announcements.'
        });
    }
});

// FETCH SINGLE ANNOUNCEMENT & TRACK VIEWS
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id || isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid announcement ID.'
            });
        }
        
        // Increment view count
        await db.execute('UPDATE announcements SET view_count = view_count + 1 WHERE id = ?', [id]);
        
        // Replace the fetch query in GET /:id route:
const [announcement] = await db.execute(`
    SELECT a.*, u.username as posted_by_username, u.role as posted_by_role
    FROM announcements a 
    LEFT JOIN users u ON a.posted_by_id = u.id 
    WHERE a.id = ?
`, [id]);
        
        if (announcement.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Announcement not found.'
            });
        }
        
        res.json({
            success: true,
            data: announcement[0]
        });
        
    } catch (error) {
        console.error('Error fetching announcement:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching announcement.'
        });
    }
});

// TRACK ANNOUNCEMENT VIEW (separate from fetching)
router.post('/:id/view', async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id || isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid announcement ID.'
            });
        }
        
        // Increment view count
        await db.execute('UPDATE announcements SET view_count = view_count + 1 WHERE id = ?', [id]);
        
        // Get updated view count
        const [result] = await db.execute('SELECT view_count FROM announcements WHERE id = ?', [id]);
        
        res.json({
            success: true,
            message: 'View tracked successfully',
            view_count: result[0]?.view_count || 0
        });
        
    } catch (error) {
        console.error('Error tracking view:', error);
        res.status(500).json({
            success: false,
            message: 'Error tracking view'
        });
    }
});

// Image validation endpoint
router.get('/validate-image/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const imagePath = path.join(uploadsDir, filename);
        
        console.log('🔍 Validating image:', {
            filename,
            fullPath: imagePath,
            exists: fs.existsSync(imagePath)
        });
        
        if (!fs.existsSync(imagePath)) {
            return res.status(404).json({
                success: false,
                message: 'Image file not found',
                filename,
                expectedPath: imagePath
            });
        }
        
        const stats = fs.statSync(imagePath);
        
        res.json({
            success: true,
            filename,
            size: stats.size,
            modified: stats.mtime,
            publicUrl: `/uploads/announcements/${filename}`,
            exists: true
        });
        
    } catch (error) {
        console.error('Error validating image:', error);
        res.status(500).json({
            success: false,
            message: 'Error validating image',
            error: error.message
        });
    }
});

// Direct image serving endpoint as fallback
router.get('/image/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const imagePath = path.join(uploadsDir, filename);
        
        console.log('🖼️ Direct image request:', {
            filename,
            fullPath: imagePath,
            exists: fs.existsSync(imagePath)
        });
        
        if (!fs.existsSync(imagePath)) {
            return res.status(404).json({
                error: 'Image not found',
                filename,
                searchPath: imagePath
            });
        }
        
        // Set proper headers
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        };
        
        const mimeType = mimeTypes[ext] || 'application/octet-stream';
        
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        
        // Stream the file
        const stream = fs.createReadStream(imagePath);
        stream.on('error', (error) => {
            console.error('Stream error:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error streaming image' });
            }
        });
        
        stream.pipe(res);
        
    } catch (error) {
        console.error('Error serving image:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});



// GET ANNOUNCEMENT STATISTICS
router.get('/stats/summary', async (req, res) => {
    try {
        const [stats] = await db.execute(`
            SELECT 
                COUNT(*) as total_announcements,
                SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgent_count,
                SUM(CASE WHEN priority = 'important' THEN 1 ELSE 0 END) as important_count,
                SUM(CASE WHEN priority = 'general' THEN 1 ELSE 0 END) as general_count,
                SUM(view_count) as total_views
            FROM announcements
        `);
        
        res.json({
            success: true,
            data: stats[0]
        });
        
    } catch (error) {
        console.error('Error fetching announcement stats:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching statistics.'
        });
    }
});

// ADDITIONAL DEBUG ENDPOINTS FOR TESTING

// Debug endpoint to list all uploaded images
router.get('/debug/list-images', (req, res) => {
    try {
        const files = fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : [];
        const imageFiles = files.filter(file => 
            /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
        );
        
        const fileDetails = imageFiles.map(file => {
            const filePath = path.join(uploadsDir, file);
            const stats = fs.statSync(filePath);
            return {
                name: file,
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                publicUrl: `/uploads/announcements/${file}`,
                directUrl: `/api/announcements/image/${file}`,
                exists: fs.existsSync(filePath)
            };
        });
        
        res.json({
            success: true,
            uploadsDirectory: uploadsDir,
            totalImages: imageFiles.length,
            images: fileDetails,
            message: `Found ${imageFiles.length} image files in uploads directory`
        });
    } catch (error) {
        console.error('Error listing images:', error);
        res.status(500).json({
            success: false,
            message: 'Error listing uploaded images',
            error: error.message
        });
    }
});

// Debug endpoint to test image accessibility
router.get('/debug/test-image-access/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const imagePath = path.join(uploadsDir, filename);
        
        console.log('🧪 Testing image accessibility:', {
            filename,
            fullPath: imagePath,
            uploadsDir,
            exists: fs.existsSync(imagePath)
        });
        
        if (!fs.existsSync(imagePath)) {
            return res.status(404).json({
                success: false,
                message: 'Image file not found',
                filename,
                searchPath: imagePath,
                uploadsDirectory: uploadsDir,
                availableFiles: fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : []
            });
        }
        
        const stats = fs.statSync(imagePath);
        const isReadable = fs.constants.R_OK;
        
        try {
            fs.accessSync(imagePath, isReadable);
            console.log('✅ Image file is readable');
        } catch (accessError) {
            console.log('❌ Image file is not readable:', accessError);
            return res.status(403).json({
                success: false,
                message: 'Image file exists but is not readable',
                error: accessError.message
            });
        }
        
        res.json({
            success: true,
            filename,
            path: imagePath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            isReadable: true,
            publicUrl: `/uploads/announcements/${filename}`,
            directApiUrl: `/api/announcements/image/${filename}`,
            exists: true
        });
        
    } catch (error) {
        console.error('Error testing image access:', error);
        res.status(500).json({
            success: false,
            message: 'Error testing image accessibility',
            error: error.message
        });
    }
});

// Debug endpoint to get upload directory info
router.get('/debug/upload-info', (req, res) => {
    try {
        const dirExists = fs.existsSync(uploadsDir);
        let dirStats = null;
        let files = [];
        
        if (dirExists) {
            dirStats = fs.statSync(uploadsDir);
            files = fs.readdirSync(uploadsDir);
        }
        
        res.json({
            success: true,
            uploadsDirectory: uploadsDir,
            exists: dirExists,
            stats: dirStats ? {
                created: dirStats.birthtime,
                modified: dirStats.mtime,
                isDirectory: dirStats.isDirectory()
            } : null,
            totalFiles: files.length,
            files: files,
            serverInfo: {
                platform: process.platform,
                nodeVersion: process.version,
                cwd: process.cwd(),
                __dirname: __dirname
            }
        });
    } catch (error) {
        console.error('Error getting upload directory info:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting upload directory information',
            error: error.message,
            uploadsDir: uploadsDir
        });
    }
});

// UPDATE ANNOUNCEMENT - FIXED VERSION WITH DOCUMENT SUPPORT
router.put('/:id', authenticateToken, canPostAnnouncements, upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'document', maxCount: 1 }
]), async (req, res) => {
    console.log('🔄 PUT /api/announcements/:id called for update with document support');
    console.log('📸 Files received:', req.files);
    
    try {
        const { id } = req.params;
        let { title, content, target_audience, target_course, target_year, priority, remove_image, remove_document } = req.body;
        
        if (!id || isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid announcement ID.'
            });
        }
        
        // Check if announcement exists
        const [existing] = await db.execute('SELECT * FROM announcements WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Announcement not found.'
            });
        }
        
        // Check permissions - Allow admin and owner to edit
        if (req.user.role !== 'admin' && req.user.role !== 'Admin' && existing[0].posted_by_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You can only edit your own announcements.'
            });
        }
        
        // Validate and sanitize inputs - use existing values as fallbacks
        const updatedTitle = title ? sanitizeInput(title.toString().trim()) : existing[0].title;
        const updatedContent = content ? sanitizeInput(content.toString().trim()) : existing[0].content;
        const updatedTargetAudience = target_audience || existing[0].target_audience;
        const updatedTargetCourse = target_course || existing[0].target_course;
        const updatedTargetYear = target_year || existing[0].target_year;
        const updatedPriority = priority || existing[0].priority;
        
        // Validate required fields
        if (!updatedTitle || updatedTitle.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Title must be at least 3 characters long.'
            });
        }
        
        if (!updatedContent || updatedContent.length < 10) {
            return res.status(400).json({
                success: false,
                message: 'Content must be at least 10 characters long.'
            });
        }
        
        let imageUrl = existing[0].image_url;
        let documentUrl = existing[0].document_url;
        let documentName = existing[0].document_name;
        let documentSize = existing[0].document_size;
        
        // Handle image removal
        if (remove_image === 'true' && imageUrl) {
            const imagePath = path.join(__dirname, '../uploads/announcements', path.basename(imageUrl));
            if (fs.existsSync(imagePath)) {
                try {
                    fs.unlinkSync(imagePath);
                    console.log('🗑️ Removed old image:', imageUrl);
                } catch (error) {
                    console.error('Error removing old image:', error);
                }
            }
            imageUrl = null;
        }
        
        // Handle document removal
        if (remove_document === 'true' && documentUrl) {
            const documentPath = path.join(__dirname, '../uploads/documents', path.basename(documentUrl));
            if (fs.existsSync(documentPath)) {
                try {
                    fs.unlinkSync(documentPath);
                    console.log('🗑️ Removed old document:', documentUrl);
                } catch (error) {
                    console.error('Error removing old document:', error);
                }
            }
            documentUrl = null;
            documentName = null;
            documentSize = null;
        }
        
        // Handle new image upload
        if (req.files && req.files.image && req.files.image[0]) {
            // Remove old image if exists
            if (imageUrl) {
                const oldImagePath = path.join(__dirname, '../uploads/announcements', path.basename(imageUrl));
                if (fs.existsSync(oldImagePath)) {
                    try {
                        fs.unlinkSync(oldImagePath);
                        console.log('🗑️ Replaced old image:', imageUrl);
                    } catch (error) {
                        console.error('Error removing old image:', error);
                    }
                }
            }
            const imageFile = req.files.image[0];
            imageUrl = `/uploads/announcements/${imageFile.filename}`;
            console.log('📸 New image uploaded:', imageUrl);
        }
        
        // Handle new document upload
        if (req.files && req.files.document && req.files.document[0]) {
            // Remove old document if exists
            if (documentUrl) {
                const oldDocumentPath = path.join(__dirname, '../uploads/documents', path.basename(documentUrl));
                if (fs.existsSync(oldDocumentPath)) {
                    try {
                        fs.unlinkSync(oldDocumentPath);
                        console.log('🗑️ Replaced old document:', documentUrl);
                    } catch (error) {
                        console.error('Error removing old document:', error);
                    }
                }
            }
            const documentFile = req.files.document[0];
            documentUrl = `/uploads/documents/${documentFile.filename}`;
            documentName = documentFile.originalname;
            documentSize = documentFile.size;
            console.log('📄 New document uploaded:', {
                url: documentUrl,
                name: documentName,
                size: documentSize
            });
        }
        
        // UPDATE database with document fields
        const updateQuery = `
            UPDATE announcements 
            SET title = ?, content = ?, target_audience = ?, target_course = ?, 
                target_year = ?, priority = ?, image_url = ?, document_url = ?, 
                document_name = ?, document_size = ?, updated_at = NOW() 
            WHERE id = ?
        `;
        
        await db.execute(updateQuery, [
            updatedTitle, 
            updatedContent, 
            updatedTargetAudience, 
            updatedTargetCourse, 
            updatedTargetYear, 
            updatedPriority, 
            imageUrl,
            documentUrl,
            documentName,
            documentSize,
            id
        ]);
        
        console.log('✅ Announcement updated successfully with attachments, ID:', id);
        
        // Fetch updated announcement with user details
        const [updated] = await db.execute(`
            SELECT a.*, u.username as posted_by_username, u.role as posted_by_role
            FROM announcements a 
            LEFT JOIN users u ON a.posted_by_id = u.id 
            WHERE a.id = ?
        `, [id]);
        
        res.json({
            success: true,
            message: 'Announcement updated successfully!',
            data: updated[0]
        });
        
    } catch (error) {
        console.error('❌ Error updating announcement:', error);
        
        // Clean up uploaded files on error
        if (req.files) {
            Object.values(req.files).flat().forEach(file => {
                if (fs.existsSync(file.path)) {
                    try {
                        fs.unlinkSync(file.path);
                        console.log('🗑️ Cleaned up uploaded file due to error');
                    } catch (cleanupError) {
                        console.error('Error cleaning up file:', cleanupError);
                    }
                }
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Internal server error while updating announcement.'
        });
    }
});

// DELETE ANNOUNCEMENT
router.delete('/:id', authenticateToken, canPostAnnouncements, async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id || isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid announcement ID.'
            });
        }
        
        // Check if announcement exists
        const [existing] = await db.execute('SELECT * FROM announcements WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Announcement not found.'
            });
        }
        
        // Check permissions
        if (req.user.role !== 'admin' && req.user.role !== 'Admin' && existing[0].posted_by_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You can only delete your own announcements.'
            });
        }
        
        // Delete associated image
        if (existing[0].image_url) {
            const imagePath = path.join(__dirname, '..', existing[0].image_url);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }
        
        // Delete from database
        await db.execute('DELETE FROM announcements WHERE id = ?', [id]);
        
        res.json({
            success: true,
            message: 'Announcement deleted successfully.'
        });
        
    } catch (error) {
        console.error('Error deleting announcement:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while deleting announcement.'
        });
    }
});



export default router;
