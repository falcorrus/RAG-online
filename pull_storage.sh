#!/bin/bash

echo "🔄 Синхронизация данных пользователей с сервера..."

# Параметры сервера (берем из git remote vps)
REMOTE_USER="root"
REMOTE_HOST="server.reloto.ru"
REMOTE_PATH="/opt/easyFAQ.online/storage/"
LOCAL_PATH="./storage/"

# Используем rsync для скачивания (удаляет локальные файлы, если их нет на сервере)
rsync -avz --progress "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}" "${LOCAL_PATH}"

echo "✅ Данные обновлены!"
