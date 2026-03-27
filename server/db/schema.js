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

  console.log('Schéma initialisé')
}

module.exports = initSchema
