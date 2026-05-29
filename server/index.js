const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
require('dotenv').config()

const initSchema = require('./db/schema')
const authRoutes = require('./routes/auth')
const exercisesRoutes = require('./routes/exercises')
const sessionsRoutes = require('./routes/sessions')
const statsRoutes = require('./routes/stats')
const bodyweightRoutes = require('./routes/bodyweight')

const app = express()
app.use(helmet())
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
}))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/exercises', exercisesRoutes)
app.use('/api/sessions', sessionsRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/bodyweight', bodyweightRoutes)
app.use('/api/schedule', require('./routes/schedule'))
app.use('/api/friends', require('./routes/friends'))
app.use('/api/feed', require('./routes/feed'))
app.use('/api/social', require('./routes/social'))
app.use('/api/leaderboard', require('./routes/leaderboard'))
app.use('/api/profile', require('./routes/profile'))

app.get('/api/health', async (req, res) => {
  try {
    const pool = require('./db/pool')
    await pool.query('SELECT 1')
    res.json({ status: 'ok', db: 'connected' })
  } catch (err) {
    res.status(500).json({ status: 'error', db: err.message })
  }
})

// ── Initialisation du schéma ─────────────────────────────────────────────────
// On Vercel (serverless), chaque cold start doit attendre que les tables
// existent avant de traiter la première requête.
let _initPromise = null

function getInitPromise() {
  if (!_initPromise) _initPromise = initSchema()
  return _initPromise
}

app.use((req, res, next) => {
  getInitPromise()
    .then(() => next())
    .catch((err) => {
      console.error('Erreur init schéma:', err)
      res.status(500).json({ error: 'Erreur initialisation base de données' })
    })
})

// Export pour Vercel serverless
module.exports = app

// Démarrage local uniquement
if (require.main === module) {
  const PORT = process.env.PORT || 3001
  initSchema()
    .then(() => app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`)))
    .catch((err) => { console.error("Impossible d'initialiser la base de données:", err); process.exit(1) })
}
