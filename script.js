document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const queryInput = document.getElementById('queryInput');
    const sendBtn = document.getElementById('sendBtn');
    const clearBtn = document.getElementById('clearBtn');
    const minimizeBtn = document.getElementById('minimizeBtn');
    const floatingBtn = document.getElementById('floatingBtn');
    const adminBtn = document.getElementById('adminBtn');
    const adminOverlay = document.getElementById('adminOverlay');
    const closeAdminBtn = document.getElementById('closeAdminBtn');
    const saveAdminBtn = document.getElementById('saveAdminBtn');
    const kbDropZone = document.getElementById('kbDropZone');
    const kbFileInput = document.getElementById('kbFileInput');
    const fileInfo = document.getElementById('fileInfo');
    const fileNameDisplay = fileInfo.querySelector('.file-name');
    const removeFileBtn = document.getElementById('removeFileBtn');
    const initiallyOpenToggle = document.getElementById('initiallyOpenToggle');
    const defaultLangSelect = document.getElementById('defaultLangSelect');

    const resultsArea = document.getElementById('resultsArea');
    const answerCard = document.getElementById('answerCard');
    const answerContent = document.getElementById('answerContent');
    const loader = document.getElementById('loader');
    const statusText = document.getElementById('statusText');
    const suggestions = document.querySelectorAll('.suggestion-chip');
    const langBtns = document.querySelectorAll('.lang-btn');

    // Auth Elements
    const authPanel = document.getElementById('authPanel');
    const settingsPanel = document.getElementById('settingsPanel');
    const authEmail = document.getElementById('authEmail');
    const authPass = document.getElementById('authPass');
    const authBtn = document.getElementById('authBtn');
    const authTitle = document.getElementById('authTitle');
    const toggleAuthMode = document.getElementById('toggleAuthMode');
    const authError = document.getElementById('authError');

    // State
    let currentLang = 'ru';
    let isRegisterMode = false;

    const translations = {
        ru: {
            title_main: "AI Knowledge Base",
            minimize_btn_title: "Свернуть",
            admin_btn_title: "Настройки",
            input_placeholder: "Задайте вопрос по базе знаний...",
            suggestion_1: "Как оформить отпуск?",
            suggestion_2: "График работы",
            suggestion_3: "Контакты HR",
            source_label: "Источник: Внутренняя документация",
            send_btn_aria: "Отправить",
            clear_btn_title: "Очистить",
            copy_btn_title: "Копировать",
            admin_title: "Настройки администратора",
            kb_upload_label: "База знаний (.md)",
            drop_zone_text: "Перетащите .md файл или кликните для выбора",
            initially_open_label: "Изначально открыто",
            default_lang_label: "Язык по умолчанию",
            save_btn: "Сохранить изменения",
            status_analyzing: "Анализирую базу знаний...",
            status_ai_thinking: "ИИ формирует ответ...",
            response_fallback: "Я поискал это в базе знаний, но не нашел точного совпадения. Попробуйте перефразировать вопрос."
        },
        en: {
            title_main: "AI Knowledge Base",
            minimize_btn_title: "Minimize",
            admin_btn_title: "Settings",
            input_placeholder: "Ask a question...",
            suggestion_1: "How to apply for leave?",
            suggestion_2: "Work schedule",
            suggestion_3: "HR Contacts",
            source_label: "Source: Internal Documentation",
            send_btn_aria: "Send",
            clear_btn_title: "Clear",
            copy_btn_title: "Copy",
            admin_title: "Admin Settings",
            kb_upload_label: "Knowledge Base (.md)",
            drop_zone_text: "Drag & drop .md file or click to browse",
            initially_open_label: "Initially open",
            default_lang_label: "Default Language",
            save_btn: "Save Changes",
            status_analyzing: "Analyzing knowledge base...",
            status_ai_thinking: "AI is thinking...",
            response_fallback: "I searched the knowledge base but couldn't find a match. Try rephrasing your question."
        }
    };

    // --- API Helpers ---
    async function apiRequest(path, method = 'GET', body = null) {
        const headers = { 'Content-Type': 'application/json' };
        const token = localStorage.getItem('token');
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const options = { method, headers };
        if (body) options.body = JSON.stringify(body);

        const response = await fetch(path, options);
        if (response.status === 401) {
            localStorage.removeItem('token');
            showAuth();
        }
        return response;
    }

    // --- Auth Logic ---
    function showAuth() {
        authPanel.classList.remove('hidden');
        settingsPanel.classList.add('hidden');
        adminOverlay.classList.remove('hidden');
    }

    async function handleAuth() {
        const email = authEmail.value;
        const password = authPass.value;
        const path = isRegisterMode ? '/api/auth/register' : '/api/auth/login';

        const resp = await fetch(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await resp.json();
        if (resp.ok) {
            localStorage.setItem('token', data.token);
            authError.classList.add('hidden');
            initSettings(); // Reload settings for this user
            authPanel.classList.add('hidden');
            settingsPanel.classList.remove('hidden');
        } else {
            authError.textContent = data.detail || 'Ошибка входа';
            authError.classList.remove('hidden');
        }
    }

    toggleAuthMode.addEventListener('click', () => {
        isRegisterMode = !isRegisterMode;
        authTitle.textContent = isRegisterMode ? 'Регистрация' : 'Вход в систему';
        authBtn.textContent = isRegisterMode ? 'Создать аккаунт' : 'Войти';
        toggleAuthMode.textContent = isRegisterMode ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Регистрация';
    });

    authBtn.addEventListener('click', handleAuth);

    // --- Settings & UI ---
    async function initSettings() {
        const token = localStorage.getItem('token');
        if (!token) return;

        const resp = await apiRequest('/api/tenant/settings');
        if (resp.ok) {
            const settings = await resp.json();
            if (!settings.initiallyOpen) document.body.classList.add('minimized');
            initiallyOpenToggle.checked = settings.initiallyOpen;
            defaultLangSelect.value = settings.defaultLang;
            setLanguage(settings.defaultLang);
        }

        const kbResp = await apiRequest('/api/tenant/kb');
        if (kbResp.ok) {
            const kbData = await kbResp.json();
            if (kbData.content) showFileInfo("Загруженная база знаний");
        }
    }

    async function saveSettings() {
        const settings = {
            initiallyOpen: initiallyOpenToggle.checked,
            defaultLang: defaultLangSelect.value
        };
        const resp = await apiRequest('/api/tenant/settings', 'POST', settings);
        if (resp.ok) {
            setLanguage(settings.defaultLang);
            adminOverlay.classList.add('hidden');
        }
    }

    async function handleFileSelect(file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target.result;
            const resp = await apiRequest('/api/tenant/kb', 'POST', { content });
            if (resp.ok) showFileInfo(file.name);
        };
        reader.readAsText(file);
    }

    async function processSearch(query) {
        if (!localStorage.getItem('token')) return showAuth();
        
        queryInput.blur();
        document.body.classList.add('has-results');
        resultsArea.classList.remove('hidden');
        answerCard.classList.add('hidden');
        loader.classList.remove('hidden');
        statusText.textContent = translations[currentLang]?.status_analyzing || "...";

        const resp = await apiRequest('/api/chat', 'POST', { query });
        const data = await resp.json();

        loader.classList.add('hidden');
        statusText.textContent = "";
        
        if (resp.ok) {
            typeWriterEffect(data.answer, answerContent);
            answerCard.classList.remove('hidden');
        } else {
            typeWriterEffect("Ошибка запроса. Пожалуйста, войдите снова.", answerContent);
        }
    }

    // --- Event Listeners ---
    if (adminBtn) adminBtn.addEventListener('click', () => {
        const token = localStorage.getItem('token');
        if (!token) showAuth();
        else {
            if (authPanel) authPanel.classList.add('hidden');
            if (settingsPanel) settingsPanel.classList.remove('hidden');
            adminOverlay.classList.remove('hidden');
        }
    });

    if (closeAdminBtn) closeAdminBtn.addEventListener('click', () => adminOverlay.classList.add('hidden'));
    if (saveAdminBtn) saveAdminBtn.addEventListener('click', saveSettings);
    if (kbDropZone) kbDropZone.addEventListener('click', () => kbFileInput.click());
    if (kbFileInput) kbFileInput.addEventListener('change', (e) => { if (e.target.files.length > 0) handleFileSelect(e.target.files[0]); });
    
    if (minimizeBtn) minimizeBtn.addEventListener('click', () => document.body.classList.add('minimized'));
    if (floatingBtn) floatingBtn.addEventListener('click', () => { 
        document.body.classList.remove('minimized'); 
        setTimeout(() => queryInput && queryInput.focus(), 300); 
    });

    if (langBtns) langBtns.forEach(btn => btn.addEventListener('click', () => setLanguage(btn.getAttribute('data-lang'))));

    if (sendBtn) sendBtn.addEventListener('click', () => { 
        const query = queryInput.value.trim(); 
        if (query) processSearch(query); 
    });

    if (queryInput) {
        queryInput.addEventListener('keydown', (e) => { 
            if (e.key === 'Enter' && !e.shiftKey) { 
                e.preventDefault(); 
                const query = queryInput.value.trim(); 
                if (query) processSearch(query); 
            } 
        });
        queryInput.addEventListener('input', () => {
            const val = queryInput.value.trim();
            if (val.length === 0) {
                document.body.classList.remove('has-results');
                resultsArea.classList.add('hidden');
            }
        });
    }

    // Helper Functions
    function showFileInfo(name) {
        fileNameDisplay.textContent = name;
        fileInfo.classList.remove('hidden');
        kbDropZone.querySelector('.drop-zone-content').classList.add('hidden');
    }

    function setLanguage(lang) {
        currentLang = translations[lang] ? lang : 'ru';
        document.documentElement.lang = currentLang;
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[currentLang][key]) el.textContent = translations[currentLang][key];
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (translations[currentLang][key]) el.placeholder = translations[currentLang][key];
        });
        if (langBtns) langBtns.forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-lang') === currentLang));
    }

    function typeWriterEffect(text, element) {
        element.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    }

    initSettings();
});
