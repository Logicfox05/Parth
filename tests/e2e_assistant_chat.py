"""
Exercises the assistant "buddy" chat endpoint (/api/assistant/chat, backed by
Groq — see backend/groq.ts / backend/assistant.ts) through the actual UI:
natural-language navigation ("show me August's reports", "open CAPA"),
natural-language field filling on an already-open record, and a plain
conversational reply. Makes real network calls to Groq, so this is NOT wired
into `npm run test:e2e` (network/quota-dependent, like visual_qa.py) — run it
manually against a server you start yourself:

    npm run build
    API_PORT=8844 npm run server &     # Windows PowerShell: $env:API_PORT=8844; npm run server
    python tests/e2e_assistant_chat.py
"""
import sys
import time
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8844"
FAILURES = []
TEST_EMAIL = f"e2e-buddy-{int(time.time() * 1000)}@example.com"
TEST_PASSWORD = "PlaywrightQA123"


def check(label, condition):
    status = "PASS" if condition else "FAIL"
    print(f"[{status}] {label}")
    if not condition:
        FAILURES.append(label)


def open_widget(page):
    # The floating "Ask the assistant" button only exists while the panel is
    # CLOSED (it's replaced by the panel itself once open) — a previous ask()
    # on this page may have left it open, so only click if it's actually
    # showing, rather than assuming a fresh collapsed state every time.
    toggle = page.locator("button:has-text('Ask the assistant')")
    if toggle.count() > 0:
        toggle.click()
        page.wait_for_timeout(200)


def ask(page, text):
    open_widget(page)
    box = page.locator("textarea.input")
    box.fill(text)
    page.click("button[aria-label='Send']")
    page.wait_for_timeout(3500)  # real Groq round-trip


def bot_messages(page):
    return page.locator(".chat-msg.bot")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))

        page.goto(f"{BASE}/index.html")
        page.wait_for_timeout(300)
        page.click("text=Sign up")
        page.fill("#signup-name", "Buddy QA")
        page.fill("#signup-email", TEST_EMAIL)
        page.fill("#signup-password", TEST_PASSWORD)
        page.fill("#signup-confirm", TEST_PASSWORD)
        page.click("button:has-text('Create Account')")
        page.wait_for_timeout(600)
        got_it = page.locator("button:has-text('Got it')")
        if got_it.count():
            got_it.first.click()
            page.wait_for_timeout(200)

        # ---- 1. Navigation: "reports for August" ----
        before = bot_messages(page).count()
        ask(page, "show me all reports of august")
        check("Navigated to Reports for August via free text", "#/reports/2026/7" in page.url)
        check("Assistant showed a confirmation reply", bot_messages(page).count() > before)

        # ---- 2. Navigation: "open CAPA" ----
        ask(page, "open CAPA")
        check("Navigated to CAPA via free text", "#/gap" in page.url)

        # ---- 3. Plain conversational reply (no navigation, no fill) ----
        url_before = page.url
        before = bot_messages(page).count()
        ask(page, "hi, what can you do")
        check("A conversational message did not navigate anywhere", page.url == url_before)
        check("Assistant gave a reply message", bot_messages(page).count() > before)

        # ---- 4. Natural-language fill on an already-open record ----
        # Close the panel first: it sits bottom-right, over the Day View's
        # "Open" buttons, same as a real user would tuck it away to click.
        page.click("button[aria-label='Close assistant']")
        page.wait_for_timeout(150)
        page.click("text=Record Calendar")
        page.wait_for_timeout(200)
        page.locator(".calendar-cell.today").first.click()
        page.wait_for_timeout(300)
        rows = page.locator(".doc-table tbody tr")
        opened = False
        for i in range(rows.count()):
            if "Daily Pest Control Monitoring" in rows.nth(i).inner_text():
                rows.nth(i).locator("button", has_text="Open").click()
                opened = True
                break
        check("Opened a Daily Pest Monitoring record for the fill test", opened)
        if opened:
            ask(page, "checker is Buddy QA Tester")
            check("Fill instruction applied a field", bot_messages(page).filter(has_text="I've filled in").count() > 0)
            checker_input = page.locator("input[placeholder='Name of checker']")
            check("Checker field actually updated", checker_input.count() > 0 and checker_input.input_value() == "Buddy QA Tester")

        browser.close()
        print("\nJS errors:", errors[:10])
        if FAILURES:
            print(f"\n{len(FAILURES)} FAILURE(S):")
            for f in FAILURES:
                print(" -", f)
            sys.exit(1)
        print("\nAll assistant-chat checks passed.")


if __name__ == "__main__":
    main()
