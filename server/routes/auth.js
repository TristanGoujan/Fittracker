const express = require('express')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const pool = require('../db/pool')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()
const SALT_ROUNDS = 12

// ─── Routes publiques ─────────────────────────────────────────────────────────

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Tous les champs sont requis' })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit faire au moins 8 caractères' })
  }

  try {
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    )
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Email ou nom d'utilisateur déjà utilisé" })
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS)
    const result = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, hashed]
    )

    const user = result.rows[0]
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({ token, user: { id: user.id, username: user.username, email: user.email } })
  } catch (err) {
    console.error('Erreur register:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' })
  }

  try {
    const result = await pool.query(
      'SELECT id, username, email, password FROM users WHERE email = $1',
      [email]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Identifiants invalides' })
    }

    const user = result.rows[0]
    const match = await bcrypt.compare(password, user.password)

    if (!match) {
      return res.status(401).json({ error: 'Identifiants invalides' })
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({ token, user: { id: user.id, username: user.username, email: user.email } })
  } catch (err) {
    console.error('Erreur login:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// ─── Routes protégées ─────────────────────────────────────────────────────────
router.use(authMiddleware)

// GET /api/auth/me — profil complet + stats calculées
router.get('/me', async (req, res) => {
  try {
    const userRes = await pool.query(
      `SELECT id, username, email, avatar_url, weight_kg::float, height_cm,
              birth_date::text, goal, weekly_target, current_program, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    )
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'Utilisateur introuvable' })

    const sessionsRes = await pool.query(
      'SELECT COUNT(*)::int AS total FROM workout_sessions WHERE user_id = $1',
      [req.user.id]
    )

    const volumeRes = await pool.query(
      `SELECT COALESCE(SUM(s.weight_kg * s.reps), 0)::float AS total
       FROM workout_sessions ws
       JOIN session_exercises se ON se.session_id = ws.id
       JOIN sets s ON s.session_exercise_id = se.id
       WHERE ws.user_id = $1`,
      [req.user.id]
    )

    const streakRes = await pool.query(
      `WITH dates AS (
         SELECT DISTINCT session_date AS d
         FROM workout_sessions WHERE user_id = $1
       ),
       numbered AS (
         SELECT d, ROW_NUMBER() OVER (ORDER BY d) AS rn FROM dates
       ),
       grouped AS (
         SELECT d, (d - (rn || ' days')::interval)::date AS grp FROM numbered
       ),
       streaks AS (
         SELECT COUNT(*) AS len FROM grouped GROUP BY grp
       )
       SELECT COALESCE(MAX(len), 0)::int AS best_streak FROM streaks`,
      [req.user.id]
    )

    res.json({
      ...userRes.rows[0],
      stats: {
        total_sessions: sessionsRes.rows[0].total,
        total_volume:   Math.round(volumeRes.rows[0].total),
        best_streak:    streakRes.rows[0].best_streak,
      },
    })
  } catch (err) {
    console.error('Erreur /me:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// PUT /api/auth/profile — mise à jour des informations personnelles
router.put('/profile', async (req, res) => {
  const { username, email, weight_kg, height_cm, birth_date, goal, weekly_target, current_program } = req.body

  if (!username || !email) {
    return res.status(400).json({ error: "Nom d'utilisateur et email requis" })
  }

  try {
    const conflict = await pool.query(
      'SELECT id FROM users WHERE (email = $1 OR username = $2) AND id != $3',
      [email, username, req.user.id]
    )
    if (conflict.rows.length > 0) {
      return res.status(409).json({ error: "Email ou nom d'utilisateur déjà utilisé" })
    }

    const result = await pool.query(
      `UPDATE users
       SET username = $1, email = $2, weight_kg = $3, height_cm = $4,
           birth_date = $5, goal = $6, weekly_target = $7, current_program = $8
       WHERE id = $9
       RETURNING id, username, email, avatar_url, weight_kg::float, height_cm,
                 birth_date::text, goal, weekly_target, current_program`,
      [
        username, email,
        weight_kg    || null,
        height_cm    || null,
        birth_date   || null,
        goal         || null,
        weekly_target || null,
        current_program || null,
        req.user.id,
      ]
    )

    res.json(result.rows[0])
  } catch (err) {
    console.error('Erreur update profile:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// POST /api/auth/avatar — upload photo de profil (base64 data URL)
router.post('/avatar', async (req, res) => {
  const { avatar } = req.body

  if (!avatar || !avatar.startsWith('data:image/')) {
    return res.status(400).json({ error: 'Image invalide' })
  }
  if (avatar.length > 2_800_000) {
    return res.status(413).json({ error: 'Image trop grande (max 2 MB)' })
  }

  try {
    const result = await pool.query(
      'UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING avatar_url',
      [avatar, req.user.id]
    )
    res.json({ avatar_url: result.rows[0].avatar_url })
  } catch (err) {
    console.error('Erreur avatar:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// PUT /api/auth/password — changement de mot de passe
router.put('/password', async (req, res) => {
  const { current_password, new_password } = req.body

  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Les deux mots de passe sont requis' })
  }
  if (new_password.length < 8) {
    return res.status(400).json({ error: 'Le nouveau mot de passe doit faire au moins 8 caractères' })
  }

  try {
    const userRes = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id])
    if (!userRes.rows[0]) {
      return res.status(404).json({ error: 'Utilisateur introuvable' })
    }
    const match = await bcrypt.compare(current_password, userRes.rows[0].password)

    if (!match) {
      return res.status(401).json({ error: 'Mot de passe actuel incorrect' })
    }

    const hashed = await bcrypt.hash(new_password, SALT_ROUNDS)
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, req.user.id])

    res.json({ success: true })
  } catch (err) {
    console.error('Erreur password change:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// DELETE /api/auth/account — suppression du compte et de toutes les données
router.delete('/account', async (req, res) => {
  const { password } = req.body

  if (!password) {
    return res.status(400).json({ error: 'Mot de passe requis pour confirmer la suppression' })
  }

  try {
    const userRes = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id])
    if (!userRes.rows[0]) {
      return res.status(404).json({ error: 'Utilisateur introuvable' })
    }
    const match = await bcrypt.compare(password, userRes.rows[0].password)

    if (!match) {
      return res.status(401).json({ error: 'Mot de passe incorrect' })
    }

    // CASCADE supprime workout_sessions → session_exercises → sets automatiquement
    await pool.query('DELETE FROM users WHERE id = $1', [req.user.id])

    res.json({ success: true })
  } catch (err) {
    console.error('Erreur delete account:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// PUT /api/auth/program — update current program only
router.put('/program', async (req, res) => {
  const { current_program } = req.body
  try {
    await pool.query('UPDATE users SET current_program = $1 WHERE id = $2', [current_program || null, req.user.id])
    res.json({ success: true })
  } catch (err) {
    console.error('Erreur update program:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
