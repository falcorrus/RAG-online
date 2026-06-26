# Решения (Solutions Register)

## [2026-06-26] Ошибка 502 при регистрации нового пользователя и недоступность поддоменов .easyfaq.online

### Описание проблемы
При регистрации нового пользователя через API (например, для поддомена `spain`) возникала ошибка 502 Bad Gateway при попытке открыть ссылку вида `https://spain.easyfaq.online/?token=...`.
Причиной было то, что скрипт настройки SSL `setup_ssl.sh` на VPS конфигурировал Nginx только для поддомена `${subdomain}.rag.reloto.ru`, но не создавал конфигурационный файл и SSL-сертификат для `${subdomain}.easyfaq.online`, который выдается пользователям в качестве основного адреса.

### Решение
1. **Ручное исправление на VPS**:
   - Создан конфигурационный файл Nginx `/etc/nginx/sites-available/spain.easyfaq.online` с проксированием `/api/` на порт 8006 и отдачей статики из `/opt/easyFAQ.online`.
   - Создан симлинк в `sites-enabled`.
   - Получен SSL-сертификат Let's Encrypt для `spain.easyfaq.online`.
   - Файл `/etc/nginx/sites-available/spain.rag.reloto.ru` переписан на чистый 301-редирект на `https://spain.easyfaq.online$request_uri` с использованием SSL.
   - Nginx успешно перезапущен.

2. **Автоматизация**:
   - Переписан скрипт [setup_ssl.sh](file:///Users/eugene/MyProjects/easyFAQ.online/setup_ssl.sh). Теперь он автоматически:
     - Создает временные HTTP-конфиги для обоих доменов (`${subdomain}.easyfaq.online` и `${subdomain}.rag.reloto.ru`).
     - Получает SSL-сертификаты для обоих доменов по отдельности.
     - Переписывает конфиг `${subdomain}.rag.reloto.ru` на постоянный 301-редирект на `https://${subdomain}.easyfaq.online$request_uri`.
     - Применяет настройки в Nginx.
   - Скрипт задеплоен на VPS через `deploy.sh`.
