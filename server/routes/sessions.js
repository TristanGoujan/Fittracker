const express = require('express')
const pool = require('../db/pool')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()
router.use(authMiddleware)

// GET /api/sessions
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         ws.id,
         ws.name,
         ws.session_date::text,
         ws.duration_min,
         ws.created_at,
         COALESCE(SUM(s.weight_kg * s.reps), 0)::float AS volume,
         COUNT(DISTINCT se.exercise_id)::int            AS exercise_count
       FROM workout_sessions ws
       LEFT JOIN session_exercises se ON se.session_id = ws.id
       LEFT JOIN sets s ON s.session_exercise_id = se.id
       WHERE ws.user_id = $1
       GROUP BY ws.id
       ORDER BY ws.session_date DESC, ws.created_at DESC`,
      [req.user.id]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('Erreur liste séances:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/sessions/recent — 6 dernières séances avec volume + liste d'exercices
router.get('/recent', async (req, res) => {
  try {
    const result = await pool.query(
      `WITH recent AS (
         SELECT id, name, session_date, duration_min, created_at
         FROM workout_sessions
         WHERE user_id = $1
         ORDER BY session_date DESC, created_at DESC
         LIMIT 6
       )
       SELECT
         r.id,
         r.name,
         r.session_date::text,
         r.duration_min,
         r.created_at,
         COALESCE(SUM(s.weight_kg * s.reps), 0)::float AS volume,
         ARRAY_REMOVE(ARRAY_AGG(DISTINCT e.name), NULL) AS exercises
       FROM recent r
       LEFT JOIN session_exercises se ON se.session_id = r.id
       LEFT JOIN exercises e ON e.id = se.exercise_id
       LEFT JOIN sets s ON s.session_exercise_id = se.id
       GROUP BY r.id, r.name, r.session_date, r.duration_min, r.created_at
       ORDER BY r.session_date DESC, r.created_at DESC`,
      [req.user.id]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('Erreur séances récentes:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/sessions/:id
router.get('/:id', async (req, res) => {
  try {
    const rows = await pool.query(
      `SELECT
         ws.id, ws.name, ws.session_date::text, ws.duration_min, ws.notes,
         se.id          AS se_id,
         se.order_index AS se_order,
         se.rest_seconds,
         e.id           AS exercise_id,
         e.name         AS exercise_name,
         mg.name        AS muscle_group,
         s.id           AS set_id,
         s.set_number,
         s.weight_kg::float,
         s.reps,
         s.duration_sec
       FROM workout_sessions ws
       JOIN session_exercises se ON se.session_id = ws.id
       JOIN exercises e ON e.id = se.exercise_id
       LEFT JOIN muscle_groups mg ON mg.id = e.muscle_group_id
       LEFT JOIN sets s ON s.session_exercise_id = se.id
       WHERE ws.id = $1 AND ws.user_id = $2
       ORDER BY se.order_index, s.set_number`,
      [req.params.id, req.user.id]
    )

    if (rows.rows.length === 0) {
      return res.status(404).json({ error: 'Séance non trouvée' })
    }

    const first = rows.rows[0]
    const session = {
      id: first.id,
      name: first.name,
      session_date: first.session_date,
      duration_min: first.duration_min,
      notes: first.notes,
      exercises: [],
    }

    const exMap = {}
    rows.rows.forEach((row) => {
      if (!exMap[row.se_id]) {
        const ex = {
          se_id: row.se_id,
          exercise_id: row.exercise_id,
          exercise_name: row.exercise_name,
          muscle_group: row.muscle_group,
          rest_seconds: row.rest_seconds,
          sets: [],
        }
        session.exercises.push(ex)
        exMap[row.se_id] = ex
      }
      if (row.set_id) {
        exMap[row.se_id].sets.push({
          set_number: row.set_number,
          weight_kg: row.weight_kg,
          reps: row.reps,
          duration_sec: row.duration_sec,
        })
      }
    })

    res.json(session)
  } catch (err) {
    console.error('Erreur détail séance:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// POST /api/sessions
router.post('/', async (req, res) => {
  const { name, session_date, duration_min, notes, exercises } = req.body

  if (!session_date) {
    return res.status(400).json({ error: 'La date est requise' })
  }
  if (!exercises || exercises.length === 0) {
    return res.status(400).json({ error: 'Au moins un exercice est requis' })
  }

  const MAX_WEIGHT_KG = 500
  const MAX_REPS      = 999
  for (const ex of exercises) {
    for (const set of ex.sets ?? []) {
      if (set.weight_kg != null && set.weight_kg > MAX_WEIGHT_KG) {
        return res.status(400).json({ error: `Poids maximum autorisé : ${MAX_WEIGHT_KG} kg par série.` })
      }
      if (set.weight_kg != null && set.weight_kg < 0) {
        return res.status(400).json({ error: 'Le poids ne peut pas être négatif.' })
      }
      if (set.reps != null && set.reps > MAX_REPS) {
        return res.status(400).json({ error: `Nombre de reps maximum autorisé : ${MAX_REPS}.` })
      }
      if (set.reps != null && set.reps < 0) {
        return res.status(400).json({ error: 'Le nombre de reps ne peut pas être négatif.' })
      }
    }
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const sessionRes = await client.query(
      `INSERT INTO workout_sessions (user_id, name, session_date, duration_min, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [req.user.id, name || null, session_date, duration_min || null, notes || null]
    )
    const sessionId = sessionRes.rows[0].id

    for (let i = 0; i < exercises.length; i++) {
      const { exercise_id, rest_seconds, sets } = exercises[i]

      const seRes = await client.query(
        `INSERT INTO session_exercises (session_id, exercise_id, order_index, rest_seconds)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [sessionId, exercise_id, i, rest_seconds ?? 90]
      )
      const seId = seRes.rows[0].id

      for (let j = 0; j < sets.length; j++) {
        const { weight_kg, reps, duration_sec } = sets[j]
        await client.query(
          `INSERT INTO sets (session_exercise_id, set_number, weight_kg, reps, duration_sec)
           VALUES ($1, $2, $3, $4, $5)`,
          [seId, j + 1, weight_kg ?? null, reps ?? null, duration_sec ?? null]
        )
      }
    }

    await client.query('COMMIT')
    res.status(201).json({ id: sessionId })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Erreur création séance:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  } finally {
    client.release()
  }
})

// DELETE /api/sessions/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM workout_sessions WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Séance non trouvée' })
    }
    res.json({ success: true })
  } catch (err) {
    console.error('Erreur suppression séance:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
