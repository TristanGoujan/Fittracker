const express = require('express')
const pool = require('../db/pool')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()
router.use(authMiddleware)

// GET /api/bodyweight — toutes les entrées de l'utilisateur
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, weight_kg::float, entry_date::text, created_at
       FROM body_weight_entries
       WHERE user_id = $1
       ORDER BY entry_date ASC`,
      [req.user.id]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('Erreur get body weight:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// POST /api/bodyweight — ajouter ou mettre à jour une entrée (upsert par date)
router.post('/', async (req, res) => {
  const { weight_kg, entry_date } = req.body

  if (!weight_kg || !entry_date) {
    return res.status(400).json({ error: 'Poids et date requis' })
  }
  if (weight_kg <= 0 || weight_kg > 500) {
    return res.status(400).json({ error: 'Poids invalide' })
  }

  try {
    const result = await pool.query(
      `INSERT INTO body_weight_entries (user_id, weight_kg, entry_date)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, entry_date)
       DO UPDATE SET weight_kg = EXCLUDED.weight_kg
       RETURNING id, weight_kg::float, entry_date::text`,
      [req.user.id, weight_kg, entry_date]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('Erreur add body weight:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// DELETE /api/bodyweight/:id — supprimer une entrée
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM body_weight_entries WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entrée introuvable' })
    }
    res.json({ success: true })
  } catch (err) {
    console.error('Erreur delete body weight:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
