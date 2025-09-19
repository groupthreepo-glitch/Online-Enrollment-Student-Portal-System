// routes/enrollment.js - UPDATED VERSION
import express from 'express';
import db from '../config/database.js';
import NotificationService from '../services/notificationService.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';


// REPLACE the existing enrichSubjectsWithCurriculumData function with this CORRECTED version
async function enrichSubjectsWithCurriculumData(subjects, program, yearLevel, semester) {
    console.log('🔍 ENHANCED ENRICHMENT FUNCTION CALLED WITH:');
    console.log('  - Program:', program);
    console.log('  - Year Level:', yearLevel); 
    console.log('  - Semester:', semester);
    console.log('  - Subjects count:', subjects.length);
    console.log('  - First subject code:', subjects[0]?.code || subjects[0]?.subject_code);
    
    try {
        const enrichedSubjects = [];
        
        // CORRECTED: More comprehensive program mapping
        const programMapping = {
            'BSIT': 'BSIT',
            'BSCS': 'BSCS', 
            'BSIS': 'BSIS',
            'BSBA': 'BSBA',
            'BS Information Technology': 'BSIT',
            'BS Computer Science': 'BSCS',
            'BS Information Systems': 'BSIS',
            'BS Business Administration': 'BSBA',
            'Bachelor of Science in Information Technology': 'BSIT',
            'Bachelor of Science in Computer Science': 'BSCS',
            'Bachelor of Science in Information Systems': 'BSIS',
            'Bachelor of Science in Business Administration': 'BSBA'
        };
        
        const dbProgram = programMapping[program] || program;
        console.log('🔄 Using program for database lookup:', dbProgram);
        
        for (const subject of subjects) {
            const subjectCode = subject.code || subject.subject_code;
            
            if (!subjectCode) {
                console.warn('⚠️ Subject missing code:', subject);
                enrichedSubjects.push({
                    ...subject,
                    instructor: 'TBA - No Code',
                    room: 'TBA - No Code'
                });
                continue;
            }
            
            console.log('🔍 Looking up curriculum data for subject:', subjectCode);
            
            // CRITICAL FIX: Use exact column names from your database
            const [curriculumData] = await db.execute(`
                SELECT instructor, room, schedule, subject_name
                FROM curriculum 
                WHERE subject_code = ? 
                  AND program_id = ? 
                  AND year_level = ? 
                  AND semester = ?
                LIMIT 1
            `, [subjectCode, dbProgram, yearLevel, semester]);
            
            console.log('📋 Database lookup result for', subjectCode, ':', {
                found: curriculumData.length > 0,
                instructor: curriculumData.length > 0 ? curriculumData[0].instructor : 'NOT FOUND',
                room: curriculumData.length > 0 ? curriculumData[0].room : 'NOT FOUND',
                queryParams: `subject_code='${subjectCode}', program_id='${dbProgram}', year_level='${yearLevel}', semester='${semester}'`
            });
            
            // If no exact match, try with different year level formats
            let curriculumInfo = curriculumData.length > 0 ? curriculumData[0] : null;
            
            if (!curriculumInfo) {
                console.log('🔄 Trying alternative year level formats...');
                const yearLevelVariations = [
                    yearLevel.replace(' Year', ''),     // "1st Year" -> "1st"
                    yearLevel.replace(' ', ''),         // "1st Year" -> "1stYear"
                    yearLevel.toLowerCase(),            // "1st Year" -> "1st year"
                    yearLevel.replace('st', '').replace('nd', '').replace('rd', '').replace('th', '') + ' Year' // "1st" -> "1 Year"
                ];
                
                for (const altYearLevel of yearLevelVariations) {
                    const [altResult] = await db.execute(`
                        SELECT instructor, room, schedule, subject_name
                        FROM curriculum 
                        WHERE subject_code = ? AND program_id = ? AND year_level = ? AND semester = ?
                        LIMIT 1
                    `, [subjectCode, dbProgram, altYearLevel, semester]);
                    
                    if (altResult.length > 0) {
                        curriculumInfo = altResult[0];
                        console.log('✅ Found match with year level variation:', altYearLevel);
                        break;
                    }
                }
            }
            
            // ENHANCED: Build enriched subject with proper fallback logic
            const enrichedSubject = {
                ...subject,
                
                // Instructor enrichment with validation
                instructor: (() => {
                    const dbInstructor = curriculumInfo?.instructor;
                    console.log(`👨‍🏫 Processing instructor for ${subjectCode}:`, {
                        raw: dbInstructor,
                        isValid: dbInstructor && dbInstructor.trim() !== '' && !['NULL', 'null', 'TBA'].includes(dbInstructor.trim())
                    });
                    
                    if (dbInstructor && dbInstructor.trim() !== '' && !['NULL', 'null', 'TBA'].includes(dbInstructor.trim())) {
                        return dbInstructor.trim();
                    }
                    // Keep original if it exists and is not TBA
                    return (subject.instructor && subject.instructor !== 'TBA') ? subject.instructor : 'TBA';
                })(),
                
                // Room enrichment with validation  
                room: (() => {
                    const dbRoom = curriculumInfo?.room;
                    console.log(`🏢 Processing room for ${subjectCode}:`, {
                        raw: dbRoom,
                        isValid: dbRoom && dbRoom.trim() !== '' && !['NULL', 'null', 'TBA'].includes(dbRoom.trim())
                    });
                    
                    if (dbRoom && dbRoom.trim() !== '' && !['NULL', 'null', 'TBA'].includes(dbRoom.trim())) {
                        return dbRoom.trim();
                    }
                    // Keep original if it exists and is not TBA
                    return (subject.room && subject.room !== 'TBA') ? subject.room : 'TBA';
                })(),
                      
                // Enhanced schedule processing
                schedule: (() => {
                    const dbSchedule = curriculumInfo?.schedule;
                    if (dbSchedule && dbSchedule.trim() !== '' && !['NULL', 'null', 'TBA'].includes(dbSchedule.trim())) {
                        return dbSchedule.trim();
                    }
                    return subject.schedule || 'TBA';
                })()
            };
            
            enrichedSubjects.push(enrichedSubject);
            
            console.log('✅ ENRICHED SUBJECT RESULT:', subjectCode);
            console.log('   - Final Instructor:', enrichedSubject.instructor);
            console.log('   - Final Room:', enrichedSubject.room);
            console.log('   - Final Schedule:', enrichedSubject.schedule);
        }
        
        console.log('✅ Enrichment complete. Successfully processed', enrichedSubjects.length, 'subjects');
        console.log('📊 ENRICHMENT SUMMARY:');
        const enrichedCount = enrichedSubjects.filter(s => s.instructor !== 'TBA' || s.room !== 'TBA').length;
        console.log(`   - ${enrichedCount}/${enrichedSubjects.length} subjects were enriched with database data`);
        
        return enrichedSubjects;
        
    } catch (error) {
        console.error('❌ CRITICAL ERROR in enrichment function:', error);
        console.error('❌ Error stack:', error.stack);
        return subjects.map(subject => ({
            ...subject,
            instructor: 'TBA - Error: ' + error.message.substring(0, 20),
            room: 'TBA - Error: ' + error.message.substring(0, 20)
        }));
    }
}

const router = express.Router();

// Configure multer for file upload (payment receipts)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/receipts/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images (JPEG, JPG, PNG) and PDF files are allowed'));
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});



// routes/enrollment.js - MOVE THIS ROUTE TO THE TOP (after imports, before any other routes)
// GET individual enrollment request details - MOVE THIS TO THE VERY TOP
router.get('/request/:enrollmentId', async (req, res) => {
    try {
        const { enrollmentId } = req.params;
        
        console.log('📋 Fetching enrollment request details:', enrollmentId);
        
        // FIXED: Updated query with proper LEFT JOIN syntax
        const query = `
            SELECT 
                er.id,
                er.student_id,
                er.student_type,
                er.program,
                er.year_level,
                er.semester,
                er.subjects,
                er.total_fees,
                er.payment_receipt,
                er.status,
                er.remarks,
                er.created_at,
                er.updated_at,
                COALESCE(si.display_name, CONCAT(COALESCE(si.first_name, ''), ' ', COALESCE(si.last_name, '')), 'Unknown Student') as student_name,
                si.first_name,
                si.last_name,
                si.email as student_email,
                si.phone,
                si.home_address as address
            FROM enrollment_requests er
            LEFT JOIN student_info si ON er.student_id = si.id OR er.student_id = si.student_id
            WHERE er.id = ?
        `;
        
        const [results] = await db.execute(query, [enrollmentId]);
        
        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Enrollment request not found'
            });
        }
        
        const request = results[0];
        
        // Format the response with proper defaults
        const formattedRequest = {
            ...request,
            student_name: request.student_name || 'Unknown Student',
            student_type: request.student_type || 'regular',
            student_email: request.student_email || 'N/A',
            phone: request.phone || 'N/A',
            address: request.address || 'N/A'
        };
        
        console.log('✅ Enrollment request details fetched successfully');
        
        res.json({
            success: true,
            data: formattedRequest
        });
        
    } catch (error) {
        console.error('❌ Error fetching enrollment request details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch enrollment request details',
            error: error.message
        });
    }
});

// REPLACE the existing receipt route in routes/enrollment.js
router.get('/receipt/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(process.cwd(), 'uploads', 'receipts', filename);
        
        console.log('📁 Serving receipt file:', filePath);
        
        // FIXED: Use the imported fs module instead of require
        if (!fs.existsSync(filePath)) {
            console.error('❌ Receipt file not found:', filePath);
            return res.status(404).json({
                success: false,
                message: 'Receipt file not found'
            });
        }
        
        // Set appropriate headers based on file extension
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes = {
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png'
        };
        
        const mimeType = mimeTypes[ext] || 'application/octet-stream';
        res.setHeader('Content-Type', mimeType);
        
        if (req.query.download === '1') {
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        }
        
        // Send file
        res.sendFile(filePath, (err) => {
            if (err) {
                console.error('❌ Error sending file:', err);
                if (!res.headersSent) {
                    res.status(500).json({
                        success: false,
                        message: 'Error serving file'
                    });
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Error serving receipt:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Error serving receipt file'
            });
        }
    }
});



// REPLACE the existing route in routes/enrollment.js
// FIND this route: router.get('/student-info/:studentId', async (req, res) => {

router.get('/student-info/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        
        console.log('📋 Fetching student info for ID:', studentId);
        
        // FIXED: Query that matches your actual database structure
        // The profile table uses 'id' as primary key, not 'student_id'
        let query = `
            SELECT 
                id,
                first_name,
                last_name,
                display_name,
                email,
                major,
                year_level,
                phone,
                home_address,
                city,
                province,
                date_of_birth,
                postal_code,
                country,
                student_id
            FROM student_info 
            WHERE id = ?
            LIMIT 1
        `;
        
        console.log('🔍 Executing query with user ID:', studentId);
        
        let [results] = await db.execute(query, [studentId]);
        
        // If no profile found, check if user exists in users table
        if (results.length === 0) {
            console.log('🔄 No student_info found, checking users table...');
            try {
                const [userResults] = await db.execute(
                    'SELECT id, username, email FROM users WHERE id = ?', 
                    [studentId]
                );
                
                if (userResults.length > 0) {
                    console.log('⚠️ User exists but has no profile data');
                    return res.status(400).json({
                        success: false,
                        message: 'Your profile is incomplete. Please complete your profile first.',
                        requiresProfile: true,
                        userExists: true
                    });
                } else {
                    console.log('❌ User not found');
                    return res.status(404).json({ 
                        success: false, 
                        message: 'User not found. Please check your account.',
                        requiresProfile: true,
                        userExists: false
                    });
                }
            } catch (userCheckError) {
                console.error('❌ Error checking users table:', userCheckError);
                return res.status(500).json({
                    success: false,
                    message: 'Database error occurred while checking user account.',
                    error: userCheckError.message
                });
            }
        }
        
        const student = results[0];
        console.log('👤 Found student data:', student);
        
        // Check essential fields are present
        const essentialFields = ['first_name', 'last_name', 'email', 'student_id', 'major', 'year_level'];
        const missingEssentialFields = [];
        
        essentialFields.forEach(field => {
            const value = student[field];
            if (!value || value.toString().trim() === '' || value === 'null' || value === null) {
                missingEssentialFields.push(field);
            }
        });
        
        // Only require profile completion if truly essential fields are missing
        if (missingEssentialFields.length > 0) {
            console.log('⚠️ Missing essential profile fields:', missingEssentialFields);
            return res.status(400).json({
                success: false,
                message: `Please complete these required fields in your profile: ${missingEssentialFields.join(', ')}`,
                requiresProfile: true,
                missingFields: missingEssentialFields,
                student: student
            });
        }
        
        // Map data to expected format using your actual database structure
        const programMap = {
            'information_technology': 'BSIT',
            'information_system': 'BSIS',
            'computer_science': 'BSCS',
            'business_administration': 'BSBA',
        };

        const yearLevelMap = {
            '1st_year': '1st Year',
            '2nd_year': '2nd Year', 
            '3rd_year': '3rd Year',
            '4th_year': '4th Year'
        };
        
        const responseData = {
            success: true,
            student: {
                // Use the actual student_id field from the database
                id: student.student_id || student.id,
                studentId: student.student_id || student.id,
                name: student.display_name || `${student.first_name || ''} ${student.last_name || ''}`.trim(),
                email: student.email,
                program: programMap[student.major] || student.major || 'BSIT',
                yearLevel: yearLevelMap[student.year_level] || student.year_level || '1st Year'
            }
        };
        
        console.log('✅ Profile is complete, sending student data:', responseData);
        res.json(responseData);
        
    } catch (error) {
        console.error('❌ Error fetching student info:', error);
        console.error('❌ Error stack:', error.stack);
        
        res.status(500).json({ 
            success: false, 
            message: 'Database error occurred. Please try refreshing the page.',
            error: error.message,
            requiresProfile: false
        });
    }
});

// ADD this route to handle student ID synchronization
router.post('/sync-student-id', async (req, res) => {
    try {
        const { userId, studentId } = req.body;
        
        console.log('🔗 Syncing student ID:', { userId, studentId });
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }
        
        // Update student_info to ensure student_id matches user_id
        const updateQuery = `
            UPDATE student_info 
            SET student_id = COALESCE(student_id, ?) 
            WHERE user_id = ?
        `;
        
        await db.execute(updateQuery, [userId, userId]);
        
        console.log('✅ Student ID synchronized in database');
        
        res.json({
            success: true,
            message: 'Student ID synchronized successfully'
        });
        
    } catch (error) {
        console.error('❌ Error syncing student ID:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});



// REPLACE the existing tuition-fees route in routes/enrollment.js
router.get('/tuition-fees', async (req, res) => {
    try {
        const { program, yearLevel, term, studentType, customUnits, actualUnits } = req.query;
        console.log('💰 Calculating fees for:', { program, yearLevel, term, studentType, customUnits });
        
        // ENHANCED FEE STRUCTURE - Different rates for regular vs irregular
        const REGULAR_RATE = 328.21;     // Regular students: ₱328.21 per unit
        const IRREGULAR_RATE = 450.00;   // Irregular students: ₱450.00 per unit (higher rate)
        
        const isIrregular = studentType === 'irregular';
        const perUnitRate = isIrregular ? IRREGULAR_RATE : REGULAR_RATE;
        
        console.log(`💰 Using ${isIrregular ? 'IRREGULAR' : 'REGULAR'} rate: ₱${perUnitRate} per unit`);
        
        // Fixed fees structure (irregular students pay higher miscellaneous fees)
        const fixedFees = {
            labFee: 500,                                    // Same for both
            miscFee: isIrregular ? 500 : 300,              // Higher for irregular students
            enrollmentFee: isIrregular ? 350 : 200,        // Higher processing fee for irregular
            irregularityFee: isIrregular ? 300 : 0         // Additional fee for irregular students
        };
        
        // ENHANCED: Dynamic units calculation for both regular and irregular students
let totalUnits = 0; // Start with 0, calculate from actual curriculum

if (actualUnits) {
    // PRIORITY: Use actual units calculated from frontend subjects
    totalUnits = parseInt(actualUnits);
    console.log('💰 Using actual units from frontend calculation:', totalUnits);
} else if (isIrregular && customUnits) {
    // For irregular students with custom unit count from frontend
    totalUnits = parseInt(customUnits);
    console.log('💰 Using custom units for irregular student:', totalUnits);
} else {
    // For both regular and irregular students, get actual units from curriculum
    try {
        console.log('💰 Calculating units from curriculum for:', { program, yearLevel, term });
        
        // Find program ID from programs table
        const [programData] = await db.execute('SELECT id, program_name FROM programs WHERE program_name = ?', [program]);
        
        if (programData.length > 0) {
            const programName = programData[0].program_name; // Use program name for curriculum lookup
            console.log('💰 Found program:', programName);
            
            // Try multiple year level format variations to find curriculum
            const yearLevelVariations = [
                yearLevel,                    // "1st Year"
                yearLevel.replace(' Year', ''), // "1st"  
                yearLevel.replace('st', '').replace('nd', '').replace('rd', '').replace('th', '') + ' Year', // "1 Year"
                yearLevel.toLowerCase(),      // "1st year"
                yearLevel.replace(' ', ''),   // "1stYear"
            ];
            
            console.log('💰 Trying year level variations for units calculation:', yearLevelVariations);
            
            // Try each variation until we find curriculum data
            for (const yearVariation of yearLevelVariations) {
                const curriculumQuery = `
                    SELECT SUM(CAST(units AS SIGNED)) as total_units, COUNT(*) as subject_count
                    FROM curriculum 
                    WHERE program_id = ? AND year_level = ? AND semester = ?
                `;
                
                console.log('💰 Querying units with:', { programName, yearVariation, term });
                const [curriculumResults] = await db.execute(curriculumQuery, [programName, yearVariation, term]);
                
                if (curriculumResults.length > 0 && curriculumResults[0].total_units && curriculumResults[0].subject_count > 0) {
                    totalUnits = parseInt(curriculumResults[0].total_units) || 0;
                    console.log(`✅ Found ${curriculumResults[0].subject_count} subjects with ${totalUnits} total units using year format: ${yearVariation}`);
                    break;
                }
            }
            
            // If still no units found, log available curriculum for debugging
            if (totalUnits === 0) {
                console.warn('⚠️ No units found for requested combination');
                const [debugQuery] = await db.execute(`
                    SELECT DISTINCT program_id, year_level, semester, COUNT(*) as subjects, SUM(CAST(units AS SIGNED)) as units
                    FROM curriculum 
                    WHERE program_id = ? 
                    GROUP BY year_level, semester
                    ORDER BY year_level, semester
                `, [programName]);
                console.log('🔍 Available curriculum data for program:', programName, debugQuery);
            }
        } else {
            console.warn('⚠️ Program not found in database:', program);
        }
    } catch (dbError) {
        console.error('❌ Database error while calculating units:', dbError);
    }
    
    // FALLBACK: If no units calculated from database, use a reasonable default based on year level
    if (totalUnits === 0) {
        console.warn('⚠️ Using fallback unit calculation');
        const fallbackUnits = {
            '1st Year': 18,
            '2nd Year': 18, 
            '3rd Year': 15,
            '4th Year': 12
        };
        totalUnits = fallbackUnits[yearLevel] || 15;
        console.log(`💰 Using fallback units for ${yearLevel}: ${totalUnits}`);
    }
}

console.log(`💰 FINAL UNITS CALCULATION: ${totalUnits} units for ${isIrregular ? 'irregular' : 'regular'} student`);
        
        // Calculate tuition based on student type and per-unit rate
        const tuitionFee = Math.round(perUnitRate * totalUnits * 100) / 100;
        const totalFixedFees = fixedFees.labFee + fixedFees.miscFee + fixedFees.enrollmentFee + fixedFees.irregularityFee;
        const totalFees = tuitionFee + totalFixedFees;
        
        console.log('💰 Fee calculation:', { 
            tuitionFee, 
            totalFixedFees,
            totalFees, 
            totalUnits,
            perUnitRate,
            studentType: isIrregular ? 'irregular' : 'regular'
        });
        
        // Build breakdown array dynamically
        const breakdown = [
            { 
                item: 'Tuition Fee', 
                amount: tuitionFee, 
                details: `${totalUnits} units × ₱${perUnitRate.toFixed(2)} ${isIrregular ? '(Irregular Rate)' : '(Regular Rate)'}` 
            },
            { 
                item: 'Laboratory Fee', 
                amount: fixedFees.labFee, 
                details: 'Lab equipment and materials' 
            },
            { 
                item: 'Miscellaneous Fee', 
                amount: fixedFees.miscFee, 
                details: `ID, library, ${isIrregular ? 'and additional services' : 'and other fees'}` 
            },
            { 
                item: 'Enrollment Fee', 
                amount: fixedFees.enrollmentFee, 
                details: `Registration processing fee ${isIrregular ? '(Higher for irregular)' : ''}` 
            }
        ];
        
        // Add irregularity fee for irregular students
        if (isIrregular) {
            breakdown.push({
                item: 'Irregularity Fee',
                amount: fixedFees.irregularityFee,
                details: 'Additional fee for non-standard enrollment'
            });
        }
        
        res.json({
            success: true,
            fees: {
                tuition: tuitionFee,
                laboratory: fixedFees.labFee,
                miscellaneous: fixedFees.miscFee,
                enrollment: fixedFees.enrollmentFee,
                irregularity: fixedFees.irregularityFee,
                total: totalFees,
                totalUnits: totalUnits,
                perUnitRate: perUnitRate,
                studentType: isIrregular ? 'irregular' : 'regular',
                breakdown: breakdown
            }
        });
        
    } catch (error) {
        console.error('❌ Error calculating tuition fees:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// POST enrollment submission - UPDATED TO USE ENROLLMENT_REQUESTS TABLE
router.post('/submit', upload.single('paymentReceipt'), async (req, res) => {
    try {
        const { studentId, program, yearLevel, term, totalFees, subjects, studentType } = req.body;
        // Debug log to verify studentType is received
        console.log('📝 Received studentType:', studentType);
        console.log('📝 Processing enrollment submission:', {
            studentId, program, yearLevel, term, totalFees, studentType
        });
        
        // Validate required fields
        if (!studentId || !program || !yearLevel || !term) {
            return res.status(400).json({
                success: false,
                message: 'Missing required enrollment information'
            });
        }
        
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Payment receipt is required'
            });
        }
        
        console.log('📁 File uploaded:', req.file.filename);
        
        // Parse subjects if provided
        let subjectsData = [];
        if (subjects) {
            try {
                subjectsData = JSON.parse(subjects);
            } catch (e) {
                console.warn('⚠️ Could not parse subjects data');
            }
        }
        
        // Insert enrollment record into enrollment_requests table
        const enrollmentQuery = `
    INSERT INTO enrollment_requests 
    (student_id, student_type, program, year_level, semester, subjects, total_fees, payment_receipt, status, created_at, updated_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())
`;
        
        const finalStudentType = studentType || 'regular';
console.log('💾 Saving student type as:', finalStudentType);

const [result] = await db.execute(enrollmentQuery, [
    studentId,
    finalStudentType,
    program,
    yearLevel,
    term,
    JSON.stringify(subjectsData),
    parseFloat(totalFees) || 0,
    req.file.filename
]);
        
        console.log('✅ Enrollment submitted successfully with ID:', result.insertId);
        
        res.json({
            success: true,
            message: 'Enrollment submitted successfully!',
            enrollmentId: result.insertId,
            receiptFile: req.file.filename
        });
        
    } catch (error) {
        console.error('❌ Error submitting enrollment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit enrollment',
            error: error.message
        });
    }
});

// GET enrollment history for a student - UPDATED TO USE ENROLLMENT_REQUESTS TABLE
router.get('/history/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        console.log('📋 Fetching enrollment history for student:', studentId);
        
        const query = `
            SELECT 
                id,
                program,
                year_level,
                semester,
                total_fees,
                status,
                created_at,
                updated_at
            FROM enrollment_requests 
            WHERE student_id = ? 
            ORDER BY created_at DESC
        `;
        
        const [results] = await db.execute(query, [studentId]);
        console.log('📊 Found enrollment records:', results.length);
        
        res.json({
            success: true,
            enrollments: results
        });
        
    } catch (error) {
        console.error('❌ Error fetching enrollment history:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// ADD this route BEFORE the curriculum route 
router.get('/programs', async (req, res) => {
    try {
        console.log('🎓 Fetching all programs from database...');
        
        const query = 'SELECT * FROM programs ORDER BY program_name ASC';
        const [results] = await db.execute(query);
        
        console.log('📊 Programs found:', results.length);
        if (results.length > 0) {
            console.log('🎓 Available programs:');
            results.forEach((program, index) => {
                console.log(`  ${index + 1}. ID: ${program.id}, Name: "${program.program_name}"`);
            });
        }
        
        res.json({
            success: true,
            data: results
        });
        
    } catch (error) {
        console.error('❌ Error fetching programs:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// ADD this new route to enrollment.js (before the export statement):

// GET curriculum data for specific program, year, and semester - FIXED TO USE PROGRAM NAME
router.get('/curriculum', async (req, res) => {
    try {
        const { program_id, year_level, semester } = req.query;
        
        console.log('📚 Fetching curriculum from database:', { program_id, year_level, semester });
        
        if (!program_id || !year_level || !semester) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters: program_id, year_level, semester'
            });
        }

        // First, get the program name from the programs table using the ID
        const [programCheck] = await db.execute('SELECT program_name FROM programs WHERE id = ?', [program_id]);
        if (programCheck.length === 0) {
            console.log('❌ Program not found for ID:', program_id);
            return res.status(404).json({
                success: false,
                message: 'Program not found'
            });
        }

        const programName = programCheck[0].program_name; // This will be "BSIT", "BSCS", etc.
        console.log('📚 Program found:', programName);

        // DEBUG: Check what's in curriculum table for this program name
        const [debugQuery] = await db.execute(`
            SELECT DISTINCT program_id, year_level, semester 
            FROM curriculum 
            WHERE program_id = ? 
            ORDER BY year_level, semester
        `, [programName]); // Use program name, not numeric ID
        console.log('🔍 Available curriculum combinations for program name:', programName, ':', debugQuery);

        // Try multiple year level format variations
        const yearLevelVariations = [
            year_level,                    // "1st Year"
            year_level.replace(' Year', ''), // "1st"
            year_level.replace('st', '').replace('nd', '').replace('rd', '').replace('th', '') + ' Year', // "1 Year"
            year_level.toLowerCase(),      // "1st year"
            year_level.replace(' ', ''),   // "1stYear"
        ];

        console.log('🔍 Trying year level variations:', yearLevelVariations);

        let curriculumResults = [];
        let usedYearLevel = year_level;

        // Try each variation until we find a match
        for (const yearVariation of yearLevelVariations) {
            const curriculumQuery = `
                SELECT 
                    subject_code,
                    subject_name,
                    units,
                    prerequisite,
                    schedule,
                    section
                FROM curriculum 
                WHERE program_id = ? AND year_level = ? AND semester = ?
                ORDER BY subject_code
            `;
            
            console.log('🔍 Trying query with program_id:', programName, 'year_level:', yearVariation, 'semester:', semester);
            const [results] = await db.execute(curriculumQuery, [programName, yearVariation, semester]);
            
            if (results.length > 0) {
                curriculumResults = results;
                usedYearLevel = yearVariation;
                console.log('✅ Found', results.length, 'subjects with year_level format:', yearVariation);
                break;
            }
        }

        if (curriculumResults.length === 0) {
            console.log('⚠️ No curriculum found for any year level variation');
            // Show what's actually available
            const [allAvailable] = await db.execute(`
                SELECT program_id, year_level, semester, COUNT(*) as count 
                FROM curriculum 
                WHERE program_id = ? 
                GROUP BY year_level, semester
            `, [programName]);
            
            return res.json({
                success: true,
                data: [],
                program_id,
                program_name: programName,
                year_level,
                semester,
                total_subjects: 0,
                total_units: 0,
                message: 'No curriculum found for this selection',
                debug: { 
                    availableCurriculum: allAvailable,
                    triedYearLevels: yearLevelVariations,
                    requestedYearLevel: year_level,
                    usedProgramName: programName
                }
            });
        }

        const curriculumData = curriculumResults.map(subject => ({
            subject_code: subject.subject_code,
            subject_name: subject.subject_name,
            units: parseInt(subject.units) || 3,
            prerequisite: subject.prerequisite || null,
            schedule: subject.schedule || 'TBA',
            section: subject.section || 'A'
        }));

        const totalUnits = curriculumData.reduce((sum, subject) => sum + subject.units, 0);

        console.log('✅ Sending curriculum data:', curriculumData.length, 'subjects');

        res.json({
            success: true,
            data: curriculumData,
            program_id,
            program_name: programName,
            year_level: usedYearLevel,
            semester,
            total_subjects: curriculumData.length,
            total_units: totalUnits
        });

    } catch (error) {
        console.error('❌ Error fetching curriculum from database:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});



// ADD THESE ROUTES TO YOUR EXISTING routes/enrollment.js FILE

// GET all enrollment requests with student names - FIXED JOIN LOGIC
router.get('/all-requests', async (req, res) => {
    try {
        console.log('📋 Fetching all enrollment requests with enhanced data...');
        
        // FIXED: Updated JOIN to match student_id properly
        const query = `
            SELECT 
                er.id,
                er.student_id,
                COALESCE(er.student_type, 'regular') as student_type,
                er.program,
                er.year_level,
                er.semester,
                er.subjects,
                er.total_fees,
                er.payment_receipt,
                er.status,
                er.remarks,
                er.created_at,
                er.updated_at,
                COALESCE(si.display_name, CONCAT(COALESCE(si.first_name, ''), ' ', COALESCE(si.last_name, '')), 'Unknown Student') as student_name,
                si.first_name,
                si.last_name,
                si.email as student_email,
                si.phone,
                CASE 
                    WHEN er.payment_receipt IS NOT NULL AND er.payment_receipt != '' THEN 1 
                    ELSE 0 
                END as has_receipt,
                CASE 
                    WHEN er.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 
                    ELSE 0 
                END as is_recent
            FROM enrollment_requests er
            LEFT JOIN student_info si ON er.student_id = si.id OR er.student_id = si.student_id
            ORDER BY er.created_at DESC
        `;
        
        const [results] = await db.execute(query);
        console.log('📊 Found enrollment requests:', results.length);
        
        // Format the data with enhanced information
        const formattedResults = results.map(request => ({
            ...request,
            student_name: request.student_name || 'Unknown Student',
            has_receipt: Boolean(request.has_receipt),
            is_recent: Boolean(request.is_recent),
            // Parse subjects for frontend use
            subjects_parsed: (() => {
                try {
                    return JSON.parse(request.subjects || '[]');
                } catch (e) {
                    return [];
                }
            })()
        }));
        
        res.json({
            success: true,
            data: formattedResults,
            total: results.length,
            metadata: {
                pending: formattedResults.filter(r => r.status === 'pending').length,
                approved: formattedResults.filter(r => r.status === 'approved').length,
                rejected: formattedResults.filter(r => r.status === 'rejected').length,
                regular: formattedResults.filter(r => r.student_type === 'regular').length,
                irregular: formattedResults.filter(r => r.student_type === 'irregular').length,
                withReceipt: formattedResults.filter(r => r.has_receipt).length,
                recent: formattedResults.filter(r => r.is_recent).length
            }
        });
        
    } catch (error) {
        console.error('❌ Error fetching enrollment requests:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});


// PUT update enrollment status - ADD THIS ROUTE
router.put('/update-status/:enrollmentId', async (req, res) => {
    try {
        const { enrollmentId } = req.params;
        const { status, remarks } = req.body;
        
        console.log('📝 Updating enrollment status:', { enrollmentId, status, remarks });
        
        // Validate status
        const validStatuses = ['pending', 'approved', 'rejected'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be: pending, approved, or rejected'
            });
        }
        
        // Update the enrollment request
        const updateQuery = `
            UPDATE enrollment_requests 
            SET status = ?, remarks = ?, updated_at = NOW() 
            WHERE id = ?
        `;
        
        const [result] = await db.execute(updateQuery, [status, remarks || null, enrollmentId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Enrollment request not found'
            });
        }
        
        console.log('✅ Enrollment status updated successfully');
        
        res.json({
            success: true,
            message: `Enrollment ${status} successfully`,
            enrollmentId: parseInt(enrollmentId),
            newStatus: status
        });
        
    } catch (error) {
        console.error('❌ Error updating enrollment status:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});



// GET enrollment statistics - ADD THIS ROUTE (Optional)
router.get('/stats', async (req, res) => {
    try {
        console.log('📊 Fetching enhanced enrollment statistics...');
        
        const statsQuery = `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
                SUM(CASE WHEN student_type = 'regular' OR student_type IS NULL THEN 1 ELSE 0 END) as regular,
                SUM(CASE WHEN student_type = 'irregular' THEN 1 ELSE 0 END) as irregular,
                SUM(CASE WHEN payment_receipt IS NOT NULL AND payment_receipt != '' THEN 1 ELSE 0 END) as with_receipt,
                SUM(CASE WHEN payment_receipt IS NULL OR payment_receipt = '' THEN 1 ELSE 0 END) as no_receipt,
                SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as recent,
                SUM(total_fees) as total_fees
            FROM enrollment_requests
        `;
        
        const [results] = await db.execute(statsQuery);
        const stats = results[0];
        
        res.json({
            success: true,
            stats: {
                total: parseInt(stats.total) || 0,
                pending: parseInt(stats.pending) || 0,
                approved: parseInt(stats.approved) || 0,
                rejected: parseInt(stats.rejected) || 0,
                regular: parseInt(stats.regular) || 0,
                irregular: parseInt(stats.irregular) || 0,
                withReceipt: parseInt(stats.with_receipt) || 0,
                noReceipt: parseInt(stats.no_receipt) || 0,
                recent: parseInt(stats.recent) || 0,
                totalFees: parseFloat(stats.total_fees) || 0
            }
        });
        
    } catch (error) {
        console.error('❌ Error fetching enrollment statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});


// DELETE individual enrollment request - ADD THIS ROUTE to enrollment.js
router.delete('/delete/:enrollmentId', async (req, res) => {
    try {
        const { enrollmentId } = req.params;
        
        console.log('🗑️ Deleting enrollment request:', enrollmentId);
        
        // First, get the request details for logging
        const getQuery = `
            SELECT er.student_id, si.display_name as student_name, er.payment_receipt
            FROM enrollment_requests er
            LEFT JOIN student_info si ON er.student_id = si.student_id
            WHERE er.id = ?
        `;
        
        const [requestData] = await db.execute(getQuery, [enrollmentId]);
        
        if (requestData.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Enrollment request not found'
            });
        }
        
        const request = requestData[0];
        
        // Delete the enrollment request
        const deleteQuery = `DELETE FROM enrollment_requests WHERE id = ?`;
        const [result] = await db.execute(deleteQuery, [enrollmentId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Enrollment request not found'
            });
        }
        
        // TODO: Optionally delete associated files
        // if (request.payment_receipt) {
        //     // Delete receipt file from storage
        // }
        
        console.log('✅ Enrollment request deleted successfully:', {
            id: enrollmentId,
            student: request.student_name,
            studentId: request.student_id
        });
        
        res.json({
            success: true,
            message: `Enrollment request deleted successfully`,
            deletedId: parseInt(enrollmentId),
            studentName: request.student_name
        });
        
    } catch (error) {
        console.error('❌ Error deleting enrollment request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete enrollment request',
            error: error.message
        });
    }
});

// POST bulk operations - ADD THIS ROUTE to enrollment.js
router.post('/bulk-action', async (req, res) => {
    try {
        const { action, enrollmentIds, remarks } = req.body;
        
        console.log('📦 Performing bulk action:', { action, count: enrollmentIds?.length });
        
        // Validate input
        if (!action || !enrollmentIds || !Array.isArray(enrollmentIds) || enrollmentIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid request. Action and enrollment IDs are required.'
            });
        }
        
        const validActions = ['approve', 'reject', 'delete'];
        if (!validActions.includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid action. Must be: approve, reject, or delete'
            });
        }
        
        let query;
        let params;
        let successCount = 0;
        const results = [];
        
        if (action === 'delete') {
            // Bulk delete
            const placeholders = enrollmentIds.map(() => '?').join(',');
            query = `DELETE FROM enrollment_requests WHERE id IN (${placeholders})`;
            params = enrollmentIds;
            
            const [result] = await db.execute(query, params);
            successCount = result.affectedRows;
            
        } else {
            // Bulk status update (approve/reject)
            const status = action === 'approve' ? 'approved' : 'rejected';
            
            for (const enrollmentId of enrollmentIds) {
                try {
                    const updateQuery = `
                        UPDATE enrollment_requests 
                        SET status = ?, remarks = ?, updated_at = NOW() 
                        WHERE id = ?
                    `;
                    
                    const [result] = await db.execute(updateQuery, [status, remarks || null, enrollmentId]);
                    
                    if (result.affectedRows > 0) {
                        successCount++;
                        results.push({ id: enrollmentId, success: true });
                    } else {
                        results.push({ id: enrollmentId, success: false, reason: 'Not found' });
                    }
                } catch (error) {
                    results.push({ id: enrollmentId, success: false, reason: error.message });
                }
            }
        }
        
        console.log(`✅ Bulk ${action} completed: ${successCount}/${enrollmentIds.length} successful`);
        
        res.json({
            success: true,
            message: `Bulk ${action} completed`,
            totalRequested: enrollmentIds.length,
            successCount: successCount,
            failedCount: enrollmentIds.length - successCount,
            results: action !== 'delete' ? results : undefined
        });
        
    } catch (error) {
        console.error('❌ Error performing bulk action:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to perform bulk action',
            error: error.message
        });
    }
});

// ADD THIS FUNCTION - Insert into enrolled_students when request is approved
// ADD these helper functions at the top of your routes/enrollment.js file, after the imports

// Helper function to validate student data before enrollment
function validateStudentForEnrollment(studentData) {
    const requiredFields = ['student_id', 'program', 'year_level', 'semester'];
    const missingFields = [];
    
    requiredFields.forEach(field => {
        if (!studentData[field] || studentData[field].toString().trim() === '') {
            missingFields.push(field);
        }
    });
    
    return {
        isValid: missingFields.length === 0,
        missingFields: missingFields
    };
}

// Helper function to check for duplicate enrollments
async function checkDuplicateEnrollment(studentId, program, yearLevel, semester) {
    try {
        const [existing] = await db.execute(`
            SELECT id FROM enrolled_students 
            WHERE student_id = ? AND program = ? AND year_level = ? AND semester = ? AND status = 'active'
        `, [studentId, program, yearLevel, semester]);
        
        return existing.length > 0;
    } catch (error) {
        console.error('❌ Error checking duplicate enrollment:', error);
        return false;
    }
}

// REPLACE the createEnrolledStudentRecord function with this enhanced version
async function createEnrolledStudentRecord(enrollmentRequestData) {
    try {
        console.log('🎓 Creating enrolled student record for:', enrollmentRequestData.student_id);
        
        // Validate data
        const validation = validateStudentForEnrollment(enrollmentRequestData);
        if (!validation.isValid) {
            throw new Error(`Missing required fields: ${validation.missingFields.join(', ')}`);
        }
        
        // Check for duplicate enrollment
        const isDuplicate = await checkDuplicateEnrollment(
            enrollmentRequestData.student_id,
            enrollmentRequestData.program,
            enrollmentRequestData.year_level,
            enrollmentRequestData.semester
        );
        
        if (isDuplicate) {
            console.log('⚠️ Student already enrolled in this program/semester, skipping duplicate');
            return null;
        }
        
        // Determine current academic year
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const nextYear = currentYear + 1;
        const academicYear = `${currentYear}-${nextYear}`;
        
        const insertQuery = `
            INSERT INTO enrolled_students 
            (enrollment_request_id, student_id, student_type, program, year_level, semester, subjects, total_fees, enrollment_date, academic_year, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, 'active')
        `;
        
        const [result] = await db.execute(insertQuery, [
            enrollmentRequestData.id,
            enrollmentRequestData.student_id,
            enrollmentRequestData.student_type || 'regular',
            enrollmentRequestData.program,
            enrollmentRequestData.year_level,
            enrollmentRequestData.semester,
            enrollmentRequestData.subjects,
            parseFloat(enrollmentRequestData.total_fees) || 0,
            academicYear
        ]);
        
        console.log('✅ Enrolled student record created successfully with ID:', result.insertId);
        
        // Log enrollment activity
        console.log('📚 ENROLLMENT SUMMARY:');
        console.log(`   Student ID: ${enrollmentRequestData.student_id}`);
        console.log(`   Program: ${enrollmentRequestData.program}`);
        console.log(`   Year/Semester: ${enrollmentRequestData.year_level} - ${enrollmentRequestData.semester}`);
        console.log(`   Type: ${enrollmentRequestData.student_type || 'regular'}`);
        console.log(`   Total Fees: ₱${enrollmentRequestData.total_fees}`);
        console.log(`   Academic Year: ${academicYear}`);
        
        return result.insertId;
        
    } catch (error) {
        console.error('❌ Error creating enrolled student record:', error);
        throw error;
    }
}




// FIXED: Update enrollment status without auto-enrollment (around line 50-150 in your enrollment.js)
router.put('/update-status/:enrollmentId', async (req, res) => {
    try {
        const { enrollmentId } = req.params;
        const { status, remarks } = req.body;
        
        console.log('📝 Updating enrollment status:', { enrollmentId, status, remarks });
        
        // Validate status
        const validStatuses = ['pending', 'approved', 'rejected'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be: pending, approved, or rejected'
            });
        }
        
        // Get enrollment request data
        const [requestData] = await db.execute(`
            SELECT * FROM enrollment_requests WHERE id = ?
        `, [enrollmentId]);
        
        if (requestData.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Enrollment request not found'
            });
        }
        
        const enrollmentRequest = requestData[0];
        console.log('📋 Found enrollment request for student_id:', enrollmentRequest.student_id);
        
        // Update the enrollment request status
        const updateQuery = `
            UPDATE enrollment_requests 
            SET status = ?, remarks = ?, updated_at = NOW() 
            WHERE id = ?
        `;
        
        const [result] = await db.execute(updateQuery, [status, remarks || null, enrollmentId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Failed to update enrollment request'
            });
        }
        
        console.log('✅ Enrollment request status updated to:', status);
        
        // REMOVED: Automatic enrollment creation - now handled by migration only
        
        // Send notifications for approved/rejected status
        if (status === 'approved' || status === 'rejected') {
            try {
                console.log('📧 Sending status notification...');
                
                let userId = null;
                
                const numericStudentId = parseInt(enrollmentRequest.student_id);
                if (!isNaN(numericStudentId)) {
                    const [userById] = await db.execute(`
                        SELECT id FROM users WHERE id = ?
                    `, [numericStudentId]);
                    
                    if (userById.length > 0) {
                        userId = numericStudentId;
                    }
                }
                
                if (!userId) {
                    const [studentInfo] = await db.execute(`
                        SELECT si.email, si.id as si_id
                        FROM student_info si 
                        WHERE si.student_id = ? OR si.id = ?
                        LIMIT 1
                    `, [enrollmentRequest.student_id, enrollmentRequest.student_id]);
                    
                    if (studentInfo.length > 0) {
                        const studentRecord = studentInfo[0];
                        
                        if (studentRecord.email) {
                            const [userByEmail] = await db.execute(`
                                SELECT id FROM users WHERE email = ?
                            `, [studentRecord.email]);
                            
                            if (userByEmail.length > 0) {
                                userId = parseInt(userByEmail[0].id);
                            }
                        }
                    }
                }
                
                if (userId && !isNaN(userId)) {
                    const currentDate = new Date();
                    const currentYear = currentDate.getFullYear();
                    const semesterYear = `${enrollmentRequest.semester} ${currentYear}`;
                    
                    const NotificationService = (await import('../services/notificationService.js')).default;
                    
                    // Send ONLY status notification (approved/rejected), NOT enrollment notification
                    await NotificationService.createEnrollmentNotification(
                        userId,
                        status, // 'approved' or 'rejected' - NOT 'enrolled'
                        enrollmentRequest.program,
                        semesterYear,
                        enrollmentRequest.id
                    );
                    
                    console.log('✅ Status notification sent successfully');
                }
                
            } catch (notificationError) {
                console.error('❌ Error in notification process:', notificationError);
            }
        }
        
        // Return response
        res.json({
            success: true,
            message: status === 'approved' 
                ? 'Enrollment approved! Use Migration Center to enroll students.'
                : `Enrollment ${status} successfully`,
            enrollmentId: parseInt(enrollmentId),
            newStatus: status,
            notificationSent: true
        });
        
    } catch (error) {
        console.error('❌ Error updating enrollment status:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// ENHANCED: Migration route with COMPREHENSIVE duplicate prevention
router.post('/migrate-approved', async (req, res) => {
    try {
        console.log('🔄 Starting ENHANCED migration with comprehensive duplicate prevention...');
        
        // STEP 1: Get approved requests that haven't been migrated yet
        const query = `
            SELECT er.* 
            FROM enrollment_requests er
            WHERE er.status = 'approved' 
            AND er.id NOT IN (
                SELECT DISTINCT enrollment_request_id 
                FROM enrolled_students 
                WHERE enrollment_request_id IS NOT NULL
            )
            AND er.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
            ORDER BY er.created_at ASC
        `;
        
        const [approvedRequests] = await db.execute(query);
        console.log('📊 Found', approvedRequests.length, 'approved requests for migration');
        
        if (approvedRequests.length === 0) {
            return res.json({
                success: true,
                message: 'No new approved requests to migrate - all duplicates prevented',
                migratedCount: 0,
                errorCount: 0,
                notificationsSent: 0,
                duplicatesPrevented: 0
            });
        }
        
        // STEP 2: Additional filtering to prevent same student + semester duplicates
        const uniqueRequests = [];
        const duplicatesPrevented = [];
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const nextYear = currentYear + 1;
        const academicYear = `${currentYear}-${nextYear}`;
        
        // ENHANCED: More comprehensive duplicate check with better student ID matching
for (const request of approvedRequests) {
    console.log('🔍 Checking duplicates for request:', request.id, 'Student:', request.student_id);
    
    // STEP 1: Check if this specific enrollment request was already migrated
    const [existingByRequestId] = await db.execute(
        'SELECT id FROM enrolled_students WHERE enrollment_request_id = ?',
        [request.id]
    );
    
    if (existingByRequestId.length > 0) {
        duplicatesPrevented.push({
            requestId: request.id,
            studentId: request.student_id,
            reason: 'Enrollment request already migrated'
        });
        console.log('🚫 PREVENTED: Request already migrated -', request.id);
        continue;
    }
    
    // STEP 2: Check for same student in same program/year/semester/academic year
    const [existingByStudent] = await db.execute(`
        SELECT id, enrollment_request_id FROM enrolled_students 
        WHERE student_id = ? 
        AND program = ? 
        AND year_level = ? 
        AND semester = ? 
        AND academic_year = ? 
        AND status = 'active'
        LIMIT 1
    `, [
        request.student_id,
        request.program,
        request.year_level,
        request.semester,
        academicYear
    ]);
    
    if (existingByStudent.length > 0) {
        duplicatesPrevented.push({
            requestId: request.id,
            studentId: request.student_id,
            reason: `Student already enrolled in ${request.program} ${request.year_level} ${request.semester} ${academicYear}`,
            existingEnrollmentId: existingByStudent[0].id
        });
        console.log('🚫 PREVENTED: Student already enrolled -', request.student_id, 'in', request.program);
        continue;
    }
    
    // STEP 3: Additional check for alternative student ID formats
    if (request.student_id.includes('-')) {
        const baseStudentId = request.student_id.split('-')[0];
        const [existingByBaseId] = await db.execute(`
            SELECT id FROM enrolled_students 
            WHERE (student_id LIKE ? OR student_id = ?)
            AND program = ? 
            AND year_level = ? 
            AND semester = ? 
            AND academic_year = ?
            AND status = 'active'
            LIMIT 1
        `, [
            `${baseStudentId}%`,
            baseStudentId,
            request.program,
            request.year_level,
            request.semester,
            academicYear
        ]);
        
        if (existingByBaseId.length > 0) {
            duplicatesPrevented.push({
                requestId: request.id,
                studentId: request.student_id,
                reason: 'Student ID variant already enrolled'
            });
            console.log('🚫 PREVENTED: Student ID variant exists -', request.student_id);
            continue;
        }
    }
    
    // If all checks pass, add to unique requests
    uniqueRequests.push(request);
    console.log('✅ APPROVED for migration:', request.student_id, 'Request:', request.id);
}
        
        console.log('✅ After duplicate prevention:', uniqueRequests.length, 'unique requests');
        console.log('🚫 Duplicates prevented:', duplicatesPrevented.length);
        
        if (uniqueRequests.length === 0) {
            return res.json({
                success: true,
                message: 'All requests were duplicates - no migration needed',
                migratedCount: 0,
                errorCount: 0,
                notificationsSent: 0,
                duplicatesPrevented: duplicatesPrevented.length
            });
        }
        
        // STEP 3: Process unique requests
        let migratedCount = 0;
        let notificationsSent = 0;
        const errors = [];
        
        for (const request of uniqueRequests) {
            try {
                console.log('🎓 Processing unique request ID:', request.id, 'Student:', request.student_id);
                
                // FINAL SAFETY CHECK before insertion
                const [finalCheck] = await db.execute(
                    'SELECT id FROM enrolled_students WHERE enrollment_request_id = ?',
                    [request.id]
                );
                
                if (finalCheck.length > 0) {
                    console.log('⚠️ Last-second duplicate detected, skipping:', request.id);
                    continue;
                }
                
                // Insert into enrolled_students table
                const insertQuery = `
                    INSERT INTO enrolled_students 
                    (enrollment_request_id, student_id, student_type, program, year_level, semester, subjects, total_fees, enrollment_date, academic_year, status, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())
                `;
                
                const [result] = await db.execute(insertQuery, [
                    request.id,
                    request.student_id,
                    request.student_type || 'regular',
                    request.program,
                    request.year_level,
                    request.semester,
                    request.subjects,
                    parseFloat(request.total_fees) || 0,
                    request.created_at,
                    academicYear
                ]);
                
                migratedCount++;
                console.log('✅ Successfully migrated - Enrolled ID:', result.insertId);
                
                // Send notification
                try {
                    let userId = null;
                    
                    // Find user ID for notification
                    const [userByStudentId] = await db.execute(`
                        SELECT id FROM users WHERE id = ? OR username = ?
                    `, [request.student_id, request.student_id]);
                    
                    if (userByStudentId.length > 0) {
                        userId = parseInt(userByStudentId[0].id);
                    }
                    
                    if (!userId) {
                        const [userViaStudentInfo] = await db.execute(`
                            SELECT u.id 
                            FROM users u
                            JOIN student_info si ON (u.email = si.email OR u.id = si.id)
                            WHERE si.student_id = ? OR si.id = ?
                            LIMIT 1
                        `, [request.student_id, request.student_id]);
                        
                        if (userViaStudentInfo.length > 0) {
                            userId = parseInt(userViaStudentInfo[0].id);
                        }
                    }
                    
                    if (userId) {
                        const semesterYear = `${request.semester} ${academicYear}`;
                        const NotificationService = (await import('../services/notificationService.js')).default;
                        
                        await NotificationService.createEnrollmentNotification(
                            userId,
                            'enrolled',
                            request.program,
                            semesterYear,
                            request.id
                        );
                        
                        notificationsSent++;
                        console.log('✅ Notification sent to user:', userId);
                    }
                    
                } catch (notificationError) {
                    console.error('❌ Error sending notification:', notificationError);
                }
                
            } catch (error) {
                console.error('❌ Error migrating request ID:', request.id, error);
                errors.push({
                    requestId: request.id,
                    studentId: request.student_id,
                    error: error.message
                });
            }
        }
        
        console.log('🎯 Migration completed:', migratedCount, 'successful,', errors.length, 'errors,', duplicatesPrevented.length, 'duplicates prevented');
        
        res.json({
            success: true,
            message: `Migration completed: ${migratedCount} students enrolled, ${duplicatesPrevented.length} duplicates prevented`,
            migratedCount,
            errorCount: errors.length,
            totalProcessed: approvedRequests.length,
            notificationsSent,
            academicYear: academicYear,
            duplicatesPrevented: duplicatesPrevented.length,
            errors: errors.length > 0 ? errors : undefined
        });
        
    } catch (error) {
        console.error('❌ Error during migration:', error);
        res.status(500).json({
            success: false,
            message: 'Migration failed: ' + error.message,
            error: error.message
        });
    }
});

// ENHANCED: Database cleanup route for removing duplicates
router.post('/cleanup-duplicates', async (req, res) => {
    try {
        console.log('🧹 Starting comprehensive duplicate cleanup process...');
        
        // STEP 1: Find duplicate students (same student_id, program, year_level, semester, academic_year)
        const [duplicates] = await db.execute(`
            SELECT student_id, program, year_level, semester, academic_year, 
                   GROUP_CONCAT(id ORDER BY created_at ASC) as all_ids,
                   MIN(id) as keep_id,
                   COUNT(*) as duplicate_count,
                   MIN(created_at) as first_created
            FROM enrolled_students 
            WHERE status = 'active'
            GROUP BY student_id, program, year_level, semester, academic_year
            HAVING COUNT(*) > 1
            ORDER BY first_created ASC
        `);
        
        if (duplicates.length === 0) {
            return res.json({
                success: true,
                message: 'No duplicates found',
                removedCount: 0,
                duplicateGroups: 0
            });
        }
        
        let totalRemoved = 0;
        let processedGroups = 0;
        
        for (const duplicate of duplicates) {
            const idsToRemove = duplicate.all_ids.split(',')
                .map(id => parseInt(id))
                .filter(id => id !== duplicate.keep_id);
            
            if (idsToRemove.length > 0) {
                // Remove duplicate entries (keeping the oldest one)
                await db.execute(
                    `DELETE FROM enrolled_students WHERE id IN (${idsToRemove.map(() => '?').join(',')})`,
                    idsToRemove
                );
                
                totalRemoved += idsToRemove.length;
                processedGroups++;
                console.log('🗑️ Removed', idsToRemove.length, 'duplicates for student:', duplicate.student_id, 'keeping ID:', duplicate.keep_id);
            }
        }
        
        // STEP 2: Also clean up any orphaned enrollment requests (optional)
        const [orphanedRequests] = await db.execute(`
            UPDATE enrollment_requests er
            SET status = 'processed'
            WHERE er.status = 'approved' 
            AND er.id IN (
                SELECT enrollment_request_id 
                FROM enrolled_students 
                WHERE enrollment_request_id IS NOT NULL
            )
        `);
        
        console.log('✅ Cleanup completed:', totalRemoved, 'duplicates removed,', processedGroups, 'groups processed');
        
        res.json({
            success: true,
            message: `Cleanup completed: ${totalRemoved} duplicate entries removed from ${processedGroups} duplicate groups`,
            removedCount: totalRemoved,
            duplicateGroups: processedGroups,
            orphanedRequestsUpdated: orphanedRequests.affectedRows || 0
        });
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        res.status(500).json({
            success: false,
            message: 'Cleanup failed: ' + error.message,
            error: error.message
        });
    }
});

// FIXED: Enhanced enrolled students endpoint for faculty dashboard
router.get('/enrolled-students', async (req, res) => {
    try {
        const { program, yearLevel, semester, search } = req.query;
        
        console.log('👥 Fetching enrolled students for faculty dashboard...');
        console.log('🔍 Filters:', { program, yearLevel, semester, search });
        
        // FIXED: Updated query with proper JOIN - using student_id as primary match
        let query = `
    SELECT 
        es.id,
        es.enrollment_request_id,
        es.student_id,
        es.student_type,
        es.program,
        es.year_level,
        es.semester,
        es.subjects,
        es.total_fees,
        es.enrollment_date,
        es.academic_year,
        es.status as enrollment_status,
        es.created_at,
        es.updated_at,
        -- FIXED: More precise student info matching with priority order
        COALESCE(
            (SELECT CONCAT(si1.first_name, ' ', si1.last_name) 
             FROM student_info si1 
             WHERE CAST(si1.student_id AS CHAR) = CAST(es.student_id AS CHAR) 
             LIMIT 1),
            (SELECT si2.display_name 
             FROM student_info si2 
             WHERE CAST(si2.id AS CHAR) = CAST(es.student_id AS CHAR) 
             LIMIT 1),
            CONCAT('Student-', es.student_id)
        ) as student_name,
        (SELECT si3.email FROM student_info si3 
         WHERE CAST(si3.student_id AS CHAR) = CAST(es.student_id AS CHAR) 
         LIMIT 1) as student_email,
        (SELECT si4.phone FROM student_info si4 
         WHERE CAST(si4.student_id AS CHAR) = CAST(es.student_id AS CHAR) 
         LIMIT 1) as phone,
        (SELECT si5.home_address FROM student_info si5 
         WHERE CAST(si5.student_id AS CHAR) = CAST(es.student_id AS CHAR) 
         LIMIT 1) as address
    FROM enrolled_students es
    WHERE es.status = 'active'
`;
        
        const queryParams = [];
        
        // Apply filters (rest remains the same...)
        if (program && program !== '') {
            query += ' AND es.program = ?';
            queryParams.push(program);
        }
        
        if (yearLevel && yearLevel !== '') {
            query += ' AND es.year_level = ?';
            queryParams.push(yearLevel);
        }
        
        if (semester && semester !== '') {
            query += ' AND es.semester = ?';
            queryParams.push(semester);
        }
        
        if (search && search.trim() !== '') {
            query += ` AND (
                si.first_name LIKE ? OR 
                si.last_name LIKE ? OR 
                si.display_name LIKE ? OR 
                si.email LIKE ? OR 
                CAST(es.student_id AS CHAR) LIKE ? OR
                es.program LIKE ?
            )`;
            const searchTerm = `%${search.trim()}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
        }
        
        query += ' ORDER BY es.enrollment_date DESC';
        
        console.log('📊 Executing query with', queryParams.length, 'parameters');
        const [results] = await db.execute(query, queryParams);
        
        console.log('📊 Found', results.length, 'enrolled students');
        
        // Format the results
        const formattedResults = results.map(student => {
    // ENHANCED SUBJECT PARSING - FIXED VERSION
    let subjectsParsed = [];
    let subjectsCount = 0;
    
    console.log('📚 Processing subjects for student:', student.student_id);
    console.log('📚 Raw subjects data:', student.subjects);
    console.log('📚 Subjects type:', typeof student.subjects);
    
    try {
        if (student.subjects && student.subjects.trim() !== '' && student.subjects !== 'null') {
            // FIXED: Handle different JSON formats
            let parsedData;
            
            // Try to parse as JSON
            try {
                parsedData = JSON.parse(student.subjects);
                console.log('📚 JSON parsed successfully:', parsedData);
            } catch (jsonError) {
                console.warn('⚠️ JSON parse failed, treating as string:', jsonError.message);
                parsedData = student.subjects;
            }
            
            // ENHANCED: Handle multiple data structures
            if (Array.isArray(parsedData)) {
                subjectsParsed = parsedData;
                console.log('📚 Using array format:', subjectsParsed.length, 'items');
            } else if (typeof parsedData === 'object' && parsedData !== null) {
                // Convert object to array
                subjectsParsed = Object.values(parsedData);
                console.log('📚 Converted object to array:', subjectsParsed.length, 'items');
            } else if (typeof parsedData === 'string') {
                // Handle string format - might be comma separated
                console.log('📚 Handling string format subjects');
                subjectsParsed = [{
                    subject_code: 'UNKNOWN',
                    subject_name: parsedData,
                    units: 3
                }];
            }
            
            // CRITICAL: Filter and validate subjects
            subjectsParsed = subjectsParsed.filter(subject => {
                if (!subject) return false;
                
                // Check if subject has required fields
                const hasValidData = subject.subject_code || subject.code || 
                                   subject.subject_name || subject.name || 
                                   subject.description || subject.title;
                
                if (!hasValidData) {
                    console.warn('⚠️ Invalid subject filtered out:', subject);
                }
                
                return hasValidData;
            });
            
            subjectsCount = subjectsParsed.length;
            console.log('📚 Final valid subjects count:', subjectsCount);
            
        } else {
            console.log('📚 No subjects data found for student:', student.student_id);
        }
    } catch (error) {
        console.error('❌ Error processing subjects for student:', student.student_id, error);
        subjectsParsed = [];
        subjectsCount = 0;
    }
    
    const formattedStudent = {
        ...student,
        student_name: student.student_name || `Student ${student.student_id}`,
        student_email: student.student_email || 'N/A',
        phone: student.phone || 'N/A',
        address: student.address || 'N/A',
        subjects_parsed: subjectsParsed,  // CRITICAL: This must be populated
        subjects_count: subjectsCount,
        // Add searchable text for frontend filtering
        searchable_text: `${student.student_name || ''} ${student.student_email || ''} ${student.student_id || ''} ${student.program || ''}`.toLowerCase()
    };
    
    console.log('📚 Final formatted student subjects_parsed:', formattedStudent.subjects_parsed);
    return formattedStudent;
});
        
        // Calculate metadata
        const metadata = {
            totalStudents: formattedResults.length,
            activeStudents: formattedResults.filter(s => s.enrollment_status === 'active').length,
            programs: [...new Set(formattedResults.map(s => s.program))],
            yearLevels: [...new Set(formattedResults.map(s => s.year_level))],
            newEnrollees: formattedResults.filter(s => {
                const enrollDate = new Date(s.enrollment_date);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return enrollDate >= weekAgo;
            }).length
        };
        
        console.log('✅ Enrolled students data prepared successfully');
        console.log('📊 Metadata:', metadata);
        
        res.json({
            success: true,
            data: formattedResults,
            total: formattedResults.length,
            metadata: metadata
        });
        
    } catch (error) {
        console.error('❌ Error fetching enrolled students:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// ADD NEW ROUTE - Get enrolled students statistics for faculty dashboard
router.get('/enrolled-students/stats', async (req, res) => {
    try {
        console.log('📊 Fetching enrolled students statistics...');
        
        const statsQuery = `
            SELECT 
                COUNT(*) as total_students,
                COUNT(CASE WHEN es.status = 'active' THEN 1 END) as active_students,
                COUNT(CASE WHEN es.enrollment_date >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as new_enrollees,
                COUNT(DISTINCT es.program) as courses_count,
                COUNT(DISTINCT CONCAT(es.program, '-', es.year_level, '-', es.semester)) as unique_classes
            FROM enrolled_students es
            WHERE es.status = 'active'
        `;
        
        const [results] = await db.execute(statsQuery);
        const stats = results[0];
        
        res.json({
            success: true,
            stats: {
                totalStudents: parseInt(stats.total_students) || 0,
                activeStudents: parseInt(stats.active_students) || 0,
                newEnrollees: parseInt(stats.new_enrollees) || 0,
                coursesCount: parseInt(stats.courses_count) || 0,
                uniqueClasses: parseInt(stats.unique_classes) || 0
            }
        });
        
    } catch (error) {
        console.error('❌ Error fetching enrolled students statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});



// ADD these routes to routes/enrollment.js for bulk operations on enrolled students

// PUT - Update enrolled student status (active/dropped/graduated)
router.put('/enrolled-students/:enrolledId/status', async (req, res) => {
    try {
        const { enrolledId } = req.params;
        const { status, remarks } = req.body;
        
        console.log('📝 Updating enrolled student status:', { enrolledId, status });
        
        const validStatuses = ['active', 'dropped', 'graduated'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be: active, dropped, or graduated'
            });
        }
        
        const updateQuery = `
            UPDATE enrolled_students 
            SET status = ?, updated_at = NOW()
            WHERE id = ?
        `;
        
        const [result] = await db.execute(updateQuery, [status, enrolledId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Enrolled student record not found'
            });
        }
        
        console.log('✅ Enrolled student status updated successfully');
        
        res.json({
            success: true,
            message: `Student status updated to ${status}`,
            enrolledId: parseInt(enrolledId),
            newStatus: status
        });
        
    } catch (error) {
        console.error('❌ Error updating enrolled student status:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// GET - Search enrolled students by various criteria
router.get('/enrolled-students/search', async (req, res) => {
    try {
        const { query, type } = req.query;
        
        if (!query || query.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }
        
        console.log('🔍 Searching enrolled students:', { query, type });
        
        let searchQuery;
        let queryParams;
        
        // Different search types
        switch (type) {
            case 'student_id':
                searchQuery = `
                    SELECT es.*, si.display_name as student_name, si.email as student_email
                    FROM enrolled_students es
                    LEFT JOIN student_info si ON es.student_id = si.student_id
                    WHERE es.student_id LIKE ?
                    ORDER BY es.enrollment_date DESC
                `;
                queryParams = [`%${query}%`];
                break;
                
            case 'name':
                searchQuery = `
                    SELECT es.*, si.display_name as student_name, si.email as student_email
                    FROM enrolled_students es
                    LEFT JOIN student_info si ON es.student_id = si.student_id
                    WHERE (si.first_name LIKE ? OR si.last_name LIKE ? OR si.display_name LIKE ?)
                    ORDER BY es.enrollment_date DESC
                `;
                queryParams = [`%${query}%`, `%${query}%`, `%${query}%`];
                break;
                
            case 'program':
                searchQuery = `
                    SELECT es.*, si.display_name as student_name, si.email as student_email
                    FROM enrolled_students es
                    LEFT JOIN student_info si ON es.student_id = si.student_id
                    WHERE es.program LIKE ?
                    ORDER BY es.enrollment_date DESC
                `;
                queryParams = [`%${query}%`];
                break;
                
            default:
                // General search across all fields
                searchQuery = `
                    SELECT es.*, si.display_name as student_name, si.email as student_email
                    FROM enrolled_students es
                    LEFT JOIN student_info si ON es.student_id = si.student_id
                    WHERE (
                        es.student_id LIKE ? OR 
                        es.program LIKE ? OR 
                        si.first_name LIKE ? OR 
                        si.last_name LIKE ? OR 
                        si.display_name LIKE ? OR
                        si.email LIKE ?
                    )
                    ORDER BY es.enrollment_date DESC
                `;
                const searchTerm = `%${query}%`;
                queryParams = [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm];
        }
        
        const [results] = await db.execute(searchQuery, queryParams);
        
        console.log('✅ Search completed, found', results.length, 'results');
        
        res.json({
            success: true,
            data: results,
            total: results.length,
            searchQuery: query,
            searchType: type || 'general'
        });
        
    } catch (error) {
        console.error('❌ Error searching enrolled students:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// GET - Get enrollment history for analytics
router.get('/enrolled-students/analytics', async (req, res) => {
    try {
        console.log('📊 Generating enrollment analytics...');
        
        const analyticsQuery = `
            SELECT 
                program,
                year_level,
                semester,
                student_type,
                COUNT(*) as count,
                AVG(total_fees) as avg_fees,
                SUM(total_fees) as total_revenue,
                DATE(enrollment_date) as enrollment_date
            FROM enrolled_students 
            WHERE status = 'active'
            GROUP BY program, year_level, semester, student_type, DATE(enrollment_date)
            ORDER BY enrollment_date DESC, program, year_level
        `;
        
        const [results] = await db.execute(analyticsQuery);
        
        // Process data for frontend charts
        const analytics = {
            byProgram: {},
            byYearLevel: {},
            byStudentType: {},
            byDate: {},
            totals: {
                totalStudents: 0,
                totalRevenue: 0,
                averageFees: 0
            }
        };
        
        results.forEach(row => {
            // Group by program
            if (!analytics.byProgram[row.program]) {
                analytics.byProgram[row.program] = { count: 0, revenue: 0 };
            }
            analytics.byProgram[row.program].count += row.count;
            analytics.byProgram[row.program].revenue += row.total_revenue;
            
            // Group by year level
            if (!analytics.byYearLevel[row.year_level]) {
                analytics.byYearLevel[row.year_level] = { count: 0, revenue: 0 };
            }
            analytics.byYearLevel[row.year_level].count += row.count;
            analytics.byYearLevel[row.year_level].revenue += row.total_revenue;
            
            // Group by student type
            if (!analytics.byStudentType[row.student_type]) {
                analytics.byStudentType[row.student_type] = { count: 0, revenue: 0 };
            }
            analytics.byStudentType[row.student_type].count += row.count;
            analytics.byStudentType[row.student_type].revenue += row.total_revenue;
            
            // Group by date
            const dateKey = row.enrollment_date;
            if (!analytics.byDate[dateKey]) {
                analytics.byDate[dateKey] = { count: 0, revenue: 0 };
            }
            analytics.byDate[dateKey].count += row.count;
            analytics.byDate[dateKey].revenue += row.total_revenue;
            
            // Update totals
            analytics.totals.totalStudents += row.count;
            analytics.totals.totalRevenue += row.total_revenue;
        });
        
        if (analytics.totals.totalStudents > 0) {
            analytics.totals.averageFees = analytics.totals.totalRevenue / analytics.totals.totalStudents;
        }
        
        console.log('✅ Analytics generated successfully');
        
        res.json({
            success: true,
            analytics: analytics,
            rawData: results
        });
        
    } catch (error) {
        console.error('❌ Error generating analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// ENHANCED: Get enrolled student data with better ID matching
router.get('/enrolled-students/student/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        console.log('📋 Fetching enrolled student data for student ID:', studentId);
        
        // CRITICAL FIX: Handle multiple ID formats and ensure proper matching
        let query;
        let queryParams;
        
        // Try direct student_id match first (most reliable)
        query = `
            SELECT 
                es.*,
                COALESCE(si.display_name, CONCAT(COALESCE(si.first_name, ''), ' ', COALESCE(si.last_name, '')), 'Unknown Student') as student_name,
                si.first_name, si.last_name, si.email as student_email, si.phone, si.home_address as address
            FROM enrolled_students es
            LEFT JOIN student_info si ON es.student_id = si.student_id
            WHERE es.student_id = ? AND es.status = 'active'
            ORDER BY es.enrollment_date DESC LIMIT 1
        `;
        queryParams = [studentId];
        
        console.log('🔍 Primary query with student_id:', studentId);
        let [results] = await db.execute(query, queryParams);
        
        // If no direct match and studentId looks like a user ID (numeric), try to resolve it
        if (results.length === 0 && !isNaN(studentId) && !studentId.includes('-')) {
            console.log('🔄 No direct match found, trying user ID resolution...');
            
            // Get the actual student_id from student_info using user_id
            const [studentInfo] = await db.execute(
                'SELECT student_id FROM student_info WHERE id = ? OR student_id = ?',
                [studentId, studentId]
            );
            
            if (studentInfo.length > 0) {
                const actualStudentId = studentInfo[0].student_id;
                console.log('✅ Resolved to actual student_id:', actualStudentId);
                
                // Retry the query with the resolved student_id
                [results] = await db.execute(query, [actualStudentId]);
            }
        }
        
        if (results.length === 0) {
            console.log('⚠️ No active enrollment found for student ID:', studentId);
            return res.json({
                success: false,
                data: [],
                message: 'No active enrollment found for this student',
                debug: {
                    searchedStudentId: studentId,
                    queryUsed: 'enrolled_students.student_id match'
                }
            });
        }
        
        const student = results[0];
        console.log('✅ Found enrolled student:', {
            enrolledId: student.id,
            studentId: student.student_id,
            studentName: student.student_name
        });
        
        // Parse subjects data with enhanced error handling
        let subjectsParsed = [];
        try {
            if (student.subjects && student.subjects.trim() !== '' && student.subjects !== 'null') {
                console.log('📚 Raw subjects data type:', typeof student.subjects);
                console.log('📚 Raw subjects preview:', student.subjects.substring(0, 100) + '...');
                
                const parsedData = JSON.parse(student.subjects);
                if (Array.isArray(parsedData)) {
                    subjectsParsed = parsedData;
                } else if (typeof parsedData === 'object' && parsedData !== null) {
                    subjectsParsed = Object.values(parsedData);
                }
                
                // Clean and validate subjects
                subjectsParsed = subjectsParsed.filter(subject => {
                    return subject && (subject.subject_code || subject.code || subject.description);
                }).map(subject => ({
                    subject_code: subject.code || subject.subject_code || 'UNKNOWN',
                    subject_name: subject.description || subject.subject_name || subject.name || 'Unknown Subject',
                    units: parseInt(subject.units) || 3,
                    section: subject.section || 'A',
                    instructor: subject.instructor || 'TBA',
                    room: subject.room || 'TBA',
                    prerequisite: subject.prereq || subject.prerequisite || 'None',
                    schedule: (subject.day && subject.time) ? `${subject.day} ${subject.time}` : 'TBA',
                    time: subject.time || 'TBA',
                    day: subject.day || 'TBA'
                }));
                
                console.log('✅ Processed subjects count:', subjectsParsed.length);
            }
        } catch (error) {
            console.error('❌ Error parsing subjects for student:', student.student_id, error);
        }
        
        const formattedStudent = {
            ...student,
            student_name: student.student_name || 'Unknown Student',
            subjects_parsed: subjectsParsed,
            subjects_count: subjectsParsed.length
        };
        
        console.log('✅ Sending student data:', {
            studentId: formattedStudent.student_id,
            studentName: formattedStudent.student_name,
            subjectsCount: formattedStudent.subjects_count
        });
        
        res.json({
            success: true,
            data: [formattedStudent]
        });
        
    } catch (error) {
        console.error('❌ Error fetching student enrollment:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});


// ADD THESE ROUTES TO YOUR EXISTING routes/enrollment.js FILE (before export default router;)

// GET student grades for a specific student
router.get('/grades/student/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        
        console.log('📊 Fetching grades for student:', studentId);
        
        const query = `
            SELECT 
                sg.*,
                es.program,
                es.year_level
            FROM students_grades sg
            JOIN enrolled_students es ON sg.enrolled_student_id = es.id
            WHERE sg.student_id = ?
            ORDER BY sg.semester, sg.subject_code
        `;
        
        const [results] = await db.execute(query, [studentId]);
        
        console.log('📊 Found grades:', results.length);
        
        res.json({
            success: true,
            data: results
        });
        
    } catch (error) {
        console.error('❌ Error fetching student grades:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// GET all enrolled students with their subjects for grading (Faculty Dashboard)
router.get('/grading/students', async (req, res) => {
    try {
        const { program, yearLevel, semester, search } = req.query;
        // CRITICAL DEBUG: Log received query parameters
console.log('🔍 BACKEND: Received query parameters:', {
    program: `"${program}"`,
    yearLevel: `"${yearLevel}"`, 
    semester: `"${semester}"`,
    search: `"${search}"`
});
console.log('🔍 BACKEND: Parameter types:', {
    program: typeof program,
    yearLevel: typeof yearLevel,
    semester: typeof semester,
    search: typeof search
});
        console.log('👥 Fetching students for grading dashboard...');
        console.log('🔍 Filters:', { program, yearLevel, semester, search });
        
        let query = `
            SELECT 
                es.id as enrolled_id,
                es.student_id,
                es.student_type,
                es.program,
                es.year_level,
                es.semester,
                es.subjects,
                es.academic_year,
                COALESCE(
                    si.display_name, 
                    CONCAT(COALESCE(si.first_name, ''), ' ', COALESCE(si.last_name, '')),
                    CONCAT('Student-', es.student_id)
                ) as student_name,
                si.email as student_email,
                si.phone,
                -- Count existing grades for this student
                (SELECT COUNT(*) FROM students_grades sg WHERE sg.student_id = es.student_id) as grades_count
            FROM enrolled_students es
            LEFT JOIN student_info si ON (
                CAST(es.student_id AS CHAR) = CAST(si.student_id AS CHAR) OR
                CAST(es.student_id AS CHAR) = CAST(si.id AS CHAR)
            )
            WHERE es.status = 'active'
        `;
        
        const queryParams = [];
        
// FIXED: Program filter condition - removed extra checks
if (program && program.trim() !== '') {
    console.log('🔍 BACKEND: Applying program filter:', program);
    query += ' AND es.program = ?';
    queryParams.push(program.trim());
}

// FIXED: Year Level filter condition  
if (yearLevel && yearLevel.trim() !== '') {
    console.log('🔍 BACKEND: Applying year level filter:', yearLevel);
    query += ' AND es.year_level = ?';
    queryParams.push(yearLevel.trim());
}

// FIXED: Semester filter condition
if (semester && semester.trim() !== '') {
    console.log('🔍 BACKEND: Applying semester filter:', semester);
    query += ' AND es.semester = ?';
    queryParams.push(semester.trim());
}

        
        if (search && search.trim() !== '') {
            query += ` AND (
                si.first_name LIKE ? OR 
                si.last_name LIKE ? OR 
                si.display_name LIKE ? OR 
                si.email LIKE ? OR 
                CAST(es.student_id AS CHAR) LIKE ?
            )`;
            const searchTerm = `%${search.trim()}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
        }
        
        query += ' ORDER BY es.program, es.year_level, si.last_name, si.first_name';
        
        console.log('🔍 Executing query:', query);
        console.log('🔍 With params:', queryParams);
        
        const [results] = await db.execute(query, queryParams);
        
        console.log('📊 Found students for grading:', results.length);
        
        // Process each student's subjects properly
        const formattedResults = results.map(student => {
            let subjectsParsed = [];
            let subjectsCount = 0;
            
            console.log('📚 Processing subjects for student:', student.student_id);
            
            try {
                if (student.subjects && student.subjects.trim() !== '' && student.subjects !== 'null') {
                    let parsedData;
                    
                    // Handle both array and object formats
                    if (student.subjects.startsWith('[')) {
                        parsedData = JSON.parse(student.subjects);
                    } else if (student.subjects.startsWith('{')) {
                        const objectData = JSON.parse(student.subjects);
                        parsedData = Object.values(objectData);
                    } else {
                        console.warn('⚠️ Unexpected subjects format:', student.subjects);
                        parsedData = [];
                    }
                    
                    if (Array.isArray(parsedData)) {
                        subjectsParsed = parsedData.filter(subject => 
                            subject && (subject.subject_code || subject.code || subject.description)
                        ).map(subject => ({
                            subject_code: subject.code || subject.subject_code || 'UNKNOWN',
                            subject_name: subject.description || subject.subject_name || subject.name || 'Unknown Subject',
                            units: parseInt(subject.units) || 3,
                            section: subject.section || 'A',
                            schedule: (subject.day && subject.time) ? `${subject.day} ${subject.time}` : 'TBA',
                            prerequisite: subject.prereq || subject.prerequisite || 'None',
                            instructor: subject.instructor || 'TBA',
                            room: subject.room || 'TBA',
                            day: subject.day || 'TBA',
                            time: subject.time || 'TBA'
                        }));
                    }
                    
                    subjectsCount = subjectsParsed.length;
                    console.log('✅ Processed', subjectsCount, 'subjects for student:', student.student_id);
                }
            } catch (error) {
                console.error('❌ Error parsing subjects for student:', student.student_id, error);
                console.error('❌ Raw subjects data:', student.subjects);
                subjectsParsed = [];
                subjectsCount = 0;
            }
            
            return {
                ...student,
                subjects_parsed: subjectsParsed,
                subjects_count: subjectsCount,
                has_grades: student.grades_count > 0
            };
        });
        
        console.log('✅ Returning', formattedResults.length, 'formatted students');
        
        res.json({
            success: true,
            data: formattedResults,
            total: formattedResults.length
        });
        
    } catch (error) {
        console.error('❌ Error fetching students for grading:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// ADD THIS NEW ROUTE - Get grading statistics  
router.get('/grading/stats', async (req, res) => {
    try {
        console.log('📊 Fetching grading statistics...');
        
        const statsQuery = `
            SELECT 
                COUNT(DISTINCT es.student_id) as totalStudents,
                COUNT(DISTINCT es.program) as totalPrograms,
                COUNT(DISTINCT CONCAT(es.program, '-', es.year_level, '-', es.semester)) as activeClasses,
                COUNT(DISTINCT CASE WHEN sg.student_id IS NULL THEN es.student_id END) as pendingGrades
            FROM enrolled_students es
            LEFT JOIN students_grades sg ON es.student_id = sg.student_id
            WHERE es.status = 'active'
        `;
        
        const [results] = await db.execute(statsQuery);
        const stats = results[0];
        
        res.json({
            success: true,
            stats: {
                totalStudents: parseInt(stats.totalStudents) || 0,
                totalPrograms: parseInt(stats.totalPrograms) || 0,
                activeClasses: parseInt(stats.activeClasses) || 0,
                pendingGrades: parseInt(stats.pendingGrades) || 0
            }
        });
        
    } catch (error) {
        console.error('❌ Error fetching grading statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// NEW ROUTE: Get specific enrollment by enrolled_id (for grading modal)
router.get('/enrolled-students/enrollment/:enrolledId', async (req, res) => {
    try {
        const { enrolledId } = req.params;
        console.log('📋 Fetching specific enrollment record:', enrolledId);
        
        const query = `
            SELECT 
                es.*,
                COALESCE(si.display_name, CONCAT(COALESCE(si.first_name, ''), ' ', COALESCE(si.last_name, '')), CONCAT('Student-', es.student_id)) as student_name,
                si.email as student_email
            FROM enrolled_students es
            LEFT JOIN student_info si ON CAST(es.student_id AS CHAR) = CAST(si.student_id AS CHAR)
            WHERE es.id = ? AND es.status = 'active'
        `;
        
        const [results] = await db.execute(query, [enrolledId]);
        
        if (results.length === 0) {
            return res.json({ 
                success: false, 
                message: 'Enrollment record not found',
                data: null 
            });
        }
        
        const enrollment = results[0];
        
        // Parse subjects for this specific enrollment
        let subjectsParsed = [];
        try {
            if (enrollment.subjects && enrollment.subjects.trim() !== '') {
                let parsedData = JSON.parse(enrollment.subjects);
                if (!Array.isArray(parsedData)) {
                    parsedData = Object.values(parsedData);
                }
                
                subjectsParsed = parsedData.filter(subject => 
                    subject && (subject.subject_code || subject.code || subject.description)
                ).map(subject => ({
                    subject_code: subject.code || subject.subject_code || 'UNKNOWN',
                    subject_name: subject.description || subject.subject_name || subject.name || 'Unknown Subject',
                    units: parseInt(subject.units) || 3,
                    section: subject.section || 'A',
                    instructor: subject.instructor || 'TBA',
                    room: subject.room || 'TBA',
                    schedule: (subject.day && subject.time) ? `${subject.day} ${subject.time}` : 'TBA',
                    prerequisite: subject.prereq || subject.prerequisite || 'None'
                }));
            }
        } catch (error) {
            console.error('❌ Error parsing subjects for enrollment:', enrolledId, error);
        }
        
        const formattedEnrollment = {
            ...enrollment,
            subjects_parsed: subjectsParsed,
            subjects_count: subjectsParsed.length
        };
        
        console.log('✅ Returning enrollment record:', {
            enrolledId: formattedEnrollment.id,
            semester: formattedEnrollment.semester,
            subjectsCount: formattedEnrollment.subjects_count
        });
        
        res.json({
            success: true,
            data: formattedEnrollment
        });
        
    } catch (error) {
        console.error('❌ Error fetching enrollment record:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
            data: null
        });
    }
});

// NEW ROUTE: Get grades for specific enrollment (semester-specific)
router.get('/grades/student/:studentId/enrollment/:enrolledId', async (req, res) => {
    try {
        const { studentId, enrolledId } = req.params;
        console.log('📊 Fetching grades for student:', studentId, 'enrollment:', enrolledId);
        
        const query = `
            SELECT sg.*
            FROM students_grades sg
            WHERE sg.student_id = ? AND sg.enrolled_student_id = ?
            ORDER BY sg.subject_code
        `;
        
        const [results] = await db.execute(query, [studentId, enrolledId]);
        
        console.log('📊 Found semester-specific grades:', results.length);
        
        res.json({
            success: true,
            data: results
        });
        
    } catch (error) {
        console.error('❌ Error fetching enrollment-specific grades:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});


// POST/PUT save or update grades for a student - WITH NOTIFICATION
router.post('/grades/save', async (req, res) => {
    try {
        const { studentId, enrolledStudentId, grades, facultyId } = req.body;
        
        console.log('💾 Saving grades for student:', studentId);
        console.log('📊 Grades data:', grades);
        
        if (!studentId || !enrolledStudentId || !grades || !Array.isArray(grades)) {
            return res.status(400).json({
                success: false,
                message: 'Missing required data: studentId, enrolledStudentId, and grades array'
            });
        }
        
        // Get student enrollment info
        const [enrollmentInfo] = await db.execute(
            `SELECT es.semester, es.academic_year, es.program, es.year_level,
                    COALESCE(si.display_name, CONCAT(COALESCE(si.first_name, ''), ' ', COALESCE(si.last_name, '')), CONCAT('Student-', es.student_id)) as student_name,
                    si.id as user_id
             FROM enrolled_students es
             LEFT JOIN student_info si ON CAST(es.student_id AS CHAR) = CAST(si.student_id AS CHAR)
             WHERE es.id = ?`,
            [enrolledStudentId]
        );
        
        if (enrollmentInfo.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Enrolled student record not found'
            });
        }
        
        const { semester, academic_year, program, year_level, student_name, user_id } = enrollmentInfo[0];
        
        // Get faculty name for notification
        let facultyName = 'Faculty';
        if (facultyId) {
            try {
                const [facultyInfo] = await db.execute(
                    'SELECT first_name, last_name FROM users WHERE id = ?',
                    [facultyId]
                );
                if (facultyInfo.length > 0) {
                    facultyName = `${facultyInfo[0].first_name} ${facultyInfo[0].last_name}`;
                }
            } catch (err) {
                console.warn('Could not fetch faculty name:', err);
            }
        }
        
        const savedGrades = [];
        const errors = [];
        
        for (const gradeData of grades) {
            try {
                const {
                    subject_code,
                    subject_name,
                    prelim_grade,
                    midterm_grade,
                    final_grade
                } = gradeData;
                
                // Calculate total grade with new 3-part system (33%, 33%, 34%)
                const gradesArray = [prelim_grade, midterm_grade, final_grade]
                    .filter(g => g !== null && g !== undefined && g !== '');
                
                let total_grade = null;
                let letter_grade = null;
                let remarks = 'INCOMPLETE';
                
                if (gradesArray.length === 3) {
                    const prelimNum = parseFloat(prelim_grade);
                    const midtermNum = parseFloat(midterm_grade);
                    const finalNum = parseFloat(final_grade);
                    
                    // Weighted calculation: Prelim 33%, Midterm 33%, Final 34%
                    total_grade = (prelimNum * 0.33) + (midtermNum * 0.33) + (finalNum * 0.34);
                    
                    // 1.00-5.00 grading system (1.00 = highest grade)
                    if (total_grade >= 97) { letter_grade = '1.00'; remarks = 'PASSED'; }
                    else if (total_grade >= 94) { letter_grade = '1.25'; remarks = 'PASSED'; }
                    else if (total_grade >= 91) { letter_grade = '1.50'; remarks = 'PASSED'; }
                    else if (total_grade >= 88) { letter_grade = '1.75'; remarks = 'PASSED'; }
                    else if (total_grade >= 85) { letter_grade = '2.00'; remarks = 'PASSED'; }
                    else if (total_grade >= 82) { letter_grade = '2.25'; remarks = 'PASSED'; }
                    else if (total_grade >= 79) { letter_grade = '2.50'; remarks = 'PASSED'; }
                    else if (total_grade >= 76) { letter_grade = '2.75'; remarks = 'PASSED'; }
                    else if (total_grade >= 75) { letter_grade = '3.00'; remarks = 'PASSED'; }
                    else if (total_grade >= 70) { letter_grade = '4.00'; remarks = 'CONDITIONAL'; }
                    else { letter_grade = '5.00'; remarks = 'FAILED'; }
                }

                const upsertQuery = `
                    INSERT INTO students_grades 
                    (enrolled_student_id, student_id, subject_code, subject_name, semester, academic_year,
                     prelim_grade, midterm_grade, final_grade, 
                     total_grade, letter_grade, remarks, faculty_id, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                    ON DUPLICATE KEY UPDATE
                    prelim_grade = VALUES(prelim_grade),
                    midterm_grade = VALUES(midterm_grade),
                    final_grade = VALUES(final_grade),
                    total_grade = VALUES(total_grade),
                    letter_grade = VALUES(letter_grade),
                    remarks = VALUES(remarks),
                    faculty_id = VALUES(faculty_id),
                    updated_at = NOW()
                `;
                
                const [result] = await db.execute(upsertQuery, [
                    enrolledStudentId, studentId, subject_code, subject_name, semester, academic_year,
                    prelim_grade || null, midterm_grade || null, final_grade || null,
                    total_grade, letter_grade, remarks, facultyId || null
                ]);
                
                savedGrades.push({
                    subject_code,
                    subject_name,
                    grades: { prelim_grade, midterm_grade, final_grade },
                    total_grade,
                    letter_grade,
                    remarks,
                    saved: true
                });
                
            } catch (error) {
                console.error('❌ Error saving grade for subject:', gradeData.subject_code, error);
                errors.push({
                    subject_code: gradeData.subject_code,
                    error: error.message
                });
            }
        }
        
        console.log('✅ Grades saved successfully:', savedGrades.length);
        
        // SEND NOTIFICATION TO STUDENT if grades were saved successfully
if (savedGrades.length > 0) {
    try {
        // Try multiple strategies to find the correct user_id for notification
        let notificationUserId = user_id; // From the enrollment query
        
        if (!notificationUserId) {
            // Fallback: try to find user by student_id
            const [userLookup] = await db.execute(
                'SELECT id FROM users WHERE id = ? OR username = ?',
                [studentId, studentId]
            );
            
            if (userLookup.length > 0) {
                notificationUserId = parseInt(userLookup[0].id);
            }
        }
        
        if (notificationUserId) {
            const courseName = `${program} - ${year_level}`;
            
            await NotificationService.createGradesNotification(
                notificationUserId,
                courseName,
                semester,
                facultyName
            );
            
            console.log('📧 Grades notification sent successfully to user:', notificationUserId);
        } else {
            console.warn('⚠️ Could not determine user_id for grades notification. Student ID:', studentId);
            
            // Debug information
            console.log('🔍 Debug - Available data:', {
                studentId,
                enrolledStudentId,
                user_id_from_query: user_id,
                student_name
            });
        }
    } catch (notificationError) {
        console.error('❌ Error sending grades notification:', notificationError);
        // Don't fail the grade saving if notification fails
    }
}
        
        res.json({
            success: true,
            message: `Grades saved: ${savedGrades.length} successful${errors.length > 0 ? `, ${errors.length} errors` : ''}`,
            savedGrades,
            errors: errors.length > 0 ? errors : undefined
        });
        
    } catch (error) {
        console.error('❌ Error saving grades:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});


// GET grades for a specific student and semester
router.get('/grades/student/:studentId/semester/:semester', async (req, res) => {
    try {
        const { studentId, semester } = req.params;
        
        console.log('📊 Fetching grades for student:', studentId, 'semester:', semester);
        
        const query = `
            SELECT * FROM students_grades 
            WHERE student_id = ? AND semester = ?
            ORDER BY subject_code
        `;
        
        const [results] = await db.execute(query, [studentId, semester]);
        
        res.json({
            success: true,
            data: results
        });
        
    } catch (error) {
        console.error('❌ Error fetching semester grades:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// FIXED: Remove duplicate route and fix the stats calculation
router.get('/grading/stats', async (req, res) => {
    try {
        console.log('📊 Fetching grading statistics...');
        
        // FIXED: Separate queries for more accurate counts
        const [totalStudentsResult] = await db.execute(`
            SELECT COUNT(DISTINCT student_id) as count 
            FROM enrolled_students 
            WHERE status = 'active'
        `);
        
        const [totalProgramsResult] = await db.execute(`
            SELECT COUNT(DISTINCT program) as count 
            FROM enrolled_students 
            WHERE status = 'active'
        `);
        
        const [activeClassesResult] = await db.execute(`
            SELECT COUNT(DISTINCT CONCAT(program, '-', year_level, '-', semester)) as count 
            FROM enrolled_students 
            WHERE status = 'active'
        `);
        
        const [pendingGradesResult] = await db.execute(`
            SELECT COUNT(DISTINCT es.student_id) as count
            FROM enrolled_students es
            LEFT JOIN students_grades sg ON es.student_id = sg.student_id
            WHERE es.status = 'active' AND sg.student_id IS NULL
        `);
        
        const stats = {
            totalStudents: parseInt(totalStudentsResult[0].count) || 0,
            totalPrograms: parseInt(totalProgramsResult[0].count) || 0,
            activeClasses: parseInt(activeClassesResult[0].count) || 0,
            pendingGrades: parseInt(pendingGradesResult[0].count) || 0
        };
        
        console.log('📊 Fixed stats:', stats);
        
        res.json({
            success: true,
            stats
        });
        
    } catch (error) {
        console.error('❌ Error fetching grading stats:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});


// ENSURE this route exists in routes/enrollment.js
router.get('/grades/student/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        
        console.log('📊 Fetching grades for student:', studentId);
        
        // FIXED: Better query to handle student ID resolution
        let gradesQuery = `
            SELECT 
                sg.*,
                es.program,
                es.year_level,
                es.semester as enrolled_semester
            FROM students_grades sg
            LEFT JOIN enrolled_students es ON sg.enrolled_student_id = es.id
            WHERE sg.student_id = ?
            ORDER BY sg.semester, sg.subject_code
        `;
        
        let [results] = await db.execute(gradesQuery, [studentId]);
        
        // If no results and studentId looks like user ID, try to resolve
        if (results.length === 0 && !studentId.includes('-')) {
            console.log('🔄 Trying user ID resolution for grades...');
            
            const [studentInfo] = await db.execute(
                'SELECT student_id FROM student_info WHERE id = ?',
                [studentId]
            );
            
            if (studentInfo.length > 0) {
                const actualStudentId = studentInfo[0].student_id;
                console.log('✅ Resolved to actual student_id for grades:', actualStudentId);
                [results] = await db.execute(gradesQuery, [actualStudentId]);
            }
        }
        
        console.log('📊 Found grades:', results.length);
        
        res.json({
            success: true,
            data: results
        });
        
    } catch (error) {
        console.error('❌ Error fetching student grades:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// NEW ROUTE: Get all historical enrollments for a student (for grade history)
router.get('/student-history/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        console.log('📚 Fetching student enrollment history for:', studentId);
        
        const query = `
            SELECT 
                es.*,
                COALESCE(si.display_name, CONCAT(COALESCE(si.first_name, ''), ' ', COALESCE(si.last_name, '')), CONCAT('Student-', es.student_id)) as student_name,
                si.email as student_email
            FROM enrolled_students es
            LEFT JOIN student_info si ON CAST(es.student_id AS CHAR) = CAST(si.student_id AS CHAR)
            WHERE CAST(es.student_id AS CHAR) = CAST(? AS CHAR)
            ORDER BY es.created_at DESC
        `;
        
        const [results] = await db.execute(query, [studentId]);
        
        console.log('📋 Found', results.length, 'historical enrollment records');
        
        // Process subjects for each enrollment
        const processedResults = results.map(enrollment => {
            let subjectsParsed = [];
            
            try {
                if (enrollment.subjects && enrollment.subjects.trim() !== '') {
                    let parsedData = JSON.parse(enrollment.subjects);
                    if (!Array.isArray(parsedData)) {
                        parsedData = Object.values(parsedData);
                    }
                    
                    subjectsParsed = parsedData.filter(subject => 
                        subject && (subject.subject_code || subject.code || subject.description)
                    ).map(subject => ({
                        subject_code: subject.code || subject.subject_code || 'UNKNOWN',
                        subject_name: subject.description || subject.subject_name || subject.name || 'Unknown Subject',
                        units: parseInt(subject.units) || 3,
                        section: subject.section || 'A',
                        instructor: subject.instructor || 'TBA',
                        room: subject.room || 'TBA',
                        schedule: (subject.day && subject.time) ? `${subject.day} ${subject.time}` : 'TBA',
                        prerequisite: subject.prereq || subject.prerequisite || 'None'
                    }));
                }
            } catch (error) {
                console.error('❌ Error parsing subjects for enrollment:', enrollment.id, error);
            }
            
            return {
                ...enrollment,
                subjects_parsed: subjectsParsed
            };
        });
        
        res.json({
            success: true,
            data: processedResults
        });
        
    } catch (error) {
        console.error('❌ Error fetching student history:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// REPLACE the existing router.get('/enrolled-students/student/:studentId') route with this:
router.get('/enrolled-students/student/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        console.log('📋 FIXED: Fetching enrolled student with enrichment for:', studentId);
        
        const query = `
            SELECT 
                es.*,
                COALESCE(si.display_name, CONCAT(COALESCE(si.first_name, ''), ' ', COALESCE(si.last_name, '')), CONCAT('Student-', es.student_id)) as student_name,
                si.email as student_email
            FROM enrolled_students es
            LEFT JOIN student_info si ON CAST(es.student_id AS CHAR) = CAST(si.student_id AS CHAR)
            WHERE es.status = 'active' AND CAST(es.student_id AS CHAR) = CAST(? AS CHAR)
            ORDER BY es.created_at DESC LIMIT 1
        `;
        
        const [results] = await db.execute(query, [studentId]);
        
        if (results.length === 0) {
            return res.json({ success: false, message: 'No enrolled student record found', data: [] });
        }
        
        const student = results[0];
        let subjectsParsed = [];
        
        try {
    if (student.subjects && student.subjects.trim() !== '') {
        console.log('📚 Processing and ENRICHING subjects for student:', student.student_id);
        console.log('📊 Student academic info:', {
            program: student.program,
            year_level: student.year_level,
            semester: student.semester
        });
        
        let parsedData = JSON.parse(student.subjects);
        if (!Array.isArray(parsedData)) {
            parsedData = Object.values(parsedData);
        }
        
        // CRITICAL: Debug the raw parsed data before enrichment
        console.log('🧪 DEBUG: Raw parsed subjects before enrichment:', parsedData.length, 'items');
        if (parsedData.length > 0) {
            console.log('🧪 First subject before enrichment:', {
                code: parsedData[0].code || parsedData[0].subject_code,
                instructor: parsedData[0].instructor,
                room: parsedData[0].room
            });
        }
        
        // ENHANCED: Call enrichment function with proper error handling
        console.log('🔍 CALLING enrichSubjectsWithCurriculumData...');
        const enrichedSubjects = await enrichSubjectsWithCurriculumData(
            parsedData,
            student.program,
            student.year_level,
            student.semester
        );
        
        console.log('✅ ENRICHMENT RETURNED:', enrichedSubjects.length, 'subjects');
        if (enrichedSubjects.length > 0) {
            console.log('🎯 FIRST ENRICHED SUBJECT:', {
                code: enrichedSubjects[0].code || enrichedSubjects[0].subject_code,
                instructor: enrichedSubjects[0].instructor,
                room: enrichedSubjects[0].room,
                wasEnriched: enrichedSubjects[0].instructor !== 'TBA' || enrichedSubjects[0].room !== 'TBA'
            });
        }
        
        // Map to final format with validation
        subjectsParsed = enrichedSubjects.filter(subject => 
            subject && (subject.subject_code || subject.code)
        ).map(subject => ({
            subject_code: subject.code || subject.subject_code,
            subject_name: subject.description || subject.subject_name || 'Unknown',
            units: parseInt(subject.units) || 3,
            section: subject.section || 'A',
            schedule: subject.schedule || 'TBA',
            prerequisite: subject.prerequisite || subject.prereq || 'None',
            instructor: subject.instructor || 'TBA', // This should now have enriched data
            room: subject.room || 'TBA',             // This should now have enriched data
            day: subject.day || 'TBA',
            time: subject.time || 'TBA'
        }));
        
        console.log('✅ FINAL subjects_parsed with enriched data:', subjectsParsed.length);
        console.log('📊 ENRICHMENT VERIFICATION:');
        const enrichedSubjectsCount = subjectsParsed.filter(s => s.instructor !== 'TBA' || s.room !== 'TBA').length;
        console.log(`   - ${enrichedSubjectsCount}/${subjectsParsed.length} subjects have enriched instructor/room data`);
    }
} catch (error) {
    console.error('❌ Error in subject processing and enrichment:', error);
    console.error('❌ Error details:', error.message);
    subjectsParsed = [];
}
        
        const formattedStudent = {
            ...student,
            subjects_parsed: subjectsParsed,  // Contains enriched instructor/room data
            subjects_count: subjectsParsed.length
        };
        
        res.json({
            success: true,
            data: [formattedStudent]
        });
        
    } catch (error) {
        console.error('❌ Error in enrolled student route:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error', 
            error: error.message 
        });
    }
});

// ADD this debug route at the end of routes/enrollment.js (before export default router;)
router.get('/debug-curriculum/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        console.log('🧪 DEBUG: Testing curriculum lookup for student:', studentId);
        
        // Get student info
        const [studentInfo] = await db.execute(`
            SELECT es.program, es.year_level, es.semester 
            FROM enrolled_students es 
            WHERE es.student_id = ? LIMIT 1
        `, [studentId]);
        
        if (studentInfo.length === 0) {
            return res.json({ success: false, message: 'Student not found' });
        }
        
        const { program, year_level, semester } = studentInfo[0];
        console.log('📊 Student academic info:', { program, year_level, semester });
        
        // Test curriculum queries for each subject
        const testSubjects = ['GE 01', 'GE 02', 'IT 101', 'IT 102', 'PE 01'];
        const results = [];
        
        for (const subjectCode of testSubjects) {
            console.log(`🔍 Testing lookup for subject: ${subjectCode}`);
            
            const [curriculumData] = await db.execute(`
                SELECT subject_code, instructor, room, schedule, program_id, year_level, semester
                FROM curriculum 
                WHERE subject_code = ? AND program_id = ? AND year_level = ? AND semester = ?
            `, [subjectCode, program, year_level, semester]);
            
            results.push({
                subject_code: subjectCode,
                query_params: { program, year_level, semester },
                found: curriculumData.length > 0,
                data: curriculumData.length > 0 ? curriculumData[0] : null,
                raw_query_result: curriculumData
            });
            
            console.log(`📋 Result for ${subjectCode}:`, {
                found: curriculumData.length > 0,
                instructor: curriculumData[0]?.instructor || 'NOT FOUND',
                room: curriculumData[0]?.room || 'NOT FOUND'
            });
        }
        
        // Also test what's available in curriculum table
        const [availableData] = await db.execute(`
            SELECT DISTINCT program_id, year_level, semester, COUNT(*) as subject_count
            FROM curriculum 
            GROUP BY program_id, year_level, semester
            ORDER BY program_id, year_level, semester
        `);
        
        res.json({
            success: true,
            student_info: { program, year_level, semester },
            test_results: results,
            available_combinations: availableData,
            debug_info: {
                total_curriculum_records: availableData.reduce((sum, item) => sum + item.subject_count, 0),
                matching_program: availableData.filter(item => item.program_id === program),
            }
        });
        
    } catch (error) {
        console.error('❌ Debug curriculum error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ADD this route to test curriculum data access:
router.get('/test-simple-curriculum', async (req, res) => {
    try {
        console.log('🧪 Testing simple curriculum access...');
        
        const [allData] = await db.execute(`
            SELECT subject_code, instructor, room, program_id, year_level, semester
            FROM curriculum 
            LIMIT 10
        `);
        
        console.log('📊 Sample curriculum data:', allData);
        
        res.json({
            success: true,
            total_records: allData.length,
            sample_data: allData
        });
        
    } catch (error) {
        console.error('❌ Curriculum test error:', error);
        res.json({
            success: false,
            error: error.message
        });
    }
});


export default router;