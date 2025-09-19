// backend/middleware/auth.js - COMPLETELY FIXED VERSION

import jwt from 'jsonwebtoken';
import db from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// COMPLETELY FIXED authenticateToken function
export const authenticateToken = async (req, res, next) => {
    try {
        // Try multiple ways to get the token
        let token = null;
        
        // Method 1: Authorization header (Bearer token)
        const authHeader = req.header('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.replace('Bearer ', '');
        }
        
        // Method 2: Check cookies
        if (!token && req.cookies && req.cookies.authToken) {
            token = req.cookies.authToken;
        }
        
        // Method 3: Check for token in cookies (alternative name)
        if (!token && req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }
        
        // Method 4: Check body for FormData requests
        if (!token && req.body && req.body.authToken) {
            token = req.body.authToken;
        }
        
        // Method 5: Check query parameters (last resort)
        if (!token && req.query && req.query.authToken) {
            token = req.query.authToken;
        }
        
        console.log('🔐 Authentication check:', {
            method: req.method,
            path: req.path,
            hasAuthHeader: !!req.header('Authorization'),
            authHeaderValue: authHeader ? authHeader.substring(0, 20) + '...' : 'none',
            hasCookies: !!(req.cookies && Object.keys(req.cookies).length > 0),
            cookieKeys: req.cookies ? Object.keys(req.cookies) : [],
            hasAuthTokenCookie: !!(req.cookies && req.cookies.authToken),
            hasTokenCookie: !!(req.cookies && req.cookies.token),
            hasBodyToken: !!(req.body && req.body.authToken),
            hasQueryToken: !!(req.query && req.query.authToken),
            finalTokenFound: !!token,
            tokenPreview: token ? token.substring(0, 20) + '...' : 'none'
        });

        if (!token) {
            console.log('❌ No authentication token found in any location');
            return res.status(401).json({
                success: false,
                message: 'Access denied. No authentication token provided. Please log in.',
                debug: {
                    checkedLocations: [
                        'Authorization header',
                        'authToken cookie', 
                        'token cookie',
                        'request body',
                        'query parameters'
                    ],
                    foundIn: 'none'
                }
            });
        }

        // Verify token
        console.log('🔍 Verifying token...');
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('🎟️ Token decoded successfully:', { 
            userId: decoded.userId, 
            email: decoded.email, 
            role: decoded.role,
            exp: new Date(decoded.exp * 1000).toISOString()
        });

        // Get fresh user data from database
        console.log('🔍 Fetching user from database...');
        const [users] = await db.execute(
            'SELECT id, username, first_name, last_name, email, role FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (users.length === 0) {
            console.log('❌ User not found in database for userId:', decoded.userId);
            return res.status(401).json({
                success: false,
                message: 'User account not found. Please contact administrator.'
            });
        }

        const user = users[0];
        console.log('👤 User found in database:', {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            firstName: user.first_name,
            lastName: user.last_name
        });

        // Attach user info to request
        req.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            first_name: user.first_name,
            last_name: user.last_name
        };

        console.log('✅ User authenticated successfully:', {
            id: req.user.id,
            username: req.user.username,
            role: req.user.role
        });

        next();
    } catch (error) {
        console.error('❌ Authentication error:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Your session has expired. Please log in again.',
                errorType: 'TOKEN_EXPIRED'
            });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid authentication token. Please log in again.',
                errorType: 'INVALID_TOKEN'
            });
        } else {
            return res.status(401).json({
                success: false,
                message: 'Authentication failed. Please try again.',
                errorType: 'AUTH_ERROR'
            });
        }
    }
};

// FIXED: Authorization middleware for posting announcements
export const canPostAnnouncements = (req, res, next) => {
    console.log('🔒 Checking announcement posting permissions:', {
        userId: req.user?.id,
        username: req.user?.username,
        userRole: req.user?.role,
        method: req.method,
        path: req.path
    });

    if (!req.user) {
        console.log('❌ No user object found in request');
        return res.status(401).json({
            success: false,
            message: 'Authentication required. Please log in first.'
        });
    }

    // CRITICAL FIX: Normalize role comparison
    const userRole = req.user.role.toString().toLowerCase().trim();
    const allowedRoles = ['admin', 'registrar', 'faculty'];
    
    console.log('🔍 Role comparison:', {
        originalRole: req.user.role,
        normalizedRole: userRole,
        allowedRoles: allowedRoles,
        isAllowed: allowedRoles.includes(userRole)
    });
    
    if (!allowedRoles.includes(userRole)) {
        console.log('❌ Access denied - insufficient permissions:', {
            userRole: req.user.role,
            normalizedRole: userRole,
            requiredRoles: ['Admin', 'Registrar', 'Faculty']
        });
        
        return res.status(403).json({
            success: false,
            message: `Access denied. Only Admin, Registrar, and Faculty can post announcements. Your role: ${req.user.role}`,
            userRole: req.user.role,
            requiredRoles: ['Admin', 'Registrar', 'Faculty']
        });
    }

    console.log('✅ User authorized to post announcements');
    next();
};

// Check if user has specific role
export const requireRole = (roles) => {
    return (req, res, next) => {
        console.log('🔒 Checking role requirement:', {
            requiredRoles: roles,
            userRole: req.user?.role,
            userId: req.user?.id
        });

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required. Please log in first.'
            });
        }

        // Convert to array if single role passed
        const allowedRoles = Array.isArray(roles) ? roles : [roles];
        
        // Normalize role comparison
        const userRole = req.user.role.toString().toLowerCase().trim();
        const normalizedAllowedRoles = allowedRoles.map(role => role.toString().toLowerCase().trim());
        
        const hasPermission = normalizedAllowedRoles.includes(userRole);

        console.log('🔍 Role permission check:', {
            userRole: req.user.role,
            normalizedUserRole: userRole,
            allowedRoles: allowedRoles,
            normalizedAllowedRoles: normalizedAllowedRoles,
            hasPermission: hasPermission
        });

        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${req.user.role}`
            });
        }

        console.log('✅ Role permission granted');
        next();
    };
};

// Export default object for backwards compatibility
export default { authenticateToken, canPostAnnouncements, requireRole };