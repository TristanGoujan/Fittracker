const pool = require('./pool')

const SEED_MUSCLE_GROUPS = [
  'Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Jambes', 'Abdominaux',
]

const SEED_EXERCISES = [
  // [name, muscle_group, equipment]
  // ── Pectoraux ──────────────────────────────────────────────────────────────
  ['Développé incliné machine',             'Pectoraux', 'Machine'],
  ['Développé incliné barre',               'Pectoraux', 'Barre'],
  ['Développé incliné haltères',            'Pectoraux', 'Haltères'],
  ['Développé couché machine',              'Pectoraux', 'Machine'],
  ['Développé couché barre',                'Pectoraux', 'Barre'],
  ['Développé couché haltères',             'Pectoraux', 'Haltères'],
  ['Pec deck machine',                      'Pectoraux', 'Machine'],
  ['Pec deck poulies',                      'Pectoraux', 'Poulies'],
  ['Écarté haltères',                       'Pectoraux', 'Haltères'],
  ['Pompes',                                'Pectoraux', 'Poids de corps'],
  // ── Dos ────────────────────────────────────────────────────────────────────
  ['Tractions',                             'Dos', 'Barre'],
  ['Tirage vertical machine',               'Dos', 'Machine'],
  ['Tirage vertical poulies',               'Dos', 'Poulies'],
  ['Tirage horizontal machine prise large', 'Dos', 'Machine'],
  ['Tirage horizontal machine prise serrée','Dos', 'Machine'],
  ['Tirage horizontal poulies prise large', 'Dos', 'Poulies'],
  ['Tirage horizontal poulies prise serrée','Dos', 'Poulies'],
  ['Tirage unilatéral poulies',             'Dos', 'Poulies'],
  ['Shrugs',                                'Dos', 'Haltères'],
  ['Soulevé de terre',                      'Dos', 'Barre'],
  ['Pullover',                              'Dos', 'Haltères'],
  // ── Épaules ────────────────────────────────────────────────────────────────
  ['Développé militaire',                   'Épaules', 'Barre'],
  ['Élévations latérales',                  'Épaules', 'Haltères'],
  ['Oiseau',                                'Épaules', 'Haltères'],
  // ── Biceps ─────────────────────────────────────────────────────────────────
  ['Curl marteau poulies',                  'Biceps', 'Poulies'],
  ['Curl marteau haltères',                 'Biceps', 'Haltères'],
  ['Curl classique',                        'Biceps', 'Haltères'],
  ['Curl barre',                            'Biceps', 'Barre'],
  ['Preacher curl machine',                 'Biceps', 'Machine'],
  ['Preacher curl haltères',                'Biceps', 'Haltères'],
  // ── Triceps ────────────────────────────────────────────────────────────────
  ['Pushdown poulies',                      'Triceps', 'Poulies'],
  ['Dips',                                  'Triceps', 'Poids de corps'],
  ['Kickback poulies',                      'Triceps', 'Poulies'],
  ['Kickback haltères',                     'Triceps', 'Haltères'],
  ['Skull crusher haltères',                'Triceps', 'Haltères'],
  ['Skull crusher barre',                   'Triceps', 'Barre'],
  ['Extension horizontale poulies haute',   'Triceps', 'Poulies'],
  // ── Jambes ─────────────────────────────────────────────────────────────────
  ['Presse à cuisses',                      'Jambes', 'Machine'],
  ['Squat',                                 'Jambes', 'Barre'],
  ['Leg extension',                         'Jambes', 'Machine'],
  ['Leg curl assis',                        'Jambes', 'Machine'],
  ['Leg curl allongé',                      'Jambes', 'Machine'],
  ['Fentes bulgares',                       'Jambes', 'Haltères'],
  ['Hip-thrust',                            'Jambes', 'Barre'],
  ['Hack squat',                            'Jambes', 'Machine'],
  ['Soulevé de terre roumain',              'Jambes', 'Barre'],
  ['Extension mollet presse',               'Jambes', 'Machine'],
  ['Extension mollet barre',                'Jambes', 'Barre'],
  ['Extension mollet hack squat',           'Jambes', 'Machine'],
  ['Extension mollet machine',              'Jambes', 'Machine'],
  // ── Abdominaux ─────────────────────────────────────────────────────────────
  ['Crunchs',                               'Abdominaux', 'Poids de corps'],
  ['Planche',                               'Abdominaux', 'Poids de corps'],
  ['Relevés de jambes',                     'Abdominaux', 'Poids de corps'],
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

  // Migration 005 — refonte de la liste d'exercices
  // Supprime les anciens exercices qui ne sont plus dans la nouvelle liste
  // UNIQUEMENT s'ils n'ont aucun historique (aucune session_exercises associée)
  await pool.query(`
    DELETE FROM exercises
    WHERE name IN (
      'Développé couché',
      'Développé incliné',
      'Dips pectoraux',
      'Rowing barre',
      'Tirage vertical',
      'Extension triceps poulie',
      'Dips triceps',
      'Barre au front',
      'Curl haltères',
      'Curl marteau',
      'Leg curl',
      'Fentes',
      'Mollets debout'
    )
    AND id NOT IN (
      SELECT DISTINCT exercise_id FROM session_exercises WHERE exercise_id IS NOT NULL
    )
  `)

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
