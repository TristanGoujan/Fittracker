const express = require('express')
const pool = require('../db/pool')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()
router.use(authMiddleware)

// GET /api/feed — activity feed from accepted friends (last 14 days)
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1
  const limit = 20
  const offset = (page - 1) * limit

  try {
    const result = await pool.query(
      `SELECT
         ws.id,
         ws.name,
         ws.session_date::text,
         ws.duration_min,
         ws.user_id,
         u.username,
         u.avatar_url,
         COALESCE(SUM(s.weight_kg * s.reps), 0)::float AS volume,
         COUNT(DISTINCT se.exercise_id)::int AS exercise_count,
         (
           SELECT ARRAY_AGG(ex_name ORDER BY ex_count DESC)
           FROM (
             SELECT e2.name AS ex_name, COUNT(*) AS ex_count
             FROM session_exercises se2
             JOIN exercises e2 ON e2.id = se2.exercise_id
             WHERE se2.session_id = ws.id
             GROUP BY e2.name
             LIMIT 3
           ) top_ex
         ) AS top_exercises,
         (
           SELECT COALESCE(JSON_AGG(r_agg ORDER BY r_count DESC), '[]'::json)
           FROM (
             SELECT JSON_BUILD_OBJECT('emoji', emoji, 'count', COUNT(*)::int) AS r_agg,
                    COUNT(*) AS r_count
             FROM session_reactions sr2
             WHERE sr2.session_id = ws.id
             GROUP BY sr2.emoji
           ) reactions_sub
         ) AS reactions,
         (
           SELECT sr3.emoji
           FROM session_reactions sr3
           WHERE sr3.session_id = ws.id AND sr3.user_id = $1
           LIMIT 1
         ) AS my_reaction,
         (
           SELECT COUNT(*)::int
           FROM session_comments sc2
           WHERE sc2.session_id = ws.id
         ) AS comment_count
       FROM workout_sessions ws
       JOIN users u ON u.id = ws.user_id
       LEFT JOIN session_exercises se ON se.session_id = ws.id
       LEFT JOIN sets s ON s.session_exercise_id = se.id
       WHERE ws.user_id IN (
         SELECT CASE WHEN f.sender_id = $1 THEN f.receiver_id ELSE f.sender_id END
         FROM friendships f
         WHERE f.status = 'accepted'
           AND (f.sender_id = $1 OR f.receiver_id = $1)
       )
         AND ws.session_date >= NOW() - INTERVAL '14 days'
       GROUP BY ws.id, u.username, u.avatar_url
       ORDER BY ws.session_date DESC, ws.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('Erreur feed:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
