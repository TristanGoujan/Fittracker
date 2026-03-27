const express = require('express')
const cors = require('cors')
require('dotenv').config()

const initSchema = require('./db/schema')
const authRoutes = require('./routes/auth')
const exercisesRoutes = require('./routes/exercises')
const sessionsRoutes = require('./routes/sessions')

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/exercises', exercisesRoutes)
app.use('/api/sessions', sessionsRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

const PORT = process.env.PORT || 3001

initSchema()
  .then(() => {
    app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`))
  })
  .catch((err) => {
    console.error("Impossible d'initialiser la base de données:", err)
    process.exit(1)
  })
