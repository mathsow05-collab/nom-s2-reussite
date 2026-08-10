# 🎓 S2 Réussite — Plateforme e-learning sécurisée

Plateforme de cours en ligne pour les élèves de la série **S2** (Maths, Physique-Chimie, Français,
Histoire-Géographie) avec **catalogue d'orientation post-Bac**, accès par **ID unique** et
**session unique stricte** (kill switch administrateur en temps réel).

---

## 🧱 Stack technique

| Couche | Choix | Pourquoi |
|---|---|---|
| Backend | **Node.js + Express** | Simple, rapide, parfait pour une API + fichiers |
| Frontend | **React 18 + Vite** | Build léger (~55 KB gzip), mobile-first |
| Base de données | **SQLite** (better-sqlite3), schéma prêt pour PostgreSQL | Zéro config pour démarrer, migration facile (voir §Déploiement) |
| Sessions | **JWT HS256** + registre de session en base + **SSE** | Session unique stricte, déconnexion instantanée |
| Uploads | **Multer** (PDF ≤ 25 Mo, images ≤ 5 Mo, types vérifiés) | Sécurité des fichiers |
| Mots de passe | **scrypt** (crypto natif Node) | Pas de dépendance, robuste |

```
s2-reussite/
├── server/                 # API Express
│   ├── index.js            # Serveur, sécurité (CSP…), statiques
│   ├── db.js               # Schéma SQLite (admins, eleves, cours, metiers, logs)
│   ├── security.js         # scrypt, JWT HS256, générateur d'ID, rate-limit
│   ├── middleware.js       # requireAdmin / requireEleve (session unique)
│   ├── sse.js              # Hub temps réel (déconnexion forcée)
│   └── routes/             # admin.js et eleve.js
├── client/                 # React + Vite
│   └── src/
│       ├── pages/          # Login élève, app élève, orientation, admin
│       └── admin/          # Dashboard, élèves, cours, métiers
├── uploads/                # PDF par matière : maths/, physique-chimie/, francais/, histoire-geographie/
├── data/s2reussite.db      # Base (créée automatiquement)
├── scripts/                # Générateur de PDF démo + smoke test
└── .env                    # Configuration (PORT, JWT_SECRET, comptes admin)
```

## 🚀 Lancer le projet

```bash
npm install                 # dépendances serveur (déjà fait)
cd client && npm install    # dépendances frontend (déjà fait)
cd ..
npm run build               # compile le frontend
npm run seed:pdfs           # (re)génère les PDF de démonstration
npm start                   # démarre sur http://localhost:3000
npm run smoke               # tests de sécurité bout-en-bout (16 checks)
```

## 🔐 Comptes de démonstration (voir `demo-accounts.txt`)

**Administrateurs** (`/#/admin`) :
- `admin` / `Admin#S2-2026`
- `partenaire` / `Partenaire#S2-2026`

**Élèves** (page d'accueil `/`) :
- Awa Diop → `S2-BC8B-Z94HY`
- Moussa Ndiaye → `S2-4XH2-58RR6`
- Fatou Sarr → `S2-5XQX-JRHK9`

> ⚠️ **À changer immédiatement avant la production** dans `.env` (mots de passe admin + `JWT_SECRET`).

## ✅ Fonctionnalités livrées

### Phase 1 — Architecture
- Arborescence propre, variables d'environnement (`.env` / `.env.example`), schéma de données :
  `admins`, `eleves`, `cours`, `metiers`, `logs`.

### Phase 2 — Backend & sécurité
- **Générateur d'ID** : alphabet sans caractères ambigus (pas de 0/O/1/I/L), 8 caractères tirés avec
  `crypto.randomInt` + caractère de contrôle → non séquentiel, non prédictible, vérification anti-collision.
- **Session unique stricte** : chaque connexion génère un `jti` stocké en base ; toute nouvelle
  connexion **écrase** la précédente. L'ancien appareil est prévenu **en temps réel via SSE**
  (avec vérification périodique en filet de sécurité) et affiche un écran explicatif.
- **Kill switch** : un clic admin → l'ID est révoqué, le token invalidé, l'élève déconnecté instantanément.
- Rate-limiting sur les logins, requêtes paramétrées (anti-injection SQL), CSP + en-têtes de sécurité,
  PDF servis uniquement aux sessions valides.

### Phase 3 — Espace administrateur
- Connexion réservée (2 comptes), tableau de bord (élèves, sessions actives, cours, logs d'audit),
  génération d'ID, liste des élèves avec statut « En session », boutons **Révoquer / Réactiver /
  Régénérer l'ID / Supprimer**, CRUD complet des cours (lien YouTube **non répertorié** + upload PDF
  classé par dossier de matière), CRUD du catalogue métiers avec upload d'images.

### Phase 4 — Espace élève
- **Mobile-first** (grille responsive, onglets, carrousel snap), login minimaliste à **un seul champ**,
  onglets par matière, lecteur YouTube `youtube-nocookie` avec `rel=0` (pas de suggestions externes),
  visionneuse PDF intégrée + téléchargement, **carrousel d'orientation S2** avec fiches métiers,
  images et débouchés.

## ☁️ Phase 5 — Déploiement en production

**Guide complet : [`docs/DEPLOIEMENT.md`](docs/DEPLOIEMENT.md)**

Fichiers de déploiement inclus :
- `render.yaml` — déploiement Render en un clic (disque persistant, secrets générés)
- `Dockerfile` + `docker-compose.yml` + `Procfile` — VPS ou Railway
- `scripts/backup.sh` — sauvegarde quotidienne base + PDF (cron)
- `scripts/schema-postgres.sql` — migration vers PostgreSQL (Neon/Supabase)
- `server/paths.js` — redirection des données vers disque persistant (`DATA_DIR`, `UPLOADS_DIR`)

Résumé express :
1. **Render** (recommandé) : push GitHub → New + → Blueprint → choisir le dépôt → renseigner les
   mots de passe admin → en ligne en ~10 min.
2. **VPS** : `docker compose up -d --build` + Nginx + Certbot (config fournie dans le guide).
3. Avant ouverture : changez les mots de passe de démo, lancez `npm run smoke` sur le serveur,
   testez la session unique et le kill switch depuis deux appareils réels.

## 🧪 Tests

```bash
npm run smoke
```
Couvre : santé API, login admin, **session unique** (appareil A éjecté quand B se connecte),
lecture PDF authentifiée, refus sans session, **kill switch**, refus d'un ID révoqué, réactivation.

---
Fait avec ❤️ à Thiès — bon courage pour le Bac S2 !
