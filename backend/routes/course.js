// File: routes/course.js
// Description: Enhanced Course Management Routes with better debugging and data validation

import express from 'express';
import db from '../config/database.js';

const router = express.Router();

// Enhanced error logging middleware
router.use((req, res, next) => {
    console.log(`📡 Course API: ${req.method} ${req.originalUrl}`, {
        query: req.query,
        body: req.method !== 'GET' ? req.body : undefined,
        timestamp: new Date().toISOString()
    });
    next();
});

// ===== PROGRAM MANAGEMENT ROUTES =====

// GET /api/programs - Fetch all programs with enhanced debugging
router.get('/programs', async (req, res) => {
    try {
        console.log('📚 Fetching all programs from database...');
        
        const query = 'SELECT * FROM programs ORDER BY created_at DESC';
        console.log('📝 Executing query:', query);
        
        const [programs] = await db.execute(query);
        console.log('📊 Query results:', {
            rowCount: programs.length,
            sampleData: programs.length > 0 ? programs[0] : null
        });
        
        // Enhanced logging for each program
        if (programs.length > 0) {
            console.log('📋 Programs found:');
            programs.forEach((program, index) => {
                console.log(`  ${index + 1}. ID: ${program.id}, Name: "${program.program_name}", Created: ${program.created_at}`);
            });
        } else {
            console.log('⚠️ No programs found in database');
        }
        
        res.status(200).json({
            success: true,
            data: programs,
            meta: {
                count: programs.length,
                query: query,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('❌ Error fetching programs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch programs',
            error: {
                message: error.message,
                code: error.code,
                errno: error.errno
            }
        });
    }
});

// ===== CURRICULUM MANAGEMENT ROUTES =====



// Enhanced debugging route with comprehensive data analysis
router.get('/curriculum/debug', async (req, res) => {
    try {
        console.log('🧪 Debug curriculum endpoint called');
        
        // Get all curriculum data without filters
        const [allCurriculum] = await db.execute(`
            SELECT c.*, p.program_name 
            FROM curriculum c 
            JOIN programs p ON c.program_id = p.id 
            ORDER BY c.program_id, c.year_level, c.semester, c.subject_code
        `);
        
        // Get all programs for reference
        const [allPrograms] = await db.execute('SELECT * FROM programs ORDER BY id');
        
        // Analyze the data structure
        const analysis = {
            total_programs: allPrograms.length,
            total_curriculum_records: allCurriculum.length,
            programs: allPrograms.map(p => {
                const programCurriculum = allCurriculum.filter(c => c.program_id === p.id);
                return {
                    id: p.id,
                    name: p.program_name,
                    curriculum_count: programCurriculum.length,
                    year_levels: [...new Set(programCurriculum.map(c => c.year_level))],
                    semesters: [...new Set(programCurriculum.map(c => c.semester))]
                };
            }),
            data_quality: {
                unique_year_levels: [...new Set(allCurriculum.map(c => c.year_level))],
                unique_semesters: [...new Set(allCurriculum.map(c => c.semester))],
                records_with_missing_data: allCurriculum.filter(c => 
                    !c.subject_code || !c.subject_name || !c.units
                ).length
            }
        };
        
        console.log('📊 Comprehensive analysis:', analysis);
        
        res.json({
            success: true,
            analysis: analysis,
            sample_data: allCurriculum.slice(0, 10),
            suggested_queries: allPrograms.length > 0 ? [
                `/api/curriculum?program_id=${allPrograms[0].id}`,
                `/api/curriculum?program_id=${allPrograms[0].id}&year_level=1st Year`,
                `/api/curriculum?program_id=${allPrograms[0].id}&year_level=1st Year&semester=1st Term`
            ] : [],
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error in debug endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Debug endpoint failed',
            error: error.message
        });
    }
});

// ADD this debug route to your course.js file (add it anywhere in the file)
router.get('/curriculum/debug-data', async (req, res) => {
    try {
        console.log('🔍 Debug: Checking actual curriculum data...');
        
        // Get all unique program_ids in curriculum
        const [programIds] = await db.execute(`
            SELECT DISTINCT program_id, COUNT(*) as count 
            FROM curriculum 
            GROUP BY program_id 
            ORDER BY program_id
        `);
        
        // Get all unique year_level and semester combinations
        const [yearSemester] = await db.execute(`
            SELECT DISTINCT 
                year_level, 
                semester, 
                COUNT(*) as count,
                CONCAT('"', year_level, '"') as year_level_quoted,
                CONCAT('"', semester, '"') as semester_quoted,
                LENGTH(year_level) as year_level_length,
                LENGTH(semester) as semester_length
            FROM curriculum 
            GROUP BY year_level, semester 
            ORDER BY year_level, semester
        `);
        
        // Get sample data for each program_id
        const [sampleData] = await db.execute(`
            SELECT program_id, year_level, semester, subject_code, subject_name, units
            FROM curriculum 
            ORDER BY program_id, year_level, semester
            LIMIT 20
        `);
        
        const analysis = {
            available_program_ids: programIds,
            available_year_semester_combinations: yearSemester,
            sample_curriculum_data: sampleData,
            total_curriculum_records: await db.execute('SELECT COUNT(*) as total FROM curriculum')
        };
        
        console.log('📊 Database Analysis:', analysis);
        
        res.json({
            success: true,
            analysis: analysis,
            recommendations: {
                mapping_suggestion: `Based on the data, update your programMapping in course.js`,
                search_for: "1st Year / 1st Term",
                available: yearSemester.map(ys => `${ys.year_level} / ${ys.semester}`)
            }
        });
        
    } catch (error) {
        console.error('❌ Debug route error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Enhanced programs debug endpoint
router.get('/programs/debug', async (req, res) => {
    try {
        console.log('🧪 Debug programs endpoint called');
        
        const [programs] = await db.execute('SELECT * FROM programs ORDER BY id');
        
        // Get curriculum count for each program
        const programsWithStats = await Promise.all(programs.map(async (program) => {
            const [curriculumCount] = await db.execute(
                'SELECT COUNT(*) as count FROM curriculum WHERE program_id = ?', 
                [program.id]
            );
            return {
                ...program,
                curriculum_count: curriculumCount[0].count
            };
        }));
        
        console.log('📊 Programs analysis:', {
            total_programs: programs.length,
            programs_with_curriculum: programsWithStats.filter(p => p.curriculum_count > 0).length
        });
        
        res.json({
            success: true,
            analysis: {
                total_programs: programs.length,
                programs_with_curriculum: programsWithStats.filter(p => p.curriculum_count > 0).length,
                programs_without_curriculum: programsWithStats.filter(p => p.curriculum_count === 0).length
            },
            programs: programsWithStats,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error in programs debug endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Programs debug endpoint failed',
            error: error.message
        });
    }
});

// Add this route to check exact database values
router.get('/curriculum/check-values/:program_id', async (req, res) => {
    try {
        const { program_id } = req.params;
        
        const [results] = await db.execute(`
            SELECT 
                id,
                CONCAT('"', year_level, '"') as year_level_quoted,
                CONCAT('"', semester, '"') as semester_quoted,
                year_level,
                semester,
                subject_code,
                subject_name,
                LENGTH(year_level) as year_level_length,
                LENGTH(semester) as semester_length,
                ASCII(SUBSTRING(year_level, 1, 1)) as first_char_ascii,
                ASCII(SUBSTRING(semester, 1, 1)) as semester_first_char_ascii
            FROM curriculum 
            WHERE program_id = ?
            ORDER BY year_level, semester
        `, [program_id]);
        
        res.json({
            success: true,
            program_id: program_id,
            total_records: results.length,
            data: results,
            unique_combinations: [...new Set(results.map(r => `${r.year_level}|${r.semester}`))],
            debug_info: {
                searching_for: "1st Year|1st Term",
                available: results.map(r => `${r.year_level}|${r.semester}`)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add this route to check program-curriculum ID relationship
router.get('/debug/program-curriculum-mismatch', async (req, res) => {
    try {
        console.log('🔍 Checking program-curriculum ID mismatch...');
        
        // Get all programs
        const [programs] = await db.execute('SELECT * FROM programs ORDER BY id');
        
        // Get all curriculum with counts by program_id
        const [curriculumStats] = await db.execute(`
            SELECT 
                program_id,
                COUNT(*) as curriculum_count,
                GROUP_CONCAT(DISTINCT year_level) as year_levels,
                GROUP_CONCAT(DISTINCT semester) as semesters
            FROM curriculum 
            GROUP BY program_id
            ORDER BY program_id
        `);
        
        // Get sample curriculum data
        const [sampleCurriculum] = await db.execute(`
            SELECT program_id, year_level, semester, subject_code, subject_name
            FROM curriculum 
            ORDER BY program_id, year_level, semester 
            LIMIT 10
        `);
        
        const analysis = {
            programs: programs.map(p => ({
                id: p.id,
                name: p.program_name,
                description: p.description
            })),
            curriculum_by_program_id: curriculumStats,
            sample_curriculum: sampleCurriculum,
            mismatch_detected: programs.length > 0 && curriculumStats.length > 0 && 
                              !curriculumStats.some(c => programs.some(p => p.id === c.program_id))
        };
        
        console.log('📊 Program-Curriculum Analysis:', analysis);
        
        res.json({
            success: true,
            analysis: analysis,
            fix_suggestions: analysis.mismatch_detected ? [
                "1. Update curriculum.program_id to match programs.id",
                "2. Or update programs.id to match curriculum.program_id", 
                "3. Or create proper foreign key relationships"
            ] : ["No mismatch detected"],
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error checking program-curriculum mismatch:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check program-curriculum mismatch',
            error: error.message
        });
    }
});

// GET /api/curriculum/units-summary - Enhanced units calculation
router.get('/curriculum/units-summary', async (req, res) => {
    try {
        const { program_id } = req.query;

        if (!program_id) {
            return res.status(400).json({
                success: false,
                message: 'Program ID is required'
            });
        }

        console.log('📊 Loading units summary for program:', program_id);

        // Get the program info
        const [programInfo] = await db.execute('SELECT * FROM programs WHERE id = ?', [program_id]);
        if (programInfo.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Program not found'
            });
        }

        const program = programInfo[0];
        const programCode = program.program_name; // Use "BSIT", "BSCS", etc.

        const query = `
            SELECT 
                year_level, 
                semester, 
                COUNT(*) as subject_count,
                SUM(units) as total_units,
                GROUP_CONCAT(subject_code ORDER BY subject_code) as subjects
            FROM curriculum 
            WHERE program_id = ?
            GROUP BY year_level, semester 
            ORDER BY year_level, semester
        `;
        const [summary] = await db.execute(query, [programCode]);

        console.log('📈 Units summary calculated:', summary);

        res.status(200).json({
            success: true,
            data: summary,
            meta: {
                program_id: program_id,
                program_code: programCode,
                total_combinations: summary.length,
                grand_total_units: summary.reduce((sum, item) => sum + (item.total_units || 0), 0),
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('❌ Error fetching units summary:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch units summary',
            error: error.message
        });
    }
});

// ===== DATA MANAGEMENT ROUTES =====

// POST /api/curriculum - Add subject with enhanced validation
router.get('/curriculum', async (req, res) => {
    try {
        const { program_id, year_level, semester } = req.query;
        
        console.log('📚 Curriculum API called with params:', { 
            program_id, 
            year_level, 
            semester
        });

        if (!program_id) {
            return res.status(400).json({
                success: false,
                message: 'program_id parameter is required'
            });
        }

        // Get the program info
        const [programInfo] = await db.execute('SELECT * FROM programs WHERE id = ?', [program_id]);
        if (programInfo.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Program not found'
            });
        }

        const program = programInfo[0];
        console.log('🎯 Found program:', program);

        // FIXED: Use program.program_name (BSIT, BSCS, etc.) directly as string
        const programCode = program.program_name; // This is "BSIT", "BSCS", etc.
        console.log('🔄 Using program code for curriculum lookup:', programCode);

        // Build query with direct string matching
        let query = `
    SELECT c.id, c.program_id, c.year_level, c.semester, c.subject_code, 
           c.subject_name, c.units, c.section, c.prerequisite, c.schedule,
           c.instructor, c.room, c.created_at, c.updated_at,
           ? as program_name 
    FROM curriculum c 
    WHERE c.program_id = ?
`;
        let params = [program.description, programCode];

        // Add filters
        if (year_level) {
            query += ' AND TRIM(c.year_level) = TRIM(?)';
            params.push(year_level.trim());
            console.log('📅 Adding year_level filter:', year_level);
        }

        if (semester) {
            query += ' AND TRIM(c.semester) = TRIM(?)';
            params.push(semester.trim());
            console.log('📆 Adding semester filter:', semester);
        }

        query += ' ORDER BY c.subject_code';

        console.log('🔍 Final query:', query);
        console.log('📋 Final params:', params);

        const [curriculum] = await db.execute(query, params);

        console.log('📊 Query executed successfully:');
        console.log(`   - Found ${curriculum.length} curriculum records`);

        res.status(200).json({
            success: true,
            data: curriculum,
            meta: {
                query_info: {
                    program_id,
                    program_name: program.description,
                    program_code: programCode,
                    year_level, 
                    semester,
                    total_records: curriculum.length
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Error fetching curriculum:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch curriculum',
            error: {
                message: error.message,
                code: error.code,
                errno: error.errno
            }
        });
    }
});

// REPLACE the existing PUT /api/curriculum/:id route with this:
router.put('/curriculum/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            program_id, 
            year_level, 
            semester, 
            subject_code, 
            subject_name, 
            units, 
            section,
            prerequisite,
            schedule,
            instructor,
            room
        } = req.body;

        console.log('✏️ Editing subject ID:', id, 'with complete data:', {
            program_id, year_level, semester, subject_code, subject_name, units, section, prerequisite, schedule, instructor, room
        });

        // IMPROVED: More specific validation messages
        const missingFields = [];
        if (!program_id) missingFields.push('program_id');
        if (!year_level) missingFields.push('year_level');  
        if (!semester) missingFields.push('semester');
        if (!subject_code) missingFields.push('subject_code');
        if (!subject_name) missingFields.push('subject_name');
        if (!units) missingFields.push('units');

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(', ')}`,
                missing_fields: missingFields,
                received_data: req.body
            });
        }

        // Validate units is a number
        if (isNaN(units) || units <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Units must be a positive number'
            });
        }

        // Check if subject exists
        const checkQuery = 'SELECT id FROM curriculum WHERE id = ?';
        const [existing] = await db.execute(checkQuery, [id]);

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Subject not found'
            });
        }

        // Check for duplicate subject code (excluding current subject)
        const duplicateQuery = 'SELECT id FROM curriculum WHERE program_id = ? AND subject_code = ? AND year_level = ? AND semester = ? AND id != ?';
        const [duplicate] = await db.execute(duplicateQuery, [program_id, subject_code, year_level, semester, id]);

        if (duplicate.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Subject code already exists in this program for the same year and semester'
            });
        }

        // FIXED: Handle prerequisite properly (convert '-' to NULL)
        const cleanPrerequisite = prerequisite === '-' || prerequisite === '' ? null : prerequisite;

        // Update query with instructor and room
        const query = `
            UPDATE curriculum 
            SET program_id = ?, year_level = ?, semester = ?, subject_code = ?, 
                subject_name = ?, units = ?, section = ?, prerequisite = ?, 
                schedule = ?, instructor = ?, room = ?, updated_at = NOW() 
            WHERE id = ?
        `;
        
        await db.execute(query, [
            program_id, 
            year_level, 
            semester, 
            subject_code, 
            subject_name, 
            parseInt(units), 
            section || null,
            cleanPrerequisite,        // FIXED: Properly handle '-' and empty strings
            schedule || null,
            instructor || null,
            room || null,
            id
        ]);

        console.log('✅ Subject updated successfully');

        res.status(200).json({
            success: true,
            message: 'Subject updated successfully',
            updated_subject: {
                id: id,
                subject_code: subject_code,
                subject_name: subject_name,
                units: parseInt(units),
                instructor: instructor,
                room: room
            }
        });
    } catch (error) {
        console.error('❌ Error updating subject:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update subject',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// DELETE /api/curriculum/:id - Delete subject with enhanced validation
router.delete('/curriculum/:id', async (req, res) => {
    try {
        const { id } = req.params;

        console.log('🗑️ Deleting subject ID:', id);

        // Check if subject exists and get details for logging
        const checkQuery = 'SELECT * FROM curriculum WHERE id = ?';
        const [existing] = await db.execute(checkQuery, [id]);

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Subject not found'
            });
        }

        console.log('📋 Subject to delete:', existing[0]);

        const query = 'DELETE FROM curriculum WHERE id = ?';
        await db.execute(query, [id]);

        console.log('✅ Subject deleted successfully');

        res.status(200).json({
            success: true,
            message: 'Subject deleted successfully',
            deleted_subject: {
                id: existing[0].id,
                subject_code: existing[0].subject_code,
                subject_name: existing[0].subject_name
            }
        });
    } catch (error) {
        console.error('❌ Error deleting subject:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete subject',
            error: error.message
        });
    }
});

// ===== PROGRAM MANAGEMENT ROUTES =====

// POST /api/programs - Add new program with enhanced validation
router.post('/programs', async (req, res) => {
    try {
        const { program_name, description } = req.body;

        console.log('➕ Adding new program:', { program_name, description });

        // Input validation
        if (!program_name || !description) {
            return res.status(400).json({
                success: false,
                message: 'Program name and description are required'
            });
        }

        // Check if program already exists
        const checkQuery = 'SELECT id FROM programs WHERE program_name = ?';
        const [existing] = await db.execute(checkQuery, [program_name]);

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Program already exists'
            });
        }

        const query = `
            INSERT INTO programs (program_name, description, created_at, updated_at) 
            VALUES (?, ?, NOW(), NOW())
        `;
        const [result] = await db.execute(query, [program_name, description]);

        console.log('✅ Program added successfully with ID:', result.insertId);

        res.status(201).json({
            success: true,
            message: 'Program added successfully',
            data: {
                id: result.insertId,
                program_name,
                description
            }
        });
    } catch (error) {
        console.error('❌ Error adding program:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add program',
            error: error.message
        });
    }
});

// POST /api/curriculum - Add new subject to curriculum
router.post('/curriculum', async (req, res) => {
    try {
        const { 
            program_id, 
            year_level, 
            semester, 
            subject_code, 
            subject_name, 
            units, 
            section, 
            prerequisite, 
            schedule,
            instructor,
            room
        } = req.body;

        console.log('📝 Adding new subject:', {
            program_id, year_level, semester, subject_code, subject_name, units, instructor, room
        });

        // Enhanced input validation
        if (!program_id || !year_level || !semester || !subject_code || !subject_name || !units) {
            return res.status(400).json({
                success: false,
                message: 'Program ID, year level, semester, subject code, subject name, and units are required'
            });
        }

        // Validate units is a positive number
        if (isNaN(units) || units <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Units must be a positive number'
            });
        }

        // Get the program info to use program_name as the identifier
        const [programInfo] = await db.execute('SELECT * FROM programs WHERE id = ?', [program_id]);
        if (programInfo.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Program not found'
            });
        }

        const programCode = programInfo[0].program_name; // Use "BSIT", "BSCS", etc.

        // Check for duplicate subject code in the same program
        const duplicateQuery = `
            SELECT id FROM curriculum 
            WHERE program_id = ? AND subject_code = ? AND year_level = ? AND semester = ?
        `;
        const [duplicate] = await db.execute(duplicateQuery, [programCode, subject_code, year_level, semester]);

        if (duplicate.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Subject code already exists in this program for the selected year and semester'
            });
        }

        // Insert new subject with instructor and room
        const query = `
            INSERT INTO curriculum (
                program_id, year_level, semester, subject_code, subject_name, 
                units, section, prerequisite, schedule, instructor, room, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;
        
        const [result] = await db.execute(query, [
            programCode, // Use program code instead of program ID
            year_level,
            semester,
            subject_code,
            subject_name,
            units,
            section || null,
            prerequisite || null,
            schedule || null,
            instructor || null,
            room || null
        ]);

        console.log('✅ Subject added successfully with ID:', result.insertId);

        res.status(201).json({
            success: true,
            message: 'Subject added successfully',
            data: {
                id: result.insertId,
                subject_code,
                subject_name,
                units,
                instructor,
                room,
                program_code: programCode
            }
        });

    } catch (error) {
        console.error('❌ Error adding subject:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add subject',
            error: error.message
        });
    }
});

// PUT /api/programs/:id - Edit program
router.put('/programs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { program_name, description } = req.body;

        console.log('✏️ Editing program ID:', id, 'with data:', { program_name, description });

        // Input validation
        if (!program_name || !description) {
            return res.status(400).json({
                success: false,
                message: 'Program name and description are required'
            });
        }

        // Check if program exists
        const checkQuery = 'SELECT id FROM programs WHERE id = ?';
        const [existing] = await db.execute(checkQuery, [id]);

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Program not found'
            });
        }

        // Check for duplicate name (excluding current program)
        const duplicateQuery = 'SELECT id FROM programs WHERE program_name = ? AND id != ?';
        const [duplicate] = await db.execute(duplicateQuery, [program_name, id]);

        if (duplicate.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Program name already exists'
            });
        }

        const query = `
            UPDATE programs 
            SET program_name = ?, description = ?, updated_at = NOW() 
            WHERE id = ?
        `;
        await db.execute(query, [program_name, description, id]);

        console.log('✅ Program updated successfully');

        res.status(200).json({
            success: true,
            message: 'Program updated successfully'
        });
    } catch (error) {
        console.error('❌ Error updating program:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update program',
            error: error.message
        });
    }
});

// DELETE /api/programs/:id - Delete program
router.delete('/programs/:id', async (req, res) => {
    try {
        const { id } = req.params;

        console.log('🗑️ Deleting program ID:', id);

        // Check if program exists
        const checkQuery = 'SELECT * FROM programs WHERE id = ?';
        const [existing] = await db.execute(checkQuery, [id]);

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Program not found'
            });
        }

        console.log('📋 Program to delete:', existing[0]);

        // Check if program has associated curriculum
        const curriculumQuery = 'SELECT COUNT(*) as count FROM curriculum WHERE program_id = ?';
        const [curriculum] = await db.execute(curriculumQuery, [id]);

        if (curriculum[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete program with existing curriculum. Please remove all ${curriculum[0].count} subjects first.`
            });
        }

        const query = 'DELETE FROM programs WHERE id = ?';
        await db.execute(query, [id]);

        console.log('✅ Program deleted successfully');

        res.status(200).json({
            success: true,
            message: 'Program deleted successfully',
            deleted_program: {
                id: existing[0].id,
                program_name: existing[0].program_name
            }
        });
    } catch (error) {
        console.error('❌ Error deleting program:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete program',
            error: error.message
        });
    }
});

// ===== UTILITY AND DEBUG ROUTES =====

// Complete data analysis endpoint
router.get('/debug/complete', async (req, res) => {
    try {
        console.log('🧪 Complete database analysis requested');
        
        // Get all programs
        const [programs] = await db.execute('SELECT * FROM programs ORDER BY id');
        
        // Get all curriculum with joined program data
        const [allCurriculum] = await db.execute(`
            SELECT c.*, p.program_name 
            FROM curriculum c 
            LEFT JOIN programs p ON c.program_id = p.id 
            ORDER BY c.program_id, c.year_level, c.semester, c.subject_code
        `);
        
        // Analyze curriculum by program
        const programAnalysis = {};
        allCurriculum.forEach(curr => {
            if (!programAnalysis[curr.program_id]) {
                programAnalysis[curr.program_id] = {
                    program_name: curr.program_name,
                    subjects: [],
                    year_levels: new Set(),
                    semesters: new Set(),
                    total_units: 0
                };
            }
            programAnalysis[curr.program_id].subjects.push(curr);
            programAnalysis[curr.program_id].year_levels.add(curr.year_level);
            programAnalysis[curr.program_id].semesters.add(curr.semester);
            programAnalysis[curr.program_id].total_units += curr.units || 0;
        });
        
        // Convert Sets to Arrays for JSON serialization
        Object.keys(programAnalysis).forEach(programId => {
            programAnalysis[programId].year_levels = Array.from(programAnalysis[programId].year_levels).sort();
            programAnalysis[programId].semesters = Array.from(programAnalysis[programId].semesters).sort();
        });

        // Generate comprehensive statistics
        const stats = {
            programs: {
                total: programs.length,
                with_curriculum: Object.keys(programAnalysis).length,
                without_curriculum: programs.length - Object.keys(programAnalysis).length
            },
            curriculum: {
                total_subjects: allCurriculum.length,
                total_units: allCurriculum.reduce((sum, curr) => sum + (curr.units || 0), 0),
                unique_year_levels: [...new Set(allCurriculum.map(c => c.year_level))].sort(),
                unique_semesters: [...new Set(allCurriculum.map(c => c.semester))].sort()
            },
            data_quality: {
                subjects_missing_units: allCurriculum.filter(c => !c.units || c.units === 0).length,
                subjects_missing_code: allCurriculum.filter(c => !c.subject_code).length,
                subjects_missing_name: allCurriculum.filter(c => !c.subject_name).length
            }
        };

        const debugInfo = {
            statistics: stats,
            program_analysis: programAnalysis,
            sample_queries: programs.length > 0 ? [
                `/api/curriculum?program_id=${programs[0].id}`,
                `/api/curriculum?program_id=${programs[0].id}&year_level=1st Year&semester=1st Term`,
                `/api/programs`,
                `/api/curriculum/units-summary?program_id=${programs[0].id}`
            ] : []
        };
        
        console.log('📊 Complete analysis generated:', {
            programs: stats.programs.total,
            curriculum: stats.curriculum.total_subjects,
            yearLevels: stats.curriculum.unique_year_levels.length,
            semesters: stats.curriculum.unique_semesters.length
        });
        
        res.json({
            success: true,
            debug_info: debugInfo,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error in complete debug analysis:', error);
        res.status(500).json({
            success: false,
            message: 'Debug analysis failed',
            error: error.message
        });
    }
});

// Test endpoint to verify API connectivity
router.get('/test', (req, res) => {
    console.log('🧪 API Test endpoint accessed');
    const testInfo = {
        success: true,
        message: 'Enhanced Course API is working perfectly',
        timestamp: new Date().toISOString(),
        server_time: new Date().toLocaleString(),
        endpoints: {
            programs: '/api/programs',
            curriculum: '/api/curriculum',
            debug: '/api/debug/complete',
            units: '/api/curriculum/units-summary'
        }
    };
    
    console.log('✅ Test successful:', testInfo);
    res.json(testInfo);
});

// Health check endpoint
router.get('/health', async (req, res) => {
    try {
        // Test database connectivity
        await db.execute('SELECT 1');
        
        res.json({
            success: true,
            status: 'healthy',
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            status: 'unhealthy',
            database: 'disconnected',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

export default router;