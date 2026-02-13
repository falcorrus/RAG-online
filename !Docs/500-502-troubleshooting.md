# Устранение ошибок 500/502 (Internal Server Error / Bad Gateway)

## Описание проблемы
Периодически возникает ошибка 500 (Internal Server Error) при попытке входа в систему или ошибка 502 (Bad Gateway), указывающая на недоступность бэкенд-сервиса. Логи `server.log` часто пустые, что затрудняет диагностику.

## Выявленные корневые причины

1.  **Поврежденный файл `tenants.json`:**
    *   `tenants.json` содержал усеченные или некорректные хеши паролей (например, `"password": "b2"` вместо полного bcrypt хеша).
    *   Это приводило к ошибке `passlib.exc.UnknownHashError: hash could not be identified` в Python-бэкенде при попытке верификации пароля.
    *   **Причина повреждения:** Некорректная запись во время регистрации нового пользователя, ручное редактирование или проблемы при синхронизации/деплое.

2.  **Конфликт портов Uvicorn / некорректный запуск Uvicorn:**
    *   Uvicorn не мог запуститься, выдавая ошибку `ERROR: [Errno 98] error while attempting to bind on address ('0.0.0.0', 8006): address already in use`.
    *   **Причина:** Сервис `systemd` (`rag-online.service`) с политикой `Restart=always` постоянно пытался запустить Uvicorn на порту 8006. Даже после остановки сервиса, `systemd` немедленно пытался его перезапустить, или оставался "висячий" процесс, удерживающий порт.
    *   Пустые логи `server.log` были следствием того, что Uvicorn падал на самом старте (из-за конфликта портов), не успевая инициализировать логирование.

## Процесс диагностики

1.  **Проверка логов Nginx (`/var/log/nginx/error.log`):**
    *   Показывает `connect() failed (111: Connection refused) while connecting to upstream`, что указывает на то, что Nginx не может связаться с Uvicorn.
2.  **Проверка статуса Uvicorn через `systemd` (`sudo systemctl status rag-online.service`):**
    *   Выявило статус `Active: activating (auto-restart) (Result: exit-code)`, подтверждая, что Uvicorn падал сразу после запуска, а `systemd` пытался его перезапустить.
3.  **Запуск Uvicorn в интерактивном режиме в SSH-сессии:**
    *   Обязательное условие для получения подробного traceback:
        *   **Остановить сервис `systemd`**: `sudo systemctl stop rag-online.service`.
        *   **Принудительно завершить все Uvicorn процессы**: `pkill -f uvicorn`.
        *   **Запустить вручную**: `cd /opt/RAG-online && /opt/RAG-online/venv/bin/python3 -m uvicorn server:app --host 0.0.0.0 --port 8006`
    *   В этом режиме был получен `passlib.exc.UnknownHashError` и `address already in use`.
4.  **Определение процесса, занимающего порт (`sudo lsof -i :8006`):**
    *   Показал PID процесса `python3`, который слушал порт 8006, что позволило принудительно его завершить.
5.  **Проверка содержимого `tenants.json` на сервере (`cat /opt/RAG-online/storage/tenants.json`):**
    *   Многократно выявлялось повреждение хешей паролей.

## Решение

1.  **Полностью остановить и отключить сервис `systemd` на время отладки:**
    ```bash
    ssh root@server.reloto.ru "sudo kill -9 \$(sudo lsof -t -i :8006) || true" # Убить текущий процесс на порту
    ssh root@server.reloto.ru "sudo systemctl stop rag-online.service"
    ssh root@server.reloto.ru "sudo systemctl disable rag-online.service --now" # Отключить автозапуск
    ```
    *   *Примечание:* `pkill -f uvicorn` также может помочь, но `lsof` более точен.

2.  **Обеспечить корректность файла `tenants.json` на сервере:**
    *   Создать или убедиться в наличии локального файла `/Users/eugene/MyProjects/RAG-online/storage/tenants.json` с правильными полными bcrypt хешами паролей для всех необходимых пользователей.
    *   **Залить корректный файл на сервер через `rsync`:**
        ```bash
        rsync -avz /Users/eugene/MyProjects/RAG-online/storage/tenants.json root@server.reloto.ru:/opt/RAG-online/storage/tenants.json
        ```
    *   **Обязательно проверить содержимое файла на сервере после заливки:**
        ```bash
        ssh root@server.reloto.ru "cat /opt/RAG-online/storage/tenants.json"
        ```
        Убедиться, что хеши полные и корректные.

3.  **Перезапустить сервис `systemd` для стабильной работы:**
    ```bash
    ssh root@server.reloto.ru "sudo systemctl enable rag-online.service"
    ssh root@server.reloto.ru "sudo systemctl start rag-online.service"
    ssh root@server.reloto.ru "sudo systemctl status rag-online.service" # Проверить статус
    ```
    *   Убедиться, что сервис `active (running)` и `enabled`.

## Важные выводы

*   **Всегда проверяйте `tenants.json`:** Повреждение этого файла является частой причиной ошибок аутентификации.
*   **Управляйте `systemd` осторожно:** При интерактивной отладке на VPS, всегда сначала останавливайте и отключайте соответствующий `systemd` сервис, чтобы избежать конфликтов портов.
*   **Используйте `lsof`:** Если возникает `address already in use`, `lsof -i :<port>` поможет найти виновный процесс.

На этом задача по устранению текущих ошибок считается выполненной.