#!/usr/bin/env bash
# Sauvegarde de la base SQLite + des fichiers uploadés (PDF, images).
# À planifier en cron sur le serveur, par exemple chaque nuit à 3h :
#   crontab -e  →  0 3 * * * /chemin/vers/s2-reussite/scripts/backup.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA_DIR="${DATA_DIR:-$ROOT/data}"
UPLOADS_DIR="${UPLOADS_DIR:-$ROOT/uploads}"
DEST="${BACKUP_DIR:-$ROOT/backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$DEST"
tar -czf "$DEST/s2-reussite-$STAMP.tar.gz" -C "$(dirname "$DATA_DIR")" "$(basename "$DATA_DIR")" -C "$(dirname "$UPLOADS_DIR")" "$(basename "$UPLOADS_DIR")"
echo "✔ Sauvegarde créée : $DEST/s2-reussite-$STAMP.tar.gz"

# Conservation : garde uniquement les 14 dernières sauvegardes
ls -1t "$DEST"/s2-reussite-*.tar.gz 2>/dev/null | tail -n +15 | xargs -r rm --
