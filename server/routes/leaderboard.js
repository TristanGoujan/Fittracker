const express = require('express')
const pool = require('../db/pool')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()
router.use(authMiddleware)

// GET /api/leaderboard/weekly — weekly volume leaderboard among friends + self
router.get('/weekly', async (req, res) => {
  try {
    const result = await pool.query(
      `WITH friend_ids AS (
         SELECT $1::int AS user_id
         UNION
         SELECT CASE WHEN f.sender_id = $1 THEN f.receiver_id ELSE f.sender_id END
         FROM friendships f
         WHERE f.status = 'accepted'
           AND (f.sender_id = $1 OR f.receiver_id = $1)
       ),
       weekly_stats AS (
         SELECT
           ws.user_id,
           COALESCE(SUM(s.weight_kg * s.reps), 0)::float AS weekly_volume,
           COUNT(DISTINCT ws.id)::int AS sessions_count
         FROM workout_sessions ws
         LEFT JOIN session_exercises se ON se.session_id = ws.id
         LEFT JOIN sets s ON s.session_exercise_id = se.id
         WHERE ws.user_id IN (SELECT user_id FROM friend_ids)
           AND ws.session_date >= date_trunc('week', NOW())
         GROUP BY ws.user_id
       )
       SELECT
         u.id AS user_id,
         u.username,
         u.avatar_url,
         COALESCE(ws.weekly_volume, 0)::float AS weekly_volume,
         COALESCE(ws.sessions_count, 0)::int AS sessions_count,
         (u.id = $1) AS is_me
       FROM friend_ids fi
       JOIN users u ON u.id = fi.user_id
       LEFT JOIN weekly_stats ws ON ws.user_id = u.id
       ORDER BY weekly_volume DESC, u.username ASC`,
      [req.user.id]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('Erreur classement hebdomadaire:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/leaderboard/pr?exercise=squat|bench|deadlift
// Returns best single-lift PR among friends + self for a given exercise
router.get('/pr', async (req, res) => {
  const EXERCISE_PATTERNS = {
    squat:    '%squat%',
    bench:    '%développé couché%',
    deadlift: '%soulevé de terre%',
  }
  const exercise = req.query.exercise || 'squat'
  const pattern  = EXERCISE_PATTERNS[exercise]
  if (!pattern) return res.status(400).json({ error: 'Exercice invalide. Valeurs acceptées : squat, bench, deadlift' })

  try {
    const result = await pool.query(
      `WITH friend_ids AS (
         SELECT $1::int AS user_id
         UNION
         SELECT CASE WHEN f.sender_id = $1 THEN f.receiver_id ELSE f.sender_id END
         FROM friendships f
         WHERE f.status = 'accepted'
           AND (f.sender_id = $1 OR f.receiver_id = $1)
       ),
       best_sets AS (
         SELECT DISTINCT ON (ws.user_id)
           ws.user_id,
           s.weight_kg::float,
           s.reps
         FROM workout_sessions ws
         JOIN session_exercises se ON se.session_id = ws.id
         JOIN exercises e          ON e.id = se.exercise_id AND e.name ILIKE $2
         JOIN sets s               ON s.session_exercise_id = se.id
         WHERE s.weight_kg IS NOT NULL
           AND ws.user_id IN (SELECT user_id FROM friend_ids)
         ORDER BY ws.user_id, s.weight_kg DESC, s.reps DESC
       )
       SELECT
         u.id          AS user_id,
         u.username,
         u.avatar_url,
         COALESCE(bs.weight_kg, 0)::float AS pr_weight,
         bs.reps       AS pr_reps,
         (u.id = $1)   AS is_me
       FROM friend_ids fi
       JOIN users u ON u.id = fi.user_id
       LEFT JOIN best_sets bs ON bs.user_id = u.id
       ORDER BY pr_weight DESC, u.username ASC`,
      [req.user.id, pattern]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('Erreur classement PR:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
