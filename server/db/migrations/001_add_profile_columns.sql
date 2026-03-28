-- Migration 001 : ajout des colonnes de profil utilisateur
-- À exécuter manuellement si la base existe déjà,
-- ou automatiquement via initSchema() au démarrage du serveur.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_url    TEXT,
  ADD COLUMN IF NOT EXISTS weight_kg     NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS height_cm     INTEGER,
  ADD COLUMN IF NOT EXISTS birth_date    DATE,
  ADD COLUMN IF NOT EXISTS goal          VARCHAR(50),
  ADD COLUMN IF NOT EXISTS weekly_target INTEGER;
