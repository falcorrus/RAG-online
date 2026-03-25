# RAG-online (Gemini File Search)

## Development & Running
- **Server Command:** `python3 -m uvicorn server:app --host 0.0.0.0 --port 8006 --reload`
- **Settings:** Данные 'Общие настройки' из Obsidian нельзя перефразировать.

## Deployment
- **Dev Env:** `deploy-dev.sh`
- **Main Env:** `deploy.sh`
- **Policy:** Всегда уточнять цель деплоя (Dev/Main) у пользователя.
- **Location on VPS:** `/root/projects/gemini-file-search/` (Alias 'vps')
