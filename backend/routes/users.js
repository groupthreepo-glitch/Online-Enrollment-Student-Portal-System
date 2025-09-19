// routes/users.js
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/database.js';

const router = Router();

// Token verification middleware
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
        req.user = decoded;
        next();
    } catch (error) {
        res.status(400).json({ 
            success: false, 
            message: 'Invalid token' 
        });
    }
};

// Admin authorization middleware
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.'
        });
    }
    next();
};

// Get all users with role counts
router.get('/all', verifyToken, requireAdmin, async (req, res) => {
    try {
        // Get all users
        const [users] = await db.execute(
            `SELECT id, username, email, role, first_name, last_name, created_at, updated_at, last_login
             FROM users 
             ORDER BY role ASC, first_name ASC, last_name ASC`
        );

        // Get user counts by role
        const [counts] = await db.execute(
            `SELECT 
                role,
                COUNT(*) as count
             FROM users 
             GROUP BY role`
        );

        // Format counts for easy access
        const roleCounts = {
            student: 0,
            faculty: 0,
            admin: 0,
            registrar: 0
        };

        counts.forEach(item => {
            roleCounts[item.role] = item.count;
        });

        res.json({
            success: true,
            users: users,
            counts: roleCounts,
            total: users.length
        });

    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Database error while fetching users'
        });
    }
});

// Search users by name or email
router.get('/search', verifyToken, async (req, res) => {
    try {
        const { query, role } = req.query;
        
        let sql = `SELECT id, username, email, role, first_name, last_name, created_at, last_login
                   FROM users WHERE 1=1`;
        let params = [];

        // Add search filter
        if (query && query.trim()) {
            sql += ` AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR username LIKE ?)`;
            const searchTerm = `%${query.trim()}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        // Add role filter
        if (role && role !== 'all') {
            sql += ` AND role = ?`;
            params.push(role);
        }

        // Exclude current user if not admin
        if (req.user.role !== 'admin') {
            sql += ` AND id != ?`;
            params.push(req.user.userId);
        }

        sql += ` ORDER BY role ASC, first_name ASC, last_name ASC LIMIT 50`;

        const [results] = await db.execute(sql, params);
        
        res.json({ 
            success: true, 
            users: results 
        });
        
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Database error while searching users' 
        });
    }
});

// Add new user
router.post('/add', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { username, email, password, role, first_name, last_name } = req.body;

        // Validation
        if (!username || !email || !password || !role || !first_name || !last_name) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Validate role
        const validRoles = ['student', 'faculty', 'admin', 'registrar'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role specified'
            });
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Password strength validation
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        // Check if username or email already exists
        const [existing] = await db.execute(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Username or email already exists'
            });
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert new user
        const [result] = await db.execute(
            `INSERT INTO users (username, email, password, role, first_name, last_name, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [username, email, hashedPassword, role, first_name, last_name]
        );

        // Get the newly created user
        const [newUser] = await db.execute(
            `SELECT id, username, email, role, first_name, last_name, created_at, updated_at 
             FROM users WHERE id = ?`,
            [result.insertId]
        );

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: newUser[0]
        });

    } catch (error) {
        console.error('Error adding user:', error);
        res.status(500).json({
            success: false,
            message: 'Database error while creating user'
        });
    }
});

// Delete user
router.delete('/delete/:id', verifyToken, requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        // Validate user ID
        if (!userId || isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        // Prevent admin from deleting themselves
        if (userId === req.user.userId) {
            return res.status(400).json({
                success: false,
                message: 'You cannot delete your own account'
            });
        }

        // Check if user exists
        const [user] = await db.execute(
            'SELECT id, username, role FROM users WHERE id = ?',
            [userId]
        );

        if (user.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Delete the user
        await db.execute('DELETE FROM users WHERE id = ?', [userId]);

        res.json({
            success: true,
            message: `User ${user[0].username} deleted successfully`
        });

    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            message: 'Database error while deleting user'
        });
    }
});

// Get user's contacts (existing functionality)
router.get('/contacts', verifyToken, async (req, res) => {
    try {
        // Get all users except the current user
        const [results] = await db.execute(
            `SELECT u.id, u.username, u.email, u.role, u.last_login,
                    CASE WHEN u.last_login > DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN 1 ELSE 0 END as online
             FROM users u 
             WHERE u.id != ?
             ORDER BY u.username ASC`,
            [req.user.userId]
        );
        
        res.json({ 
            success: true, 
            contacts: results 
        });
        
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Database error' 
        });
    }
});

export default router;