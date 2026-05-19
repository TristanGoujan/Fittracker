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
  const EXERCISE_NAMES = {
    squat:    'Squat',
    bench:    'Développé couché barre',
    deadlift: 'Soulevé de terre',
  }
  const exercise = req.query.exercise || 'squat'
  const pattern  = EXERCISE_NAMES[exercise]
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
         JOIN exercises e          ON e.id = se.exercise_id AND LOWER(e.name) = LOWER($2)
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

// GET /api/leaderboard/global?exercise=bench|squat|deadlift
// Classement de tous les utilisateurs sur un exercice donné
const GLOBAL_EXERCISE_NAMES = {
  bench:    'Développé couché barre',
  squat:    'Squat',
  deadlift: 'Soulevé de terre',
}

router.get('/global', async (req, res) => {
  const exercise = req.query.exercise || 'bench'
  const pattern  = GLOBAL_EXERCISE_NAMES[exercise]

  if (!pattern) {
    return res.status(400).json({ error: 'Exercice invalide. Valeurs acceptées : bench, squat, deadlift' })
  }

  try {
    const result = await pool.query(
      `WITH best_sets AS (
         SELECT DISTINCT ON (ws.user_id)
           ws.user_id,
           s.weight_kg::float,
           s.reps
         FROM workout_sessions ws
         JOIN session_exercises se ON se.session_id = ws.id
         JOIN exercises e          ON e.id = se.exercise_id AND LOWER(e.name) = LOWER($2)
         JOIN sets s               ON s.session_exercise_id = se.id
         WHERE s.weight_kg IS NOT NULL AND s.reps IS NOT NULL
         ORDER BY ws.user_id, s.weight_kg DESC, s.reps DESC
       )
       SELECT
         u.id          AS user_id,
         u.username,
         u.avatar_url,
         bs.weight_kg  AS value,
         bs.reps,
         (u.id = $1)   AS is_me
       FROM best_sets bs
       JOIN users u ON u.id = bs.user_id
       ORDER BY value DESC, bs.reps DESC, u.username ASC
       LIMIT 50`,
      [req.user.id, pattern]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('Erreur classement global:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
