#!/bin/bash

# ========================================
# Database Backup Script for tripsmgm_kpi
# ========================================
# IMPORTANT: Run this before any schema changes or migrations!
# Usage: ./scripts/backup-database.sh

# Load environment variables
source .env 2>/dev/null || echo "Warning: .env file not found"

# Configuration
DB_NAME="tripsmgm_kpi"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/tripsmgm_kpi_${TIMESTAMP}.sql"

# Extract MySQL credentials from DATABASE_URL
# Format: mysql://USER:PASSWORD@HOST:PORT/DATABASE
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL not set in .env file"
    exit 1
fi

# Parse DATABASE_URL
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

echo "========================================="
echo "📦 Starting MySQL Database Backup"
echo "========================================="
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USER"
echo "Backup file: $BACKUP_FILE"
echo ""

# Perform backup using mysqldump
echo "🔄 Exporting database..."
mysqldump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USER" \
  --password="$DB_PASS" \
  --databases "$DB_NAME" \
  --add-drop-database \
  --routines \
  --triggers \
  --events \
  --single-transaction \
  --quick \
  --lock-tables=false \
  --result-file="$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ]; then
    # Compress backup
    echo "🗜️  Compressing backup..."
    gzip "$BACKUP_FILE"
    BACKUP_FILE="${BACKUP_FILE}.gz"

    # Get file size
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

    echo ""
    echo "========================================="
    echo "✅ Backup completed successfully!"
    echo "========================================="
    echo "File: $BACKUP_FILE"
    echo "Size: $FILE_SIZE"
    echo ""
    echo "📋 To restore this backup later:"
    echo "   gunzip < $BACKUP_FILE | mysql -u $DB_USER -p $DB_NAME"
    echo ""

    # Keep only last 10 backups
    echo "🧹 Cleaning old backups (keeping last 10)..."
    ls -t ${BACKUP_DIR}/tripsmgm_kpi_*.sql.gz | tail -n +11 | xargs -r rm

    echo "✅ Done!"
else
    echo ""
    echo "❌ Backup failed! Please check your database connection."
    exit 1
fi
