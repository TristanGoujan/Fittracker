const express = require('express')
const pool = require('../db/pool')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()
router.use(authMiddleware)

// GET /api/stats/summary
router.get('/summary', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        COUNT(DISTINCT ws.id)::int          AS total_sessions,
        COALESCE(SUM(s.weight_kg * s.reps), 0)::float AS total_volume,
        COALESCE(MAX(s.weight_kg), 0)::float           AS best_weight
       FROM workout_sessions ws
       LEFT JOIN session_exercises se ON se.session_id = ws.id
       LEFT JOIN sets s ON s.session_exercise_id = se.id
       WHERE ws.user_id = $1`,
      [req.user.id]
    )
    res.json(result.rows[0])
  } catch (err) {
    console.error('Erreur summary:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/stats/volume?days=7
router.get('/volume', async (req, res) => {
  const days = Math.max(1, Math.min(365, parseInt(req.query.days) || 7))
  try {
    const result = await pool.query(
      `SELECT
        ws.session_date::text                          AS date,
        COALESCE(SUM(s.weight_kg * s.reps), 0)::float AS volume
       FROM workout_sessions ws
       LEFT JOIN session_exercises se ON se.session_id = ws.id
       LEFT JOIN sets s ON s.session_exercise_id = se.id
       WHERE ws.user_id = $1
         AND ws.session_date >= CURRENT_DATE - ($2 * INTERVAL '1 day')
       GROUP BY ws.session_date
       ORDER BY ws.session_date ASC`,
      [req.user.id, days]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('Erreur volume:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/stats/activity
router.get('/activity', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT session_date::text AS date, COUNT(*)::int AS count
       FROM workout_sessions
       WHERE user_id = $1
         AND session_date >= CURRENT_DATE - INTERVAL '364 days'
       GROUP BY session_date
       ORDER BY session_date ASC`,
      [req.user.id]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('Erreur activity:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
