const express = require('express')
const pool = require('../db/pool')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()
router.use(authMiddleware)

// GET /api/friends — accepted friends list
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         f.id AS friendship_id,
         u.id,
         u.username,
         u.avatar_url,
         EXISTS (
           SELECT 1 FROM workout_sessions ws
           WHERE ws.user_id = u.id
             AND ws.session_date >= date_trunc('week', NOW())
         ) AS active_this_week
       FROM friendships f
       JOIN users u ON (
         CASE WHEN f.sender_id = $1 THEN f.receiver_id ELSE f.sender_id END = u.id
       )
       WHERE f.status = 'accepted'
         AND (f.sender_id = $1 OR f.receiver_id = $1)
       ORDER BY u.username`,
      [req.user.id]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('Erreur liste amis:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/friends/requests — incoming pending requests
router.get('/requests', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         f.id AS friendship_id,
         f.sender_id,
         u.username,
         u.avatar_url,
         f.created_at
       FROM friendships f
       JOIN users u ON u.id = f.sender_id
       WHERE f.receiver_id = $1 AND f.status = 'pending'
       ORDER BY f.created_at DESC`,
      [req.user.id]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('Erreur demandes reçues:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/friends/pending — outgoing pending requests
router.get('/pending', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         f.id AS friendship_id,
         f.receiver_id,
         u.username,
         u.avatar_url,
         f.created_at
       FROM friendships f
       JOIN users u ON u.id = f.receiver_id
       WHERE f.sender_id = $1 AND f.status = 'pending'
       ORDER BY f.created_at DESC`,
      [req.user.id]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('Erreur demandes envoyées:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/friends/search?q= — search users
router.get('/search', async (req, res) => {
  const q = (req.query.q || '').trim()
  if (!q) return res.json([])

  try {
    const result = await pool.query(
      `SELECT
         u.id,
         u.username,
         u.avatar_url,
         (
           SELECT f.status
           FROM friendships f
           WHERE (f.sender_id = $1 AND f.receiver_id = u.id)
              OR (f.receiver_id = $1 AND f.sender_id = u.id)
           LIMIT 1
         ) AS friendship_status
       FROM users u
       WHERE u.id != $1
         AND u.username ILIKE $2
         AND NOT EXISTS (
           SELECT 1 FROM friendships f2
           WHERE ((f2.sender_id = $1 AND f2.receiver_id = u.id)
               OR (f2.receiver_id = $1 AND f2.sender_id = u.id))
             AND f2.status = 'blocked'
         )
       ORDER BY u.username
       LIMIT 20`,
      [req.user.id, `%${q}%`]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('Erreur recherche utilisateurs:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// POST /api/friends/request — send friend request
router.post('/request', async (req, res) => {
  const { user_id } = req.body
  if (!user_id) return res.status(400).json({ error: 'user_id requis' })
  if (user_id === req.user.id) return res.status(400).json({ error: 'Impossible de s\'ajouter soi-même' })

  try {
    // Check if relation already exists
    const existing = await pool.query(
      `SELECT id, status FROM friendships
       WHERE (sender_id = $1 AND receiver_id = $2)
          OR (sender_id = $2 AND receiver_id = $1)`,
      [req.user.id, user_id]
    )
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Une relation existe déjà avec cet utilisateur' })
    }

    const result = await pool.query(
      `INSERT INTO friendships (sender_id, receiver_id, status)
       VALUES ($1, $2, 'pending') RETURNING id`,
      [req.user.id, user_id]
    )
    res.status(201).json({ friendship_id: result.rows[0].id })
  } catch (err) {
    console.error('Erreur envoi demande:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// PUT /api/friends/:friendshipId/accept — accept request (only receiver)
router.put('/:friendshipId/accept', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE friendships SET status = 'accepted'
       WHERE id = $1 AND receiver_id = $2 AND status = 'pending'
       RETURNING id`,
      [req.params.friendshipId, req.user.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Demande introuvable ou non autorisé' })
    }
    res.json({ success: true })
  } catch (err) {
    console.error('Erreur acceptation demande:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// PUT /api/friends/:friendshipId/decline — decline/cancel request
router.put('/:friendshipId/decline', async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM friendships
       WHERE id = $1
         AND (sender_id = $2 OR receiver_id = $2)
         AND status = 'pending'
       RETURNING id`,
      [req.params.friendshipId, req.user.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Demande introuvable ou non autorisé' })
    }
    res.json({ success: true })
  } catch (err) {
    console.error('Erreur refus demande:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// PUT /api/friends/:userId/block — block user
router.put('/:userId/block', async (req, res) => {
  const targetId = parseInt(req.params.userId)
  if (targetId === req.user.id) return res.status(400).json({ error: 'Impossible de se bloquer soi-même' })

  try {
    // Remove existing friendship then insert blocked
    await pool.query(
      `DELETE FROM friendships
       WHERE (sender_id = $1 AND receiver_id = $2)
          OR (sender_id = $2 AND receiver_id = $1)`,
      [req.user.id, targetId]
    )
    await pool.query(
      `INSERT INTO friendships (sender_id, receiver_id, status)
       VALUES ($1, $2, 'blocked')`,
      [req.user.id, targetId]
    )
    res.json({ success: true })
  } catch (err) {
    console.error('Erreur blocage utilisateur:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// DELETE /api/friends/:friendshipId — remove friend
router.delete('/:friendshipId', async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM friendships
       WHERE id = $1
         AND (sender_id = $2 OR receiver_id = $2)
         AND status = 'accepted'
       RETURNING id`,
      [req.params.friendshipId, req.user.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Amitié introuvable ou non autorisé' })
    }
    res.json({ success: true })
  } catch (err) {
    console.error('Erreur suppression ami:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
