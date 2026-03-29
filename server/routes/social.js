const express = require('express')
const pool = require('../db/pool')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()
router.use(authMiddleware)

const ALLOWED_EMOJIS = ['💪', '🔥', '👊', '🎯', '⚡']

// POST /api/social/react — toggle/replace reaction
router.post('/react', async (req, res) => {
  const { session_id, emoji } = req.body
  if (!session_id || !emoji) return res.status(400).json({ error: 'session_id et emoji requis' })
  if (!ALLOWED_EMOJIS.includes(emoji)) return res.status(400).json({ error: 'Emoji non autorisé' })

  try {
    // Check session exists
    const sessionCheck = await pool.query('SELECT id FROM workout_sessions WHERE id = $1', [session_id])
    if (sessionCheck.rows.length === 0) return res.status(404).json({ error: 'Séance introuvable' })

    // Check existing reaction
    const existing = await pool.query(
      'SELECT id, emoji FROM session_reactions WHERE user_id = $1 AND session_id = $2',
      [req.user.id, session_id]
    )

    if (existing.rows.length > 0) {
      const prev = existing.rows[0]
      if (prev.emoji === emoji) {
        // Same emoji → toggle off (remove)
        await pool.query('DELETE FROM session_reactions WHERE id = $1', [prev.id])
        return res.json({ action: 'removed' })
      } else {
        // Different emoji → replace
        await pool.query('UPDATE session_reactions SET emoji = $1 WHERE id = $2', [emoji, prev.id])
        return res.json({ action: 'replaced', emoji })
      }
    } else {
      await pool.query(
        'INSERT INTO session_reactions (user_id, session_id, emoji) VALUES ($1, $2, $3)',
        [req.user.id, session_id, emoji]
      )
      return res.status(201).json({ action: 'added', emoji })
    }
  } catch (err) {
    console.error('Erreur réaction:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/social/session/:sessionId/comments
router.get('/session/:sessionId/comments', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         sc.id,
         sc.user_id,
         u.username,
         u.avatar_url,
         sc.content,
         sc.created_at
       FROM session_comments sc
       JOIN users u ON u.id = sc.user_id
       WHERE sc.session_id = $1
       ORDER BY sc.created_at ASC`,
      [req.params.sessionId]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('Erreur commentaires:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// POST /api/social/session/:sessionId/comment — add comment (friends only)
router.post('/session/:sessionId/comment', async (req, res) => {
  const { content } = req.body
  if (!content || content.trim().length === 0) return res.status(400).json({ error: 'Contenu requis' })
  if (content.length > 300) return res.status(400).json({ error: 'Commentaire trop long (max 300 caractères)' })

  const sessionId = parseInt(req.params.sessionId)

  try {
    // Get session owner
    const sessionCheck = await pool.query('SELECT user_id FROM workout_sessions WHERE id = $1', [sessionId])
    if (sessionCheck.rows.length === 0) return res.status(404).json({ error: 'Séance introuvable' })

    const ownerId = sessionCheck.rows[0].user_id

    // Allow commenting on own sessions
    if (ownerId !== req.user.id) {
      // Check friendship
      const friendCheck = await pool.query(
        `SELECT 1 FROM friendships
         WHERE status = 'accepted'
           AND ((sender_id = $1 AND receiver_id = $2)
             OR (sender_id = $2 AND receiver_id = $1))`,
        [req.user.id, ownerId]
      )
      if (friendCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Vous devez être ami avec le propriétaire de la séance pour commenter' })
      }
    }

    const result = await pool.query(
      `INSERT INTO session_comments (user_id, session_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, session_id, content, created_at`,
      [req.user.id, sessionId, content.trim()]
    )

    // Return with username
    const row = result.rows[0]
    const user = await pool.query('SELECT username, avatar_url FROM users WHERE id = $1', [req.user.id])
    res.status(201).json({
      ...row,
      username: user.rows[0].username,
      avatar_url: user.rows[0].avatar_url,
    })
  } catch (err) {
    console.error('Erreur ajout commentaire:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// DELETE /api/social/comment/:commentId — delete own comment
router.delete('/comment/:commentId', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM session_comments WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.commentId, req.user.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Commentaire introuvable ou non autorisé' })
    }
    res.json({ success: true })
  } catch (err) {
    console.error('Erreur suppression commentaire:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
