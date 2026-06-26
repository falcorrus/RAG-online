#!/bin/bash

# Проверка на root
if [ "$EUID" -ne 0 ]; then 
  echo "Пожалуйста, запустите от имени root (sudo)"
  exit 1
fi

SUBDOMAIN=$1
if [ -z "$SUBDOMAIN" ]; then
    echo "Использование: $0 <поддомен>"
    exit 1
fi

EMAIL="ekirshin@gmail.com"
EASYFAQ_DOMAIN="${SUBDOMAIN}.easyfaq.online"
RAG_DOMAIN="${SUBDOMAIN}.rag.reloto.ru"

EASYFAQ_CONF="/etc/nginx/sites-available/$EASYFAQ_DOMAIN"
RAG_CONF="/etc/nginx/sites-available/$RAG_DOMAIN"

echo "🌐 Настройка поддоменов для $SUBDOMAIN..."
echo "  - $EASYFAQ_DOMAIN (основной)"
echo "  - $RAG_DOMAIN (редирект)"

# 1. Создаем временную HTTP конфигурацию для easyfaq.online поддомена
cat <<EOF > $EASYFAQ_CONF
server {
    listen 80;
    server_name $EASYFAQ_DOMAIN;

    root /opt/easyFAQ.online;
    index index.html;
    client_max_body_size 50M;

    location /api/ {
        proxy_pass http://localhost:8006/api/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        try_files \$uri \$uri/ =404;
    }
}
EOF

# 2. Создаем временную HTTP конфигурацию для rag.reloto.ru поддомена (для прохождения проверки certbot)
cat <<EOF > $RAG_CONF
server {
    listen 80;
    server_name $RAG_DOMAIN;

    root /opt/easyFAQ.online;
    index index.html;
    client_max_body_size 50M;

    location / {
        try_files \$uri \$uri/ =404;
    }
}
EOF

# 3. Активируем конфигурации
ln -sf $EASYFAQ_CONF /etc/nginx/sites-enabled/
ln -sf $RAG_CONF /etc/nginx/sites-enabled/

# 4. Проверка конфигурации Nginx
nginx -t
if [ $? -ne 0 ]; then
    echo "❌ Ошибка в начальной конфигурации Nginx"
    exit 1
fi

# 5. Перезагрузка Nginx для применения 80 порта
systemctl reload nginx

# 6. Получение сертификата для easyfaq.online
echo "🔐 Запрос сертификата Let's Encrypt для $EASYFAQ_DOMAIN..."
certbot --nginx -d $EASYFAQ_DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect

if [ $? -eq 0 ]; then
    echo "✅ Сертификат для $EASYFAQ_DOMAIN успешно установлен!"
else
    echo "❌ Ошибка при получении сертификата для $EASYFAQ_DOMAIN"
    exit 1
fi

# 7. Получение сертификата для rag.reloto.ru (без флага redirect, так как мы сами настроим перенаправление)
echo "🔐 Запрос сертификата Let's Encrypt для $RAG_DOMAIN..."
certbot --nginx -d $RAG_DOMAIN --non-interactive --agree-tos --email $EMAIL

if [ $? -eq 0 ]; then
    echo "✅ Сертификат для $RAG_DOMAIN успешно установлен!"
else
    echo "❌ Ошибка при получении сертификата для $RAG_DOMAIN"
    exit 1
fi

# 8. Перезаписываем конфигурацию rag.reloto.ru на постоянный SSL-редирект
cat <<EOF > $RAG_CONF
server {
    listen 80;
    listen 443 ssl;
    server_name $RAG_DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$RAG_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$RAG_DOMAIN/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    return 301 https://$EASYFAQ_DOMAIN\$request_uri;
}
EOF

# 9. Финальная проверка и перезагрузка Nginx
nginx -t
if [ $? -ne 0 ]; then
    echo "❌ Ошибка в финальной конфигурации Nginx"
    exit 1
fi

systemctl reload nginx
echo "🎉 Настройка SSL для обоих доменов успешно завершена!"
