# Production Dockerfile for Maternal & Newborn Health Automated SMS Platform
FROM php:8.3-apache

# Set working directory
WORKDIR /var/www/html

# Install system dependencies & libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    unzip \
    libicu-dev \
    libpq-dev \
    libzip-dev \
    && rm -rf /var/lib/apt/lists/*

# Install required PHP extensions for Symfony, Ethiopian calendar & PostgreSQL
RUN docker-php-ext-configure intl \
    && docker-php-ext-install -j$(nproc) \
    intl \
    pdo_pgsql \
    pgsql \
    zip \
    opcache

# Enable Apache modules & custom virtual host
RUN a2enmod rewrite
COPY docker/apache.conf /etc/apache2/sites-available/000-default.conf

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Set production environment flags
ENV APP_ENV=prod
ENV APP_DEBUG=0

# Copy composer definition files first for optimal layer caching
COPY composer.json composer.lock ./

# Install dependencies without scripts (scripts need full app code)
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist

# Copy the rest of the application
COPY . .

# Generate optimized autoloader and execute post-install recipes
RUN composer dump-autoload --optimize --classmap-authoritative --no-dev \
    && composer run-script --no-dev post-install-cmd || true

# Prepare writable directories for Symfony
RUN mkdir -p var/cache var/log var/data \
    && chown -R www-data:www-data var/

# Configure entrypoint script
COPY docker/entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["apache2-foreground"]
