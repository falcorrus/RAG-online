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
    const mainTitle = document.getElementById('mainTitle');
    const mainSparkle = document.getElementById('mainSparkle');
    const logsPanel = document.getElementById('logsPanel');
    const logsContent = document.getElementById('logsContent');
    const viewLogsBtn = document.getElementById('viewLogsBtn');
    const clearLogsBtn = document.getElementById('clearLogsBtn');
    const closeLogsBtn = document.getElementById('closeLogsBtn');

    const resultsArea = document.getElementById('resultsArea');
    const answerCard = document.getElementById('answerCard');
    const answerContent = document.getElementById('answerContent');
    const loader = document.getElementById('loader');
    const statusText = document.getElementById('statusText');
    const suggestionsContainer = document.getElementById('suggestions');
    const langBtns = document.querySelectorAll('.lang-btn');
    const sourceBadge = document.getElementById('sourceBadge');

    let underAnswerText = "";

    function updateSourceDisplay() {
        if (!sourceBadge) return;
        
        const sourcePrefix = {
            "ru": "Для вопросов: ",
            "en": "Questions: ",
            "pt": "Questões: "
        };

        if (underAnswerText && underAnswerText.trim().length > 0) {
            sourceBadge.textContent = (sourcePrefix[currentLang] || sourcePrefix["ru"]) + underAnswerText;
        } else {
            const key = sourceBadge.getAttribute('data-i18n');
            if (translations[currentLang] && translations[currentLang][key]) {
                sourceBadge.textContent = translations[currentLang][key];
            }
        }
    }
    const authPanel = document.getElementById('authPanel');
    const settingsPanel = document.getElementById('settingsPanel');
    const onboardingPanel = document.getElementById('onboardingPanel');
    const onboardingNextBtn = document.getElementById('onboardingNextBtn');
    const subdomainGroup = document.getElementById('subdomainGroup');
    const authSubdomain = document.getElementById('authSubdomain');

    const authEmail = document.getElementById('authEmail');
    const authPass = document.getElementById('authPass');
    const authBtn = document.getElementById('authBtn');
    const authTitle = document.getElementById('authTitle');
    const toggleAuthMode = document.getElementById('toggleAuthMode');
    const authError = document.getElementById('authError');
    const authBackBtn = document.getElementById('authBackBtn');

    // State
    function getInitialLang() {
        const saved = localStorage.getItem('user_lang');
        const supported = ['ru', 'en', 'pt'];
        if (saved && supported.includes(saved)) return saved;
        
        const browserLang = navigator.language.split('-')[0];
        return supported.includes(browserLang) ? browserLang : 'ru';
    }

    let currentLang = getInitialLang();
    let isRegisterMode = false;

    const translations = {
        ru: {
            title_main: "База знаний",
            input_placeholder: "Спрашивайте в свободной форме",
            suggestion_1: "Как оформить отпуск?",
            suggestion_2: "График работы",
            suggestion_3: "Контакты HR",
            source_label: "Для вопросов: @argodon",
            admin_title: "Настройки администратора",
            kb_upload_label: "База знаний (.md)",
            drop_zone_text: "Перетащите .md файл или кликните для выбора",
            initially_open_label: "Изначально открыто",
            save_btn: "Сохранить изменения",
            status_analyzing: "Анализирую базу знаний...",
            status_ai_thinking: "ИИ формирует ответ...",
            view_logs_btn: "Просмотреть логи",
            logs_title: "Логи чата",
            no_logs_msg: "Логи пока пусты.",
            clear_logs_btn: "Очистить логи",
            download_logs_btn: "Скачать",
            log_item_label: "Запрос",
            promo_link: "Создайте свой RAG в 2 клика",
            auth_btn_login: "Войти",
            auth_btn_register: "Создать мой RAG",
            auth_toggle_login: "Уже есть аккаунт? Войти",
            auth_toggle_register: "Хотите такой же? Регистрация",
            welcome_download_demo: "Скачать пример",
            welcome_go_to_settings: "В настройки",
            onboarding_title: "Как это работает",
            onboarding_step_1: "Загрузите базу знаний (Markdown или текст).",
            onboarding_step_2: "Получите ссылку вида yourname.rag.reloto.ru.",
            onboarding_step_3: "Ваш ИИ-ассистент онлайн.",
            onboarding_next: "Далее",
            auth_subdomain_label: "Желаемый поддомен"
        },
        en: {
            title_main: "AI Knowledge Base",
            input_placeholder: "Ask a question...",
            suggestion_1: "How to apply for leave?",
            suggestion_2: "Work schedule",
            suggestion_3: "HR Contacts",
            source_label: "Questions: @argodon",
            admin_title: "Admin Settings",
            kb_upload_label: "Knowledge Base (.md)",
            drop_zone_text: "Drag & drop .md file or click to browse",
            initially_open_label: "Initially open",
            save_btn: "Save Changes",
            status_analyzing: "Analyzing knowledge base...",
            status_ai_thinking: "AI is thinking...",
            view_logs_btn: "View Logs",
            logs_title: "Chat Logs",
            no_logs_msg: "No logs yet.",
            clear_logs_btn: "Clear Logs",
            download_logs_btn: "Download",
            log_item_label: "Query",
            promo_link: "Create your RAG in 2 clicks",
            auth_btn_login: "Login",
            auth_btn_register: "Create my RAG",
            auth_toggle_login: "Already have an account? Login",
            auth_toggle_register: "Want the same? Register",
            welcome_download_demo: "Download Demo",
            welcome_go_to_settings: "Go to Settings",
            onboarding_title: "How it works",
            onboarding_step_1: "Upload knowledge base (Markdown or text).",
            onboarding_step_2: "Get a link like yourname.rag.reloto.ru.",
            onboarding_step_3: "Your AI assistant is online.",
            onboarding_next: "Next",
            auth_subdomain_label: "Desired subdomain"
        },
        pt: {
            title_main: "Base de Conhecimento AI",
            input_placeholder: "Faça uma pergunta...",
            suggestion_1: "Como solicitar férias?",
            suggestion_2: "Horário de trabalho",
            suggestion_3: "Contatos de RH",
            source_label: "Questões: @argodon",
            admin_title: "Configurações do Administrador",
            kb_upload_label: "Base de Conhecimento (.md)",
            drop_zone_text: "Arraste um arquivo .md ou clique para selecionar",
            initially_open_label: "Abrir inicialmente",
            save_btn: "Salvar alterações",
            status_analyzing: "Analisando base de conhecimento...",
            status_ai_thinking: "IA está pensando...",
            view_logs_btn: "Ver Registros",
            logs_title: "Registros de Chat",
            no_logs_msg: "Nenhum registro ainda.",
            clear_logs_btn: "Limpar Registros",
            download_logs_btn: "Baixar",
            log_item_label: "Consulta",
            promo_link: "Crie seu RAG em 2 cliques",
            auth_btn_login: "Entrar",
            auth_btn_register: "Criar meu RAG",
            auth_toggle_login: "Já tem uma conta? Entrar",
            auth_toggle_register: "Quer un igual? Registre-се",
            welcome_download_demo: "Baixar Demonstração",
            welcome_go_to_settings: "Configurações",
            onboarding_title: "Como funciona",
            onboarding_step_1: "Carregue a base de conhecimento (Markdown ou texto).",
            onboarding_step_2: "Obtenha um link como yourname.rag.reloto.ru.",
            onboarding_step_3: "Seu assistente de IA está online.",
            onboarding_next: "Próximo",
            auth_subdomain_label: "Subdomínio desejado"
        }
    };

    const welcomeBanner = document.getElementById('welcomeBanner');
    const downloadDemoBtn = document.getElementById('downloadDemoBtn');
    const goToSettingsBtn = document.getElementById('goToSettingsBtn');

    // --- API Helpers ---
    async function apiRequest(path, method = 'GET', body = null) {
        const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
            ? 'http://localhost:8006' 
            : '';
        const url = path.startsWith('http') ? path : baseUrl + path;
        
        const headers = { 'Content-Type': 'application/json' };
        const token = localStorage.getItem('token');
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const options = { method, headers };
        if (body) options.body = JSON.stringify(body);

        try {
            const response = await fetch(url, options);
            if (response.status === 401) {
                localStorage.removeItem('token');
                showAuth();
            }
            return response;
        } catch (err) {
            console.error("API Request Failed at " + url, err);
            throw err;
        }
    }

    async function downloadDemoFile() {
        try {
            const response = await fetch('/RAG-demo.md');
            if (!response.ok) throw new Error('Demo file not found');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'RAG-demo.md';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showToast(currentLang === 'ru' ? "Файл RAG-demo.md скачан" : "RAG-demo.md downloaded");
        } catch (err) {
            console.error('Download error:', err);
            showToast("Error downloading demo file", true);
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
        const subdomain = authSubdomain.value;
        const path = isRegisterMode ? '/api/auth/register' : '/api/auth/login';
        
        const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
            ? 'http://localhost:8006' 
            : '';
        const url = baseUrl + path;

        if (!email || !password) {
            authError.textContent = 'Введите email и пароль';
            authError.classList.remove('hidden');
            return;
        }

        const body = { email, password };
        if (isRegisterMode && subdomain) body.subdomain = subdomain;

        try {
            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
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
                onboardingPanel.classList.add('hidden');
                settingsPanel.classList.remove('hidden');

                if (isRegisterMode) {
                    showToast(currentLang === 'ru' ? "Аккаунт успешно создан!" : "Account created successfully!");
                }
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
            updateAuthLabels();
        });
    }

    function updateAuthLabels() {
        authTitle.textContent = currentLang === 'ru' ? (isRegisterMode ? 'Регистрация' : 'Вход в систему') : (isRegisterMode ? 'Registration' : 'Login');
        
        if (isRegisterMode) {
            subdomainGroup.classList.remove('hidden');
            if (authBackBtn) authBackBtn.classList.remove('hidden');
        } else {
            subdomainGroup.classList.add('hidden');
            if (authBackBtn) authBackBtn.classList.add('hidden');
        }

        const btnKey = isRegisterMode ? 'auth_btn_register' : 'auth_btn_login';
        const toggleKey = isRegisterMode ? 'auth_toggle_login' : 'auth_toggle_register';
        
        if (authBtn && translations[currentLang][btnKey]) {
            authBtn.textContent = translations[currentLang][btnKey];
            authBtn.setAttribute('data-i18n', btnKey);
        }
        if (toggleAuthMode && translations[currentLang][toggleKey]) {
            toggleAuthMode.textContent = translations[currentLang][toggleKey];
            toggleAuthMode.setAttribute('data-i18n', toggleKey);
        }
    }

    if (onboardingNextBtn) {
        onboardingNextBtn.addEventListener('click', () => {
            onboardingPanel.classList.add('hidden');
            authPanel.classList.remove('hidden');
            isRegisterMode = true;
            updateAuthLabels();
        });
    }

    if (authBackBtn) {
        authBackBtn.addEventListener('click', () => {
            authPanel.classList.add('hidden');
            onboardingPanel.classList.remove('hidden');
        });
    }

    if (authBtn) authBtn.addEventListener('click', handleAuth);

    // --- Settings & UI ---
    async function initSettings() {
        try {
            const publicResp = await apiRequest(`/api/settings?lang=${currentLang}`);
            if (publicResp.ok) {
                const settings = await publicResp.json();
                
                if (!settings.initiallyOpen) document.body.classList.add('minimized');

                if (settings.kb_exists === false) {
                    welcomeBanner.classList.remove('hidden');
                } else {
                    welcomeBanner.classList.add('hidden');
                }
                
                underAnswerText = settings.underAnswerText || "";
                updateSourceDisplay();
                
                const savedLang = localStorage.getItem('user_lang');
                if (!savedLang && settings.defaultLang && settings.defaultLang !== currentLang) {
                    await setLanguage(settings.defaultLang);
                } else {
                    await setLanguage(currentLang);
                }
                
                updateTitle(settings.kb_exists, settings.businessName);
            }
        } catch (err) {
            console.error("Public settings fetch failed", err);
        }

        const token = localStorage.getItem('token');
        if (!token) {
            await loadSuggestions();
            return;
        }

        try {
            const resp = await apiRequest('/api/tenant/settings');
            if (resp.ok) {
                const settings = await resp.json();
                initiallyOpenToggle.checked = settings.initiallyOpen;
            }
            
            const kbResp = await apiRequest('/api/tenant/kb');
            if (kbResp.ok) {
                const kbData = await kbResp.json();
                if (kbData.content && kbData.content.trim().length > 0) {
                    showFileInfo("Загруженная база знаний");
                    welcomeBanner.classList.add('hidden');
                }
            }
            await loadSuggestions();
        } catch (err) {
            console.error("Admin data fetch failed", err);
        }
    }

    if (downloadDemoBtn) downloadDemoBtn.addEventListener('click', downloadDemoFile);
    if (goToSettingsBtn) {
        goToSettingsBtn.addEventListener('click', () => {
            const token = localStorage.getItem('token');
            if (!token) showAuth();
            else {
                authPanel.classList.add('hidden');
                settingsPanel.classList.remove('hidden');
                adminOverlay.classList.remove('hidden');
            }
        });
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

    function showToast(message, isError = false) {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        const toastIcon = toast.querySelector('.toast-icon');
        
        toastMessage.textContent = message;
        toastIcon.textContent = isError ? '✕' : '✓';
        toastIcon.style.color = isError ? '#ff4d4d' : '#4ade80';
        
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    async function saveSettings() {
        const isChecked = initiallyOpenToggle.checked;
        const settings = { initiallyOpen: isChecked };
        try {
            const resp = await apiRequest('/api/tenant/settings', 'POST', settings);
            if (resp.ok) {
                if (!isChecked) document.body.classList.add('minimized');
                else document.body.classList.remove('minimized');

                const publicResp = await apiRequest(`/api/settings?lang=${currentLang}`);
                if (publicResp.ok) {
                    const pubData = await publicResp.json();
                    updateTitle(pubData.kb_exists, pubData.businessName);
                }
                
                adminOverlay.classList.add('hidden');
                showToast(currentLang === 'ru' ? "Настройки сохранены" : "Settings saved");
            } else {
                const errorData = await resp.json();
                showToast(errorData.detail || "Error", true);
            }
        } catch (err) {
            showToast("Network error", true);
        }
    }

    async function handleFileSelect(file) {
        if (!file.name.toLowerCase().endsWith('.md')) {
            showToast("Only .md files allowed", true);
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
                    welcomeBanner.classList.add('hidden');
                    
                    const publicResp = await apiRequest(`/api/settings?lang=${currentLang}`);
                    if (publicResp.ok) {
                        const pubData = await publicResp.json();
                        updateTitle(pubData.kb_exists, pubData.businessName);
                    }
                    
                    await loadSuggestions();
                    showToast(currentLang === 'ru' ? "База знаний обновлена" : "Knowledge base updated");
                } else {
                    const errorData = await resp.json();
                    showToast(errorData.detail || "Upload error", true);
                }
            } catch (err) {
                showToast("Network error", true);
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
    if (adminBtn) {
        let longPressTimer;
        const longPressDuration = 800;

        const startPress = () => {
            longPressTimer = setTimeout(() => {
                localStorage.removeItem('token');
                showToast(currentLang === 'ru' ? "Выход из системы" : "Logged out");
                showAuth();
                longPressTimer = null;
            }, longPressDuration);
        };

        const cancelPress = () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        };

        adminBtn.addEventListener('mousedown', startPress);
        adminBtn.addEventListener('touchstart', startPress, { passive: true });
        adminBtn.addEventListener('mouseup', cancelPress);
        adminBtn.addEventListener('mouseleave', cancelPress);
        adminBtn.addEventListener('touchend', cancelPress);

        adminBtn.addEventListener('click', () => {
            const token = localStorage.getItem('token');
            if (!token) showAuth();
            else {
                authPanel.classList.add('hidden');
                settingsPanel.classList.remove('hidden');
                adminOverlay.classList.remove('hidden');
            }
        });
    }

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
                    const publicResp = await apiRequest(`/api/settings?lang=${currentLang}`);
                    if (publicResp.ok) {
                        const pubData = await publicResp.json();
                        updateTitle(pubData.kb_exists, pubData.businessName);
                    }
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

    async function setLanguage(lang) {
        currentLang = lang;
        localStorage.setItem('user_lang', lang);
        document.documentElement.lang = currentLang;
        langBtns.forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-lang') === currentLang));
        
        document.querySelectorAll('[data-i18n]').forEach(el => {
            if (el.id === 'mainTitle' && el.getAttribute('data-custom-title') === 'true') return;
            if (el.id === 'sourceBadge' && underAnswerText) return;

            const key = el.getAttribute('data-i18n');
            if (translations[currentLang] && translations[currentLang][key]) el.textContent = translations[currentLang][key];
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (translations[currentLang] && translations[currentLang][key]) el.placeholder = translations[currentLang][key];
        });

        await loadSuggestions();

        try {
            const publicResp = await apiRequest(`/api/settings?lang=${currentLang}`);
            if (publicResp.ok) {
                const settings = await publicResp.json();
                underAnswerText = settings.underAnswerText || "";
                updateSourceDisplay();
                updateTitle(settings.kb_exists, settings.businessName);
            }
        } catch (err) {
            console.warn("Title update failed during language switch", err);
        }
    }

    function updateTitle(isKbLoaded, overrideName = null) {
        const customName = (overrideName && overrideName.length > 0) ? overrideName : "";
        mainTitle.classList.remove('visible');
        if (mainSparkle) mainSparkle.classList.remove('visible');
        
        setTimeout(() => {
            if (isKbLoaded && customName) {
                mainTitle.textContent = customName;
                mainTitle.setAttribute('data-custom-title', 'true');
                if (mainSparkle) mainSparkle.style.display = 'none';
            } else {
                mainTitle.setAttribute('data-custom-title', 'false');
                if (mainSparkle) {
                    mainSparkle.style.display = 'block';
                    requestAnimationFrame(() => mainSparkle.classList.add('visible'));
                }
                const key = mainTitle.getAttribute('data-i18n');
                if (translations[currentLang] && translations[currentLang][key]) {
                    mainTitle.textContent = translations[currentLang][key];
                }
            }
            mainTitle.classList.add('visible');
        }, 100);
    }

    function typeWriterEffect(text, element) {
        element.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    }

    const creatorLink = document.getElementById('creatorLink');
    const creatorPopup = document.getElementById('creatorPopup');
    const downloadLogsBtn = document.getElementById('downloadLogsBtn');
    const promoLink = document.getElementById('promoLink');
    const copyBtn = document.getElementById('copyBtn');

    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            let textToCopy = answerContent.innerText;
            if (underAnswerText && underAnswerText.trim().length > 0) {
                textToCopy += "\n\n" + underAnswerText;
            }
            navigator.clipboard.writeText(textToCopy).then(() => {
                showToast(currentLang === 'ru' ? "Ответ скопирован" : "Answer copied");
            }).catch(err => console.error('Failed to copy: ', err));
        });
    }

    if (promoLink) {
        promoLink.addEventListener('click', (e) => {
            e.preventDefault();
            authPanel.classList.add('hidden');
            settingsPanel.classList.add('hidden');
            onboardingPanel.classList.remove('hidden');
            adminOverlay.classList.remove('hidden');
            isRegisterMode = false; // Reset to ensure clean start if user goes back and clicks again
        });
    }

    if (viewLogsBtn) viewLogsBtn.addEventListener('click', async () => {
        settingsPanel.classList.add('hidden');
        logsPanel.classList.remove('hidden');
        await loadLogs();
    });

    if (closeLogsBtn) closeLogsBtn.addEventListener('click', () => {
        logsPanel.classList.add('hidden');
        settingsPanel.classList.remove('hidden');
    });

    if (clearLogsBtn) clearLogsBtn.addEventListener('click', async () => {
        if (!confirm(currentLang === 'ru' ? "Вы уверены, что хотите очистить все логи?" : "Are you sure you want to clear all logs?")) return;
        try {
            const resp = await apiRequest('/api/tenant/logs', 'DELETE');
            if (resp.ok) {
                showToast(currentLang === 'ru' ? "Логи очищены" : "Logs cleared");
                renderLogs([]);
            }
        } catch (err) {
            showToast("Error", true);
        }
    });

    function renderLogs(logs) {
        logsContent.innerHTML = '';
        if (logs.length === 0) {
            logsContent.innerHTML = `<p data-i18n="no_logs_msg">${translations[currentLang]?.no_logs_msg || "No logs yet."}</p>`;
            return;
        }

        logs.slice().reverse().forEach(log => {
            const logItem = document.createElement('div');
            logItem.className = 'log-item';
            const timestamp = new Date(log.timestamp).toLocaleString(currentLang === 'ru' ? 'ru-RU' : 'en-US');
            logItem.innerHTML = `
                <div class="log-header">
                    <span class="log-timestamp">${timestamp}</span>
                    <span class="log-lang">[${log.lang.toUpperCase()}]</span>
                </div>
                <div class="log-query">${translations[currentLang]?.log_item_label || "Query"}: ${log.query}</div>
                <div class="log-answer">Answer: ${log.answer}</div>
            `;
            logsContent.appendChild(logItem);
        });
    }

    async function downloadLogs() {
        try {
            const resp = await apiRequest('/api/tenant/logs');
            if (resp.ok) {
                const data = await resp.json();
                const logsJson = JSON.stringify(data.logs, null, 2);
                const blob = new Blob([logsJson], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `chat_logs_${new Date().toISOString()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast(currentLang === 'ru' ? "Логи скачаны" : "Logs downloaded");
            }
        } catch (err) {
            showToast("Error", true);
        }
    }

    async function loadLogs() {
        try {
            const resp = await apiRequest('/api/tenant/logs');
            if (resp.ok) {
                const data = await resp.json();
                renderLogs(data.logs);
            }
        } catch (err) {
            showToast("Error", true);
        }
    }

    if (downloadLogsBtn) downloadLogsBtn.addEventListener('click', downloadLogs);

    if (creatorLink && creatorPopup) {
        creatorLink.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            creatorPopup.classList.toggle('show');
            if (creatorPopup.classList.contains('show')) {
                const closePopup = (e) => {
                    if (!creatorPopup.contains(e.target)) {
                        creatorPopup.classList.remove('show');
                        document.removeEventListener('click', closePopup);
                    }
                };
                document.addEventListener('click', closePopup);
            }
        });
        creatorPopup.addEventListener('click', (e) => e.stopPropagation());
    }

    initSettings();
});
