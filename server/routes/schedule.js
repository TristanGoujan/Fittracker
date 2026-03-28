const express = require('express')
const pool = require('../db/pool')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()
router.use(authMiddleware)

// GET /api/schedule — returns array of 7 day objects
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT day_of_week, label FROM weekly_schedule WHERE user_id = $1 ORDER BY day_of_week',
      [req.user.id]
    )
    // Return sparse array — client fills gaps with 'Repos'
    res.json(result.rows)
  } catch (err) {
    console.error('Erreur get schedule:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// PUT /api/schedule — upsert full week (array of {day_of_week, label})
router.put('/', async (req, res) => {
  const { days } = req.body // [{day_of_week: 0, label: 'Push'}, ...]
  if (!Array.isArray(days) || days.length !== 7) {
    return res.status(400).json({ error: '7 jours requis' })
  }
  try {
    // Delete then reinsert for simplicity
    await pool.query('DELETE FROM weekly_schedule WHERE user_id = $1', [req.user.id])
    for (const { day_of_week, label } of days) {
      if (label && label !== 'Repos' && label !== '') {
        await pool.query(
          'INSERT INTO weekly_schedule (user_id, day_of_week, label) VALUES ($1, $2, $3)',
          [req.user.id, day_of_week, label]
        )
      }
    }
    res.json({ success: true })
  } catch (err) {
    console.error('Erreur save schedule:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
