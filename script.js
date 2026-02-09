document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const queryInput = document.getElementById('queryInput');
    const sendBtn = document.getElementById('sendBtn');
    const clearBtn = document.getElementById('clearBtn');
    const minimizeBtn = document.getElementById('minimizeBtn');
    const floatingBtn = document.getElementById('floatingBtn');

    // Areas
    const resultsArea = document.getElementById('resultsArea');
    const answerCard = document.getElementById('answerCard');
    const answerContent = document.getElementById('answerContent');
    const loader = document.getElementById('loader');
    const statusText = document.getElementById('statusText');
    const suggestions = document.querySelectorAll('.suggestion-chip');
    const langBtns = document.querySelectorAll('.lang-btn');

    // Translations
    const translations = {
        ru: {
            // UI Text
            title_main: "AI Knowledge Base",
            minimize_btn_title: "Свернуть",
            input_placeholder: "Задайте вопрос по базе знаний...",
            suggestion_1: "Как оформить отпуск?",
            suggestion_2: "График работы",
            suggestion_3: "Контакты HR",
            source_label: "Источник: Внутренняя документация",
            send_btn_aria: "Отправить",
            clear_btn_title: "Очистить",
            copy_btn_title: "Копировать",

            // Status & Responses
            status_analyzing: "Анализирую базу знаний...",
            status_generating: "Формирую ответ...",

            response_vacation: "Согласно графику отпусков, вы можете брать **28 календарных дней** в году. \n\nВажно: одна из частей отпуска должна быть не менее 14 дней. Заявление нужно подать за 2 недели до начала.",
            response_remote: "Политика компании позволяет работать удаленно **до 3 дней в неделю**. \n\nЭто нужно согласовать с вашим руководителем. Если хотите перейти на полную удаленку, потребуется доп. соглашение.",
            response_hr: "Вы можете связаться с HR-отделом по почте **hr@company.com**.\nТакже доступен внутренний номер 1024 (Мария Иванова).",
            response_fallback: "Я поискал это в базе знаний, но не нашел точного совпадения. \n\nВот что есть общего:\n"
        },
        en: {
            title_main: "AI Knowledge Base",
            minimize_btn_title: "Minimize",
            input_placeholder: "Ask a question...",
            suggestion_1: "How to apply for leave?",
            suggestion_2: "Work schedule",
            suggestion_3: "HR Contacts",
            source_label: "Source: Internal Documentation",
            send_btn_aria: "Send",
            clear_btn_title: "Clear",
            copy_btn_title: "Copy",

            status_analyzing: "Analyzing knowledge base...",
            status_generating: "Generating answer...",

            response_vacation: "According to the vacation schedule, you can take **28 calendar days** per year. \n\nImportant: one part of the vacation must be at least 14 days. You need to apply 2 weeks in advance.",
            response_remote: "Company policy allows remote work **up to 3 days a week**. \n\nThis must be agreed with your manager. If you want to switch to full remote work, an additional agreement is required.",
            response_hr: "You can contact the HR department via email **hr@company.com**.\nInternal extension 1024 (Maria Ivanova) is also available.",
            response_fallback: "I searched the knowledge base but couldn't find an exact match. \n\nHere is what I found:\n"
        },
        pt: {
            title_main: "Base de Conhecimento IA",
            minimize_btn_title: "Minimizar",
            input_placeholder: "Faça uma pergunta...",
            suggestion_1: "Como pedir férias?",
            suggestion_2: "Horário de trabalho",
            suggestion_3: "Contatos de RH",
            source_label: "Fonte: Documentação Interna",
            send_btn_aria: "Enviar",
            clear_btn_title: "Limpar",
            copy_btn_title: "Copiar",

            status_analyzing: "Analisando base de conhecimento...",
            status_generating: "Gerando resposta...",

            response_vacation: "De acordo com o cronograma de férias, você pode tirar **28 dias corridos** por ano. \n\nImportante: uma das partes das férias deve ter pelo menos 14 dias. Você precisa solicitar com 2 semanas de antecedência.",
            response_remote: "A política da empresa permite trabalho remoto **até 3 dias por semana**. \n\nIsso deve ser acordado com seu gerente. Se quiser mudar para trabalho remoto total, é necessário um acordo adicional.",
            response_hr: "Você pode entrar em contato com o departamento de RH pelo e-mail **hr@company.com**.\nO ramal interno 1024 (Maria Ivanova) também está disponível.",
            response_fallback: "Pesquisei na base de conhecimento, mas não encontrei uma correspondência exata. \n\nAqui está o que encontrei:\n"
        }
    };

    // Mock Data (Static RAG content) - Simplified for fallback
    const mockFallbackData = `
**Remote Work / Удаленная работа / Trabalho Remoto**
Policy: up to 3 days/week. / Политика: до 3 дней. / Política: até 3 dias.

**Vacation / Отпуск / Férias**
28 days/year. / 28 дней в году. / 28 dias/ano.

**HR / Кадры / RH**
Email: hr@company.com
    `;

    let currentLang = 'ru';

    // --- Language Logic ---
    function setLanguage(lang) {
        if (!translations[lang]) return;
        currentLang = lang;
        document.documentElement.lang = lang;

        // Update Text Content
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[lang][key]) {
                el.textContent = translations[lang][key];
            }
        });

        // Update Placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (translations[lang][key]) {
                el.placeholder = translations[lang][key];
            }
        });

        // Update Titles
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            if (translations[lang][key]) {
                el.title = translations[lang][key];
            }
        });

        // Update Aria Labels
        document.querySelectorAll('[data-i18n-aria]').forEach(el => {
            const key = el.getAttribute('data-i18n-aria');
            if (translations[lang][key]) {
                el.setAttribute('aria-label', translations[lang][key]);
            }
        });

        // Update Buttons Styling
        langBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
        });

        // If there's an active result, we might want to re-translate it? 
        // For now, let's keep it simple. If the user searches again, it will be in new language.
    }

    // Init Language
    langBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.getAttribute('data-lang');
            setLanguage(lang);
        });
    });

    // --- Interaction Handlers ---

    // 1. Min/Max Mode
    minimizeBtn.addEventListener('click', () => {
        document.body.classList.add('minimized');
    });

    floatingBtn.addEventListener('click', () => {
        document.body.classList.remove('minimized');
        setTimeout(() => queryInput.focus(), 300);
    });

    // 2. Input Resize & State
    function updateInputState() {
        const val = queryInput.value.trim();

        // Auto-resize
        queryInput.style.height = 'auto';
        queryInput.style.height = (queryInput.scrollHeight) + 'px';
        if (queryInput.value === '') {
            queryInput.style.height = 'auto';
        }

        // Toggle X Button
        if (val.length > 0) {
            clearBtn.classList.remove('hidden');
            sendBtn.classList.add('active');
        } else {
            clearBtn.classList.add('hidden');
            sendBtn.classList.remove('active');
        }
    }

    queryInput.addEventListener('input', updateInputState);

    // 3. Clear Button
    clearBtn.addEventListener('click', () => {
        queryInput.value = '';
        updateInputState();
        queryInput.focus();
    });


    // --- Core Search Logic ---

    // Handle Suggestions Click
    suggestions.forEach(chip => {
        chip.addEventListener('click', () => {
            // Put the translated text into input
            queryInput.value = chip.textContent;
            updateInputState();
            queryInput.focus();
            processSearch(chip.textContent);
        });
    });

    // Handle Send Click
    sendBtn.addEventListener('click', () => {
        const query = queryInput.value.trim();
        if (query) {
            processSearch(query);
        }
    });

    // Handle Enter Key
    queryInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const query = queryInput.value.trim();
            if (query) {
                processSearch(query);
            }
        }
    });

    function processSearch(query) {
        // UI Transition
        document.body.classList.add('has-results');
        resultsArea.classList.remove('hidden');

        // Reset State
        answerCard.classList.add('hidden');
        loader.classList.remove('hidden');
        statusText.textContent = translations[currentLang].status_analyzing;

        // Simulate Network Delay & Processing
        setTimeout(() => {
            statusText.textContent = translations[currentLang].status_generating;

            setTimeout(() => {
                const response = simulateAIResponse(query);

                // Show Result
                loader.classList.add('hidden');
                statusText.textContent = "";

                typeWriterEffect(response, answerContent);
                answerCard.classList.remove('hidden');

            }, 800);
        }, 1200);
    }

    // Mock AI "Chain of Thought" / Retrieval
    function simulateAIResponse(query) {
        const q = query.toLowerCase();
        const t = translations[currentLang];

        // Multi-language keyword matching
        const isVacation = q.includes('отпуск') || q.includes('vacation') || q.includes('leave') || q.includes('férias');
        const isRemote = q.includes('удален') || q.includes('remote') || q.includes('home') || q.includes('trabalho');
        const isHR = q.includes('hr') || q.includes('кадр') || q.includes('rh') || q.includes('contact');

        if (isVacation) {
            return t.response_vacation;
        }
        if (isRemote) {
            return t.response_remote;
        }
        if (isHR) {
            return t.response_hr;
        }

        // Fallback
        return t.response_fallback + mockFallbackData;
    }

    // Typewriter Effect
    function typeWriterEffect(text, element) {
        element.innerHTML = "";

        const formattedHTML = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');

        element.style.opacity = 0;
        element.innerHTML = formattedHTML;

        void element.offsetWidth;

        element.style.transition = 'opacity 0.5s ease';
        element.style.opacity = 1;
    }

    // Initial call to set defaults in case HTML is static
    setLanguage('ru');
});
