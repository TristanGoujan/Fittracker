# Initialisation du projet FitTracker

> Guide pour Windows, avec VS Code, Node.js et Git déjà installés.
> Toutes les commandes sont à entrer dans le terminal intégré de VS Code (`` Ctrl+` ``).

---

## Prérequis
``
Ouvrir plusieurs onglets terminal dans VS Code avec le `+` en haut à droite du panneau terminal — un par service en cours de route (Docker, backend, frontend).

Pour choisir le shell par défaut : `Ctrl+Shift+P` → "Terminal: Select Default Profile" → PowerShell ou Command Prompt (les deux conviennent).

---

## 1. Installer Docker Desktop

Télécharger et installer Docker Desktop sur **docker.com/products/docker-desktop**. Au redémarrage, Docker tourne en arrière-plan dans la barre des tâches.

Vérifier l'installation :

```bash
docker --version
docker compose version
```

---

## 2. Créer le repo GitHub

Sur **github.com**, créer un nouveau repo appelé `fittracker`, cocher "Add a README file", laisser le reste par défaut. Puis cloner en local :

```bash
cd C:\Users\TonNom\Documents   # adapter selon où tu veux mettre tes projets
git clone https://github.com/ton-user/fittracker.git
cd fittracker
```

---

## 3. Initialiser le frontend

```bash
npm create vite@latest client -- --template react
cd client
npm install
```

Installer les dépendances du projet :

```bash
npm install react-router-dom
npm install animejs
npm install chart.js
```

Installer et configurer Tailwind :

```bash
npm install -D tailwindcss @tailwindcss/vite
```

Ouvrir `vite.config.js` et remplacer son contenu par :

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
})
```

Dans `client/src/index.css`, remplacer tout le contenu par une seule ligne :

```css
@import "tailwindcss";
```

Tester que tout démarre :

```bash
npm run dev
# → http://localhost:5173
```

---

## 4. Initialiser le backend

Revenir à la racine du projet :

```bash
cd ..
mkdir server
cd server
npm init -y
npm install express jsonwebtoken bcrypt pg cors dotenv
npm install -D nodemon
```

Dans `server/package.json`, ajouter dans `"scripts"` :

```json
"scripts": {
  "dev": "nodemon index.js",
  "start": "node index.js"
}
```

Créer le fichier `server/index.js` :

```js
const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`))
```

---

## 5. Configurer Docker pour PostgreSQL

À la racine du projet (pas dans `client/` ni `server/`), créer `docker-compose.yml` :

```yaml
services:
  postgres:
    image: postgres:16
    restart: always
    environment:
      POSTGRES_DB: fittracker
      POSTGRES_USER: fituser
      POSTGRES_PASSWORD: motdepasse
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  pgadmin:
    image: dpage/pgadmin4
    restart: always
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@fittracker.local
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "5050:80"

volumes:
  pgdata:
```

Créer `server/.env` :

```
DATABASE_URL=postgresql://fituser:motdepasse@localhost:5432/fittracker
JWT_SECRET=change_moi_avec_une_longue_chaine_aleatoire
PORT=3001
```

Lancer la base :

```bash
# Depuis la racine du projet
docker compose up -d
```

Vérifier que Postgres tourne en ouvrant **http://localhost:5050** dans le navigateur (pgAdmin). Se connecter avec `admin@fittracker.local` / `admin`, puis ajouter un serveur :

- Hôte : `postgres`
- Port : `5432`
- Utilisateur : `fituser`
- Mot de passe : `motdepasse`

---

## 6. Configurer le .gitignore

À la racine du projet, créer `.gitignore` :

```
# Dépendances
node_modules/
client/node_modules/
server/node_modules/

# Variables d'environnement — ne jamais commiter
.env
server/.env

# Build frontend
client/dist/

# Docker
pgdata/

# OS
.DS_Store
Thumbs.db
```

---

## 7. Premier commit

```bash
# Depuis la racine
git add .
git commit -m "chore: initialisation du projet (Vite + React + Express + Docker)"
git push origin main
```

---

## Vérification finale

À ce stade, trois terminaux doivent fonctionner simultanément :

```bash
# Terminal 1 — base de données (depuis la racine)
docker compose up -d

# Terminal 2 — backend
cd server && npm run dev
# Tester → http://localhost:3001/api/health  doit renvoyer {"status":"ok"}

# Terminal 3 — frontend
cd client && npm run dev
# Tester → http://localhost:5173  doit afficher la page Vite par défaut
```

Si les trois fonctionnent, la fondation est en place. Passer au jalon 2 : l'authentification.
