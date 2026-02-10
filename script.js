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
    const suggestionsContainer = document.getElementById('suggestions');
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
            input_placeholder: "Задайте вопрос по базе знаний...",
            suggestion_1: "Как оформить отпуск?",
            suggestion_2: "График работы",
            suggestion_3: "Контакты HR",
            source_label: "Источник: Внутренняя документация",
            admin_title: "Настройки администратора",
            kb_upload_label: "База знаний (.md)",
            drop_zone_text: "Перетащите .md файл или кликните для выбора",
            initially_open_label: "Изначально открыто",
            default_lang_label: "Язык по умолчанию",
            save_btn: "Сохранить изменения",
            status_analyzing: "Анализирую базу знаний...",
            status_ai_thinking: "ИИ формирует ответ..."
        },
        en: {
            title_main: "AI Knowledge Base",
            input_placeholder: "Ask a question...",
            suggestion_1: "How to apply for leave?",
            suggestion_2: "Work schedule",
            suggestion_3: "HR Contacts",
            source_label: "Source: Internal Documentation",
            admin_title: "Admin Settings",
            kb_upload_label: "Knowledge Base (.md)",
            drop_zone_text: "Drag & drop .md file or click to browse",
            initially_open_label: "Initially open",
            default_lang_label: "Default Language",
            save_btn: "Save Changes",
            status_analyzing: "Analyzing knowledge base...",
            status_ai_thinking: "AI is thinking..."
        },
        pt: {
            title_main: "Base de Conhecimento AI",
            input_placeholder: "Faça uma pergunta...",
            suggestion_1: "Como solicitar férias?",
            suggestion_2: "Horário de trabalho",
            suggestion_3: "Contatos de RH",
            source_label: "Fonte: Documentação Interna",
            admin_title: "Configurações do Administrador",
            kb_upload_label: "Base de Conhecimento (.md)",
            drop_zone_text: "Arraste um arquivo .md ou clique para selecionar",
            initially_open_label: "Abrir inicialmente",
            default_lang_label: "Idioma padrão",
            save_btn: "Salvar alterações",
            status_analyzing: "Analisando base de conhecimento...",
            status_ai_thinking: "IA está pensando..."
        }
    };

    // --- API Helpers ---
    async function apiRequest(path, method = 'GET', body = null) {
        const headers = { 'Content-Type': 'application/json' };
        const token = localStorage.getItem('token');
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const options = { method, headers };
        if (body) options.body = JSON.stringify(body);

        try {
            const response = await fetch(path, options);
            if (response.status === 401) {
                localStorage.removeItem('token');
                showAuth();
            }
            return response;
        } catch (err) {
            console.error("API Request Failed:", err);
            throw err;
        }
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

        if (!email || !password) {
            authError.textContent = 'Введите email и пароль';
            authError.classList.remove('hidden');
            return;
        }

        try {
            const resp = await fetch(path, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await resp.json();
            if (resp.ok) {
                localStorage.setItem('token', data.token);
                authError.classList.add('hidden');
                
                gtag('event', isRegisterMode ? 'sign_up' : 'login', {
                    'method': 'email',
                    'tenant_subdomain': data.subdomain || 'unknown'
                });

                await initSettings();
                adminOverlay.classList.add('hidden');
                authPanel.classList.add('hidden');
                settingsPanel.classList.remove('hidden');
            } else {
                authError.textContent = data.detail || 'Ошибка входа';
                authError.classList.remove('hidden');
            }
        } catch (err) {
            authError.textContent = 'Ошибка сети. Проверьте сервер.';
            authError.classList.remove('hidden');
        }
    }

    if (toggleAuthMode) {
        toggleAuthMode.addEventListener('click', () => {
            isRegisterMode = !isRegisterMode;
            authTitle.textContent = isRegisterMode ? 'Регистрация' : 'Вход в систему';
            authBtn.textContent = isRegisterMode ? 'Создать аккаунт' : 'Войти';
            toggleAuthMode.textContent = isRegisterMode ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Регистрация';
        });
    }

    if (authBtn) authBtn.addEventListener('click', handleAuth);

    // --- Settings & UI ---
    async function initSettings() {
        const token = localStorage.getItem('token');
        if (!token) {
            await loadSuggestions();
            return;
        }

        try {
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
                if (kbData.content && kbData.content.trim().length > 0) {
                    showFileInfo("Загруженная база знаний");
                }
            }
            await loadSuggestions();
        } catch (err) {
            console.error("Init settings failed", err);
        }
    }

    async function loadSuggestions() {
        if (!suggestionsContainer) return;
        try {
            const resp = await apiRequest(`/api/suggestions?lang=${currentLang}`);
            if (resp.ok) {
                const data = await resp.json();
                suggestionsContainer.innerHTML = '';
                data.suggestions.forEach(text => {
                    const chip = document.createElement('div');
                    chip.className = 'suggestion-chip';
                    chip.textContent = text;
                    chip.addEventListener('click', () => {
                        if (queryInput) {
                            queryInput.value = text;
                            updateInputState();
                            processSearch(text);
                        }
                    });
                    suggestionsContainer.appendChild(chip);
                });
            }
        } catch (err) {
            console.warn("Failed to load suggestions", err);
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
        if (!file.name.toLowerCase().endsWith('.md')) {
            alert("Пожалуйста, выберите файл в формате .md");
            return;
        }
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target.result;
            try {
                const resp = await apiRequest('/api/tenant/kb', 'POST', { content });
                if (resp.ok) {
                    gtag('event', 'kb_upload', { 'file_name': file.name, 'file_size': file.size });
                    showFileInfo(file.name);
                    await loadSuggestions();
                } else {
                    const errorData = await resp.json();
                    alert("Ошибка при загрузке: " + (errorData.detail || "Неизвестная ошибка"));
                }
            } catch (err) {
                alert("Ошибка сети при загрузке файла.");
            }
        };
        reader.readAsText(file);
    }

    async function processSearch(query) {
        queryInput.blur();
        document.body.classList.add('has-results');
        resultsArea.classList.remove('hidden');
        answerCard.classList.add('hidden');
        loader.classList.remove('hidden');
        statusText.textContent = translations[currentLang]?.status_analyzing || "...";

        try {
            const resp = await apiRequest('/api/chat', 'POST', { query, lang: currentLang });
            const data = await resp.json();

            loader.classList.add('hidden');
            statusText.textContent = "";
            
            if (resp.ok) {
                gtag('event', 'search', { 'search_term': query, 'hostname': window.location.hostname });
                typeWriterEffect(data.answer, answerContent);
                answerCard.classList.remove('hidden');
            } else {
                typeWriterEffect(data.answer || "Ошибка сервера.", answerContent);
                answerCard.classList.remove('hidden');
            }
        } catch (err) {
            loader.classList.add('hidden');
            statusText.textContent = "Ошибка сети.";
        }
    }

    function updateInputState() {
        if (!queryInput) return;
        const val = queryInput.value.trim();
        queryInput.style.height = 'auto';
        queryInput.style.height = (queryInput.scrollHeight) + 'px';
        
        if (val.length > 0) { 
            if (clearBtn) clearBtn.classList.remove('hidden'); 
            if (sendBtn) sendBtn.classList.add('active'); 
        } else { 
            if (clearBtn) clearBtn.classList.add('hidden'); 
            if (sendBtn) sendBtn.classList.remove('active'); 
            document.body.classList.remove('has-results');
            if (resultsArea) resultsArea.classList.add('hidden');
        }
    }

    // --- Event Listeners ---
    if (adminBtn) adminBtn.addEventListener('click', () => {
        const token = localStorage.getItem('token');
        if (!token) showAuth();
        else {
            authPanel.classList.add('hidden');
            settingsPanel.classList.remove('hidden');
            adminOverlay.classList.remove('hidden');
        }
    });

    if (closeAdminBtn) closeAdminBtn.addEventListener('click', () => adminOverlay.classList.add('hidden'));
    if (saveAdminBtn) saveAdminBtn.addEventListener('click', saveSettings);
    
    if (kbDropZone) {
        kbDropZone.addEventListener('click', (e) => {
            if (e.target.closest('.remove-file-btn')) return;
            kbFileInput.click();
        });
        kbDropZone.addEventListener('dragover', (e) => { e.preventDefault(); kbDropZone.classList.add('dragover'); });
        kbDropZone.addEventListener('dragleave', () => { kbDropZone.classList.remove('dragover'); });
        kbDropZone.addEventListener('drop', (e) => { 
            e.preventDefault(); 
            kbDropZone.classList.remove('dragover'); 
            if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files[0]); 
        });
    }

    if (kbFileInput) kbFileInput.addEventListener('change', (e) => { if (e.target.files.length > 0) handleFileSelect(e.target.files[0]); });
    
    if (removeFileBtn) {
        removeFileBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!confirm("Удалить базу знаний?")) return;
            try {
                const resp = await apiRequest('/api/tenant/kb', 'POST', { content: "" });
                if (resp.ok) {
                    fileInfo.classList.add('hidden');
                    kbDropZone.querySelector('.drop-zone-content').classList.remove('hidden');
                    await loadSuggestions();
                }
            } catch (err) {
                alert("Ошибка при удалении.");
            }
        });
    }

    if (minimizeBtn) minimizeBtn.addEventListener('click', () => document.body.classList.add('minimized'));
    if (floatingBtn) floatingBtn.addEventListener('click', () => { 
        document.body.classList.remove('minimized'); 
        setTimeout(() => queryInput && queryInput.focus(), 300); 
    });

    if (clearBtn) clearBtn.addEventListener('click', () => { if (queryInput) queryInput.value = ''; updateInputState(); });
    if (sendBtn) sendBtn.addEventListener('click', () => { const query = queryInput.value.trim(); if (query) processSearch(query); });

    if (queryInput) {
        queryInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const query = queryInput.value.trim(); if (query) processSearch(query); } });
        queryInput.addEventListener('input', updateInputState);
    }

    langBtns.forEach(btn => btn.addEventListener('click', () => setLanguage(btn.getAttribute('data-lang'))));

    function showFileInfo(name) {
        fileNameDisplay.textContent = name;
        fileInfo.classList.remove('hidden');
        const content = kbDropZone.querySelector('.drop-zone-content');
        if (content) content.classList.add('hidden');
    }

    function setLanguage(lang) {
        currentLang = lang;
        document.documentElement.lang = currentLang;
        langBtns.forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-lang') === currentLang));
        
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[currentLang] && translations[currentLang][key]) el.textContent = translations[currentLang][key];
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (translations[currentLang] && translations[currentLang][key]) el.placeholder = translations[currentLang][key];
        });
        loadSuggestions();
    }

    function typeWriterEffect(text, element) {
        element.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    }

    initSettings();
});
