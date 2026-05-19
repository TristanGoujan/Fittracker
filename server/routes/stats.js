const express = require('express')
const pool = require('../db/pool')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()
router.use(authMiddleware)

// GET /api/stats/summary
router.get('/summary', async (req, res) => {
  try {
    const result = await pool.query(
      `WITH dated_sessions AS (
         SELECT session_date
         FROM workout_sessions
         WHERE user_id = $1
       ),
       islands AS (
         SELECT
           session_date,
           session_date - (ROW_NUMBER() OVER (ORDER BY session_date) * INTERVAL '1 day') AS grp
         FROM (SELECT DISTINCT session_date FROM dated_sessions) d
       ),
       streaks AS (
         SELECT COUNT(*)::int AS streak FROM islands GROUP BY grp
       )
       SELECT
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
           AND session_date >= DATE_TRUNC('month', CURRENT_DATE)) AS monthly_duration_min,

        (SELECT COALESCE(MAX(streak), 0) FROM streaks) AS best_streak,

        (SELECT COUNT(*)::int
         FROM workout_sessions ws
         JOIN session_exercises se ON se.session_id = ws.id
         JOIN sets s ON s.session_exercise_id = se.id
         WHERE ws.user_id = $1) AS total_sets,

        (SELECT COALESCE(SUM(s.reps), 0)::bigint
         FROM workout_sessions ws
         JOIN session_exercises se ON se.session_id = ws.id
         JOIN sets s ON s.session_exercise_id = se.id
         WHERE ws.user_id = $1
           AND s.reps IS NOT NULL) AS total_reps,

        (SELECT COUNT(DISTINCT se.exercise_id)::int
         FROM workout_sessions ws
         JOIN session_exercises se ON se.session_id = ws.id
         WHERE ws.user_id = $1) AS distinct_exercises,

        (SELECT COALESCE(MAX(session_vol), 0)::float
         FROM (
           SELECT ws.id, SUM(s.weight_kg * s.reps) AS session_vol
           FROM workout_sessions ws
           JOIN session_exercises se ON se.session_id = ws.id
           JOIN sets s ON s.session_exercise_id = se.id
           WHERE ws.user_id = $1
             AND s.weight_kg IS NOT NULL AND s.reps IS NOT NULL
           GROUP BY ws.id
         ) sv) AS max_session_volume`,
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
// Retourne le poids max atteint par l'utilisateur sur chaque exercice + reps à ce poids
router.get('/prs', async (req, res) => {
  try {
    const result = await pool.query(
      `WITH max_weights AS (
         SELECT
           se.exercise_id,
           MAX(s.weight_kg) AS max_weight
         FROM workout_sessions ws
         JOIN session_exercises se ON se.session_id = ws.id
         JOIN sets s ON s.session_exercise_id = se.id
         WHERE ws.user_id = $1
           AND s.weight_kg IS NOT NULL
         GROUP BY se.exercise_id
       ),
       best_sets AS (
         SELECT DISTINCT ON (se.exercise_id)
           se.exercise_id,
           s.weight_kg::float AS weight_kg,
           s.reps
         FROM workout_sessions ws
         JOIN session_exercises se ON se.session_id = ws.id
         JOIN sets s ON s.session_exercise_id = se.id
         JOIN max_weights mw ON mw.exercise_id = se.exercise_id AND s.weight_kg = mw.max_weight
         WHERE ws.user_id = $1
           AND s.weight_kg IS NOT NULL
           AND s.reps IS NOT NULL
         ORDER BY se.exercise_id, s.reps DESC
       )
       SELECT
         e.id          AS exercise_id,
         e.name        AS exercise_name,
         mg.name       AS muscle_group,
         bs.weight_kg,
         bs.reps
       FROM best_sets bs
       JOIN exercises e ON e.id = bs.exercise_id
       LEFT JOIN muscle_groups mg ON mg.id = e.muscle_group_id
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
      `WITH max_per_day AS (
         SELECT
           ws.session_date,
           MAX(s.weight_kg) AS max_weight
         FROM workout_sessions ws
         JOIN session_exercises se ON se.session_id = ws.id
         JOIN sets s ON s.session_exercise_id = se.id
         WHERE ws.user_id = $1
           AND se.exercise_id = $2
           AND s.weight_kg IS NOT NULL
         GROUP BY ws.session_date
       )
       SELECT DISTINCT ON (ws.session_date)
         ws.session_date::text AS date,
         s.weight_kg::float    AS weight_kg,
         s.reps
       FROM workout_sessions ws
       JOIN session_exercises se ON se.session_id = ws.id
       JOIN sets s ON s.session_exercise_id = se.id
       JOIN max_per_day mpd ON mpd.session_date = ws.session_date AND s.weight_kg = mpd.max_weight
       WHERE ws.user_id = $1
         AND se.exercise_id = $2
         AND s.weight_kg IS NOT NULL
         AND s.reps IS NOT NULL
       ORDER BY ws.session_date ASC, s.reps DESC`,
      [req.user.id, req.params.exoId]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('Erreur progression:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/stats/last-session/:exerciseId
// Retourne les séries de la dernière fois que cet exercice a été fait
router.get('/last-session/:exerciseId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         ws.session_date::text,
         s.set_number,
         s.weight_kg::float,
         s.reps
       FROM workout_sessions ws
       JOIN session_exercises se ON se.session_id = ws.id
       JOIN sets s ON s.session_exercise_id = se.id
       WHERE ws.user_id = $1
         AND se.exercise_id = $2
         AND ws.id = (
           SELECT ws2.id
           FROM workout_sessions ws2
           JOIN session_exercises se2 ON se2.session_id = ws2.id
           WHERE ws2.user_id = $1 AND se2.exercise_id = $2
           ORDER BY ws2.session_date DESC, ws2.created_at DESC
           LIMIT 1
         )
       ORDER BY s.set_number ASC`,
      [req.user.id, req.params.exerciseId]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('Erreur last-session:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
