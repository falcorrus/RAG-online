import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1280, "height": 800})
        
        page.on("console", lambda msg: print(f"CONSOLE [{msg.type}]: {msg.text}"))
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err.message}"))
        
        await page.goto("http://localhost:8006")
        await page.wait_for_timeout(2000)
        
        print("Typing search query char-by-char...")
        await page.focus("#queryInput")
        await page.keyboard.type("Что такое easyFAQ?")
        await page.wait_for_timeout(500)
        
        # Check elements visibility and properties after typing
        info = await page.evaluate("""() => {
            const input = document.getElementById('queryInput');
            const btn = document.getElementById('sendBtn');
            const style = window.getComputedStyle(btn);
            return {
                inputValue: input.value,
                btnActive: btn.classList.contains('active'),
                btnPointerEvents: style.pointerEvents,
                btnOpacity: style.opacity
            };
        }""")
        print("AFTER TYPING ELEMENTS INFO:", info)
        
        print("Clicking search button...")
        await page.click("#sendBtn")
        
        # Wait for potential API call and streaming responses
        await page.wait_for_timeout(7000)
        
        # Get results visibility
        results_info = await page.evaluate("""() => {
            const area = document.getElementById('resultsArea');
            const card = document.getElementById('answerCard');
            const content = document.getElementById('answerContent');
            return {
                areaVisible: !area.classList.contains('hidden'),
                cardVisible: !card.classList.contains('hidden'),
                responseTextLength: content.innerText.length,
                responseText: content.innerText.substring(0, 100) + '...'
            };
        }""")
        print("RESULTS INFO:", results_info)
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
