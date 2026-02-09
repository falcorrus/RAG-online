document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const queryInput = document.getElementById('queryInput');
    const sendBtn = document.getElementById('sendBtn');
    const clearBtn = document.getElementById('clearBtn');
    const minimizeBtn = document.getElementById('minimizeBtn');
    const floatingBtn = document.getElementById('floatingBtn');

    const resultsArea = document.getElementById('resultsArea');
    const answerCard = document.getElementById('answerCard');
    const answerContent = document.getElementById('answerContent');
    const loader = document.getElementById('loader');
    const statusText = document.getElementById('statusText');
    const suggestions = document.querySelectorAll('.suggestion-chip');

    // Mock Data (Static RAG content)
    const mockKnowledgeBase = `
**Политика удаленной работы**
Сотрудники имеют право на удаленную работу до 3 дней в неделю по согласованию с руководителем. Для полностью удаленной работы требуется подписать дополнительное соглашение.

**График отпусков**
Заявления на отпуск подаются не позднее чем за 2 недели. В году доступно 28 календарных дней. Можно делить на части, одна из которых должна быть не менее 14 дней.

**Контакты HR**
По вопросам кадров пишите на hr@company.com или звоните по внутреннему номеру 1024 (Мария Иванова).

**Техническая поддержка**
Для заявок используйте портал helpdesk.internal. Пароль от Wi-Fi "Guest": SuperSecurePass2025.
    `;

    // --- Interaction Handlers ---

    // 1. Min/Max Mode
    minimizeBtn.addEventListener('click', () => {
        document.body.classList.add('minimized');
    });

    floatingBtn.addEventListener('click', () => {
        document.body.classList.remove('minimized');
        // Optional: focus input when restoring
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
            sendBtn.classList.add('active'); // CSS class for opacity
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
        // Optional: Hide results when clearing?
        // document.body.classList.remove('has-results');
    });


    // --- Core Search Logic ---

    // Handle Suggestions Click
    suggestions.forEach(chip => {
        chip.addEventListener('click', () => {
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
        statusText.textContent = "Анализирую базу знаний...";

        // Simulate Network Delay & Processing
        setTimeout(() => {
            statusText.textContent = "Формирую ответ...";

            // Simple "RAG" simulation logic: keyword matching
            // In real app, this would be an API call
            setTimeout(() => {
                const response = simulateAIResponse(query);

                // Show Result
                loader.classList.add('hidden');
                statusText.textContent = ""; // Clear status

                typeWriterEffect(response, answerContent);
                answerCard.classList.remove('hidden');

            }, 800); // 2nd delay
        }, 1200); // 1st delay
    }

    // Mock AI "Chain of Thought" / Retrieval
    function simulateAIResponse(query) {
        const q = query.toLowerCase();

        if (q.includes('отпуск') || q.includes('отдых')) {
            return "Согласно графику отпусков, вы можете брать **28 календарных дней** в году. \n\nВажно: одна из частей отпуска должна быть не менее 14 дней. Заявление нужно подать за 2 недели до начала.";
        }
        if (q.includes('удален') || q.includes('дом')) {
            return "Политика компании позволяет работать удаленно **до 3 дней в неделю**. \n\nЭто нужно согласовать с вашим руководителем. Если хотите перейти на полную удаленку, потребуется доп. соглашение.";
        }
        if (q.includes('hr') || q.includes('кадр') || q.includes('телефон')) {
            return "Вы можете связаться с HR-отделом по почте **hr@company.com**.\nТакже доступен внутренний номер 1024 (Мария Иванова).";
        }

        // Fallback for unmatched queries
        return "Я поискал это в базе знаний, но не нашел точного совпадения. \n\nВот что есть общего:\n" + mockKnowledgeBase;
    }

    // Typewriter Effect
    function typeWriterEffect(text, element) {
        element.innerHTML = ""; // Clear

        // Basic Markdown-ish parsing (bolding)
        const formattedHTML = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');

        element.style.opacity = 0;
        element.innerHTML = formattedHTML;

        void element.offsetWidth;

        element.style.transition = 'opacity 0.5s ease';
        element.style.opacity = 1;
    }
});
