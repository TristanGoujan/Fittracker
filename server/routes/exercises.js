const express = require('express')
const pool = require('../db/pool')

const router = express.Router()

// GET /api/exercises
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.id, e.name, e.equipment, mg.name AS muscle_group
      FROM exercises e
      LEFT JOIN muscle_groups mg ON e.muscle_group_id = mg.id
      ORDER BY mg.name, e.name
    `)
    res.json(result.rows)
  } catch (err) {
    console.error('Erreur exercices:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
