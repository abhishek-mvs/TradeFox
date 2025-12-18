#!/bin/sh
set -e

echo "Waiting for database to be ready..."
until PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c '\q' 2>/dev/null; do
  >&2 echo "Database is unavailable - sleeping"
  sleep 1
done

>&2 echo "Database is up - running migrations"

# Run migrations using the compiled JavaScript
node dist/scripts/migrate.js || {
  echo "Migration failed, but continuing..."
}

echo "Migrations completed - seeding database"

# Run seed script to add test users and assets
node dist/scripts/seed.js || {
  echo "Seeding failed, but continuing..."
}

echo "Database setup completed - starting application"

# Start the application
exec "$@"

