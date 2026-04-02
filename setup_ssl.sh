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

DOMAIN="${SUBDOMAIN}.rag.reloto.ru"
EMAIL="ekirshin@gmail.com"
NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"

echo "🌐 Настройка поддомена $DOMAIN..."

# 1. Создаем конфигурацию Nginx
cat <<EOF > $NGINX_CONF
server {
    listen 80;
    server_name $DOMAIN;

    root /opt/RAG-online;
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

# 2. Активируем конфигурацию
ln -sf $NGINX_CONF /etc/nginx/sites-enabled/

# 3. Проверка конфигурации Nginx
nginx -t
if [ $? -ne 0 ]; then
    echo "❌ Ошибка в конфигурации Nginx"
    exit 1
fi

# 4. Перезагрузка Nginx для применения 80 порта (нужно для certbot)
systemctl reload nginx

# 5. Получение сертификата
echo "🔐 Запрос сертификата Let's Encrypt..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL

if [ $? -eq 0 ]; then
    echo "✅ Сертификат для $DOMAIN успешно установлен!"
else
    echo "❌ Ошибка при получении сертификата"
    exit 1
fi
