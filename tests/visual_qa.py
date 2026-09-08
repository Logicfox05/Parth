"""Visual QA pass: screenshots of key screens + deeper interaction checks
for Fly Catcher, Service Report, GAP creation, Training creation, and print.
"""
import sys
import time
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8842"
FAILURES = []
TEST_EMAIL = f"e2e-visual-{int(time.time() * 1000)}@example.com"
TEST_PASSWORD = "PlaywrightQA123"


def check(label, condition):
    status = "PASS" if condition else "FAIL"
    print(f"[{status}] {label}")
    if not condition:
        FAILURES.append(label)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1400, "height": 900})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))

        page.goto(f"{BASE}/index.html")
        page.wait_for_timeout(300)
        page.click("text=Sign up")
        page.wait_for_timeout(150)
        page.fill("#signup-name", "Visual QA")
        page.fill("#signup-email", TEST_EMAIL)
        page.fill("#signup-password", TEST_PASSWORD)
        page.fill("#signup-confirm", TEST_PASSWORD)
        page.click("button:has-text('Create Account')")
        page.wait_for_timeout(600)
        # The assistant's login briefing (a blocking overlay) is the first
        # thing a user sees -- capture it, then dismiss it.
        check("Assistant briefing shown on login", "ready for your OK" in page.content())
        page.screenshot(path="tests/shots/00_briefing.png")
        got_it = page.locator("button:has-text('Got it')")
        if got_it.count():
            got_it.first.click()
            page.wait_for_timeout(200)
        check("Signed up and reached the dashboard", "Digital Controlled Record System" in page.content())
        page.screenshot(path="tests/shots/01_dashboard.png", full_page=True)

        page.click("text=Record Calendar")
        page.wait_for_timeout(300)
        page.screenshot(path="tests/shots/02_calendar.png", full_page=True)

        page.click("text=Document Library")
        page.wait_for_timeout(300)
        page.screenshot(path="tests/shots/03_library.png", full_page=True)

        # --- Fly Catcher record ---
        page.click("text=Search")
        page.wait_for_timeout(200)
        page.fill("input[placeholder*='PC-04']", "Fly Catcher")
        page.wait_for_timeout(300)
        opened = False
        rows = page.locator(".doc-table tbody tr")
        if rows.count() > 0:
            rows.first.click()
            opened = True
        check("Opened a Fly Catcher record via search", opened)
        page.wait_for_timeout(300)
        if opened:
            page.screenshot(path="tests/shots/04_flycatcher.png", full_page=True)
            catch_inputs = page.locator("table input[type=number]")
            for i in range(min(catch_inputs.count(), 13)):
                catch_inputs.nth(i).fill(str(i % 4))
            cleaning_inputs = page.locator("table input.input-sm").all()
            # fill cleaning done by / verified by text inputs (skip date/number types already handled)
            text_inputs = page.locator("table input:not([type=number]):not([type=date])")
            for i in range(text_inputs.count()):
                el = text_inputs.nth(i)
                if el.get_attribute("value") == "" or True:
                    el.fill("QA Tester")
            page.click("button:has-text('Submit')")
            page.wait_for_timeout(300)
            check("Fly Catcher submitted", "Pending Verification" in page.content())

        # --- Service Report record ---
        page.click("text=Search")
        page.wait_for_timeout(200)
        page.fill("input[placeholder*='PC-04']", "Rodent Control Service")
        page.wait_for_timeout(300)
        rows = page.locator(".doc-table tbody tr")
        opened_sr = False
        if rows.count() > 0:
            rows.first.click()
            opened_sr = True
        check("Opened a Service Report record via search", opened_sr)
        page.wait_for_timeout(300)
        if opened_sr:
            page.screenshot(path="tests/shots/05_servicereport.png", full_page=True)
            tech = page.locator("input[placeholder='Technician name']")
            if tech.count():
                tech.fill("Yogesh Rathod")
            page.click("button:has-text('Submit')")
            page.wait_for_timeout(300)
            check("Service report submitted", "Pending Verification" in page.content())

        # --- Lamination log sheets (generic log-sheet kind) ---
        for label, shot in [("Process Parameter", "05b_process_parameter"), ("ALC & Production", "05c_alc_production"), ("Adhesive Mixing", "05d_adhesive_mixing")]:
            page.click("text=Search")
            page.wait_for_timeout(200)
            page.fill("input[placeholder*='PC-04']", label)
            page.wait_for_timeout(300)
            rows = page.locator(".doc-table tbody tr")
            if rows.count() > 0:
                rows.first.click()
                page.wait_for_timeout(300)
                page.screenshot(path=f"tests/shots/{shot}.png", full_page=True)
        check("Log sheets open with the assistant's prepared banner", "Your assistant has filled this in" in page.content())

        # --- CAPA: chooser, then a new Internal record ---
        page.click("a:has-text('Internal — Inspection Findings')")
        page.wait_for_timeout(300)
        page.goto(f"{BASE}/index.html#/gap")
        page.wait_for_timeout(300)
        page.screenshot(path="tests/shots/06_capa_home.png", full_page=True)
        page.click("a:has-text('Internal — Inspection Findings')")
        page.wait_for_timeout(300)
        page.screenshot(path="tests/shots/06_gap_list.png", full_page=True)
        page.click("button:has-text('New Internal CAPA Record')")
        page.wait_for_timeout(300)
        check("New CAPA record page opened", "Add Finding" in page.content())
        page.click("button:has-text('Add Finding')")
        page.wait_for_timeout(200)
        finding_input = page.locator(".doc-table tbody tr input.input-sm").first
        if finding_input.count():
            finding_input.fill("QA test finding")
        page.screenshot(path="tests/shots/07_gap_detail.png", full_page=True)

        # --- CAPA External: new complaint with the assistant walk-through open ---
        page.click("a:has-text('External — Customer Complaints')")
        page.wait_for_timeout(300)
        page.click("button:has-text('New Complaint')")
        page.wait_for_timeout(900)
        check("Assistant auto-starts on a new complaint", page.locator(".chat-msg.bot", has_text="Which customer").count() == 1)
        page.screenshot(path="tests/shots/07b_complaint_walkthrough.png", full_page=True)
        page.click("button[aria-label='Close assistant']")
        page.wait_for_timeout(150)

        # --- Training: create new record ---
        page.click("text=Training Records")
        page.wait_for_timeout(300)
        page.screenshot(path="tests/shots/08_training_list.png", full_page=True)
        page.click("button:has-text('New Training Record')")
        page.wait_for_timeout(300)
        check("New training record page opened", "Add Attendee" in page.content())
        page.click("button:has-text('Add Attendee')")
        page.wait_for_timeout(200)
        page.screenshot(path="tests/shots/09_training_detail.png", full_page=True)

        # --- Reports ---
        page.click("text=Reports")
        page.wait_for_timeout(300)
        page.screenshot(path="tests/shots/10_reports.png", full_page=True)
        page.click("text=Rodent Trend")
        page.wait_for_timeout(200)
        page.screenshot(path="tests/shots/11_reports_rodent.png", full_page=True)

        # --- Master data ---
        page.click("text=Master Data")
        page.wait_for_timeout(300)
        page.screenshot(path="tests/shots/12_masterdata.png", full_page=True)

        # --- Statements of Compliance ---
        page.click("text=Statements of Compliance")
        page.wait_for_timeout(300)
        page.click("text=Flexible Packaging")
        page.wait_for_timeout(300)
        check("SOC detail page renders", "Declarations" in page.content())
        page.screenshot(path="tests/shots/14_soc_detail.png", full_page=True)

        # --- Print view (emulate print media) ---
        page.click("a:has-text('Internal — Inspection Findings')")
        page.wait_for_timeout(300)
        page.locator(".doc-table tbody tr").first.click()
        page.wait_for_timeout(300)
        page.emulate_media(media="print")
        page.screenshot(path="tests/shots/13_print_preview.png", full_page=True)
        page.emulate_media(media="screen")

        browser.close()

        print("\nJS errors:", errors[:10])
        if FAILURES:
            print(f"\n{len(FAILURES)} FAILURES")
            sys.exit(1)
        print("\nAll visual QA checks passed.")


if __name__ == "__main__":
    main()
