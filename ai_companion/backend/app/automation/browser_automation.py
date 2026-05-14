from __future__ import annotations

from playwright.async_api import async_playwright


class BrowserAutomationEngine:
    async def google_search(self, query: str) -> list[str]:
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto("https://www.google.com")
            await page.fill('textarea[name="q"]', query)
            await page.keyboard.press("Enter")
            await page.wait_for_timeout(2000)
            links = await page.eval_on_selector_all(
                "a h3",
                "nodes => nodes.slice(0,5).map(n => n.textContent || '')",
            )
            await browser.close()
            return links

