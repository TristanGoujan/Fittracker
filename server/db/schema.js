const pool = require('./pool')

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id        SERIAL PRIMARY KEY,
      username  VARCHAR(50)  UNIQUE NOT NULL,
      email     VARCHAR(255) UNIQUE NOT NULL,
      password  VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  console.log('Schéma initialisé')
}

module.exports = initSchema
