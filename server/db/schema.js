const pool = require('./pool')

const SEED_MUSCLE_GROUPS = [
  'Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Jambes', 'Abdominaux',
]

const SEED_EXERCISES = [
  // [name, muscle_group, equipment]
  ['Développé couché', 'Pectoraux', 'Barre'],
  ['Développé incliné', 'Pectoraux', 'Haltères'],
  ['Écarté haltères', 'Pectoraux', 'Haltères'],
  ['Dips pectoraux', 'Pectoraux', 'Barre parallèle'],
  ['Tractions', 'Dos', 'Barre'],
  ['Rowing barre', 'Dos', 'Barre'],
  ['Tirage vertical', 'Dos', 'Poulie'],
  ['Soulevé de terre', 'Dos', 'Barre'],
  ['Développé militaire', 'Épaules', 'Barre'],
  ['Élévations latérales', 'Épaules', 'Haltères'],
  ['Oiseau', 'Épaules', 'Haltères'],
  ['Curl barre', 'Biceps', 'Barre'],
  ['Curl haltères', 'Biceps', 'Haltères'],
  ['Curl marteau', 'Biceps', 'Haltères'],
  ['Extension triceps poulie', 'Triceps', 'Poulie'],
  ['Dips triceps', 'Triceps', 'Barre parallèle'],
  ['Barre au front', 'Triceps', 'Barre'],
  ['Squat', 'Jambes', 'Barre'],
  ['Presse à cuisses', 'Jambes', 'Machine'],
  ['Leg curl', 'Jambes', 'Machine'],
  ['Fentes', 'Jambes', 'Haltères'],
  ['Mollets debout', 'Jambes', 'Machine'],
  ['Crunchs', 'Abdominaux', 'Poids de corps'],
  ['Planche', 'Abdominaux', 'Poids de corps'],
  ['Relevés de jambes', 'Abdominaux', 'Poids de corps'],
]

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL PRIMARY KEY,
      username   VARCHAR(50)  UNIQUE NOT NULL,
      email      VARCHAR(255) UNIQUE NOT NULL,
      password   VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS muscle_groups (
      id   SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS exercises (
      id              SERIAL PRIMARY KEY,
      name            VARCHAR(200) UNIQUE NOT NULL,
      muscle_group_id INTEGER REFERENCES muscle_groups(id),
      equipment       VARCHAR(100),
      description     TEXT
    )
  `)

  // Migration 001 — colonnes de profil utilisateur
  await pool.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS avatar_url    TEXT,
      ADD COLUMN IF NOT EXISTS weight_kg     NUMERIC(5,2),
      ADD COLUMN IF NOT EXISTS height_cm     INTEGER,
      ADD COLUMN IF NOT EXISTS birth_date    DATE,
      ADD COLUMN IF NOT EXISTS goal          VARCHAR(50),
      ADD COLUMN IF NOT EXISTS weekly_target INTEGER
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS workout_sessions (
      id           SERIAL PRIMARY KEY,
      user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name         VARCHAR(200),
      session_date DATE NOT NULL,
      duration_min INTEGER,
      notes        TEXT,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS session_exercises (
      id          SERIAL PRIMARY KEY,
      session_id  INTEGER REFERENCES workout_sessions(id) ON DELETE CASCADE,
      exercise_id INTEGER REFERENCES exercises(id),
      order_index INTEGER NOT NULL,
      rest_seconds INTEGER DEFAULT 90
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sets (
      id                  SERIAL PRIMARY KEY,
      session_exercise_id INTEGER REFERENCES session_exercises(id) ON DELETE CASCADE,
      set_number          INTEGER NOT NULL,
      weight_kg           NUMERIC(6,2),
      reps                INTEGER,
      duration_sec        INTEGER
    )
  `)

  // Migration 002 — suivi du poids corporel
  await pool.query(`
    CREATE TABLE IF NOT EXISTS body_weight_entries (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
      weight_kg  NUMERIC(5,2) NOT NULL,
      entry_date DATE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (user_id, entry_date)
    )
  `)

  // Migration 003 — programme courant + calendrier hebdomadaire
  await pool.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS current_program VARCHAR(50)
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS weekly_schedule (
      id           SERIAL PRIMARY KEY,
      user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
      day_of_week  INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
      label        VARCHAR(100) NOT NULL DEFAULT 'Repos',
      UNIQUE (user_id, day_of_week)
    )
  `)

  // Seed muscle groups
  for (const name of SEED_MUSCLE_GROUPS) {
    await pool.query(
      'INSERT INTO muscle_groups (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
      [name]
    )
  }

  // Seed exercises
  for (const [name, muscleGroup, equipment] of SEED_EXERCISES) {
    const mg = await pool.query('SELECT id FROM muscle_groups WHERE name = $1', [muscleGroup])
    if (mg.rows.length > 0) {
      await pool.query(
        'INSERT INTO exercises (name, muscle_group_id, equipment) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING',
        [name, mg.rows[0].id, equipment]
      )
    }
  }

  // Migration 004 — système social (amis, réactions, commentaires)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS friendships (
      id          SERIAL PRIMARY KEY,
      sender_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,
      receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      status      VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','blocked')),
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (sender_id, receiver_id)
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS session_reactions (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
      session_id INTEGER REFERENCES workout_sessions(id) ON DELETE CASCADE,
      emoji      VARCHAR(10) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (user_id, session_id)
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS session_comments (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
      session_id INTEGER REFERENCES workout_sessions(id) ON DELETE CASCADE,
      content    VARCHAR(300) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  console.log('Schéma initialisé')
}

module.exports = initSchema
