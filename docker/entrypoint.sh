#!/usr/bin/env bash
set -e

# If running the web server (default)
if [ "$1" = 'apache2-foreground' ]; then
    echo "Running Symfony production startup..."
    
    # Wait for PostgreSQL if DATABASE_URL is set
    if [ -n "$DATABASE_URL" ]; then
        echo "Updating database schema..."
        php bin/console doctrine:schema:update --force --no-interaction || true
        
        # Seed initial templates and default facility if table is empty
        php bin/console doctrine:query:sql "SELECT COUNT(*) FROM facilities" | grep -q "0" && php bin/console app:seed:demo-data --no-interaction || true
    fi

    echo "Warming up production cache..."
    php bin/console cache:clear --no-interaction --no-debug || true
    php bin/console cache:warmup --no-interaction --no-debug || true

    echo "Setting permissions..."
    chown -R www-data:www-data var/

    echo "Starting Apache web server..."
fi

exec "$@"
