const express = require('express')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const pool = require('../db/pool')

const router = express.Router()
const SALT_ROUNDS = 12

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
      return res.status(409).json({ error: 'Email ou nom d\'utilisateur déjà utilisé' })
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

module.exports = router
