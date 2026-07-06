# easyfaq.online (Gemini File Search)

## Development & Running
- **Server Command:** `python3 -m uvicorn server:app --host 0.0.0.0 --port 8006 --reload`
- **Settings:** Данные 'Общие настройки' из Obsidian нельзя перефразировать.

## Deployment
- **Dev Env:** `deploy-dev.sh`
- **Main Env:** `deploy.sh`
- **Policy:** Всегда уточнять цель деплоя (Dev/Main) у пользователя и запрашивать окончательное подтверждение перед запуском скрипта.
- **Location on VPS:** `/root/projects/gemini-file-search/` (Alias 'vps')

## Generative UI (v1.1)
- **Streaming:** Включен по умолчанию (FastAPI `StreamingResponse` и SSE на клиенте).
- **Components Catalog:** [components_catalog.json](file:///Users/eugene/MyProjects/easyFAQ.online/components_catalog.json).
- **New Components:** Добавлен `<ui-accordion title="...">содержимое</ui-accordion>`.
