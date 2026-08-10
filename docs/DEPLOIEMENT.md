# ☁️ Guide de déploiement en production — S2 Réussite

Trois options selon votre budget et vos compétences. **Option A recommandée** pour démarrer vite
sans gérer de serveur.

---

## Option A — Render (recommandé, ~10 minutes)

Tout est déjà configuré dans `render.yaml` (Blueprint).

1. Poussez le projet sur un dépôt GitHub ou GitLab :
   ```bash
   git init && git add . && git commit -m "S2 Réussite v1"
   git remote add origin https://github.com/VOTRE_COMPTE/s2-reussite.git
   git push -u origin main
   ```
2. Sur [render.com](https://render.com) : **New + → Blueprint** → sélectionnez le dépôt.
3. Render détecte `render.yaml`. Renseignez les 4 variables demandées :
   - `ADMIN1_USERNAME` / `ADMIN1_PASSWORD` (vous)
   - `ADMIN2_USERNAME` / `ADMIN2_PASSWORD` (votre partenaire)
   `JWT_SECRET` est généré automatiquement.
4. Cliquez **Apply**. Après le build, la plateforme est en ligne sur
   `https://s2-reussite.onrender.com` (ou votre domaine personnalisé).

**Points importants**
- Le disque persistant (`/opt/render/s2-data`) conserve la base SQLite et les PDF entre les
  redéploiages. S'il n'est pas disponible sur le plan gratuit, passez au plan Starter (~7 $/mois).
- Plan gratuit : l'app « s'endort » après 15 min d'inactivité (la 1re requête prend ~30 s).
  Un plan payant évite cela.
- **Sauvegardes** : téléchargez régulièrement le contenu du disque (Render Dashboard → Disks),
  ou migrez vers l'Option C quand le projet grandit.

## Option B — Railway (~10 minutes)

1. `railway login` puis `railway init` dans le dossier du projet (ou via le dashboard GitHub).
2. Le `Procfile` (`web: node server/index.js`) est détecté automatiquement.
3. Ajoutez un **Volume** Railway monté sur `/data` et définissez :
   `DATA_DIR=/data` · `UPLOADS_DIR=/data/uploads` · `JWT_SECRET` · les 4 variables admin.
4. `railway up` ou push GitHub → déploiement automatique.

## Option C — VPS (Docker + Nginx + HTTPS, contrôle total)

Convient à n'importe quel VPS (Ubuntu 22.04+, 1 Go RAM suffit) : Contabo, OVH, DigitalOcean…

```bash
# 1. Installer Docker
curl -fsSL https://get.docker.com | sh

# 2. Récupérer le projet
git clone https://github.com/VOTRE_COMPTE/s2-reussite.git && cd s2-reussite

# 3. Configurer les secrets
cp .env.example .env
# Éditez .env : JWT_SECRET (openssl rand -hex 32) + mots de passe admin forts

# 4. Lancer
docker compose up -d --build

# 5. Sauvegardes quotidiennes (cron)
crontab -e   →   0 3 * * * /chemin/vers/s2-reussite/scripts/backup.sh
```

**Nginx + HTTPS** (`/etc/nginx/sites-available/s2-reussite`) :

```nginx
server {
    server_name votre-domaine.sn;

    client_max_body_size 30m;          # uploads PDF (25 Mo + marge)

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;            # indispensable : SSE (déconnexion temps réel)
        proxy_cache off;
        proxy_read_timeout 3600s;       # connexions SSE longues
    }
}
```

```bash
ln -s /etc/nginx/sites-available/s2-reussite /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
apt install certbot python3-certbot-nginx && certbot --nginx -d votre-domaine.sn
```

Variante sans Docker : `npm ci --omit=dev` + `npm run build` + `pm2 start server/index.js --name s2`
(`pm2 startup` pour la survie au redémarrage).

---

## 🗄️ Passer de SQLite à PostgreSQL (si besoin)

SQLite tient largement des centaines d'élèves connectés. Migrez seulement si vous avez
plusieurs serveurs ou des besoins d'analyse avancés :

1. Créez une base chez **Neon** (gratuit), **Supabase** ou **Aiven**.
2. Exécutez `scripts/schema-postgres.sql`.
3. Remplacez `better-sqlite3` par `pg` dans `server/db.js`
   (les requêtes sont déjà paramétrées : `?` → `$1`, `$2`…).
4. Déplacez le stockage de session (`eleves.session_jti`) tel quel — c'est lui qui garantit
   la session unique. Pour plusieurs instances serveur, déplacez aussi le hub de `server/sse.js`
   vers **Redis pub/sub** (Upstash, offre gratuite).

## 🔒 Checklist sécurité avant ouverture

- [ ] Mots de passe admin changés (pas ceux de la démo)
- [ ] `JWT_SECRET` aléatoire fort défini
- [ ] HTTPS actif et redirection HTTP → HTTPS
- [ ] `npm run smoke` exécuté sur le serveur de production (les 16 tests doivent passer)
- [ ] Test manuel : 2 appareils avec le même ID → le 1er est éjecté instantanément
- [ ] Test manuel : kill switch admin → élève déconnecté en temps réel
- [ ] Test manuel : accès à un PDF sans token → refusé (401)
- [ ] Sauvegardes automatisées (base + uploads) et test de restauration
- [ ] Suppression des élèves de démonstration via l'espace admin

## 📈 Tests de charge (fluidité mobile)

```bash
# 100 utilisateurs virtuels x 10 requêtes sur le catalogue de cours
npx artillery quick --count 100 --num 10 https://votre-domaine/api/eleve/cours \
  --headers '{"Authorization":"Bearer TOKEN_ELEVE"}'
```

Puis audit **Lighthouse** (Chrome → F12 → onglet Lighthouse, mode mobile) sur :
- la page de connexion,
- le tableau de bord élève,
- l'onglet Orientation (carrousel).

Objectifs : Performance ≥ 90, pas de blocage au scroll. Le bundle fait ~55 KB gzip, la lecture
vidéo est déléguée à YouTube (adaptive streaming) et les PDF de démo font ~2 Ko : la fluidité
mobile vient surtout de la qualité de votre hébergement et de la compression (gzip/brotli, actif
par défaut sur Render/Nginx).
