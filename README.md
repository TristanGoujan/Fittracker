# FitTracker — Journal de bord du projet

> Application web personnelle de suivi de musculation. Hébergée localement, accessible à quelques amis. Ce fichier sert à la fois de documentation technique et de journal de progression — à relire avant chaque session de dev.

---

## Idée du projet

Une web app centrée sur la musculation avec :
- Un système de comptes utilisateurs (login / register)
- Un panneau de saisie de séances (exercices, séries, poids, reps, temps de repos)
- Un dashboard d'évolution avec graphiques
- Une base simple, extensible au fil des envies

L'ensemble du code est versionné sur GitHub pour garder une trace et constituer un portfolio.

---

## Stack technique

| Couche | Technologie | Rôle |
|---|---|---|
| Frontend | React (Vite) | Interface utilisateur |
| Styles | Tailwind CSS | Mise en forme |
| Routing | React Router | Navigation entre pages |
| Graphiques | Chart.js | Dashboard d'évolution |
| Animations | Anime.js | Transitions, feedback UI |
| Backend | Node.js + Express | API REST |
| Auth | JWT (JSON Web Tokens) | Sessions utilisateur |
| Base de données | PostgreSQL | Stockage des données |
| Local | Docker Compose | Lancer Postgres en local facilement |

### Pourquoi Chart.js et pas Recharts ?
Recharts est bien intégré à React mais difficile à personnaliser visuellement au-delà du style par défaut. Chart.js est plus bas niveau mais offre un contrôle total sur les couleurs, coins arrondis, lignes de référence — nécessaire pour le style sombre voulu. Les deux peuvent coexister : Chart.js pour les graphiques custom, Recharts en option pour des dataviz plus simples plus tard.

### Anime.js dans React — règle d'or
Toujours utiliser `useRef` pour cibler un élément et lancer l'animation dans `useEffect`. Ne jamais cibler par classe CSS globale. Toujours nettoyer avec `.pause()` ou `.cancel()` si besoin dans le `return` du `useEffect`.

---

## Architecture des fichiers

```
fittracker/
├── .gitignore                         # ne jamais commiter node_modules, .env
├── .env.example                       # template des variables d'environnement
├── docker-compose.yml                 # Postgres + pgAdmin en local
├── README.md                          # journal de bord du projet
├── init.md                            # guide d'initialisation
│
├── client/                            # ── Frontend React (Vite) ──────────────
│   ├── index.html
│   ├── vite.config.js                 # React + Tailwind plugin
│   ├── package.json
│   └── src/
│       ├── main.jsx                   # point d'entrée React
│       ├── App.jsx                    # routes principales (React Router)
│       ├── index.css                  # @import "tailwindcss" — c'est tout
│       │
│       ├── pages/                     # une page = une route
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   ├── Dashboard.jsx          # graphiques + stats
│       │   ├── NewSession.jsx         # saisie d'une séance
│       │   └── History.jsx            # séances passées
│       │
│       ├── components/                # blocs réutilisables
│       │   ├── Navbar.jsx
│       │   ├── StatCard.jsx           # carte de stat animée (Anime.js)
│       │   ├── VolumeChart.jsx        # Chart.js encapsulé (useRef + destroy)
│       │   ├── ActivityGrid.jsx       # grille CSS d'intensité
│       │   ├── ExerciseRow.jsx        # ligne exercice + séries
│       │   └── ProtectedRoute.jsx     # redirige vers /login si non connecté
│       │
│       ├── hooks/                     # logique réutilisable
│       │   ├── useAuth.js             # lecture / écriture du JWT
│       │   └── useWorkouts.js         # fetch des séances
│       │
│       └── api/                       # fonctions fetch vers le backend
│           ├── auth.js                # register, login
│           ├── sessions.js            # CRUD séances
│           └── stats.js              # volume, progression, activité
│
└── server/                            # ── Backend Node + Express ─────────────
    ├── index.js                       # point d'entrée Express
    ├── package.json
    ├── .env                           # ne jamais commiter
    │
    ├── routes/                        # endpoints de l'API
    │   ├── auth.js                    # POST /register  POST /login
    │   ├── sessions.js                # CRUD /sessions
    │   ├── exercises.js               # GET /exercises — catalogue
    │   └── stats.js                   # GET /stats/volume, /progress, /activity
    │
    ├── middleware/
    │   └── authMiddleware.js          # vérifie le JWT sur les routes protégées
    │
    └── db/
        └── pool.js                    # connexion PostgreSQL (pg)
```

### Notes sur le frontend

Le CSS n'est pas un fichier séparé à maintenir. Tailwind est branché comme plugin Vite — il détecte les classes utilisées dans les `.jsx` et génère les styles automatiquement en mémoire pendant le dev, et dans `client/dist/` au build. Tu écris uniquement du `className="..."` dans tes composants, rien d'autre.

```jsx
// Exemple — tout le style est dans className, pas de fichier CSS séparé
export default function StatCard({ label, value }) {
  return (
    <div className="bg-gray-900 rounded-xl p-6 flex flex-col gap-2">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className="text-white text-2xl font-medium">{value}</span>
    </div>
  )
}
```

### Notes sur `ProtectedRoute.jsx`

Composant React Router qui vérifie la présence du JWT avant d'afficher une page. Si le token est absent ou expiré, il redirige automatiquement vers `/login`. Toutes les pages privées (Dashboard, NewSession, History) passent par lui.

### Notes sur `VolumeChart.jsx`

Chart.js ne s'intègre pas comme un composant React classique — il manipule directement le DOM via un `<canvas>`. Le composant doit donc obligatoirement utiliser `useRef` pour pointer vers le canvas, initialiser Chart.js dans `useEffect`, et appeler `chart.destroy()` dans le cleanup du `useEffect` pour éviter les doublons au re-render.

---

## Schéma de base de données

### Tables principales

**`users`** — comptes utilisateurs
```
id            UUID  PRIMARY KEY
username      TEXT  NOT NULL
email         TEXT  UNIQUE NOT NULL
password_hash TEXT  NOT NULL
created_at    TIMESTAMP DEFAULT now()
```

**`workout_sessions`** — une séance d'entraînement
```
id            UUID  PRIMARY KEY
user_id       UUID  FK → users.id
name          TEXT                    ex: "Push day", "Full body"
session_date  DATE  NOT NULL
duration_min  INT                     durée totale en minutes
notes         TEXT                    notes libres
created_at    TIMESTAMP DEFAULT now()
```

**`muscle_groups`** — groupes musculaires (table de référence)
```
id    UUID  PRIMARY KEY
name  TEXT  NOT NULL               ex: "Pectoraux", "Dos", "Épaules"
```

**`exercises`** — catalogue d'exercices
```
id               UUID  PRIMARY KEY
name             TEXT  NOT NULL    ex: "Développé couché"
muscle_group_id  UUID  FK → muscle_groups.id
equipment        TEXT              ex: "Barre", "Haltères", "Machine"
description      TEXT
```

**`session_exercises`** — liaison séance ↔ exercice (avec ordre et repos)
```
id           UUID  PRIMARY KEY
session_id   UUID  FK → workout_sessions.id
exercise_id  UUID  FK → exercises.id
order_index  INT                   ordre dans la séance
rest_seconds INT                   temps de repos configuré
```

**`sets`** — chaque série individuelle
```
id                   UUID  PRIMARY KEY
session_exercise_id  UUID  FK → session_exercises.id
set_number           INT   NOT NULL
weight_kg            FLOAT               null si exercice au poids du corps
reps                 INT                 null si exercice au temps
duration_sec         INT                 pour plank, etc.
```

### Relations résumées
```
users
  └── workout_sessions (1 → n)
        └── session_exercises (1 → n)
              ├── sets (1 → n)
              └── exercises (n → 1)
                    └── muscle_groups (n → 1)
```

---

## Routes API

### Authentification
```
POST /api/auth/register     Créer un compte
POST /api/auth/login        Connexion → retourne un JWT
```

### Séances (routes protégées — JWT requis)
```
GET    /api/sessions            Liste des séances de l'utilisateur
POST   /api/sessions            Créer une nouvelle séance
GET    /api/sessions/:id        Détail d'une séance
DELETE /api/sessions/:id        Supprimer une séance
```

### Exercices
```
GET /api/exercises              Liste tous les exercices disponibles
GET /api/exercises/:id          Détail d'un exercice
```

### Stats / Dashboard
```
GET /api/stats/volume           Volume total par semaine/mois
GET /api/stats/progress/:exoId  Progression sur un exercice (poids max par date)
GET /api/stats/activity         Grille d'activité (nb séances par jour)
```

---

## Jalons de développement

Avance dans cet ordre. Chaque jalon = une branche Git + une PR.

### Jalon 1 — Mise en place du projet *(départ)*
- [ ] Créer le repo GitHub avec un README initial
- [ ] Initialiser le frontend : `npm create vite@latest client -- --template react`
- [ ] Installer et configurer Tailwind CSS
- [ ] Installer React Router, créer les routes de base (page d'accueil statique)
- [ ] Initialiser le dossier `server/` avec Express minimal
- [ ] Configurer `docker-compose.yml` pour Postgres
- [ ] Créer le fichier `.env.example`

**Concepts React à apprendre ici :** JSX, composants fonctionnels, props, structure d'un projet Vite.

---

### Jalon 2 — Authentification
- [ ] Backend : routes `/register` et `/login` avec hashage bcrypt + JWT
- [ ] Frontend : formulaires Login et Register
- [ ] Stocker le JWT dans `localStorage`
- [ ] Créer le hook `useAuth` (lire le token, logout)
- [ ] Protéger les routes React (rediriger si non connecté)

**Concepts React à apprendre ici :** `useState`, `useContext` (pour partager l'état auth), `useNavigate` (React Router).

---

### Jalon 3 — Saisie d'une séance *(cœur de l'app)*
- [ ] Page `NewSession.jsx` avec sélection de la date et du nom
- [ ] Ajouter des exercices à la séance (liste déroulante depuis `/api/exercises`)
- [ ] Pour chaque exercice : ajouter des séries (poids + reps + repos)
- [ ] Sauvegarder la séance complète via l'API
- [ ] Confirmation visuelle (animation Anime.js sur la validation)

**Concepts React à apprendre ici :** `useReducer` (état complexe de formulaire), `useEffect` (charger les exercices), gestion de formulaires imbriqués.

---

### Jalon 4 — Dashboard
- [ ] Récupérer les stats depuis `/api/stats/`
- [ ] Graphique de volume (barres Chart.js) avec toggle 7j / 30j
- [ ] Grille d'activité (CSS Grid, intensité par couleur)
- [ ] Cartes de stats : PR, volume total, nb de séances
- [ ] Animations d'entrée avec Anime.js (stagger sur les cartes)

**Concepts React à apprendre ici :** `useEffect` pour le chargement, `useRef` + Anime.js, encapsulation Chart.js dans un composant avec `destroy()` dans le cleanup.

---

### Jalon 5 — Historique et détail
- [ ] Page `History.jsx` : liste des séances passées
- [ ] Page de détail d'une séance (exercices + séries réalisées)
- [ ] Graphique de progression par exercice (poids max dans le temps)

---

### Jalon 6 — Polish et déploiement local
- [ ] Gestion des états de chargement (spinners, skeletons)
- [ ] Gestion des erreurs (messages si l'API est down)
- [ ] Responsive mobile (Tailwind breakpoints)
- [ ] Documenter le lancement local dans ce README
- [ ] Tester avec un ami : créer un compte, saisir une séance

---

## Hébergement

### Stratégie retenue : Raspberry Pi + Cloudflare Tunnel

Le site étant privé, à trafic quasi nul, et sans besoin d'être référencé, pas besoin de payer un hébergeur. La solution choisie est un **Raspberry Pi branché en permanence sur la box**, exposé via un **tunnel Cloudflare** pour être accessible depuis n'importe où avec une URL stable.

```
Internet (n'importe où)
        ↓
  monsite.com  (Cloudflare)
        ↓  tunnel chiffré
  Raspberry Pi  (chez soi, branché sur la box)
        ├── cloudflared
        ├── Node.js / Express
        └── PostgreSQL
```

**Pourquoi pas du self-hosting classique avec ouverture de port ?**
L'IP publique fournie par les opérateurs est dynamique (elle change). Il faudrait un service DDNS pour la suivre + ouvrir des ports sur la box. Cloudflare Tunnel évite tout ça : pas d'ouverture de port, pas d'IP fixe, HTTPS automatique.

**Pourquoi pas un VPS ?**
Pour ce volume de trafic, payer 4€/mois en permanence n'a pas de sens. Le Pi consomme ~4W et coûte moins de 2€/mois en électricité.

---

### Matériel

| Composant | Modèle recommandé | Prix indicatif |
|---|---|---|
| Carte | Raspberry Pi 4 — 4 Go RAM | ~70€ |
| Stockage | Carte microSD 32 Go (classe A2) | ~10€ |
| Alimentation | Officielle USB-C 5V/3A | ~10€ |
| Réseau | Câble Ethernet (connexion filaire obligatoire) | ~5€ |

Le Pi 4 4 Go est largement suffisant pour faire tourner Node, PostgreSQL et cloudflared simultanément. Le Pi 5 est plus puissant mais surdimensionné et plus cher pour ce cas d'usage.

---

### Mise en place — étapes

#### 1. Installer Raspberry Pi OS

Utiliser **Raspberry Pi Imager** (outil officiel) pour flasher la carte SD.
Choisir **Raspberry Pi OS Lite (64-bit)** — pas besoin d'interface graphique.
Dans les options avancées de l'imager : activer SSH, configurer un nom d'hôte, définir un utilisateur/mot de passe.

```bash
# Se connecter en SSH depuis n'importe quel PC du réseau local
ssh utilisateur@raspberrypi.local
```

#### 2. Installer Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v  # vérifier
```

#### 3. Installer PostgreSQL

```bash
sudo apt install -y postgresql
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Créer la base et l'utilisateur
sudo -u postgres psql
CREATE DATABASE fittracker;
CREATE USER fituser WITH PASSWORD 'motdepasse';
GRANT ALL PRIVILEGES ON DATABASE fittracker TO fituser;
\q
```

#### 4. Déployer l'application

```bash
# Cloner le repo
git clone https://github.com/ton-user/fittracker.git
cd fittracker

# Backend
cd server && npm install
# Créer le .env à partir de .env.example et remplir les valeurs

# Frontend — builder pour la prod
cd ../client && npm install && npm run build
# Le dossier dist/ contient les fichiers statiques à servir
```

#### 5. Installer PM2 (gestionnaire de processus)

PM2 garde l'application en vie et la relance automatiquement après un redémarrage du Pi.

```bash
sudo npm install -g pm2

# Lancer le backend
pm2 start server/index.js --name fittracker-api

# Servir le frontend buildé (ou configurer Nginx — voir ci-dessous)
pm2 startup  # génère la commande à copier-coller pour le démarrage auto
pm2 save
```

#### 6. Configurer Nginx comme reverse proxy

Nginx reçoit les requêtes HTTP et les redirige vers le bon service selon l'URL.

```bash
sudo apt install -y nginx
```

Créer `/etc/nginx/sites-available/fittracker` :

```nginx
server {
    listen 80;
    server_name _;

    # Frontend (fichiers statiques buildés)
    location / {
        root /home/utilisateur/fittracker/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/fittracker /etc/nginx/sites-enabled/
sudo nginx -t        # vérifier la config
sudo systemctl restart nginx
```

#### 7. Créer un tunnel Cloudflare

Prérequis : avoir un domaine géré par Cloudflare (achat ~10€/an sur cloudflare.com).

```bash
# Installer cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb

# Authentification (ouvre un lien dans le navigateur)
cloudflared tunnel login

# Créer le tunnel
cloudflared tunnel create fittracker

# Configurer : créer ~/.cloudflared/config.yml
```

Contenu de `~/.cloudflared/config.yml` :

```yaml
tunnel: <UUID-du-tunnel>
credentials-file: /home/utilisateur/.cloudflared/<UUID>.json

ingress:
  - hostname: monsite.com
    service: http://localhost:80
  - service: http_status:404
```

```bash
# Ajouter l'entrée DNS chez Cloudflare
cloudflared tunnel route dns fittracker monsite.com

# Lancer et activer au démarrage
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

Le site est maintenant accessible depuis `https://monsite.com` partout dans le monde, avec HTTPS automatique géré par Cloudflare.

---

### Mettre à jour l'app après un commit

```bash
ssh utilisateur@raspberrypi.local
cd fittracker
git pull

# Si changements backend
cd server && npm install
pm2 restart fittracker-api

# Si changements frontend
cd ../client && npm install && npm run build
# Nginx sert directement dist/, pas besoin de redémarrer
```

---

### Variables d'environnement sur le Pi

Le fichier `server/.env` sur le Pi (ne jamais commiter ce fichier) :

```
DATABASE_URL=postgresql://fituser:motdepasse@localhost:5432/fittracker
JWT_SECRET=un_secret_long_et_aleatoire_a_generer
PORT=3001
NODE_ENV=production
```

---

## Commandes utiles

### Lancer le projet en local

```bash
# 1. Démarrer la base de données
docker-compose up -d

# 2. Lancer le backend
cd server
npm install
npm run dev       # nodemon pour le hot-reload

# 3. Lancer le frontend (autre terminal)
cd client
npm install
npm run dev       # Vite sur http://localhost:5173
```

### Variables d'environnement (copier .env.example → .env)

```
DATABASE_URL=postgresql://postgres:password@localhost:5432/fittracker
JWT_SECRET=un_secret_tres_long_a_changer
PORT=3001
```

---

## Bonnes pratiques Git

- Une branche par jalon : `git checkout -b feature/auth`
- Commits en français, descriptifs : `feat: ajout du formulaire de login`
- Merger dans `main` via une Pull Request (même seul — ça entraîne le workflow)
- Soigner le `README.md` : screenshot de l'app dès que quelque chose de visuel existe

### Convention de nommage des commits
```
feat:     nouvelle fonctionnalité
fix:      correction de bug
style:    changement purement visuel
refactor: réécriture sans changer le comportement
docs:     modification de documentation
chore:    config, dépendances, etc.
```

---

## Ressources

### Documentation officielle
- React : https://react.dev/learn (le nouveau site, bien fait)
- Tailwind : https://tailwindcss.com/docs
- React Router : https://reactrouter.com/en/main
- Chart.js : https://www.chartjs.org/docs/latest/
- Anime.js : https://animejs.com/documentation
- Express : https://expressjs.com/fr/

### Concepts à comprendre dans l'ordre
1. `useState` — gérer un état local dans un composant
2. `useEffect` — faire quelque chose au montage / quand une valeur change
3. `useRef` — accéder directement à un élément DOM (pour Anime.js et Chart.js)
4. `useContext` — partager des données sans prop drilling (ex: auth)
5. `useReducer` — gérer un état complexe (ex: formulaire de séance)
6. Custom hooks (`use...`) — extraire de la logique réutilisable

---

## Notes personnelles

*(Zone libre — noter ici les décisions prises, les trucs qui ont bloqué, les idées d'évolution)*

- 
- 
- 

---

*Dernière mise à jour : ajout section hébergement Raspberry Pi + Cloudflare Tunnel*
