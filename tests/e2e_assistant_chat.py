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
from datetime import date, timedelta
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8844"
FAILURES = []

# The company's working calendar (Thursday weekly off, festival holidays,
# adjustment days — Master Data → Holidays, REQUIREMENTS.md §16): the fill
# test needs a day with a real, non-holiday Daily Monitoring record.
ADJUSTMENT_DAYS_2026 = {"2026-01-22", "2026-08-06", "2026-10-22", "2026-11-05", "2026-11-20"}
FESTIVAL_HOLIDAYS_2026 = {
    "2026-01-14", "2026-01-26", "2026-03-04", "2026-08-15", "2026-08-28", "2026-09-04", "2026-10-19", "2026-10-20",
    "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13",
}


def next_working_day(d):
    while d.isoformat() in FESTIVAL_HOLIDAYS_2026 or (d.weekday() == 3 and d.isoformat() not in ADJUSTMENT_DAYS_2026):
        d += timedelta(days=1)
    return d


WORK_DAY = next_working_day(date.today()).isoformat()
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
        # A phrase the client-side answer layer (engine/assistantLocal.ts)
        # does NOT catch — "what can you do" is answered locally now — so this
        # still round-trips through Groq.
        url_before = page.url
        before = bot_messages(page).count()
        ask(page, "hi there, how is your day going?")
        check("A conversational message did not navigate anywhere", page.url == url_before)
        check("Assistant gave a reply message", bot_messages(page).count() > before)

        # ---- 4. Natural-language fill on an already-open record ----
        # Close the panel first: it sits bottom-right, over the Day View's
        # "Open" buttons, same as a real user would tuck it away to click.
        page.click("button[aria-label='Close assistant']")
        page.wait_for_timeout(150)
        page.goto(f"{BASE}/index.html#/day/{WORK_DAY}")
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

        # ---- 5. Full-page Assistant: the model answers from the live app context ----
        # No date/weekday in the question, so it is NOT answered locally
        # (engine/assistantLocal.ts) — it goes to Groq with the context digest
        # attached, which states the weekly off is Thursday.
        # The four model calls above fit in one minute of this account's
        # tokens-per-minute allowance only just (each carries the route guide
        # + context); pause so this one isn't the request that trips it.
        page.wait_for_timeout(15000)
        page.goto(f"{BASE}/index.html#/assistant")
        page.wait_for_timeout(400)
        page.fill("textarea.assistant-input", "which day of the week is our weekly off? answer in one line")
        page.click("button[aria-label='Send message']")
        page.wait_for_timeout(3500)
        page_reply = page.locator(".assistant-page .chat-msg.bot").last.inner_text()
        print(f"    (assistant page replied: {page_reply[:160]!r}; url now {page.url})")
        check("Assistant page answers from the live app context (weekly off = Thursday)", "thursday" in page_reply.lower())

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
