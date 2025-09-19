import express from 'express';
import db from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
const router = express.Router();

// GET all students with pagination and filtering
router.get('/students', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            search = '', 
            program = '', 
            year = '' 
        } = req.query;

        const offset = (page - 1) * limit;
        
        // Build WHERE clause for filtering
        let whereConditions = [];
        let queryParams = [];

        if (search) {
    whereConditions.push(`(first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR student_id LIKE ?)`);
    const searchTerm = `%${search}%`;
    queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
}

if (program) {
    whereConditions.push('major = ?');
    queryParams.push(program);
}

if (year) {
    whereConditions.push('year_level = ?');
    queryParams.push(year);
}

// ADD this new status filter
if (req.query.status) {
    whereConditions.push('profile_status = ?');
    queryParams.push(req.query.status);
}

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Get total count for pagination
        const countQuery = `SELECT COUNT(*) as total FROM student_info ${whereClause}`;
        const [countResult] = await db.execute(countQuery, queryParams);
        const totalStudents = countResult[0].total;

        // Get students with pagination
        const studentsQuery = `
    SELECT 
        id,
        student_id,
        first_name,
        last_name,
        COALESCE(display_name, CONCAT(first_name, ' ', last_name)) as display_name,
        email,
        phone,
        major,
        year_level,
        student_type,
        profile_status,  -- ADD THIS LINE
        date_of_birth,
        home_address,
        city,
        postal_code,
        province,
        country,
        avatar_url,
        created_at,
        updated_at
    FROM student_info 
    ${whereClause}
    ORDER BY first_name, last_name
    LIMIT ? OFFSET ?
`;
        const [students] = await db.execute(studentsQuery, [...queryParams, parseInt(limit), parseInt(offset)]);

        // Get program statistics
        const statsQuery = `
            SELECT 
                major,
                COUNT(*) as count
            FROM student_info 
            GROUP BY major
        `;
        const [stats] = await db.execute(statsQuery);

        res.json({
            students,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalStudents / limit),
                totalStudents,
                limit: parseInt(limit)
            },
            stats
        });

    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ 
            error: 'Failed to fetch students',
            details: error.message 
        });
    }
});

// GET profile
router.get('/get', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        console.log('📋 Profile get request for user:', userId);

        const [profile] = await db.execute(
            'SELECT * FROM student_info WHERE id = ?',
            [userId]
        );

        if (profile.length === 0) {
            console.log('📋 No profile found for user:', userId);
            return res.json({
                success: true,
                message: 'No profile found',
                data: null
            });
        }

        console.log('✅ Profile retrieved:', {
            userId,
            studentId: profile[0].student_id,
            profileStatus: profile[0].profile_status,
            hasProfile: true
        });

        res.json({
            success: true,
            data: profile[0]
        });

    } catch (error) {
        console.error('❌ Error fetching profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET single student by ID
router.get('/students/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const studentQuery = `
            SELECT 
                id,
                student_id,
                first_name,
                last_name,
                COALESCE(display_name, CONCAT(first_name, ' ', last_name)) as display_name,
                email,
                phone,
                major,
                year_level,
                student_type,
                date_of_birth,
                home_address,
                city,
                postal_code,
                province,
                country,
                avatar_url,
                created_at,
                updated_at
            FROM student_info 
            WHERE id = ?
        `;
        const [students] = await db.execute(studentQuery, [id]);

        if (students.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }

        res.json(students[0]);
    } catch (error) {
        console.error('Error fetching student:', error);
        res.status(500).json({ error: 'Failed to fetch student' });
    }
});

// GET students with pending Student IDs (N/A status) - for Registrar dashboard
router.get('/pending-ids', async (req, res) => {
    try {
        const query = `
            SELECT 
                id,
                student_id,
                first_name,
                last_name,
                COALESCE(display_name, CONCAT(first_name, ' ', last_name)) as display_name,
                email,
                phone,
                major,
                year_level,
                student_type,
                profile_status,
                created_at,
                updated_at
            FROM student_info 
            WHERE student_id = 'N/A' OR profile_status = 'Pending_ID'
            ORDER BY created_at ASC
        `;
        
        const [pendingStudents] = await db.execute(query);

        res.json({
            success: true,
            students: pendingStudents,
            count: pendingStudents.length
        });

    } catch (error) {
        console.error('Error fetching pending students:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch pending students',
            details: error.message 
        });
    }
});

// GET students with N/A Student IDs (for Registrar filtering)
router.get('/students-na', async (req, res) => {
    try {
        const query = `
            SELECT 
                id,
                student_id,
                first_name,
                last_name,
                COALESCE(display_name, CONCAT(first_name, ' ', last_name)) as display_name,
                email,
                phone,
                major,
                year_level,
                student_type,
                profile_status,
                created_at,
                updated_at
            FROM student_info 
            WHERE student_id = 'N/A' OR profile_status = 'Pending_ID'
            ORDER BY created_at ASC
        `;
        
        const [naStudents] = await db.execute(query);

        res.json({
            success: true,
            students: naStudents,
            count: naStudents.length
        });

    } catch (error) {
        console.error('Error fetching N/A students:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch N/A students',
            details: error.message 
        });
    }
});

// POST assign Student ID to a student (Registrar function)
router.post('/assign-student-id', async (req, res) => {
    try {
        const { studentDbId, newStudentId } = req.body;

        // Validation
        if (!studentDbId || !newStudentId) {
            return res.status(400).json({
                success: false,
                error: 'Student database ID and new Student ID are required'
            });
        }

        // Check if new Student ID already exists
        const [existingId] = await db.execute(
            'SELECT id FROM student_info WHERE student_id = ? AND id != ?', 
            [newStudentId, studentDbId]
        );
        
        if (existingId.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'Student ID already exists'
            });
        }

        // Check if student exists
        const [existingStudent] = await db.execute(
            'SELECT * FROM student_info WHERE id = ?', 
            [studentDbId]
        );
        
        if (existingStudent.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Student not found'
            });
        }

        // Update the student record
        const updateQuery = `
            UPDATE student_info 
            SET student_id = ?, 
                profile_status = 'Complete',
                updated_at = NOW()
            WHERE id = ?
        `;

        await db.execute(updateQuery, [newStudentId, studentDbId]);

        // Get updated student data
        const [updatedStudent] = await db.execute(
            'SELECT * FROM student_info WHERE id = ?', 
            [studentDbId]
        );

        res.json({
            success: true,
            message: 'Student ID assigned successfully',
            student: updatedStudent[0]
        });

    } catch (error) {
        console.error('Error assigning Student ID:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to assign Student ID',
            details: error.message
        });
    }
});


// POST new student
router.post('/students', async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            phone,
            program,
            yearLevel,
            dateOfBirth,
            address
        } = req.body;

        // Validation
        if (!firstName || !lastName || !email || !program || !yearLevel) {
            return res.status(400).json({ 
                error: 'First name, last name, email, program, and year level are required' 
            });
        }

        // Check if email already exists
        const [emailCheck] = await db.execute('SELECT id FROM student_info WHERE email = ?', [email]);
        if (emailCheck.length > 0) {
            return res.status(409).json({ error: 'Email already exists' });
        }

        // Generate student ID (format: YYYY-XXXX)
        const year = new Date().getFullYear();
        const countQuery = 'SELECT COUNT(*) as count FROM student_info WHERE student_id LIKE ?';
        const [countResult] = await db.execute(countQuery, [`${year}-%`]);
        const studentNumber = String(countResult[0].count + 1).padStart(4, '0');
        const studentId = `${year}-${studentNumber}`;

        const insertQuery = `
            INSERT INTO student_info 
            (student_id, first_name, last_name, email, phone, major, year_level, date_of_birth, home_address, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;

        const [result] = await db.execute(insertQuery, [
            studentId,
            firstName,
            lastName,
            email,
            phone || null,
            program,
            yearLevel,
            dateOfBirth || null,
            address || null
        ]);

        res.status(201).json({
            message: 'Student created successfully',
            studentId: result.insertId,
            generatedStudentId: studentId
        });

    } catch (error) {
        console.error('Error creating student:', error);
        res.status(500).json({ error: 'Failed to create student' });
    }
});

// POST save profile (UPDATED to handle N/A and profile_status)
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

        console.log('📋 Profile save request:', {
            userId,
            studentId,
            isNA: studentId === 'N/A' || studentId?.toUpperCase() === 'N/A',
            firstName,
            lastName
        });

        // Validation - all fields are required except phone and dateOfBirth
        const requiredFields = {
            firstName: 'First Name',
            lastName: 'Last Name',
            displayName: 'Display Name',
            email: 'Email',
            studentId: 'Student ID',
            studentType: 'Student Type',
            major: 'Major',
            yearLevel: 'Year Level'
        };

        const missingFields = [];
        Object.entries(requiredFields).forEach(([field, displayName]) => {
            const value = req.body[field];
            if (!value || value.trim() === '') {
                missingFields.push(displayName);
            }
        });

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(', ')}`
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid email address'
            });
        }

        // Student ID validation - Allow N/A for freshmen
        let processedStudentId = studentId.trim();
        if (processedStudentId.toUpperCase() === 'N/A' || processedStudentId.toUpperCase() === 'NA') {
            processedStudentId = 'N/A';
            console.log('✅ N/A Student ID accepted for freshman');
        } else if (processedStudentId && processedStudentId.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Student ID must be at least 6 characters long, or enter "N/A" if you\'re a new student'
            });
        }

        // Determine profile status
        let profileStatus = 'Incomplete';
        if (processedStudentId === 'N/A') {
            profileStatus = 'Pending_ID';
        } else if (processedStudentId && processedStudentId.trim() !== '') {
            profileStatus = 'Complete';
        }

        // Check if profile already exists
        const [existingProfile] = await db.execute(
            'SELECT id FROM student_info WHERE id = ?',
            [userId]
        );

        if (existingProfile.length > 0) {
            // UPDATE existing profile
            console.log('📝 Updating existing profile for user:', userId);
            
            // Check if email is already used by another user
            const [emailCheck] = await db.execute(
                'SELECT id FROM student_info WHERE email = ? AND id != ?',
                [email, userId]
            );
            
            if (emailCheck.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Email address is already in use by another student'
                });
            }

            // Check if studentId is already used by another user (skip if N/A)
            if (processedStudentId !== 'N/A') {
                const [studentIdCheck] = await db.execute(
                    'SELECT id FROM student_info WHERE student_id = ? AND id != ?',
                    [processedStudentId, userId]
                );
                
                if (studentIdCheck.length > 0) {
                    return res.status(409).json({
                        success: false,
                        message: 'Student ID is already in use by another student'
                    });
                }
            }

            const updateQuery = `
                UPDATE student_info SET
                    first_name = ?,
                    last_name = ?,
                    display_name = ?,
                    email = ?,
                    phone = ?,
                    date_of_birth = ?,
                    home_address = ?,
                    city = ?,
                    postal_code = ?,
                    province = ?,
                    country = ?,
                    student_id = ?,
                    student_type = ?,
                    major = ?,
                    year_level = ?,
                    profile_status = ?,
                    updated_at = NOW()
                WHERE id = ?
            `;

            await db.execute(updateQuery, [
                firstName,
                lastName,
                displayName,
                email,
                phone || null,
                dateOfBirth || null,
                homeAddress || null,
                city || null,
                postalCode || null,
                province || null,
                country || null,
                processedStudentId,
                studentType,
                major,
                yearLevel,
                profileStatus,
                userId
            ]);

        } else {
            // INSERT new profile
            console.log('📝 Creating new profile for user:', userId);
            
            // Check if email is already used
            const [emailCheck] = await db.execute(
                'SELECT id FROM student_info WHERE email = ?',
                [email]
            );
            
            if (emailCheck.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Email address is already in use'
                });
            }

            // Check if studentId is already used (skip if N/A)
            if (processedStudentId !== 'N/A') {
                const [studentIdCheck] = await db.execute(
                    'SELECT id FROM student_info WHERE student_id = ?',
                    [processedStudentId]
                );
                
                if (studentIdCheck.length > 0) {
                    return res.status(409).json({
                        success: false,
                        message: 'Student ID is already in use'
                    });
                }
            }

            const insertQuery = `
                INSERT INTO student_info (
                    id, first_name, last_name, display_name, email, phone, 
                    date_of_birth, home_address, city, postal_code, province, country,
                    student_id, student_type, major, year_level, profile_status,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `;

            await db.execute(insertQuery, [
                userId,
                firstName,
                lastName,
                displayName,
                email,
                phone || null,
                dateOfBirth || null,
                homeAddress || null,
                city || null,
                postalCode || null,
                province || null,
                country || null,
                processedStudentId,
                studentType,
                major,
                yearLevel,
                profileStatus
            ]);
        }

        // Get the updated/created profile data
        const [updatedProfile] = await db.execute(
            'SELECT * FROM student_info WHERE id = ?',
            [userId]
        );

        console.log('✅ Profile saved successfully:', {
            userId,
            studentId: processedStudentId,
            profileStatus,
            isNA: processedStudentId === 'N/A'
        });

        // Return success with appropriate message
        let message = 'Profile updated successfully!';
        if (processedStudentId === 'N/A') {
            message = 'Profile saved! Please contact the Registrar to get your official Student ID assigned.';
        }

        res.json({
            success: true,
            message: message,
            data: updatedProfile[0],
            isNewStudent: processedStudentId === 'N/A'
        });

    } catch (error) {
        console.error('❌ Error saving profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save profile. Please try again.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});


// PUT update student (UPDATED to handle profile_status)
router.put('/students/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            firstName,
            lastName,
            email,
            phone,
            program,
            yearLevel,
            dateOfBirth,
            address,
            studentId  // ADD this
        } = req.body;

        // Validation
        if (!firstName || !lastName || !email || !program || !yearLevel) {
            return res.status(400).json({ 
                error: 'First name, last name, email, program, and year level are required' 
            });
        }

        // Check if student exists
        const [existingStudent] = await db.execute('SELECT * FROM student_info WHERE id = ?', [id]);
        if (existingStudent.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Check if email already exists for other students
        const [emailCheck] = await db.execute('SELECT id FROM student_info WHERE email = ? AND id != ?', [email, id]);
        if (emailCheck.length > 0) {
            return res.status(409).json({ error: 'Email already exists' });
        }

        // If studentId is provided, check if it already exists for other students
        if (studentId && studentId !== 'N/A') {
            const [studentIdCheck] = await db.execute('SELECT id FROM student_info WHERE student_id = ? AND id != ?', [studentId, id]);
            if (studentIdCheck.length > 0) {
                return res.status(409).json({ error: 'Student ID already exists' });
            }
        }

        // Determine profile status based on Student ID
        let profileStatus = 'Incomplete';
        if (studentId === 'N/A') {
            profileStatus = 'Pending_ID';
        } else if (studentId && studentId.trim() !== '') {
            profileStatus = 'Complete';
        }

        // UPDATE query to include student_id and profile_status
        const updateQuery = `
            UPDATE student_info 
            SET first_name = ?, last_name = ?, email = ?, phone = ?, 
                major = ?, year_level = ?, date_of_birth = ?, home_address = ?,
                ${studentId ? 'student_id = ?, profile_status = ?,' : ''} 
                updated_at = NOW()
            WHERE id = ?
        `;

        const updateParams = [
            firstName,
            lastName,
            email,
            phone || null,
            program,
            yearLevel,
            dateOfBirth || null,
            address || null
        ];

        if (studentId) {
            updateParams.push(studentId, profileStatus);
        }
        
        updateParams.push(id);

        await db.execute(updateQuery, updateParams);

        // Get updated student data
        const [updatedStudent] = await db.execute('SELECT * FROM student_info WHERE id = ?', [id]);

        res.json({ 
            message: 'Student updated successfully',
            student: updatedStudent[0]
        });

    } catch (error) {
        console.error('Error updating student:', error);
        res.status(500).json({ error: 'Failed to update student' });
    }
});


// PUT update student
router.put('/students/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            firstName,
            lastName,
            email,
            phone,
            program,
            yearLevel,
            dateOfBirth,
            address
        } = req.body;

        // Validation
        if (!firstName || !lastName || !email || !program || !yearLevel) {
            return res.status(400).json({ 
                error: 'First name, last name, email, program, and year level are required' 
            });
        }

        // Check if student exists
        const [existingStudent] = await db.execute('SELECT * FROM student_info WHERE id = ?', [id]);
        if (existingStudent.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Check if email already exists for other students
        const [emailCheck] = await db.execute('SELECT id FROM student_info WHERE email = ? AND id != ?', [email, id]);
        if (emailCheck.length > 0) {
            return res.status(409).json({ error: 'Email already exists' });
        }

        const updateQuery = `
            UPDATE student_info 
            SET first_name = ?, last_name = ?, email = ?, phone = ?, 
                major = ?, year_level = ?, date_of_birth = ?, home_address = ?,
                updated_at = NOW()
            WHERE id = ?
        `;

        await db.execute(updateQuery, [
            firstName,
            lastName,
            email,
            phone || null,
            program,
            yearLevel,
            dateOfBirth || null,
            address || null,
            id
        ]);

        res.json({ message: 'Student updated successfully' });

    } catch (error) {
        console.error('Error updating student:', error);
        res.status(500).json({ error: 'Failed to update student' });
    }
});

// DELETE student
router.delete('/students/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if student exists
        const [existingStudent] = await db.execute('SELECT * FROM student_info WHERE id = ?', [id]);
        if (existingStudent.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }

        await db.execute('DELETE FROM student_info WHERE id = ?', [id]);

        res.json({ message: 'Student deleted successfully' });

    } catch (error) {
        console.error('Error deleting student:', error);
        res.status(500).json({ error: 'Failed to delete student' });
    }
});

export default router;