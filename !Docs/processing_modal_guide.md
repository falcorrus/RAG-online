# Инструкция по использованию модального окна обработки (Processing Modal)

Для отображения длительных процессов (регистрация, настройка домена, индексация базы знаний) в проекте используется единый стиль модального окна `processingModal`.

## 1. Структура в HTML
Модальное окно определено в `index.html` и имеет следующую структуру:
```html
<div class="admin-overlay hidden" id="processingModal">
    <div class="admin-panel" style="max-width: 380px; text-align: center; padding: 40px 24px;">
        <div class="processing-loader">
            <div class="spinner"></div>
        </div>
        <h2 id="processingTitle" ...></h2>
        <p id="processingMessage" ...></p>
    </div>
</div>
```

## 2. Ключи перевода в script.js
Для каждого типа процесса должны быть определены заголовки и сообщения в объекте `translations`:

- **Для базы знаний:** `processing_kb_title`, `processing_kb_msg`
- **Для регистрации/SSL:** `setup_secure_title`, `setup_secure_msg`

## 3. Вызов из JavaScript
При активации процесса необходимо обновить текст и убрать класс `hidden`:

```javascript
if (processingModal) {
    const procTitle = document.getElementById('processingTitle');
    const procMsg = document.getElementById('processingMessage');
    
    if (procTitle && procMsg && translations[currentLang]) {
        procTitle.textContent = translations[currentLang].setup_secure_title;
        procMsg.textContent = translations[currentLang].setup_secure_msg;
    }
    
    processingModal.classList.remove('hidden');
}
```

## 4. Завершение
Поскольку модальное окно перекрывает весь интерфейс, оно обычно используется перед программной перезагрузкой страницы (`window.location.reload()`) или редиректом на другой домен.
