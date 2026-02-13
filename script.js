document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Script Start');
    // Check for token in URL (after registration redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    if (tokenFromUrl) {
        localStorage.setItem('token', tokenFromUrl);
        // Clean up URL without reloading
        const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({path: cleanUrl}, '', cleanUrl);
    }

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
    const adminPanelTitle = document.getElementById('adminPanelTitle');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    const resultsArea = document.getElementById('resultsArea');
    const answerCard = document.getElementById('answerCard');
    const answerContent = document.getElementById('answerContent');
    const loader = document.getElementById('loader');
    const statusText = document.getElementById('statusText');
    const suggestionsContainer = document.getElementById('suggestions');
    const langBtns = document.querySelectorAll('.lang-btn');
    const sourceBadge = document.getElementById('sourceBadge');
    const headerTools = document.querySelector('.header-tools');
    const searchWrapper = document.getElementById('searchWrapper');
    const mainFooter = document.querySelector('.main-footer');

    // Confirmation Modal Elements
    const confirmationModal = document.getElementById('confirmationModal');
    const closeConfirmBtn = document.getElementById('closeConfirmBtn');
    const cancelConfirmBtn = document.getElementById('cancelConfirmBtn');
    const confirmActionBtn = document.getElementById('confirmActionBtn');
    const confirmMessageText = document.getElementById('confirmMessage');
    const processingModal = document.getElementById('processingModal');

    let onConfirmAction = null;

    function showConfirmationModal(message, actionCallback) {
        if (confirmMessageText) confirmMessageText.textContent = message;
        onConfirmAction = actionCallback;
        if (confirmationModal) confirmationModal.classList.remove('hidden');
    }

    function hideConfirmationModal() {
        if (confirmationModal) confirmationModal.classList.add('hidden');
        onConfirmAction = null;
    }

    if (closeConfirmBtn) closeConfirmBtn.addEventListener('click', hideConfirmationModal);
    if (cancelConfirmBtn) cancelConfirmBtn.addEventListener('click', hideConfirmationModal);
    if (confirmActionBtn) confirmActionBtn.addEventListener('click', () => {
        if (onConfirmAction) onConfirmAction();
        hideConfirmationModal();
    });

    // Tab Logic
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            // Update buttons
            tabBtns.forEach(b => b.classList.toggle('active', b === btn));
            
            // Update contents
            tabContents.forEach(content => {
                content.classList.toggle('active', content.id === `${targetTab}Tab`);
            });

            if (targetTab === 'logs') {
                loadLogs();
            }
        });
    });

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

    const welcomeBanner = document.getElementById('welcomeBanner');
    const downloadDemoBtn = document.getElementById('downloadDemoBtn');
    const goToSettingsBtn = document.getElementById('goToSettingsBtn');

    function toggleUIByKnowledgeBase(hasKb, delayBannerHide = false) {
        const todoUpload = document.getElementById('todoUpload');
        
        const updateTodo = (done) => {
            if (!todoUpload) return;
            if (done) {
                todoUpload.classList.add('done');
                const icon = todoUpload.querySelector('.todo-icon');
                if (icon) icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clip-rule="evenodd" /></svg>';
            } else {
                todoUpload.classList.remove('done');
                const icon = todoUpload.querySelector('.todo-icon');
                if (icon) icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>';
            }
        };

        const applyState = (kb) => {
            if (!kb) {
                // State: NO KNOWLEDGE BASE
                if (welcomeBanner) {
                    welcomeBanner.classList.remove('force-hidden');
                    welcomeBanner.classList.remove('fade-out');
                }
                
                // Hide everything else
                if (searchWrapper) searchWrapper.classList.add('force-hidden');
                if (headerTools) headerTools.classList.add('force-hidden');
                if (mainFooter) mainFooter.classList.add('force-hidden');
                
                document.body.classList.remove('has-results');
                if (mainTitle) mainTitle.classList.remove('visible');
                if (mainSparkle) mainSparkle.classList.remove('visible');
            } else {
                // State: KNOWLEDGE BASE EXISTS
                if (welcomeBanner) {
                    welcomeBanner.classList.add('fade-out');
                    setTimeout(() => welcomeBanner.classList.add('force-hidden'), 500);
                }
                
                // Show everything else
                if (searchWrapper) searchWrapper.classList.remove('force-hidden');
                if (headerTools) headerTools.classList.remove('force-hidden');
                if (mainFooter) mainFooter.classList.remove('force-hidden');

                if (mainSparkle) {
                    mainSparkle.classList.remove('force-hidden');
                    mainSparkle.classList.add('visible');
                }
                if (mainTitle) {
                    mainTitle.classList.remove('force-hidden');
                    mainTitle.classList.add('visible');
                }
            }
        };

        if (hasKb && delayBannerHide) {
            // Sequence:
            // 1. Wait a bit
            // 2. Strike the item
            // 3. Wait to see the strike
            // 4. Fade out banner
            setTimeout(() => updateTodo(true), 500);
            setTimeout(() => applyState(true), 2500);
        } else {
            updateTodo(hasKb);
            applyState(hasKb);
        }
    }

    // INITIAL STATE: Everything is hidden via CSS/HTML classes by default.
    // We only show the correct layer after API responds in initSettings().

    if (downloadDemoBtn) {
        downloadDemoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('DEBUG: downloadDemoBtn clicked');
            downloadDemoFile();
        });
    }
    if (goToSettingsBtn) {
        goToSettingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('DEBUG: goToSettingsBtn clicked');
            const token = localStorage.getItem('token');
            if (!token) showAuth();
            else {
                authPanel.classList.add('hidden');
                settingsPanel.classList.remove('hidden');
                adminOverlay.classList.remove('hidden');
                toggleUIByKnowledgeBase(true);
            }
        });
    }

    // INITIAL STATE: Everything is hidden via CSS/HTML classes by default.
    // We only show the correct layer after API responds in initSettings().

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
            admin_title: "Панель управления",
            tab_settings: "Настройки",
            tab_logs: "Логи чата",
            download_logs_btn: "Скачать логи",
            download_kb_btn: "Скачать базу",
            kb_upload_label: "База знаний (.md)",
            drop_zone_text: "Перетащите .md файл или кликните для выбора",
            initially_open_label: "Изначально открыто",
            save_btn: "Сохранить изменения",
            close_btn: "Закрыть",
            status_analyzing: "Анализирую базу знаний...",
            status_ai_thinking: "ИИ формирует ответ...",
            view_logs_btn: "Просмотреть логи",
            logs_title: "Логи чата",
            no_logs_msg: "Логи пока пусты.",
            clear_logs_btn: "Очистить все",
            log_item_label: "Запрос",
            promo_link: "Создайте свой RAG в 2 клика",
            auth_btn_login: "Войти",
            auth_btn_register: "Создать мой RAG",
            auth_toggle_login: "Уже есть аккаунт? Войти",
            auth_toggle_register: "Хотите такой же? Регистрация",
            welcome_download_demo: "Скачать пример",
            welcome_go_to_settings: "В настройки",
            onboarding_title: "Как это работает",
            onboarding_step_1: "Создайте аккаунт (RAG)",
            onboarding_step_2: "Загрузите знания (markdown, txt)",
            onboarding_next: "Далее",
            auth_subdomain_label: "Желаемый поддомен",
            processing_kb_title: "База обрабатывается",
            processing_kb_msg: "Подождите несколько секунд, страница перезагрузится автоматически...",
            setup_secure_title: "Настраиваем домен",
            setup_secure_msg: "Настраиваем безопасное соединение для вашего домена... Подождите пару секунд.",
            deleting_kb_title: "Удаление базы",
            deleting_kb_msg: "Очищаем данные... Подождите несколько секунд.",
            confirm_title: "Подтверждение",
            cancel_btn: "Отмена",
            delete_btn: "Удалить"
        },
        en: {
            title_main: "AI Knowledge Base",
            input_placeholder: "Ask a question...",
            suggestion_1: "How to apply for leave?",
            suggestion_2: "Work schedule",
            suggestion_3: "HR Contacts",
            source_label: "Questions: @argodon",
            admin_title: "Control Panel",
            tab_settings: "Settings",
            tab_logs: "Chat Logs",
            download_logs_btn: "Download Logs",
            download_kb_btn: "Download KB",
            kb_upload_label: "Knowledge Base (.md)",
            drop_zone_text: "Drag & drop .md file or click to browse",
            initially_open_label: "Initially open",
            save_btn: "Save Changes",
            close_btn: "Close",
            status_analyzing: "Analyzing knowledge base...",
            status_ai_thinking: "AI is thinking...",
            view_logs_btn: "View Logs",
            logs_title: "Chat Logs",
            no_logs_msg: "No logs yet.",
            clear_logs_btn: "Clear All",
            log_item_label: "Query",
            promo_link: "Create your RAG in 2 clicks",
            auth_btn_login: "Login",
            auth_btn_register: "Create my RAG",
            auth_toggle_login: "Already have an account? Login",
            auth_toggle_register: "Want the same? Register",
            welcome_download_demo: "Download Demo",
            welcome_go_to_settings: "Go to Settings",
            onboarding_title: "How it works",
            onboarding_step_1: "Create account (RAG)",
            onboarding_step_2: "Upload knowledge (markdown, txt)",
            onboarding_next: "Next",
            auth_subdomain_label: "Desired subdomain",
            processing_kb_title: "Knowledge base is being processed",
            processing_kb_msg: "Please wait a few seconds, the page will reload automatically...",
            setup_secure_title: "Setting up domain",
            setup_secure_msg: "Setting up secure connection for your domain... Please wait a few seconds.",
            deleting_kb_title: "Deleting knowledge base",
            deleting_kb_msg: "Clearing data... Please wait a few seconds.",
            confirm_title: "Confirmation",
            cancel_btn: "Cancel",
            delete_btn: "Delete"
        },
        pt: {
            title_main: "Base de Conhecimento AI",
            input_placeholder: "Faça uma pergunta...",
            suggestion_1: "Como solicitar férias?",
            suggestion_2: "Horário de trabalho",
            suggestion_3: "Contatos de RH",
            source_label: "Questões: @argodon",
            admin_title: "Painel de Controle",
            tab_settings: "Configurações",
            tab_logs: "Registros",
            download_logs_btn: "Baixar logs",
            download_kb_btn: "Baixar base",
            kb_upload_label: "Base de Conhecimento (.md)",
            drop_zone_text: "Arraste um arquivo .md ou clique para selecionar",
            initially_open_label: "Abrir inicialmente",
            save_btn: "Salvar alterações",
            close_btn: "Fechar",
            status_analyzing: "Analisando base de conhecimento...",
            status_ai_thinking: "IA está pensando...",
            view_logs_btn: "Ver Registros",
            logs_title: "Registros de Chat",
            no_logs_msg: "Nenhum registro ainda.",
            clear_logs_btn: "Limpar tudo",
            log_item_label: "Consulta",
            promo_link: "Crie seu RAG em 2 cliques",
            auth_btn_login: "Entrar",
            auth_btn_register: "Criar meu RAG",
            auth_toggle_login: "Já tem uma conta? Entrar",
            auth_toggle_register: "Quer un igual? Registre-се",
            welcome_download_demo: "Baixar Demonstração",
            welcome_go_to_settings: "Configurações",
            onboarding_title: "Como funciona",
            onboarding_step_1: "Criar conta (RAG)",
            onboarding_step_2: "Carregar conhecimento (markdown, txt)",
            onboarding_next: "Próximo",
            auth_subdomain_label: "Subdomínio desejado",
            processing_kb_title: "Base sendo processada",
            processing_kb_msg: "Aguarde alguns segundos, a página será recarregada automaticamente...",
            setup_secure_title: "Configurando domínio",
            setup_secure_msg: "Configurando uma conexão segura para o seu domínio... Aguarde alguns segundos.",
            deleting_kb_title: "Excluindo base de conhecimento",
            deleting_kb_msg: "Limpando dados... Aguarde alguns segundos.",
            confirm_title: "Confirmação",
            cancel_btn: "Cancelar",
            delete_btn: "Excluir"
        }
    };

    initiallyOpenToggle.checked = true; // Default state

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
        console.log('handleAuth: Function called');
        
        // Clear old session before starting new auth attempt
        localStorage.removeItem('token');
        
        const email = authEmail.value.trim().toLowerCase();
        const password = authPass.value;
        const subdomain = authSubdomain.value.trim();
        const path = isRegisterMode ? '/api/auth/register' : '/api/auth/login';
        
        const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
            ? 'http://localhost:8006' 
            : '';
        const url = baseUrl + path;

        if (!email || !password || (isRegisterMode && !subdomain)) {
            if (currentLang === 'ru') {
                authError.textContent = isRegisterMode ? 'Введите почту, пароль и поддомен' : 'Введите email и пароль';
            } else {
                authError.textContent = isRegisterMode ? 'Enter email, password and subdomain' : 'Enter email and password';
            }
            authError.classList.remove('hidden');
            return;
        }

        const body = { email, password };
        if (isRegisterMode) body.subdomain = subdomain;

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

                if (isRegisterMode && data.subdomain) {
                    if (processingModal) {
                        const procTitle = document.getElementById('processingTitle');
                        const procMsg = document.getElementById('processingMessage');
                        if (procTitle && procMsg && translations[currentLang]) {
                            procTitle.textContent = translations[currentLang].setup_secure_title;
                            procMsg.textContent = translations[currentLang].setup_secure_msg;
                        }
                        processingModal.classList.remove('hidden');
                    }
                    
                    setTimeout(() => {
                        const newUrl = `https://${data.subdomain}.rag.reloto.ru`;
                        window.location.href = `${newUrl}?token=${data.token}`;
                    }, 10000); // 10 seconds delay
                    return;
                }

                const publicRespAfterInit = await apiRequest(`/api/settings?lang=${currentLang}`);
                if (publicRespAfterInit.ok) {
                    const settingsAfterInit = await publicRespAfterInit.json();
                    toggleUIByKnowledgeBase(settingsAfterInit.kb_exists);
                    if (settingsAfterInit.kb_exists === false) {
                        adminOverlay.classList.remove('hidden');
                        authPanel.classList.add('hidden');
                        onboardingPanel.classList.add('hidden');
                        settingsPanel.classList.remove('hidden');
                        showToast(currentLang === 'ru' ? "Аккаунт успешно создан! Загрузите базу знаний." : "Account created! Upload your knowledge base.", false);
                        return;
                    }
                }

                adminOverlay.classList.add('hidden');
                authPanel.classList.add('hidden');
                onboardingPanel.classList.add('hidden');
                settingsPanel.classList.add('hidden');
                
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
        console.log('initSettings: Function called');
        try {
            const publicResp = await apiRequest(`/api/settings?lang=${currentLang}`);
            if (publicResp.ok) {
                const settings = await publicResp.json();
                
                // Update welcome banner with subdomain
                const welcomeTenantName = document.getElementById('welcomeTenantName');
                if (welcomeTenantName && settings.subdomain) {
                    welcomeTenantName.textContent = settings.subdomain;
                }

                if (!settings.initiallyOpen) document.body.classList.add('minimized');
                toggleUIByKnowledgeBase(settings.kb_exists);
                updateTitle(settings.kb_exists, settings.businessName);
            }
        } catch (err) {
            console.error("Public settings fetch failed", err);
            toggleUIByKnowledgeBase(false); // Fallback to banner on error
        }

        const token = localStorage.getItem('token');
        if (!token) {
            try {
                await loadSuggestions();
            } catch (e) {
                console.warn("Initial loadSuggestions failed", e);
            }
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
                }
            }
            try {
                await loadSuggestions();
            } catch (e) {
                console.warn("Admin loadSuggestions failed", e);
            }
        } catch (err) {
            console.error("Admin data fetch failed", err);
        }
    }

    async function loadSuggestions() {
        if (!suggestionsContainer) return;
        try {
            const resp = await apiRequest(`/api/suggestions?lang=${currentLang}`);
            if (resp.ok) {
                const data = await resp.json();
                suggestionsContainer.innerHTML = '';
                data.suggestions.forEach((text, index) => {
                    const chip = document.createElement('div');
                    chip.className = 'suggestion-chip';
                    chip.textContent = text;
                    chip.style.opacity = '0';
                    chip.style.transform = 'translateY(10px)';
                    chip.style.transition = `all 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.05}s`;
                    
                    chip.addEventListener('click', () => {
                        if (queryInput) {
                            queryInput.value = text;
                            updateInputState();
                            processSearch(text);
                        }
                    });
                    suggestionsContainer.appendChild(chip);
                    
                    // Trigger animation
                    requestAnimationFrame(() => {
                        chip.style.opacity = '1';
                        chip.style.transform = 'translateY(0)';
                    });
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
        
        if (isError) {
            toastIcon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff4d4d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        } else {
            toastIcon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        }
        
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
                    toggleUIByKnowledgeBase(true, true);
                    
                    // Hide admin panel immediately to show the banner strikeout animation
                    if (adminOverlay) adminOverlay.classList.add('hidden');
                    
                    const publicResp = await apiRequest(`/api/settings?lang=${currentLang}`);
                    if (publicResp.ok) {
                        const pubData = await publicResp.json();
                        updateTitle(pubData.kb_exists, pubData.businessName);
                    }
                    
                    await loadSuggestions();
                    
                    if (processingModal) {
                        const procTitle = document.getElementById('processingTitle');
                        const procMsg = document.getElementById('processingMessage');
                        if (procTitle && procMsg && translations[currentLang]) {
                            procTitle.textContent = translations[currentLang].processing_kb_title;
                            procMsg.textContent = translations[currentLang].processing_kb_msg;
                        }
                        
                        // Delay showing processing modal to match banner transition
                        setTimeout(() => {
                            processingModal.classList.remove('hidden');
                        }, 2500);
                    }
                    
                    setTimeout(() => window.location.reload(), 6500);
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
                // Reset to settings tab
                tabBtns.forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-tab') === 'settings'));
                tabContents.forEach(content => content.classList.toggle('active', content.id === 'settingsTab'));

                // Set admin info from token
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    const email = payload.sub || "";
                    const adminEmailSpan = document.querySelector('.admin-email');
                    if (adminEmailSpan) {
                        adminEmailSpan.textContent = email;
                        adminEmailSpan.title = email;
                    }
                } catch (e) {
                    console.error("Failed to parse token for email", e);
                }

                authPanel.classList.add('hidden');
                settingsPanel.classList.remove('hidden');
                adminOverlay.classList.remove('hidden');
            }
        });
    }

    if (closeAdminBtn) closeAdminBtn.addEventListener('click', () => adminOverlay.classList.add('hidden'));
    if (saveAdminBtn) saveAdminBtn.addEventListener('click', () => adminOverlay.classList.add('hidden'));
    
    if (initiallyOpenToggle) {
        initiallyOpenToggle.addEventListener('change', saveSettings);
    }
    
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
        removeFileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showConfirmationModal("Удалить базу знаний?", async () => {
                if (processingModal) {
                    const procTitle = document.getElementById('processingTitle');
                    const procMsg = document.getElementById('processingMessage');
                    if (procTitle && procMsg && translations[currentLang]) {
                        procTitle.textContent = translations[currentLang].deleting_kb_title;
                        procMsg.textContent = translations[currentLang].deleting_kb_msg;
                    }
                    processingModal.classList.remove('hidden');
                }
                
                try {
                    const resp = await apiRequest('/api/tenant/kb', 'POST', { content: "" });
                    if (resp.ok) {
                        setTimeout(() => window.location.reload(), 1500);
                    }
                } catch (err) {
                    if (processingModal) processingModal.classList.add('hidden');
                    showToast("Ошибка при удалении.", true);
                }
            });
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
        queryInput.addEventListener('keydown', (e) => { 
            if (e.key === 'Enter' && !e.shiftKey) { 
                e.preventDefault(); 
                const query = queryInput.value.trim(); 
                if (query) processSearch(query); 
            } else if (e.key === 'Escape') {
                if (queryInput.value.length > 0) {
                    queryInput.value = '';
                    updateInputState();
                } else {
                    queryInput.blur();
                }
            }
        });
        queryInput.addEventListener('input', updateInputState);
    }

    langBtns.forEach(btn => btn.addEventListener('click', () => setLanguage(btn.getAttribute('data-lang'))));

    // Global keyboard shortcuts
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Priority 1: Close admin overlay if visible
            if (adminOverlay && !adminOverlay.classList.contains('hidden')) {
                // If confirmation modal is open, it handles its own logic, 
                // but let's just close everything for simplicity or follow existing logic.
                if (confirmationModal && !confirmationModal.classList.contains('hidden')) {
                    hideConfirmationModal();
                } else {
                    adminOverlay.classList.add('hidden');
                }
                return;
            }

            // Priority 2: Clear query if not already empty (even if not focused)
            if (queryInput && queryInput.value.length > 0) {
                queryInput.value = '';
                updateInputState();
            }
        }
    });

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

    // New function to control visibility of main UI elements
    function toggleMainUIElements(hide) {
        if (hide) {
            if (headerTools) headerTools.classList.add('hidden');
            // if (searchWrapper) searchWrapper.classList.add('hidden'); // Оставляем searchWrapper видимым
            if (mainFooter) mainFooter.classList.add('hidden');
            if (mainTitle) mainTitle.classList.add('hidden'); // Ensure title is hidden
            if (mainSparkle) mainSparkle.classList.add('hidden'); // Ensure sparkle is hidden
        } else {
            if (headerTools) headerTools.classList.remove('hidden');
            // if (searchWrapper) searchWrapper.classList.remove('hidden'); // Оставляем searchWrapper видимым
            if (mainFooter) mainFooter.classList.remove('hidden');
            if (mainTitle) mainTitle.classList.remove('hidden'); // Ensure title is shown
            if (mainSparkle) mainSparkle.classList.remove('hidden'); // Ensure sparkle is shown
        }
    }

    function typeWriterEffect(text, element) {
        element.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    }

    const creatorLink = document.getElementById('creatorLink');
    const creatorPopup = document.getElementById('creatorPopup');
    const downloadLogsBtn = document.getElementById('downloadLogsBtn');
    const downloadKbBtn = document.getElementById('downloadKbBtn');
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
            isRegisterMode = true; // Fix: Should be true for registration flow
            updateAuthLabels();
        });
    }

    if (clearLogsBtn) {
        clearLogsBtn.addEventListener('click', () => {
            showConfirmationModal(currentLang === 'ru' ? "Очистить все логи?" : "Clear all logs?", async () => {
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
        });
    }

    function renderLogs(logs) {
        logsContent.innerHTML = '';
        if (logs.length === 0) {
            logsContent.innerHTML = `<p data-i18n="no_logs_msg">${translations[currentLang]?.no_logs_msg || "No logs yet."}</p>`;
            return;
        }

        logs.slice().reverse().forEach((log, index) => {
            const logItem = document.createElement('div');
            logItem.className = 'log-item';
            logItem.style.opacity = '0';
            logItem.style.transform = 'translateY(10px)';
            logItem.style.transition = `all 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${Math.min(index * 0.03, 0.5)}s`;

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
            
            requestAnimationFrame(() => {
                logItem.style.opacity = '1';
                logItem.style.transform = 'translateY(0)';
            });
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

    async function downloadKb() {
        try {
            const resp = await apiRequest('/api/tenant/kb');
            if (resp.ok) {
                const data = await resp.json();
                if (!data.content) {
                    showToast(currentLang === 'ru' ? "База пуста" : "Knowledge base is empty", true);
                    return;
                }
                const blob = new Blob([data.content], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `kb_${new Date().toISOString().split('T')[0]}.md`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast(currentLang === 'ru' ? "База знаний скачана" : "Knowledge base downloaded");
            }
        } catch (err) {
            showToast("Error", true);
        }
    }

    if (downloadLogsBtn) downloadLogsBtn.addEventListener('click', downloadLogs);
    if (downloadKbBtn) downloadKbBtn.addEventListener('click', downloadKb);

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
