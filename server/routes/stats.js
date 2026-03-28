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
        (SELECT COUNT(*)::int
         FROM workout_sessions WHERE user_id = $1) AS total_sessions,

        (SELECT COALESCE(SUM(s.weight_kg * s.reps), 0)::float
         FROM workout_sessions ws
         JOIN session_exercises se ON se.session_id = ws.id
         JOIN sets s ON s.session_exercise_id = se.id
         WHERE ws.user_id = $1) AS total_volume,

        (SELECT COALESCE(MAX(s.weight_kg), 0)::float
         FROM workout_sessions ws
         JOIN session_exercises se ON se.session_id = ws.id
         JOIN sets s ON s.session_exercise_id = se.id
         WHERE ws.user_id = $1) AS best_weight,

        (SELECT COALESCE(SUM(duration_min), 0)::int
         FROM workout_sessions
         WHERE user_id = $1
           AND session_date >= DATE_TRUNC('month', CURRENT_DATE)) AS monthly_duration_min`,
      [req.user.id]
    )
    res.json(result.rows[0])
  } catch (err) {
    console.error('Erreur summary:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/stats/volume?days=7
// Retourne [{ date, muscle_group, volume }] — groupé par jour ET groupe musculaire
router.get('/volume', async (req, res) => {
  const days = Math.max(1, Math.min(365, parseInt(req.query.days) || 7))
  try {
    const result = await pool.query(
      `SELECT
        ws.session_date::text            AS date,
        COALESCE(mg.name, 'Autre')       AS muscle_group,
        COALESCE(SUM(s.weight_kg * s.reps), 0)::float AS volume
       FROM workout_sessions ws
       JOIN session_exercises se ON se.session_id = ws.id
       JOIN exercises e ON e.id = se.exercise_id
       LEFT JOIN muscle_groups mg ON mg.id = e.muscle_group_id
       JOIN sets s ON s.session_exercise_id = se.id
       WHERE ws.user_id = $1
         AND ws.session_date >= CURRENT_DATE - ($2 * INTERVAL '1 day')
         AND s.weight_kg IS NOT NULL
         AND s.reps IS NOT NULL
       GROUP BY ws.session_date, mg.name
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

// GET /api/stats/prs
// Retourne le poids max atteint par l'utilisateur sur chaque exercice
router.get('/prs', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        e.id          AS exercise_id,
        e.name        AS exercise_name,
        mg.name       AS muscle_group,
        MAX(s.weight_kg)::float AS weight_kg
       FROM workout_sessions ws
       JOIN session_exercises se ON se.session_id = ws.id
       JOIN exercises e ON e.id = se.exercise_id
       LEFT JOIN muscle_groups mg ON mg.id = e.muscle_group_id
       JOIN sets s ON s.session_exercise_id = se.id
       WHERE ws.user_id = $1
         AND s.weight_kg IS NOT NULL
       GROUP BY e.id, e.name, mg.name
       ORDER BY mg.name, e.name`,
      [req.user.id]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('Erreur prs:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/stats/progress/:exoId
router.get('/progress/:exoId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         ws.session_date::text  AS date,
         MAX(s.weight_kg)::float AS weight_kg
       FROM workout_sessions ws
       JOIN session_exercises se ON se.session_id = ws.id
       JOIN sets s ON s.session_exercise_id = se.id
       WHERE ws.user_id = $1
         AND se.exercise_id = $2
         AND s.weight_kg IS NOT NULL
       GROUP BY ws.session_date
       ORDER BY ws.session_date ASC`,
      [req.user.id, req.params.exoId]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('Erreur progression:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
