import express from 'express';
import db from '../database.js';

const router = express.Router();

// GET /programs - Fetch all programs
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT * FROM programs 
            ORDER BY created_at DESC
        `);
        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Error fetching programs:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching programs',
            error: error.message
        });
    }
});

// GET /programs/:id - Fetch a single program by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.execute('SELECT * FROM programs WHERE id = ?', [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Program not found'
            });
        }

        res.json({
            success: true,
            data: rows[0]
        });
    } catch (error) {
        console.error('Error fetching program:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching program',
            error: error.message
        });
    }
});

// POST /programs - Add a new program
router.post('/', async (req, res) => {
    try {
        const { program_name, description } = req.body;

        // Validation
        if (!program_name) {
            return res.status(400).json({
                success: false,
                message: 'Program name is required'
            });
        }

        // Check if program name already exists
        const [existing] = await db.execute('SELECT id FROM programs WHERE program_name = ?', [program_name]);
        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Program name already exists'
            });
        }

        const [result] = await db.execute(`
            INSERT INTO programs (program_name, description)
            VALUES (?, ?)
        `, [program_name, description || null]);

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
        console.error('Error adding program:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding program',
            error: error.message
        });
    }
});

// PUT /programs/:id - Update program details
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { program_name, description } = req.body;

        // Check if program exists
        const [existing] = await db.execute('SELECT id FROM programs WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Program not found'
            });
        }

        // Validation
        if (!program_name) {
            return res.status(400).json({
                success: false,
                message: 'Program name is required'
            });
        }

        // Check if program name already exists (excluding current program)
        const [duplicate] = await db.execute('SELECT id FROM programs WHERE program_name = ? AND id != ?', [program_name, id]);
        if (duplicate.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Program name already exists'
            });
        }

        await db.execute(`
            UPDATE programs 
            SET program_name = ?, description = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [program_name, description || null, id]);

        res.json({
            success: true,
            message: 'Program updated successfully',
            data: {
                id,
                program_name,
                description
            }
        });
    } catch (error) {
        console.error('Error updating program:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating program',
            error: error.message
        });
    }
});

// DELETE /programs/:id - Delete a program
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if program exists
        const [existing] = await db.execute('SELECT id FROM programs WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Program not found'
            });
        }

        // Check if program is being used in curriculum
        const [curriculumUsage] = await db.execute('SELECT COUNT(*) as count FROM curriculum WHERE program_id = ?', [id]);
        if (curriculumUsage[0].count > 0) {
            return res.status(409).json({
                success: false,
                message: 'Cannot delete program. It is being used in curriculum records.'
            });
        }

        await db.execute('DELETE FROM programs WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Program deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting program:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting program',
            error: error.message
        });
    }
});

export default router;