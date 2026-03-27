const express = require('express')
const pool = require('../db/pool')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()
router.use(authMiddleware)

// GET /api/sessions
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, session_date, duration_min, created_at
       FROM workout_sessions
       WHERE user_id = $1
       ORDER BY session_date DESC, created_at DESC`,
      [req.user.id]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('Erreur liste séances:', err)
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
