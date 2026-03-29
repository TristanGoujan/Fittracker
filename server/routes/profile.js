const express = require('express')
const pool = require('../db/pool')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()
router.use(authMiddleware)

// GET /api/profile/:userId — full public profile (friends only)
router.get('/:userId', async (req, res) => {
  const targetId = parseInt(req.params.userId)
  if (isNaN(targetId)) return res.status(400).json({ error: 'ID invalide' })

  // Viewing own profile is allowed; otherwise must be friends
  if (targetId !== req.user.id) {
    try {
      const friendCheck = await pool.query(
        `SELECT 1 FROM friendships
         WHERE status = 'accepted'
           AND ((sender_id = $1 AND receiver_id = $2)
             OR (sender_id = $2 AND receiver_id = $1))`,
        [req.user.id, targetId]
      )
      if (friendCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Profil accessible aux amis uniquement' })
      }
    } catch (err) {
      console.error('Erreur vérification amitié:', err)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  try {
    // ── User info ──────────────────────────────────────────────────────────────
    const userRes = await pool.query(
      `SELECT id, username, avatar_url, goal, weekly_target, current_program,
              weight_kg::float, height_cm, birth_date::text
       FROM users WHERE id = $1`,
      [targetId]
    )
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'Utilisateur introuvable' })
    const user = userRes.rows[0]

    // ── Stats ─────────────────────────────────────────────────────────────────
    const [totalSessionsRes, totalVolumeRes, streakRes, activeRes, bestWeightRes] = await Promise.all([
      pool.query(
        'SELECT COUNT(*)::int AS total FROM workout_sessions WHERE user_id = $1',
        [targetId]
      ),
      pool.query(
        `SELECT COALESCE(SUM(s.weight_kg * s.reps), 0)::float AS total
         FROM workout_sessions ws
         JOIN session_exercises se ON se.session_id = ws.id
         JOIN sets s ON s.session_exercise_id = se.id
         WHERE ws.user_id = $1`,
        [targetId]
      ),
      pool.query(
        `WITH session_days AS (
           SELECT DISTINCT session_date FROM workout_sessions WHERE user_id = $1 ORDER BY session_date
         ),
         gaps AS (
           SELECT session_date,
                  session_date - (ROW_NUMBER() OVER (ORDER BY session_date) * INTERVAL '1 day') AS grp
           FROM session_days
         ),
         streaks AS (SELECT COUNT(*)::int AS len FROM gaps GROUP BY grp)
         SELECT COALESCE(MAX(len), 0)::int AS best_streak FROM streaks`,
        [targetId]
      ),
      pool.query(
        `SELECT EXISTS (
           SELECT 1 FROM workout_sessions
           WHERE user_id = $1 AND session_date >= date_trunc('week', NOW())
         ) AS active_this_week`,
        [targetId]
      ),
      pool.query(
        `SELECT COALESCE(MAX(s.weight_kg), 0)::float AS best_weight
         FROM sets s
         JOIN session_exercises se ON se.id = s.session_exercise_id
         JOIN workout_sessions ws ON ws.id = se.session_id
         WHERE ws.user_id = $1`,
        [targetId]
      ),
    ])

    // ── PRs — all exercises, best weight ─────────────────────────────────────
    const prsRes = await pool.query(
      `SELECT DISTINCT ON (e.id)
         e.name AS exercise_name,
         s.weight_kg::float,
         s.reps
       FROM sets s
       JOIN session_exercises se ON se.id = s.session_exercise_id
       JOIN exercises e ON e.id = se.exercise_id
       JOIN workout_sessions ws ON ws.id = se.session_id
       WHERE ws.user_id = $1 AND s.weight_kg IS NOT NULL AND s.reps IS NOT NULL
       ORDER BY e.id, s.weight_kg DESC, s.reps DESC`,
      [targetId]
    )

    // ── Body weight history (all entries) ─────────────────────────────────────
    const bwRes = await pool.query(
      `SELECT id, weight_kg::float, entry_date::text
       FROM body_weight_entries
       WHERE user_id = $1
       ORDER BY entry_date ASC`,
      [targetId]
    )

    // ── Weekly schedule ────────────────────────────────────────────────────────
    const scheduleRes = await pool.query(
      `SELECT day_of_week, label
       FROM weekly_schedule
       WHERE user_id = $1
       ORDER BY day_of_week`,
      [targetId]
    )

    // ── Recent sessions (last 8) ───────────────────────────────────────────────
    const recentRes = await pool.query(
      `SELECT
         ws.id,
         ws.name,
         ws.session_date::text,
         ws.duration_min,
         COALESCE(SUM(s.weight_kg * s.reps), 0)::float AS volume,
         COUNT(DISTINCT se.exercise_id)::int AS exercise_count
       FROM workout_sessions ws
       LEFT JOIN session_exercises se ON se.session_id = ws.id
       LEFT JOIN sets s ON s.session_exercise_id = se.id
       WHERE ws.user_id = $1
       GROUP BY ws.id
       ORDER BY ws.session_date DESC, ws.created_at DESC
       LIMIT 8`,
      [targetId]
    )

    // ── Monthly session count (last 12 months for activity indicator) ──────────
    const monthlyRes = await pool.query(
      `SELECT
         TO_CHAR(session_date, 'YYYY-MM') AS month,
         COUNT(*)::int AS count
       FROM workout_sessions
       WHERE user_id = $1
         AND session_date >= NOW() - INTERVAL '12 months'
       GROUP BY month
       ORDER BY month ASC`,
      [targetId]
    )

    res.json({
      id:               user.id,
      username:         user.username,
      avatar_url:       user.avatar_url,
      goal:             user.goal,
      weekly_target:    user.weekly_target,
      current_program:  user.current_program,
      weight_kg:        user.weight_kg,
      height_cm:        user.height_cm,
      birth_date:       user.birth_date,
      active_this_week: activeRes.rows[0].active_this_week,
      stats: {
        total_sessions: totalSessionsRes.rows[0].total,
        total_volume:   Math.round(totalVolumeRes.rows[0].total),
        best_streak:    streakRes.rows[0].best_streak,
        best_weight:    bestWeightRes.rows[0].best_weight,
      },
      prs:             prsRes.rows,
      body_weight:     bwRes.rows,
      schedule:        scheduleRes.rows,
      recent_sessions: recentRes.rows,
      monthly_counts:  monthlyRes.rows,
    })
  } catch (err) {
    console.error('Erreur profil public:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
