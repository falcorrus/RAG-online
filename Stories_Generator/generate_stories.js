const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const slides = [
    { 
        id: 1, 
        label: "Боль", 
        title: "Устали отвечать на одно и то же? 🥱",
        subtitle: "Пока вы заняты, клиенты уходят к тем, кто отвечает быстрее."
    },
    { 
        id: 2, 
        label: "Решение", 
        title: "Свой GPT за 5 минут ⏱️",
        subtitle: "AI-консультант, который знает всё именно о ВАШЕМ бизнесе и ценах."
    },
    { 
        id: 7, 
        label: "Простота", 
        title: "Дай ссылку и забудь 🔗",
        subtitle: "Зарегистрируй ссылку, залей текст с FAQ — и твой ИИ-сотрудник готов."
    },
    { 
        id: 5, 
        label: "Сервис", 
        title: "Говорит на языке клиента 🌍",
        subtitle: "Свободная форма вопросов и мгновенные ответы 24/7."
    },
    { 
        id: 6, 
        label: "Результат", 
        title: "Освободите 70% своего времени 🚀",
        subtitle: "Настройте свой RAG за пару кликов прямо сейчас."
    },
    {
        id: 8,
        label: "Action",
        title: "Нажмите",
        subtitle: ""
    },
    {
        id: 9,
        label: "",
        title: "",
        subtitle: ""
    }
];

(async () => {
    console.log('🚀 Starting stories generation (Added Empty Slide)...');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    const templatePath = 'file://' + path.resolve('Stories_Generator/template.html');
    await page.setViewportSize({ width: 1080, height: 1920 });

    const outputDir = path.resolve('Stories_Generator/output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        console.log(`📸 Generating slide ${i + 1}: ${slide.title || 'Empty Slide'}`);
        
        await page.goto(templatePath);
        
        await page.evaluate((data) => {
            const container = document.querySelector('.container');
            const footer = document.querySelector('.footer');
            const label = document.getElementById('label');
            const title = document.getElementById('title');
            
            // Reset common styles
            container.style.display = 'flex';
            container.style.justifyContent = 'center';
            container.style.paddingTop = '120px';
            container.style.height = '100%';
            if (footer) footer.style.display = 'flex';
            if (label) label.style.display = 'block';
            if (title) title.style.display = 'block';

            if (label) label.innerText = data.label;
            if (title) title.innerText = data.title;
            
            // Subtitle logic
            let subtitle = document.getElementById('subtitle');
            if (!subtitle) {
                subtitle = document.createElement('p');
                subtitle.id = 'subtitle';
                subtitle.style.fontSize = '42px';
                subtitle.style.color = 'rgba(255, 255, 255, 0.6)';
                subtitle.style.marginTop = '20px';
                subtitle.style.maxWidth = '900px';
                subtitle.style.lineHeight = '1.4';
                if (title) title.after(subtitle);
            }
            subtitle.innerText = data.subtitle;
            subtitle.style.display = data.subtitle ? 'block' : 'none';

            const visual = document.getElementById('visual-content');
            if (visual) {
                visual.innerHTML = '';
                visual.style.display = 'flex';
            }
            
            if (data.id === 1) visual.innerHTML = '<div class="notification-icon">💬</div>';
            else if (data.id === 2) visual.innerHTML = '<div class="icon-large">⏱️</div>';
            else if (data.id === 7) {
                visual.innerHTML = `
                    <div class="setup-card">
                        <div class="setup-title">Запуск в 2 клика</div>
                        <div class="step done">
                            <div class="check">✓</div>
                            <div class="step-text">Ссылка: my-business.rag.ru</div>
                        </div>
                        <div class="step">
                            <div class="check"></div>
                            <div class="step-text">Загрузить текстовый файл</div>
                        </div>
                    </div>
                `;
            } else if (data.id === 5) {
                visual.innerHTML = `
                    <div class="chatgpt-input">
                        <div class="placeholder">How can I order? (AI answers in English)</div>
                        <div class="send-btn">↑</div>
                    </div>
                `;
            } else if (data.id === 6) visual.innerHTML = '<div class="icon-large">🚀</div>';
            else if (data.id === 8) {
                visual.innerHTML = '<div class="icon-large">👉</div>';
                container.style.justifyContent = 'flex-start';
                container.style.paddingTop = '250px';
                container.style.height = '50%';
                if (footer) footer.style.display = 'none';
            } else if (data.id === 9) {
                // COMPLETELY EMPTY
                if (label) label.style.display = 'none';
                if (title) title.style.display = 'none';
                if (subtitle) subtitle.style.display = 'none';
                if (visual) visual.style.display = 'none';
                if (footer) footer.style.display = 'none';
            }
        }, slide);
        
        await page.waitForTimeout(1000);
        
        const fileName = `business_slide_${i + 1}.png`;
        const filePath = path.join(outputDir, fileName);
        await page.screenshot({ path: filePath });
        console.log(`✅ Saved to ${filePath}`);
    }

    await browser.close();
    console.log('🎉 Generation complete! Empty slide added.');
})();
