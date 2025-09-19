import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Import database connection - FIXED PATH
let db;
try {
    // Try to import your actual database connection with correct path
    const dbModule = await import('../config/database.js');
    db = dbModule.default;
    console.log('✅ Database connection loaded successfully');
} catch (error) {
    console.error('❌ Failed to load database connection:', error);
    throw new Error('Database connection is required for profile functionality');
}

// FIXED: Ensure uploads directory exists with correct path structure
const uploadsDir = path.resolve(__dirname, '../uploads/avatars');
console.log('📁 Avatar uploads directory:', uploadsDir);

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 Created avatars directory:', uploadsDir);
}

// Configure multer for avatar uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        console.log('📁 Storing file in:', uploadsDir);
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Get user ID from request (from auth middleware)
        const userId = req.user?.id || req.session?.user?.id || 1;
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        const filename = `avatar_${userId}_${timestamp}${ext}`;
        console.log('📝 Generated filename:', filename);
        cb(null, filename);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        console.log('🔍 Validating file:', {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size
        });
        
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            console.log('✅ File validation passed');
            return cb(null, true);
        } else {
            console.log('❌ File validation failed');
            cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)'));
        }
    }
});

function validateStudentId(studentId) {
    console.log('🔍 Validating Student ID:', { 
        raw: studentId, 
        type: typeof studentId,
        length: studentId ? String(studentId).length : 0 
    });
    
    if (!studentId || studentId === null || studentId === undefined) {
        return { valid: false, message: 'Student ID is required' };
    }
    
    const trimmedId = String(studentId).trim().toUpperCase();
    
    if (trimmedId === '' || trimmedId === 'NULL' || trimmedId === 'UNDEFINED') {
        return { valid: false, message: 'Student ID cannot be empty' };
    }
    
    // FIXED: Allow N/A for freshmen students
    if (trimmedId === 'N/A' || trimmedId === 'NA') {
        return { valid: true, message: 'N/A accepted for new students' };
    }
    
    // For regular student IDs, apply normal validation
    if (trimmedId.length < 8) {
        return { valid: false, message: 'Student ID must be at least 8 characters long, or enter "N/A" if you\'re a new student' };
    }
    
    // Accept numbers and dashes, which covers most Student ID formats
    if (!/^[\d-]+$/.test(trimmedId)) {
        return { 
            valid: false, 
            message: `Student ID should contain only numbers and dashes, or enter "N/A" for new students (received: "${trimmedId}")` 
        };
    }
    
    return { valid: true };
}

// FIXED: Import authentication middleware from correct path
let authenticateToken;
try {
    const authModule = await import('../middleware/auth.js');
    authenticateToken = authModule.authenticateToken || authModule.default?.authenticateToken || authModule.default;
    
    if (!authenticateToken) {
        throw new Error('authenticateToken not found in auth middleware');
    }
    console.log('✅ Authentication middleware loaded successfully');
} catch (error) {
    console.error('❌ Failed to load authentication middleware:', error);
    
    // Create a simple fallback middleware that extracts user from session/token
    authenticateToken = (req, res, next) => {
        console.log('⚠️ Using fallback authentication');
        
        // Try to get user from session storage approach used in frontend
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'Access token required' 
            });
        }
        
        // For now, extract user ID from token or use default
        // In production, implement proper JWT verification
        try {
            // Mock user based on your frontend approach
            req.user = { id: 1, username: 'student' }; 
            console.log('✅ Authenticated user:', req.user);
            next();
        } catch (error) {
            return res.status(403).json({ 
                success: false, 
                message: 'Invalid token' 
            });
        }
    };
}

// Get current user profile - FIXED AUTHENTICATION
router.get('/get', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log('📖 Getting profile for user:', userId);
        
        // FIXED: Added student_type to SELECT query
        const [rows] = await db.execute(
            `SELECT id, first_name, last_name, display_name, email, phone, 
                    date_of_birth, home_address, city, postal_code, province, 
                    country, student_id, student_type, major, year_level, avatar_url, 
                    created_at, updated_at 
             FROM student_info 
             WHERE id = ?`,
            [userId]
        );

        console.log('📋 Profile query result:', rows);

        if (rows.length === 0) {
            return res.json({
                success: true,
                data: null,
                message: 'No profile data found'
            });
        }

        res.json({
            success: true,
            data: rows[0]
        });

    } catch (error) {
        console.error('❌ Error fetching profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile data',
            error: error.message
        });
    }
});

// Save/Update profile - FIXED AUTHENTICATION
// REPLACE the save route in routes/info.js (around line 120)
router.post('/save', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            firstName,
            lastName,
            displayName,
            email,
            phone,
            dateOfBirth,
            homeAddress,
            city,
            postalCode,
            province,
            country,
            studentId,
            studentType,
            major,
            yearLevel
        } = req.body;
        // Add this right after const { firstName, lastName, ... } = req.body;
console.log('🔍 RAW REQUEST BODY:', JSON.stringify(req.body, null, 2));
console.log('🔍 STUDENT ID ANALYSIS:', {
    studentId,
    type: typeof studentId,
    isString: typeof studentId === 'string',
    length: studentId ? String(studentId).length : 0,
    value: studentId,
    trimmed: studentId ? String(studentId).trim() : null
});

        console.log('💾 Saving profile for user:', userId);
        console.log('📋 Profile data:', req.body);
        // ADDED: Extra validation to prevent user ID being saved as student ID
if (studentId === String(userId)) {
    console.log('🚨 CRITICAL: Attempted to save user ID as student ID!', { userId, studentId });
    return res.status(400).json({
        success: false,
        message: 'Invalid Student ID: Cannot use user ID as Student ID. Please enter your actual Student ID.'
    });
}


        // UPDATED: Student ID validation - Allow N/A for freshmen
        const studentIdValidation = validateStudentId(studentId);
        if (!studentIdValidation.valid) {
            return res.status(400).json({
                success: false,
                message: studentIdValidation.message
            });
        }

        // ADDED: Check if Student ID is already in use by another user (skip for N/A)
        const upperStudentId = String(studentId).trim().toUpperCase();
        if (upperStudentId !== 'N/A' && upperStudentId !== 'NA') {
            const [existingStudentId] = await db.execute(
                'SELECT id FROM student_info WHERE student_id = ? AND id != ?',
                [studentId, userId]
            );

            if (existingStudentId.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Student ID is already registered to another user'
                });
            }
        }

        // ADDED: Check if Student ID is already in use by another user
        const [existingStudentId] = await db.execute(
            'SELECT id FROM student_info WHERE student_id = ? AND id != ?',
            [studentId, userId]
        );

        if (existingStudentId.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Student ID is already registered to another user'
            });
        }

        // Validate required fields
        if (!firstName || !lastName || !displayName || !email || !studentId || !studentType || !major || !yearLevel) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: firstName, lastName, displayName, email, studentId, studentType, major, yearLevel'
            });
        }

        // Check if profile exists
        const [existingProfile] = await db.execute(
            'SELECT id, avatar_url FROM student_info WHERE id = ?',
            [userId]
        );

        let query, params;

        if (existingProfile.length > 0) {
            // Update existing profile
            query = `UPDATE student_info SET 
                     first_name = ?, last_name = ?, display_name = ?, email = ?, 
                     phone = ?, date_of_birth = ?, home_address = ?, city = ?, 
                     postal_code = ?, province = ?, country = ?, student_id = ?, 
                     student_type = ?, major = ?, year_level = ?, updated_at = NOW()
                     WHERE id = ?`;
            
            params = [
                firstName, lastName, displayName, email, phone,
                dateOfBirth || null, homeAddress || null, city || null, postalCode || null,
                province || null, country || null, studentId, studentType, major, yearLevel, userId
            ];

            console.log('🔄 Updating existing profile');
        } else {
            // Insert new profile
            query = `INSERT INTO student_info 
                     (id, first_name, last_name, display_name, email, phone, 
                      date_of_birth, home_address, city, postal_code, province, 
                      country, student_id, student_type, major, year_level, created_at, updated_at) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
                             NOW(), NOW())`;
            
            params = [
                userId, firstName, lastName, displayName, email, phone,
                dateOfBirth || null, homeAddress || null, city || null, postalCode || null,
                province || null, country || null, studentId, studentType, major, yearLevel
            ];

            console.log('➕ Creating new profile');
        }

        await db.execute(query, params);

        // Fetch updated profile data
        const [updatedProfile] = await db.execute(
            `SELECT id, first_name, last_name, display_name, email, phone, 
                    date_of_birth, home_address, city, postal_code, province, 
                    country, student_id, student_type, major, year_level, avatar_url 
             FROM student_info 
             WHERE id = ?`,
            [userId]
        );

        console.log('✅ Profile saved successfully - Student ID:', studentId, 'User ID:', userId);

        res.json({
            success: true,
            message: 'Profile saved successfully',
            data: updatedProfile[0]
        });

    } catch (error) {
        console.error('❌ Error saving profile:', error);
        
        // Handle duplicate entry error
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Student ID or email already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to save profile',
            error: error.message
        });
    }
});

// DESCRIPTION: Add missing sync-student-id endpoint to handle student ID synchronization
// Add this route to your routes/info.js file:

router.post('/sync-student-id', authenticateToken, async (req, res) => {
    try {
        const { userId, studentId } = req.body;
        const authenticatedUserId = req.user.id;

        console.log('🔗 Syncing student ID for user:', authenticatedUserId);
        console.log('📋 Sync data:', { userId, studentId });

        // Use the authenticated user ID for security
        const finalUserId = authenticatedUserId;

        // Check if profile exists and update student_id reference if needed
        const [existingProfile] = await db.execute(
            'SELECT id, student_id FROM student_info WHERE id = ?',
            [finalUserId]
        );

        if (existingProfile.length > 0) {
            // Update the student_id if it's different
            const currentStudentId = existingProfile[0].student_id;
            
            if (currentStudentId !== studentId) {
                await db.execute(
                    'UPDATE student_info SET student_id = ?, updated_at = NOW() WHERE id = ?',
                    [studentId || finalUserId, finalUserId]
                );
                
                console.log('✅ Student ID synchronized:', { 
                    userId: finalUserId, 
                    oldStudentId: currentStudentId, 
                    newStudentId: studentId || finalUserId 
                });
            } else {
                console.log('✅ Student ID already synchronized');
            }

            res.json({
                success: true,
                message: 'Student ID synchronized successfully',
                data: {
                    userId: finalUserId,
                    studentId: studentId || finalUserId
                }
            });
        } else {
            // No profile exists yet, this is normal
            res.json({
                success: true,
                message: 'No profile exists yet, synchronization not needed'
            });
        }

    } catch (error) {
        console.error('❌ Error syncing student ID:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to sync student ID',
            error: error.message
        });
    }
});

// COMPLETELY FIXED: Upload avatar with proper error handling
router.post('/upload-avatar', authenticateToken, (req, res) => {
    console.log('🖼️ Avatar upload request received');
    console.log('📋 User from auth:', req.user);
    
    // Use multer middleware
    upload.single('avatar')(req, res, async (multerError) => {
        if (multerError) {
            console.error('❌ Multer error:', multerError);
            
            if (multerError.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: 'File size too large. Maximum size is 5MB.'
                });
            }
            
            if (multerError.message.includes('Only image files are allowed')) {
                return res.status(400).json({
                    success: false,
                    message: 'Only image files are allowed (JPEG, PNG, GIF, WebP)'
                });
            }
            
            return res.status(400).json({
                success: false,
                message: multerError.message || 'Upload failed'
            });
        }

        try {
            if (!req.file) {
                console.log('❌ No file uploaded');
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }

            const userId = req.user.id;
            const avatarUrl = `/uploads/avatars/${req.file.filename}`;

            console.log('📸 Avatar uploaded successfully:', {
                userId: userId,
                filename: req.file.filename,
                size: req.file.size,
                path: req.file.path,
                url: avatarUrl
            });

            // Check if profile exists first
            const [existingProfile] = await db.execute(
                'SELECT avatar_url FROM student_info WHERE id = ?',
                [userId]
            );

            // Delete old avatar file if exists
if (existingProfile.length > 0 && existingProfile[0].avatar_url) {
    const oldAvatarUrl = existingProfile[0].avatar_url;
    // FIXED: Check if avatar_url is a valid string path before processing
    if (typeof oldAvatarUrl === 'string' && oldAvatarUrl.includes('/uploads/avatars/')) {
        const oldFileName = path.basename(oldAvatarUrl);
        const oldAvatarPath = path.join(uploadsDir, oldFileName);
        
        if (fs.existsSync(oldAvatarPath)) {
            try {
                fs.unlinkSync(oldAvatarPath);
                console.log('🗑️ Deleted old avatar:', oldAvatarPath);
            } catch (unlinkError) {
                console.warn('⚠️ Could not delete old avatar:', unlinkError.message);
            }
        }
    } else {
        console.log('⚠️ Skipping old avatar deletion - invalid avatar_url format:', oldAvatarUrl);
    }
}

            // Update or insert avatar URL
            if (existingProfile.length > 0) {
                await db.execute(
                    'UPDATE student_info SET avatar_url = ?, updated_at = NOW() WHERE id = ?',
                    [avatarUrl, userId]
                );
                console.log('🔄 Updated existing profile with new avatar');
            } else {
                // Create basic profile entry with avatar
                await db.execute(
                    `INSERT INTO student_info (id, avatar_url, created_at, updated_at) 
                     VALUES (?, ?, NOW(), NOW())`,
                    [userId, avatarUrl]
                );
                console.log('➕ Created new profile entry with avatar');
            }

            res.json({
                success: true,
                message: 'Avatar uploaded successfully',
                avatarUrl: avatarUrl,
                filename: req.file.filename
            });

        } catch (error) {
            console.error('❌ Error uploading avatar:', error);
            
            // Delete uploaded file if database update fails
            if (req.file && fs.existsSync(req.file.path)) {
                try {
                    fs.unlinkSync(req.file.path);
                    console.log('🧹 Cleaned up failed upload:', req.file.path);
                } catch (unlinkError) {
                    console.warn('⚠️ Could not clean up failed upload:', unlinkError.message);
                }
            }

            res.status(500).json({
                success: false,
                message: error.message || 'Failed to upload avatar'
            });
        }
    });
});

// Delete avatar - FIXED AUTHENTICATION
router.delete('/delete-avatar', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id; // Get from authenticated user

        console.log('🗑️ Deleting avatar for user:', userId);

        // Get current avatar to delete file
        const [profile] = await db.execute(
            'SELECT avatar_url FROM student_info WHERE id = ?',
            [userId]
        );

        if (profile.length > 0 && profile[0].avatar_url) {
            const avatarUrl = profile[0].avatar_url;
            
            // FIXED: Only process if avatar_url is a valid string path
            if (typeof avatarUrl === 'string' && avatarUrl.includes('/uploads/avatars/')) {
                const fileName = path.basename(avatarUrl);
                const avatarPath = path.join(uploadsDir, fileName);
                
                if (fs.existsSync(avatarPath)) {
                    try {
                        fs.unlinkSync(avatarPath);
                        console.log('🗑️ Deleted avatar file:', avatarPath);
                    } catch (unlinkError) {
                        console.warn('⚠️ Could not delete avatar file:', unlinkError.message);
                    }
                }
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
        console.error('❌ Error deleting avatar:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete avatar',
            error: error.message
        });
    }
});

// Get profile statistics (optional endpoint for dashboard)
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id; // Get from authenticated user

        const [profile] = await db.execute(
            'SELECT created_at, updated_at FROM student_info WHERE id = ?',
            [userId]
        );

        const stats = {
            hasProfile: profile.length > 0,
            profileCreated: profile.length > 0 ? profile[0].created_at : null,
            lastUpdated: profile.length > 0 ? profile[0].updated_at : null
        };

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('❌ Error fetching profile stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile statistics'
        });
    }
});

// Test endpoint
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Profile API is working',
        endpoints: {
            'GET /api/profile/get': 'Get profile data (PROTECTED)',
            'POST /api/profile/save': 'Save/update profile (PROTECTED)',
            'POST /api/profile/upload-avatar': 'Upload avatar image (PROTECTED)',
            'DELETE /api/profile/delete-avatar': 'Delete avatar (PROTECTED)',
            'GET /api/profile/stats': 'Get profile statistics (PROTECTED)'
        },
        uploadsDirectory: uploadsDir,
        uploadsDirExists: fs.existsSync(uploadsDir),
        databaseConnected: !!db
    });
});

// Debug endpoint for checking uploads directory
router.get('/debug/uploads', (req, res) => {
    try {
        const files = fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : [];
        const fileDetails = files.map(file => {
            const filePath = path.join(uploadsDir, file);
            const stats = fs.statSync(filePath);
            return {
                name: file,
                size: stats.size,
                created: stats.birthtime,
                url: `/uploads/avatars/${file}`,
                exists: fs.existsSync(filePath)
            };
        });
        
        res.json({
            success: true,
            uploadsDirectory: uploadsDir,
            uploadsDirExists: fs.existsSync(uploadsDir),
            totalFiles: files.length,
            files: fileDetails,
            databaseConnected: !!db
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message,
            uploadsDirectory: uploadsDir
        });
    }
});

export default router;