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
    const apiKeyInput = document.getElementById('apiKeyInput');

    const resultsArea = document.getElementById('resultsArea');
    const answerCard = document.getElementById('answerCard');
    const answerContent = document.getElementById('answerContent');
    const loader = document.getElementById('loader');
    const statusText = document.getElementById('statusText');
    const suggestions = document.querySelectorAll('.suggestion-chip');
    const langBtns = document.querySelectorAll('.lang-btn');

    // State
    let knowledgeBase = []; 
    let currentLang = 'ru';

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
            status_ai_thinking: "Gemini формирует ответ...",
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
            status_ai_thinking: "Gemini is thinking...",
            response_fallback: "I searched the knowledge base but couldn't find a match. Try rephrasing your question."
        }
    };

    // --- Simple Synonym Map for local search ---
    const synonyms = {
        "стоянк": "парковк",
        "парков": "стоянк",
        "денег": "цены",
        "стоимос": "цены",
        "оплат": "цены",
        "платит": "цены",
        "ребенок": "детск",
        "малыш": "детск"
    };

    // --- AI API Integration ---
    async function callGemini(query, context) {
        const apiKey = localStorage.getItem('apiKey');
        if (!apiKey) return null;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        
        const prompt = `You are a helpful assistant for a company knowledge base. 
        Use the following documentation to answer the user's question. 
        If the answer is not in the documentation, state that clearly but politely. 
        Keep the answer concise and friendly.
        Answer in the SAME LANGUAGE as the user's question.
        
        DOCUMENTATION CONTENT:
        ---
        ${context}
        ---
        
        USER QUESTION: ${query}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.3, maxOutputTokens: 1000 }
                })
            });

            if (response.status === 429) {
                console.warn("Gemini Rate Limit (429). Falling back to local search...");
                return null;
            }

            if (!response.ok) return null;

            const data = await response.json();
            return data.candidates[0].content.parts[0].text;
        } catch (err) {
            return null;
        }
    }

    // --- Data Management ---
    function parseKnowledgeBase(text) {
        const blocks = text.split(/\n(?=\*\*|#)/);
        const kb = [];
        blocks.forEach(block => {
            const lines = block.trim().split('\n');
            if (lines.length >= 2) {
                const question = lines[0].replace(/[\*#«»]/g, '').trim();
                const answer = lines.slice(1).join('\n').trim();
                if (question && answer) {
                    kb.push({ 
                        question, 
                        answer,
                        qBuffer: question.toLowerCase().replace(/[?.,!«»()]/g, ''),
                        aBuffer: answer.toLowerCase().replace(/[?.,!«»()]/g, '')
                    });
                }
            }
        });
        knowledgeBase = kb;
    }

    const settings = {
        initiallyOpen: localStorage.getItem('initiallyOpen') !== 'false',
        defaultLang: localStorage.getItem('defaultLang') || 'ru',
        kbFileName: localStorage.getItem('kbFileName') || null,
        kbRawContent: localStorage.getItem('kbRawContent') || null,
        apiKey: localStorage.getItem('apiKey') || ''
    };

    function initSettings() {
        if (!settings.initiallyOpen) document.body.classList.add('minimized');
        setLanguage(settings.defaultLang);
        initiallyOpenToggle.checked = settings.initiallyOpen;
        defaultLangSelect.value = settings.defaultLang;
        
        apiKeyInput.value = localStorage.getItem('apiKey') || '';
        
        if (settings.kbRawContent) parseKnowledgeBase(settings.kbRawContent);
        if (settings.kbFileName) showFileInfo(settings.kbFileName);
    }

    function saveSettings() {
        localStorage.setItem('initiallyOpen', initiallyOpenToggle.checked);
        localStorage.setItem('defaultLang', defaultLangSelect.value);
        localStorage.setItem('apiKey', apiKeyInput.value.trim());
        setLanguage(defaultLangSelect.value);
        adminOverlay.classList.add('hidden');
        if (localStorage.getItem('kbRawContent')) parseKnowledgeBase(localStorage.getItem('kbRawContent'));
    }

    function handleFileSelect(file) {
        if (!file.name.endsWith('.md')) return alert('Please select a .md file');
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            localStorage.setItem('kbRawContent', content);
            localStorage.setItem('kbFileName', file.name);
            parseKnowledgeBase(content);
            showFileInfo(file.name);
        };
        reader.readAsText(file);
    }

    async function processSearch(query) {
        queryInput.blur();
        document.body.classList.add('has-results');
        resultsArea.classList.remove('hidden');
        answerCard.classList.add('hidden');
        loader.classList.remove('hidden');
        statusText.textContent = translations[currentLang].status_analyzing;

        let response = null;
        const apiKey = localStorage.getItem('apiKey');
        const kbContent = localStorage.getItem('kbRawContent');

        if (apiKey && kbContent) {
            statusText.textContent = translations[currentLang].status_ai_thinking;
            response = await callGemini(query, kbContent);
        }

        if (!response) {
            const qClean = query.toLowerCase().replace(/[?.,!«»()]/g, '');
            let queryWords = qClean.split(/\s+/).filter(w => w.length >= 3);
            
            // Expand query with synonyms
            let expandedWords = [...queryWords];
            queryWords.forEach(w => {
                const stem = w.substring(0, 6);
                if (synonyms[stem]) expandedWords.push(synonyms[stem]);
            });

            let bestMatch = null;
            let maxScore = 0;

            knowledgeBase.forEach(item => {
                let score = 0;
                const itemFullText = (item.qBuffer + " " + item.aBuffer);

                expandedWords.forEach(qW => {
                    const qStem = qW.substring(0, 4);
                    if (item.qBuffer.includes(qStem)) score += 3;
                    else if (item.aBuffer.includes(qStem)) score += 1;
                });

                if (score > maxScore) {
                    maxScore = score;
                    bestMatch = item;
                }
            });

            if (bestMatch && maxScore > 0) response = bestMatch.answer;
        }

        setTimeout(() => {
            loader.classList.add('hidden');
            statusText.textContent = "";
            typeWriterEffect(response || translations[currentLang].response_fallback, answerContent);
            answerCard.classList.remove('hidden');
        }, 300);
    }

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
        langBtns.forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-lang') === currentLang));
    }
    adminBtn.addEventListener('click', () => adminOverlay.classList.remove('hidden'));
    closeAdminBtn.addEventListener('click', () => adminOverlay.classList.add('hidden'));
    saveAdminBtn.addEventListener('click', saveSettings);
    kbDropZone.addEventListener('click', () => kbFileInput.click());
    kbFileInput.addEventListener('change', (e) => { if (e.target.files.length > 0) handleFileSelect(e.target.files[0]); });
    kbDropZone.addEventListener('dragover', (e) => { e.preventDefault(); kbDropZone.classList.add('dragover'); });
    kbDropZone.addEventListener('dragleave', () => kbDropZone.classList.remove('dragover'));
    kbDropZone.addEventListener('drop', (e) => { e.preventDefault(); kbDropZone.classList.remove('dragover'); if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files[0]); });
    removeFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        localStorage.removeItem('kbFileName');
        localStorage.removeItem('kbRawContent');
        knowledgeBase = [];
        fileInfo.classList.add('hidden');
        kbDropZone.querySelector('.drop-zone-content').classList.remove('hidden');
    });
    langBtns.forEach(btn => btn.addEventListener('click', () => setLanguage(btn.getAttribute('data-lang'))));
    minimizeBtn.addEventListener('click', () => document.body.classList.add('minimized'));
    floatingBtn.addEventListener('click', () => { document.body.classList.remove('minimized'); setTimeout(() => queryInput.focus(), 300); });
    function updateInputState() {
        const val = queryInput.value.trim();
        queryInput.style.height = 'auto';
        queryInput.style.height = (queryInput.scrollHeight) + 'px';
        if (val.length > 0) { clearBtn.classList.remove('hidden'); sendBtn.classList.add('active'); }
        else { clearBtn.classList.add('hidden'); sendBtn.classList.remove('active'); }
    }
    queryInput.addEventListener('input', updateInputState);
    clearBtn.addEventListener('click', () => { queryInput.value = ''; updateInputState(); });
    suggestions.forEach(chip => { chip.addEventListener('click', () => { queryInput.value = chip.textContent; updateInputState(); processSearch(chip.textContent); }); });
    sendBtn.addEventListener('click', () => { const query = queryInput.value.trim(); if (query) processSearch(query); });
    queryInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const query = queryInput.value.trim(); if (query) processSearch(query); } });
    function typeWriterEffect(text, element) {
        element.innerHTML = "";
        const formattedHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
        element.style.opacity = 0; element.innerHTML = formattedHTML;
        void element.offsetWidth; element.style.transition = 'opacity 0.5s ease'; element.style.opacity = 1;
    }
    initSettings();
});